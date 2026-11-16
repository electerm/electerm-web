#!/usr/bin/env node
/**
 * Serial session e2e: a real virtual serial port pair, the real server, and the
 * same websocket protocol the browser client speaks. Nothing is mocked: the
 * bytes go through `serialport` (a real pty), through the session, over a real
 * socket, and the device answers on its own.
 *
 * Needs socat (`brew install socat`) and a device on the far end of the pair.
 * By default that is electerm's serial-shell demo, which brings its own pair
 * (/tmp/ttyXM0 <-> /tmp/ttyXM1) and a small command shell behind it:
 *
 *   SERIAL_DEMO      demo script, default ~/dev/electerm/temp/serial-test/serial-shell.js
 *   SERIAL_PATH      port to connect to, default /tmp/ttyXM0
 *   SERIAL_BAUD      default 9600
 *
 * Run: node test/e2e/serial.e2e.js
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import wsPkg from 'ws'
import { getFreePort } from '../../src/app/lib/free-port.js'

// ws 7 exports the class itself, ws 8 also names it
const WebSocket = wsPkg.WebSocket || wsPkg

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DEMO = process.env.SERIAL_DEMO ||
  resolve(homedir(), 'dev/electerm/temp/serial-test/serial-shell.js')
const SERIAL_PATH = process.env.SERIAL_PATH || '/tmp/ttyXM0'
const BAUD = Number(process.env.SERIAL_BAUD || 9600)
const DATA_DIR = resolve(tmpdir(), 'electerm-web-serial-e2e')
const USER = 'e2e'
const PASS = 'e2e-pass'
const SECRET = 'e2e-secret'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitFor (fn, { timeout = 10000, label = 'condition', step = 40 } = {}) {
  const start = Date.now()
  for (;;) {
    const val = fn()
    if (val) {
      return val
    }
    if (Date.now() - start > timeout) {
      throw new Error(`timeout after ${timeout}ms waiting for ${label}`)
    }
    await sleep(step)
  }
}

// A child process with everything it printed so far, for waitFor() on output.
function spawnLog (cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
  child.out = ''
  const collect = d => {
    child.out += d.toString()
  }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)
  child.on('error', err => {
    child.out += `spawn error: ${err.message}\n`
  })
  return child
}

function stop (child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode) {
      return resolve()
    }
    child.once('exit', () => resolve())
    child.kill('SIGTERM')
    setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch (e) {}
      resolve()
    }, 3000)
  })
}

// --- middle: the common socket (create-terminal and friends) -------------

let reqId = 0

class Common {
  constructor (ws) {
    this.ws = ws
    this.pending = new Map()
    ws.on('message', data => {
      let msg
      try {
        msg = JSON.parse(data.toString())
      } catch (e) {
        return
      }
      const cb = this.pending.get(msg.id)
      if (cb) {
        this.pending.delete(msg.id)
        cb(msg)
      }
    })
  }

  request (payload, timeout = 20000) {
    const id = `e2e-${++reqId}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`no answer to ${payload.action} within ${timeout}ms`))
      }, timeout)
      this.pending.set(id, msg => {
        clearTimeout(timer)
        resolve(msg)
      })
      this.ws.send(JSON.stringify({ ...payload, id }))
    })
  }
}

// --- the terminal socket: binary device bytes plus JSON control replies ---

class Terminal {
  constructor (ws) {
    this.ws = ws
    // everything the tab would have drawn, in arrival order
    this.text = ''
    this.jsons = []
    ws.on('message', data => {
      if (typeof data === 'string') {
        try {
          this.jsons.push(JSON.parse(data))
        } catch (e) {}
        return
      }
      this.text += data.toString('latin1')
    })
  }

  get bytes () {
    return this.text.length
  }

  // substring of what arrived after `from`
  since (from) {
    return this.text.slice(from)
  }

  type (str) {
    this.ws.send(str)
  }

  serial (msg) {
    this.ws.send(JSON.stringify({ action: 'serial-event', ...msg }))
  }

  // the reply to a control message, not just any earlier one
  lastSerial () {
    for (let i = this.jsons.length - 1; i >= 0; i--) {
      if (this.jsons[i].action === 'serial-event') {
        return this.jsons[i]
      }
    }
    return null
  }

  async waitText (sub, from = 0, timeout = 10000) {
    await waitFor(
      () => this.text.indexOf(sub, from) !== -1,
      { timeout, label: JSON.stringify(sub) }
    )
    return this.text.indexOf(sub, from)
  }

  // the device echoes every character it gets and then answers, so the same
  // word arrives twice (the echo of the typed line, then the reply)
  async waitEchoAndAnswer (word, from = 0, timeout = 10000) {
    await waitFor(
      () => this.text.slice(from).split(word).length >= 3,
      { timeout, label: `${word} echoed and answered` }
    )
  }

  // the state reply of a serial-event, once it carries `expect`
  async waitSerial (expect = {}, from = this.jsons.length, timeout = 10000) {
    return waitFor(() => {
      const hit = this.jsons.slice(from).filter(m => m.action === 'serial-event')
        .find(m => Object.keys(expect).every(k => m[k] === expect[k]))
      return hit
    }, { timeout, label: `serial-event ${JSON.stringify(expect)}` })
  }
}

function open (url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}

function once (ws, event) {
  return new Promise(resolve => ws.once(event, resolve))
}

async function main () {
  assert.ok(existsSync(DEMO), `serial device demo not found: ${DEMO} (set SERIAL_DEMO)`)
  const socat = spawnSync('socat', ['-V'])
  assert.ok(
    !socat.error && socat.status === 0,
    'socat is required to build the virtual port pair (brew install socat)'
  )

  // A pty (or a driver without modem control lines) refuses TIOCMGET/TIOCMSET.
  // The reply carries that as `error`; anything else in there is a real failure.
  const PTY_ERR = /ioctl|cannot get|cannot set|inappropriate/i
  function assertNoError (st, where) {
    if (st.error) {
      assert.match(st.error, PTY_ERR, `${where}: unexpected error: ${st.error}`)
    }
  }

  const port = await getFreePort({ from: 5613, host: '127.0.0.1' })
  const base = `http://127.0.0.1:${port}`
  const wss = `ws://127.0.0.1:${port}`

  rmSync(DATA_DIR, { recursive: true, force: true })

  const results = []
  let device
  let server
  let terminal
  let common

  async function step (name, fn) {
    const t0 = Date.now()
    try {
      const note = await fn()
      results.push({ name, ok: true })
      console.log(`ok   ${name} (${Date.now() - t0}ms)${note ? ' - ' + note : ''}`)
    } catch (err) {
      results.push({ name, ok: false, error: err })
      console.log(`FAIL ${name} (${Date.now() - t0}ms)`)
      console.log(err.stack.split('\n').slice(0, 6).join('\n'))
      throw err
    }
  }

  try {
    // ---- the device and the server ------------------------------------
    device = spawnLog(process.execPath, [DEMO], { cwd: dirname(DEMO) })

    await step('virtual serial pair is up', async () => {
      try {
        await waitFor(
          () => existsSync(SERIAL_PATH) && existsSync('/tmp/ttyXM1'),
          { timeout: 15000, label: 'socat pty pair' }
        )
        await waitFor(
          () => device.out.includes('Service port open'),
          { timeout: 15000, label: 'device port open', step: 100 }
        )
      } catch (err) {
        throw new Error(`${err.message}\ndevice said:\n${device.out.trim()}`)
      }
      return `${SERIAL_PATH} (baud ${BAUD})`
    })

    server = spawnLog(process.execPath, [resolve(ROOT, 'src/app/app.js')], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(port),
        SERVER_USER: USER,
        SERVER_PASS: PASS,
        SERVER_SECRET: SECRET,
        DB_PATH: DATA_DIR
      }
    })

    await step('server is listening', async () => {
      await waitFor(
        () => server.out.includes('server runs on http://'),
        { timeout: 30000, label: 'server listen', step: 100 }
      )
      const res = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASS })
      })
      assert.equal(res.status, 200, 'login should succeed')
      return `port ${port}`
    })

    const token = await (await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASS })
    })).text()

    // ---- a serial session, created the way the client creates one ------
    let pid

    await step('create a serial session', async () => {
      common = new Common(await open(`${wss}/common/s?token=${token}`))
      const res = await common.request({
        action: 'create-terminal',
        body: {
          termType: 'serial',
          path: SERIAL_PATH,
          baudRate: BAUD,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          txLineEnding: '\r',
          rxLineEnding: 'none',
          cols: 80,
          rows: 24
        }
      })
      assert.ok(res.data && res.data.pid, `no pid: ${JSON.stringify(res)}`)
      pid = res.data.pid
      return `pid ${pid}`
    })

    // byte offset in the tab output, so a step only looks at what it caused
    let mark = 0

    await step('terminal socket attaches', async () => {
      terminal = new Terminal(await open(`${wss}/terminals/${pid}?token=${token}`))
      // what the device wrote before the socket existed was written into a pty
      // nobody held open yet, so a CR is the reliable first exchange
      mark = terminal.bytes
      terminal.type('\r')
      await terminal.waitText('shell>', mark, 5000)
      return 'prompt on attach'
    })

    await step('device answers a command', async () => {
      mark = terminal.bytes
      terminal.type('help\r')
      await terminal.waitText('Serial Shell', mark)
      await terminal.waitText('Receive file via XMODEM', mark)
      return 'help listed'
    })

    await step('input reaches the port and the echo comes back', async () => {
      mark = terminal.bytes
      terminal.type('echo hello serial e2e\r')
      await terminal.waitEchoAndAnswer('hello serial e2e', mark)
      return 'echo + answer'
    })

    await step('serial-event get reports the control lines', async () => {
      const from = terminal.jsons.length
      terminal.serial({ cmd: 'get' })
      const st = await terminal.waitSerial({ action: 'serial-event' }, from)
      assert.equal(st.dtr, true, 'dtr is asserted on open')
      assert.equal(st.rts, true, 'rts is asserted on open')
      assert.equal(st.brk, false, 'break is not held')
      assert.equal(st.mode, 'ascii', 'rx view starts as ascii')
      assert.equal(st.ascii, true, 'ascii column on')
      assert.equal(st.start, null, 'no frame start byte')
      assert.equal(st.stop, null, 'no frame stop byte')
      if (st.error) {
        // A pty has no modem control lines, so TIOCMGET is ENOTTY: the reply
        // says so instead of pretending, and nothing else is lost.
        assert.match(st.error, /ioctl|cannot get/i, `unexpected error: ${st.error}`)
        return 'pty: no modem lines to report'
      }
      for (const k of ['cts', 'dsr', 'dcd']) {
        assert.equal(typeof st[k], 'boolean', `${k} is reported`)
      }
      return `cts=${st.cts} dsr=${st.dsr} dcd=${st.dcd}`
    })

    await step('a device without modem lines still has a working session', async () => {
      if (!/ioctl|cannot get/i.test(server.out)) {
        return 'device reports its lines'
      }
      // init sets dtr/rts and tolerates a refusal (session-serial.js)
      assert.match(server.out, /serial set lines/, 'the refused line setup is logged, not thrown')
      mark = terminal.bytes
      terminal.type('\r')
      await terminal.waitText('shell>', mark)
      return 'refusal logged, session alive'
    })

    await step('dtr can be dropped and raised again', async () => {
      let from = terminal.jsons.length
      terminal.serial({ cmd: 'set', dtr: false })
      const off = await terminal.waitSerial({ dtr: false }, from)
      from = terminal.jsons.length
      terminal.serial({ cmd: 'set', dtr: true })
      const st = await terminal.waitSerial({ dtr: true }, from)
      assert.equal(st.rts, true, 'rts untouched')
      // state is tracked either way; only the hardware write may be refused
      const refusal = [off.error, st.error].filter(Boolean)
      if (refusal.length) {
        assert.match(refusal[0], /ioctl|cannot set|Inappropriate/i, `unexpected: ${refusal[0]}`)
        return 'state tracked, hardware refused (pty)'
      }
      return 'dropped then raised'
    })

    await step('rx view: hex / dec / bin redraw what came before', async () => {
      // a marker of our own, so the dump has bytes we know the hex of
      mark = terminal.bytes
      terminal.type('echo zzz999\r')
      await terminal.waitEchoAndAnswer('zzz999', mark)
      const patterns = {
        hex: /7A 7A 7A/,
        dec: /(?:\s122){3}/,
        bin: /(?:01111010 ){2}01111010/
      }
      for (const [mode, re] of Object.entries(patterns)) {
        const from = terminal.bytes
        const jfrom = terminal.jsons.length
        terminal.serial({ cmd: 'view', mode })
        const st = await terminal.waitSerial({ mode }, jfrom)
        assertNoError(st, mode)
        await waitFor(
          () => re.test(terminal.since(from)),
          { timeout: 5000, label: `${mode} dump of the received bytes` }
        )
        // the redraw starts on a cleared screen
        assert.ok(
          terminal.since(from).includes('\x1b[H\x1b[2J'),
          `${mode}: redraw clears the screen first`
        )
        if (mode === 'hex') {
          assert.match(terminal.since(from), /zzz999/, 'ascii column kept')
        }
      }
      return 'three modes, all of the received bytes'
    })

    await step('arrow keys move a byte cursor instead of going to the port', async () => {
      const from = terminal.bytes
      terminal.type('\x1b[D')
      await waitFor(
        () => terminal.since(from).includes('\x1b[7m'),
        { timeout: 5000, label: 'cursor highlight' }
      )
      const jfrom = terminal.jsons.length
      terminal.serial({ cmd: 'get' })
      const st = await waitFor(
        () => terminal.jsons.slice(jfrom)
          .filter(m => m.action === 'serial-event' && m.cursor)
          .pop(),
        { timeout: 5000, label: 'serial-event with a byte cursor' }
      )
      assert.equal(typeof st.cursor.offset, 'number', 'cursor in state')
      // the first key lands on the last byte, the prompt space of "shell> "
      assert.equal(st.cursor.byte, 0x20, 'cursor sits on the last received byte')
      return `byte #${st.cursor.offset} = 0x20`
    })

    await step('back to ascii replays the kept bytes', async () => {
      const from = terminal.bytes
      const jfrom = terminal.jsons.length
      terminal.serial({ cmd: 'view', mode: 'ascii' })
      await terminal.waitSerial({ mode: 'ascii' }, jfrom)
      await terminal.waitText('Receive file via XMODEM', from)
      return 'scrollback intact'
    })

    await step('raw bytes: send bypasses the tx line ending', async () => {
      mark = terminal.bytes
      terminal.serial({ cmd: 'send', data: [...Buffer.from('info\r')] })
      await terminal.waitText(`Port: ${SERIAL_PATH}`, mark)
      await terminal.waitText(`Baud: ${BAUD}`, mark)
      return 'info answered'
    })

    await step('break is a pulse, not a switch', async () => {
      const jfrom = terminal.jsons.length
      terminal.serial({ cmd: 'set', brk: true })
      const st = await terminal.waitSerial({ action: 'serial-event' }, jfrom)
      assert.equal(st.brk, false, 'break is reported off again')
      assertNoError(st, 'break')
      // a break left low would silence the line for good
      mark = terminal.bytes
      terminal.type('echo after break\r')
      await terminal.waitEchoAndAnswer('after break', mark)
      return 'line still answers'
    })

    await step('frame start byte breaks the ascii lines', async () => {
      const jfrom = terminal.jsons.length
      terminal.serial({ cmd: 'view', start: 10 })
      const st = await terminal.waitSerial({ start: 10 }, jfrom)
      assert.equal(st.start, 10, 'start byte set')
      // every LF is now preceded by a stray CR of its own (the device already
      // sends CRLF), which is exactly what the framer does to a line break
      await waitFor(
        () => terminal.text.includes('\r\r\n'),
        { timeout: 5000, label: 'framed line break' }
      )
      const j2 = terminal.jsons.length
      terminal.serial({ cmd: 'view', start: null })
      await terminal.waitSerial({ start: null }, j2)
      return 'framing on, then off'
    })

    await step('resize keeps the session alive', async () => {
      await common.request({
        action: 'resize-terminal',
        pid,
        cols: 100,
        rows: 40
      })
      mark = terminal.bytes
      terminal.type('echo resized\r')
      await terminal.waitEchoAndAnswer('resized', mark)
      return '80x24 -> 100x40'
    })

    await step('a bad port path fails loudly', async () => {
      const res = await common.request({
        action: 'create-terminal',
        body: { termType: 'serial', path: '/tmp/no-such-serial-port-e2e', baudRate: BAUD }
      })
      assert.ok(res.error && res.error.message, `no error: ${JSON.stringify(res)}`)
      assert.match(res.error.message, /no such|cannot open|ENOENT|not found/i)
      return res.error.message.split('\n')[0]
    })

    await step('closing the tab end of the socket ends the session', async () => {
      const closed = once(terminal.ws, 'close')
      terminal.ws.close()
      await closed
      return 'socket closed'
    })

    await step('the port is released and can be opened again', async () => {
      // the device notices the hangup and reopens its side
      await sleep(1500)
      const res = await common.request({
        action: 'create-terminal',
        body: {
          termType: 'serial',
          path: SERIAL_PATH,
          baudRate: BAUD,
          txLineEnding: '\r',
          rxLineEnding: 'none',
          cols: 80,
          rows: 24
        }
      })
      assert.ok(res.data && res.data.pid, `no pid: ${JSON.stringify(res)}`)
      pid = res.data.pid
      terminal = new Terminal(await open(`${wss}/terminals/${pid}?token=${token}`))
      mark = terminal.bytes
      terminal.type('\r')
      await terminal.waitText('shell>', mark)
      return `pid ${pid}`
    })

    await step('rx marker triggers the xmodem auto-send event', async () => {
      const from = terminal.bytes
      terminal.type('rx\r')
      await terminal.waitText('[XMODEM:RX]', from)
      await waitFor(
        () => terminal.jsons.some(m =>
          m.action === 'xmodem-event' && m.event === 'auto-trigger-send'),
        { timeout: 5000, label: 'xmodem auto-trigger-send' }
      )
      return 'client asked to send'
    })
  } finally {
    try {
      terminal?.ws.close()
      common?.ws.close()
    } catch (e) {}
    await stop(server)
    await stop(device)
  }

  const failed = results.filter(r => !r.ok)
  console.log('')
  console.log(`${results.length - failed.length}/${results.length} serial e2e steps passed`)
  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error('')
  console.error('serial e2e failed:', err.message)
  process.exitCode = 1
})
