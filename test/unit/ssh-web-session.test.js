import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import express from 'express'
import WebSocket from 'ws'
import { createBrowserAuth } from '../../src/app/lib/browser-auth.js'
import { tryBind } from '../../src/app/lib/free-port.js'
import { wsRoutes } from '../../src/app/routes/ws.js'
import globalState from '../../src/app/server/global-state.js'
import { firstHopOptions } from '../../src/app/server/session-ssh/hops.js'
import ssh2 from '../../src/app/server/ssh2.js'

const host = '127.0.0.1'

test('reusing a jump-host bookmark keeps saved credentials with their endpoint', () => {
  const destination = { host: 'destination', password: 'destination-password', interactiveValues: 'destination-code' }
  const jump = { host: 'jump', interactiveValues: 'jump-code' }
  const bookmark = { ...destination, hasHopping: true, connectionHoppings: [jump] }
  const first = firstHopOptions(bookmark)
  assert.equal(first.password, undefined)
  assert.equal(first.interactiveValues, jump.interactiveValues)
  assert.equal(first.connectionHoppings[0].password, destination.password)
  assert.equal(first.connectionHoppings[0].interactiveValues, destination.interactiveValues)
  assert.deepEqual(bookmark.connectionHoppings, [jump])
})

test('the web client can manage a live SSH tunnel and receives final output before exit', { timeout: 10000 }, async t => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'electerm-web-ssh-'))
  t.mock.method(os, 'homedir', () => home)
  t.after(() => rm(home, { recursive: true, force: true }))

  let shell
  const key = ssh2.utils.generateKeyPairSync('ed25519')
  const ssh = new ssh2.Server({ hostKeys: [key.private] }, client => {
    client.on('authentication', auth => {
      if (auth.method === 'password' && auth.password === 'fixture') auth.accept()
      else auth.reject(['password'])
    })
    client.on('session', accept => {
      const session = accept()
      session.on('pty', accept => accept())
      session.on('shell', accept => { shell = accept() })
    })
    client.on('tcpip', accept => {
      const channel = accept()
      channel.pipe(channel)
    })
  })
  ssh.listen(0, host)
  await once(ssh, 'listening')
  t.after(() => ssh.close())

  const app = express()
  wsRoutes(app, createBrowserAuth({ HOST: host }, ''))
  const web = app.listen(0, host)
  await once(web, 'listening')
  t.after(() => {
    for (const socket of app.getWss().clients) socket.terminate()
    web.close()
  })
  const addr = host + ':' + web.address().port
  const connect = route => new WebSocket('ws://' + addr + route, { origin: 'http://' + addr })
  const common = connect('/common/s')
  await once(common, 'open')
  let sequence = 0
  function request (payload) {
    const id = String(++sequence)
    return new Promise((resolve, reject) => {
      function onMessage (raw) {
        const reply = JSON.parse(raw)
        if (reply.id !== id) return
        common.off('message', onMessage)
        if (reply.error) reject(new Error(reply.error.message))
        else resolve(reply.data)
      }
      common.on('message', onMessage)
      common.send(JSON.stringify({ id, ...payload }))
    })
  }
  common.on('message', raw => {
    const msg = JSON.parse(raw)
    if (msg.action === 'session-interactive' && msg.options.mode === 'confirm') {
      common.send(JSON.stringify({ id: msg.id, results: ['trust'] }))
    }
  })

  const { pid } = await request({
    action: 'create-terminal',
    body: { host, port: ssh.address().port, username: 'user', password: 'fixture', useSshAgent: false, termType: 'ssh' }
  })
  t.after(() => globalState.getSession(pid)?.kill())
  const manage = (command, args) => request({ action: 'manage-ssh-tunnel', pid, request: { command, ...args } })
  const port = await tryBind(0)
  const [entry] = await manage('add', {
    tunnel: { sshTunnel: 'forwardLocalToRemote', sshTunnelLocalPort: String(port), sshTunnelRemotePort: 80 }
  })
  assert.equal(entry.status, 'running')
  assert.equal(entry.temporary, true)
  assert.deepEqual(await manage('list'), [entry])
  const socket = net.connect(port, host)
  t.after(() => socket.destroy())
  socket.write('through SSH')
  const [echo] = await once(socket, 'data')
  assert.equal(echo.toString(), 'through SSH')
  const row = { tunnelId: entry.id }
  assert.equal((await manage('stop', row))[0].status, 'stopped')
  assert.equal((await manage('start', row))[0].status, 'running')
  assert.deepEqual(await manage('remove', row), [])

  const previous = connect('/terminals/' + pid)
  await once(previous, 'open')
  const detached = once(previous, 'close')
  const terminal = connect('/terminals/' + pid)
  const frames = []
  terminal.on('message', data => frames.push(data))
  await once(terminal, 'open')
  await detached
  assert.deepEqual(await manage('list'), [])
  const closed = once(terminal, 'close')
  shell.write('last ')
  shell.write('line')
  shell.exit(0)
  shell.end()
  await closed
  const exit = frames.findIndex(frame => typeof frame === 'string' && JSON.parse(frame).action === 'session-exit')
  assert.ok(exit >= 0)
  assert.deepEqual(JSON.parse(frames[exit]), { action: 'session-exit', known: true, code: 0, signal: null })
  assert.equal(Buffer.concat(frames.slice(0, exit).filter(Buffer.isBuffer)).toString(), 'last line')
  await assert.rejects(manage('list'), /SSH session disconnected/)
})
