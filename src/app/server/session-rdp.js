/**
 * terminal/sftp/serial class
 */
import log from '../common/log.js'
import { TerminalBase } from './session-base.js'
import globalState from './global-state.js'
import {
  handleConnection
} from './rdp-proxy.js'
import net from 'net'

class TerminalRdp extends TerminalBase {
  init = async () => {
    globalState.setSession(this.pid, this)
    return Promise.resolve(this)
  }

  /**
   * Start the RDCleanPath proxy for this session.
   * Called when the WebSocket connects from the browser.
   * The WASM client will send an RDCleanPath Request as the first message.
   */
  start = async (width, height) => {
    if (!this.ws) {
      log.error(`[RDP:${this.pid}] No WebSocket available`)
      return
    }
    this.width = width
    this.height = height

    handleConnection(this.ws)
  }

  resize () {
    // IronRDP handles resize via the WASM session.resize() method
    // which sends resize PDUs through the existing relay
  }

  test = async () => {
    const {
      host,
      port = 3389
    } = this.initOptions
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => {
        socket.destroy()
        resolve(true)
      })
      socket.on('error', (err) => {
        reject(err)
      })
      socket.setTimeout(10000, () => {
        socket.destroy()
        reject(new Error('Connection timed out'))
      })
    })
  }

  kill = () => {
    if (this.ws) {
      try {
        this.ws.close()
      } catch (e) {
        log.debug(`[RDP:${this.pid}] ws.close() error: ${e.message}`)
      }
      delete this.ws
    }
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
    }
    const {
      pid
    } = this
    const inst = globalState.getSession(pid)
    if (!inst) {
      return
    }
    globalState.removeSession(pid)
  }
}

export const terminalRdp = async function (initOptions, ws) {
  const term = new TerminalRdp(initOptions, ws)
  await term.init()
  return term
}

/**
 * test ssh connection
 * @param {object} options
 */
export const testConnectionRdp = (options) => {
  return (new TerminalRdp(options, undefined, true))
    .test()
    .then((res) => {
      res.close()
      return true
    })
    .catch(() => {
      return false
    })
}
