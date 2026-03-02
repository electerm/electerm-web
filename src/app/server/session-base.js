/**
 * terminal/sftp/serial class
 */
import uid from '../common/uid.js'
import { createLogFileName } from '../common/create-session-log-file-path.js'
import { SessionLog } from './session-log.js'
import globalState from './global-state.js'
import time from '../common/time.js'
import stripAnsi from '@electerm/strip-ansi'

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

  writeLog (data) {
    if (!this.sessionLogger) {
      return
    }
    const s = data.toString()
    if (!s.includes('\r\n')) {
      this.cache += s
      return
    }
    const p = this.parse(this.cache)
    const dt = this.prevNewLine && this.initOptions.addTimeStampToTermLog
      ? `[${time()}] `
      : ''
    const str = stripAnsi(dt + p + s)
    this.sessionLogger.write(str)
    this.cache = ''
    this.prevNewLine = str.endsWith('\n')
  }

  toggleTerminalLogTimestamp () {
    this.initOptions.addTimeStampToTermLog = !this.initOptions.addTimeStampToTermLog
  }

  toggleTerminalLog () {
    if (this.sessionLogger) {
      this.sessionLogger.destroy()
      delete this.sessionLogger
    } else {
      this.sessionLogger = new SessionLog({
        logDir: this.initOptions.sessionLogPath,
        fileName: createLogFileName(this.initOptions.logName)
      })
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
    if (this.server && this.server.end) {
      this.server.end()
    }
    globalState.removeSession(pid)
  }
}
