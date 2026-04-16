/**
 * terminal/sftp/serial class
 */
import uid from '../common/uid.js'
import { createLogFileName } from '../common/create-session-log-file-path.js'
import { SessionLog } from './session-log.js'
import globalState from './global-state.js'
import time from '../common/time.js'
import pkg from '@xterm/headless'
const { Terminal } = pkg

function createVtParser (cols = 220) {
  const term = new Terminal({ cols, rows: 50, allowProposedApi: true })
  return term
}

export class TerminalBase {
  constructor (initOptions, ws, isTest) {
    this.type = initOptions.termType || initOptions.type
    this.pid = initOptions.uid || uid()
    this.initOptions = initOptions
    if (initOptions.saveTerminalLogToFile) {
      this.sessionLogger = new SessionLog({
        logDir: initOptions.sessionLogPath,
        fileName: createLogFileName(initOptions.logName)
      })
      this._initVtParser()
    }
    if (ws) {
      this.ws = ws
    }
    if (isTest) {
      this.isTest = isTest
    }
  }

  cache = ''
  prevNewLine = true
  _initVtParser () {
    this._vtTerm = createVtParser(this.initOptions.cols || 220)
    this._vtLastRow = 0
    this._vtTerm.onLineFeed(() => {
      if (!this.sessionLogger) return
      const buffer = this._vtTerm.buffer.active
      const row = buffer.baseY + buffer.cursorY - 1
      if (row < 0) return
      const line = buffer.getLine(row)
      if (!line) return
      const text = line.translateToString(true)
      const dt = this.initOptions.addTimeStampToTermLog
        ? `[${time()}] `
        : ''
      this.sessionLogger.write(dt + text + '\n')
    })
  }

  parse (rawText) {
    let result = ''
    const len = rawText.length
    for (let i = 0; i < len; i++) {
      if (rawText[i] === '\b') {
        result = result.slice(0, -1)
      } else {
        result += rawText[i]
      }
    }
    return result
  }

  writeLog (data) {
    if (!this.sessionLogger || !this._vtTerm) {
      return
    }
    this._vtTerm.write(data)
  }

  toggleTerminalLogTimestamp () {
    this.initOptions.addTimeStampToTermLog = !this.initOptions.addTimeStampToTermLog
  }

  toggleTerminalLog () {
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
      delete this.sessionLogger
      if (this._vtTerm) {
        this._vtTerm.dispose()
        delete this._vtTerm
      }
    } else {
      this.sessionLogger = new SessionLog({
        logDir: this.initOptions.sessionLogPath,
        fileName: createLogFileName(this.initOptions.logName)
      })
      this._initVtParser()
    }
  }

  onEndConn () {
    const {
      pid
    } = this
    const inst = globalState.getSession(pid)
    if (!inst) {
      return
    }
    if (this.ws) {
      delete this.ws
    }
    if (this._vtTerm) {
      this._vtTerm.dispose()
      delete this._vtTerm
    }
    if (this.server && this.server.end) {
      this.server.end()
    }
    globalState.removeSession(pid)
  }
}
