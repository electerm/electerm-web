/**
 * terminal/sftp/serial class
 */
import _ from 'lodash'
import log from '../common/log.js'
import { TerminalBase } from './session-base.js'
import net from 'net'
import proxySock from './socks.js'
import uid from '../common/uid.js'
import { terminalSsh } from './session-ssh.js'

function getPort (fromPort = 120023) {
  return new Promise((resolve, reject) => {
    require('find-free-port')(fromPort, '127.0.0.1', function (err, freePort) {
      if (err) {
        reject(err)
      } else {
        resolve(freePort)
      }
    })
  })
}

class TerminalVnc extends TerminalBase {
  init = async () => {
    global.sessions[this.initOptions.sessionId] = {
      id: this.initOptions.sessionId,
      terminals: {
        [this.pid]: this
      }
    }
    return Promise.resolve(this)
  }

  start = async (width, height) => {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    if (this.channel) {
      this.channel.close()
      delete this.channel
    }
    const {
      host,
      port
    } = this.initOptions
    const info = await this.hop()
    const target = net.createConnection({
      port,
      host,
      ...info
    }, this.onConnect)
    this.channel = target
    target.on('data', this.onData)
    target.on('end', this.kill)
    target.on('error', this.onError)

    this.ws.on('message', this.onMsg)
    this.ws.on('close', this.kill)
    this.width = width
    this.height = height
  }

  hop = async () => {
    const {
      host,
      port,
      proxy,
      readyTimeout,
      connectionHoppings
    } = this.initOptions
    if (!connectionHoppings || !connectionHoppings.length) {
      return proxy
        ? await proxySock({
          readyTimeout,
          host,
          port,
          proxy
        })
        : undefined
    }
    const [hop, ...rest] = connectionHoppings
    const fp = await getPort(12023)
    const initOpts = {
      connectionHoppings: rest,
      ...hop,
      cols: 80,
      rows: 24,
      term: 'xterm-256color',
      saveTerminalLogToFile: false,
      id: uid(),
      enableSsh: true,
      encode: 'utf-8',
      envLang: 'en_US.UTF-8',
      proxy,
      sessionId: uid(),
      sshTunnels: [
        {
          sshTunnel: 'dynamicForward',
          sshTunnelLocalHost: '127.0.0.1',
          sshTunnelLocalPort: fp,
          id: uid()
        }
      ]
    }
    this.ssh = await terminalSsh(initOpts)
    const proxyA = `socks5://127.0.0.1:${fp}`
    return proxySock({
      readyTimeout,
      host,
      port,
      proxy: proxyA
    })
  }

  onMsg = (msg) => {
    this.channel.write(msg)
  }

  onData = (data) => {
    try {
      this.ws?.send(data)
    } catch (e) {
      log.error('vnc connection send data error', e)
    }
  }

  resize () {

  }

  onError = (err) => {
    log.error('vnc error', err)
    this.kill()
  }

  test = async () => {
    return Promise.resolve(true)
  }

  kill = () => {
    log.debug('Closed vnc session ' + this.pid)
    if (this.ws) {
      this.ws.close()
      delete this.ws
    }
    if (this.ssh) {
      this.ssh.kill()
      delete this.ssh
    }
    this.channel && this.channel.end()
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
    }
    const inst = global.sessions[
      this.initOptions.sessionId
    ]
    if (!inst) {
      return
    }
    delete inst.terminals[this.pid]
    if (
      _.isEmpty(inst.terminals)
    ) {
      delete global.sessions[
        this.initOptions.sessionId
      ]
    }
  }
}

export const terminalVnc = async function (initOptions, ws) {
  const term = new TerminalVnc(initOptions, ws)
  await term.init()
  return term
}

/**
 * test ssh connection
 * @param {object} options
 */
export const testConnectionVnc = (options) => {
  return (new TerminalVnc(options, undefined, true))
    .test()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}