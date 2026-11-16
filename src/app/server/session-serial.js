/**
 * terminal/sftp/serial class
 */
import { TerminalBase } from './session-base.js'
import { createRxConverter, convertTx } from './line-ending.js'
import log from '../common/log.js'
import globalState from './global-state.js'
import { SerialView } from './serial-view.js'

// `serialport` is a native module that is not built for Android yet. Load it
// lazily and tolerate its absence so the server can still start.
let serialPortPromise = null
function loadSerialPort () {
  if (!serialPortPromise) {
    serialPortPromise = import('serialport')
      .then(m => m.SerialPort)
      .catch(err => {
        log.warn('serialport is not available, serial terminals disabled:', err.message)
        return null
      })
  }
  return serialPortPromise
}
// const { MockBinding } = require('@serialport/binding-mock')
// MockBinding.createPort('/dev/ROBOT', { echo: true, record: true })

// how long a break holds the line low
const BREAK_MS = 250

class TerminalSerial extends TerminalBase {
  async init () {
    // https://serialport.io/docs/api-stream
    const {
      autoOpen = true,
      baudRate = 9600,
      dataBits = 8,
      lock = true,
      stopBits = 1,
      parity = 'none',
      rtscts = false,
      xon = false,
      xoff = false,
      xany = false,
      txLineEnding = '\r',
      rxLineEnding = 'none',
      path
    } = this.initOptions
    const SerialPort = await loadSerialPort()
    if (!SerialPort) {
      return Promise.reject(new Error('Serial port support is not available on this platform'))
    }
    this.txLineEnding = txLineEnding
    this.rxLineEnding = rxLineEnding
    this.rxConverter = createRxConverter(rxLineEnding)
    this.view = new SerialView({ rows: this.initOptions.rows })
    this.framer = null
    // control lines as electerm set them: port.set() always sets all, and
    // the os may open the port with others, so they are set right away
    this.signals = { dtr: true, rts: true, brk: false }
    await new Promise((resolve, reject) => {
      this.port = new SerialPort({
        // binding: MockBinding,
        path,
        autoOpen,
        baudRate,
        dataBits,
        lock,
        stopBits,
        parity,
        rtscts,
        xon,
        xoff,
        xany
      }, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve('ok')
        }
      })
    })
    if (this.isTest) {
      this.kill()
      return true
    }
    // first listener: the view has the bytes before they are shown
    this.port.on('data', data => this.view.record(data))
    // with rtscts the driver owns rts and may refuse, the session still works
    await this.setSignals().catch(e => log.error('serial set lines', e))
    globalState.setSession(this.pid, this)
    return Promise.resolve(this)
  }

  setSignals () {
    return new Promise((resolve, reject) => {
      this.port.set(this.signals, err => err ? reject(err) : resolve())
    })
  }

  /**
   * break holds the line low, so it is a pulse, not a switch: a break left
   * on silences the port until somebody clicks it again
   */
  pulseBreak () {
    clearTimeout(this._breakTimer)
    this.signals.brk = true
    return this.setSignals().finally(() => {
      this._breakTimer = setTimeout(() => {
        this.signals.brk = false
        this.setSignals().catch(e => log.error('serial break off', e))
      }, BREAK_MS)
    })
  }

  resize (cols, rows) {
    if (rows) {
      this.view.rows = rows
    }
  }

  // to the terminal, in order with the received data, but not into the
  // session log: this is the same received bytes drawn another way, not new
  // output (see _wsUiHandler in session-server.js)
  show (buf) {
    if (this._wsUiHandler) {
      this._wsUiHandler(buf)
    } else {
      this.ws?.send(buf)
    }
  }

  // all kept bytes again in the current view, on a cleared terminal. The
  // scrollback is kept: the ascii output before the switch stays reachable
  replay () {
    const clear = '\x1b[H\x1b[2J'
    if (this.view.mode !== 'ascii') {
      return Buffer.from(clear + this.view.screen(), 'latin1')
    }
    const convert = createRxConverter(this.rxLineEnding)
    const frame = this.view.framer()
    let s = this.view.bytes.toString('latin1')
    s = convert ? convert(s) : s
    s = frame ? frame(s) : s
    return Buffer.concat([Buffer.from(clear), Buffer.from(s, 'latin1')])
  }

  on (event, cb) {
    if (event === 'data') {
      const wrapper = (data) => {
        const view = this.view.format(data)
        if (view !== null) {
          return cb(Buffer.from(view))
        }
        if (!this.rxConverter && !this.framer) {
          return cb(data)
        }
        const isBuffer = Buffer.isBuffer(data)
        let str = isBuffer ? data.toString('latin1') : String(data)
        if (this.rxConverter) {
          str = this.rxConverter(str)
        }
        if (this.framer) {
          str = this.framer(str)
        }
        cb(isBuffer ? Buffer.from(str, 'latin1') : str)
      }
      if (!this._onWrappers) {
        this._onWrappers = new Map()
      }
      let list = this._onWrappers.get(cb)
      if (!list) {
        list = []
        this._onWrappers.set(cb, list)
      }
      list.push({ event, wrapper })
      this.port.on(event, wrapper)
    } else {
      this.port.on(event, cb)
    }
  }

  off (event, cb) {
    try {
      const list = this._onWrappers?.get(cb)
      if (list) {
        const remaining = []
        for (const entry of list) {
          if (entry.event === event) {
            try {
              this.port?.removeListener?.(event, entry.wrapper)
            } catch (_) {}
          } else {
            remaining.push(entry)
          }
        }
        if (remaining.length) {
          this._onWrappers.set(cb, remaining)
        } else {
          this._onWrappers.delete(cb)
        }
      }
      try {
        this.port?.removeListener?.(event, cb)
      } catch (_) {}
    } catch (_) {
      // ignore removal errors during teardown
    }
  }

  write (data) {
    try {
      const isBuffer = Buffer.isBuffer(data)
      // hex / dec / bin view: arrow keys move the byte cursor
      const moved = this.view.move(isBuffer ? data.toString('latin1') : String(data))
      if (moved !== null) {
        moved && this.show(Buffer.from(moved, 'latin1'))
        return
      }
      const str = convertTx(
        isBuffer ? data.toString('latin1') : String(data),
        this.txLineEnding
      )
      this.port.write(isBuffer ? Buffer.from(str, 'latin1') : str)
      if (this.sessionLogger) {
        this.sessionLogger.write(data)
      }
    } catch (e) {
      log.error(e)
    }
  }

  /**
   * Write raw bytes directly to the serial port, bypassing txLineEnding transformation.
   * Used by binary protocols (XMODEM) to avoid corruption of protocol bytes.
   */
  writeRaw (data) {
    try {
      this.port.write(data)
    } catch (e) {
      log.error(e)
    }
  }

  /**
   * serial controls of the session toolbar: control lines, rx view, raw bytes
   * @param {{cmd: string}} msg set {dtr, rts, brk: true is a pulse}
   *   | view {mode, ascii, start, stop} (frame bytes, null: off)
   *   | send {data: number[]} | get
   */
  async serialEvent (msg, ws) {
    let error
    try {
      if (msg.cmd === 'set') {
        for (const k of ['dtr', 'rts']) {
          if (typeof msg[k] === 'boolean') {
            this.signals[k] = msg[k]
          }
        }
        if (msg.brk === true) {
          await this.pulseBreak()
        } else {
          if (msg.brk === false) {
            this.signals.brk = false
          }
          await this.setSignals()
        }
      } else if (msg.cmd === 'view') {
        if (this.view.set(msg)) {
          // the ascii view goes on from the end of the redrawn data
          this.framer = this.view.framer()
          const out = this.replay()
          if (this.framer) {
            this.framer(this.view.bytes.toString('latin1'))
          }
          this.show(out)
        }
      } else if (msg.cmd === 'send' && Array.isArray(msg.data)) {
        const bytes = msg.data.filter(b => Number.isInteger(b) && b >= 0 && b <= 255)
        this.writeRaw(Buffer.from(bytes))
      }
    } catch (e) {
      error = e.message
    }
    const state = {
      action: 'serial-event',
      ...this.signals,
      brk: false,
      mode: this.view.mode,
      ascii: this.view.ascii,
      start: this.view.start,
      stop: this.view.stop,
      cursor: this.view.cursorInfo(),
      error
    }
    // cts, dsr, dcd: no change event, so every reply carries them
    const lines = await new Promise(resolve => {
      if (!this.port) {
        return resolve({})
      }
      this.port.get((err, res) => {
        if (!error && err) {
          error = err.message
        }
        resolve(res || {})
      })
    })
    if (typeof ws.s !== 'function' || ws.readyState !== 1) {
      return
    }
    ws.s({ ...state, ...lines, error })
  }

  kill () {
    clearTimeout(this._breakTimer)
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
    }
    this.port && this.port.isOpen && this.port.close()
    delete this.port
    this.onEndConn()
  }
}

export async function terminalSerial (initOptions, ws) {
  const term = new TerminalSerial(initOptions, ws)
  await term.init()
  return term
}

// for the unit tests, which never open a port
export { TerminalSerial }

/**
 * test ssh connection
 * @param {object} options
 */
export function testConnectionSerial (initOptions) {
  return (new TerminalSerial(initOptions, undefined, true))
    .init()
    .then(() => true)
    .catch(() => {
      return false
    })
}

export const terminal = terminalSerial
export const testConnection = testConnectionSerial
