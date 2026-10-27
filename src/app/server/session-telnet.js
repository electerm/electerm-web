/**
 * terminal/sftp/serial class
 */
import _ from 'lodash'
import log from '../common/log.js'
import { Telnet } from './telnet.js'
import { createRxConverter, convertTx } from './line-ending.js'
import { TerminalBase } from './session-base.js'
import globalState from './global-state.js'
import iconv from 'iconv-lite'

// Encodings that are equivalent to UTF-8 (no conversion needed)
const utf8Aliases = new Set(['utf-8', 'utf8', 'utf-8-strict'])

// Helper function to convert regex string to RegExp object
function stringToRegExp (regexString) {
  // Check if it's already a RegExp
  if (regexString instanceof RegExp) {
    return regexString
  }

  // Parse string format like /pattern/flags
  const match = regexString.match(/^\/(.+)\/([gimsuy]*)$/)
  if (match) {
    const [, pattern, flags] = match
    return new RegExp(pattern, flags)
  }

  // If no slashes, treat as plain pattern
  return new RegExp(regexString)
}

class TerminalTelnet extends TerminalBase {
  async init () {
    const connection = new Telnet()

    const { initOptions } = this
    // Telnet to a serial port server has no line discipline anywhere in the
    // path, so the same two knobs the serial session has apply here (#4649)
    this.txLineEnding = initOptions.txLineEnding || '\r'
    this.rxConverter = createRxConverter(initOptions.rxLineEnding)
    const shellOpts = {
      highWaterMark: 64 * 1024 * 16
    }
    const params = _.pick(
      initOptions,
      [
        'host',
        'port',
        'timeout',
        'username',
        'password',
        'terminalWidth',
        'terminalHeight',
        'proxy'
      ]
    )
    // Convert string regex patterns to RegExp objects
    if (typeof initOptions.loginPrompt === 'string') {
      params.loginPrompt = stringToRegExp(initOptions.loginPrompt)
    }
    if (typeof initOptions.passwordPrompt === 'string') {
      params.passwordPrompt = stringToRegExp(initOptions.passwordPrompt)
    }
    Object.assign(
      params,
      {
        negotiationMandatory: false,
        // terminalWidth: initOptions.cols,
        // terminalHeight: initOptions.rows,
        timeout: initOptions.readyTimeout,
        sendTimeout: initOptions.readyTimeout,
        socketConnectOptions: shellOpts
      }
    )
    await connection.connect(params)
    this.port = connection.shell(shellOpts)
    this.channel = connection
    if (this.isTest) {
      this.kill()
      return true
    }
    globalState.setSession(this.pid, this)
  }

  resize (cols, rows) {
    if (!this.channel) {
      return
    }
    Object.assign(this.channel.options, {
      terminalWidth: cols,
      terminalHeight: rows
    })
    this.channel.sendWindowSize()
  }

  on (event, cb) {
    if (event === 'data' && this.rxConverter) {
      const wrapper = (data) => {
        const isBuffer = Buffer.isBuffer(data)
        const str = isBuffer ? data.toString('latin1') : String(data)
        const converted = this.rxConverter(str)
        cb(isBuffer ? Buffer.from(converted, 'latin1') : converted)
      }
      // off() is always called with the original callback, never the wrapper,
      // so the wrapper has to be remembered to detach it on close
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
      return
    }
    this.port.on(event, cb)
  }

  off = (event, cb) => {
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
      this.port?.removeListener?.(event, cb)
    } catch (_) {
      // ignore removal errors during teardown
    }
  }

  write (data) {
    try {
      const encode = this.initOptions?.encode
      const isBuffer = Buffer.isBuffer(data)
      const str = convertTx(
        isBuffer ? data.toString('latin1') : String(data),
        this.txLineEnding
      )
      if (encode && !utf8Aliases.has(encode.toLowerCase()) && !isBuffer) {
        try {
          this.port.write(iconv.encode(str, encode))
          if (this.sessionLogger) {
            this.sessionLogger.write(data)
          }
          return
        } catch (e) {
          log.warn('iconv encode failed, falling back to raw write:', e.message)
        }
      }
      this.port.write(isBuffer ? Buffer.from(str, 'latin1') : str)
      if (this.sessionLogger) {
        this.sessionLogger.write(data)
      }
    } catch (e) {
      log.error(e)
    }
  }

  kill = () => {
    this.channel && this.channel.end()
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
    }
    globalState.removeSession(this.pid)
  }
}

export const terminalTelnet = async function (initOptions, ws) {
  const term = new TerminalTelnet(initOptions, ws)
  await term.init()
  return term
}

/**
 * test ssh connection
 * @param {object} options
 */
export const testConnectionTelnet = (options) => {
  return (new TerminalTelnet(options, undefined, true))
    .init()
    .then(() => true)
    .catch(() => {
      return false
    })
}

export const terminal = terminalTelnet
export const testConnection = testConnectionTelnet
