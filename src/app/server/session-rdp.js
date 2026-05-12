/**
 * terminal/sftp/serial class
 */
import log from '../common/log.js'
import { TerminalBase } from './session-base.js'
import globalState from './global-state.js'
import {
  handleConnection
} from './rdp-proxy.js'
import { createHopProxy } from './session-hop.js'
import proxySock from './socks.js'
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

    // Buffer any messages that arrive during the async hop setup so they
    // are not dropped before handleConnection sets up its own listener.
    const bufferedMessages = []
    const bufferMsg = (data) => bufferedMessages.push(data)
    this.ws.on('message', bufferMsg)

    const { readyTimeout } = this.initOptions

    const { proxyUrl, ssh } = await createHopProxy(this.initOptions)
    if (ssh) {
      this.ssh = ssh
    }

    // Hand off to the proxy handler, replaying any buffered messages.
    this.ws.off('message', bufferMsg)
    handleConnection(this.ws, {
      proxy: proxyUrl,
      readyTimeout
    }, bufferedMessages)
  }

  resize () {
    // IronRDP handles resize via the WASM session.resize() method
    // which sends resize PDUs through the existing relay
  }

  test = async () => {
    const {
      host,
      port = 3389,
      readyTimeout = 10000
    } = this.initOptions

    const { proxyUrl, ssh } = await createHopProxy(this.initOptions)
    if (ssh) {
      this.ssh = ssh
    }

    try {
      if (proxyUrl) {
        const proxyResult = await proxySock({ readyTimeout, host, port, proxy: proxyUrl })
        proxyResult.socket.destroy()
        return true
      }

      return await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.destroy()
          resolve(true)
        })
        socket.on('error', (err) => reject(err))
        socket.setTimeout(readyTimeout, () => {
          socket.destroy()
          reject(new Error('Connection timed out'))
        })
      })
    } finally {
      if (this.ssh) {
        this.ssh.kill()
        delete this.ssh
      }
    }
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
    if (this.ssh) {
      this.ssh.kill()
      delete this.ssh
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

export const terminal = terminalRdp
export const testConnection = testConnectionRdp
