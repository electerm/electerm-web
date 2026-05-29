/**
 * terminal/sftp/serial class
 */
import { TerminalBase } from './session-base.js'
import log from '../common/log.js'
import { SerialPort } from 'serialport'
import globalState from './global-state.js'
// const { MockBinding } = require('@serialport/binding-mock')
// MockBinding.createPort('/dev/ROBOT', { echo: true, record: true })

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
    this.txLineEnding = txLineEnding
    this.rxLineEnding = rxLineEnding
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
    globalState.setSession(this.pid, this)
  }

  resize () {

  }

  on (event, cb) {
    if (event === 'data' && this.rxLineEnding && this.rxLineEnding !== 'none') {
      this.port.on('data', (data) => {
        const str = Buffer.isBuffer(data) ? data.toString('latin1') : String(data)
        let processed
        if (this.rxLineEnding === 'lf_to_crlf') {
          processed = str.replace(/\r?\n/g, '\r\n')
        } else if (this.rxLineEnding === 'cr_to_crlf') {
          processed = str.replace(/\r(?!\n)/g, '\r\n')
        } else {
          processed = str
        }
        cb(Buffer.isBuffer(data) ? Buffer.from(processed, 'latin1') : processed)
      })
    } else {
      this.port.on(event, cb)
    }
  }

  write (data) {
    try {
      const str = Buffer.isBuffer(data) ? data.toString('latin1') : String(data)
      let out = str
      if (this.txLineEnding && this.txLineEnding !== '\r') {
        out = str.replace(/\r\n|\r|\n/g, this.txLineEnding)
      }
      this.port.write(Buffer.isBuffer(data) ? Buffer.from(out, 'latin1') : out)
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

  kill () {
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
