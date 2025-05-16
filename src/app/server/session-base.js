/**
 * terminal/sftp/serial class
 */
import uid from '../common/uid.js'
import { createLogFileName } from '../common/create-session-log-file-path.js'
import { SessionLog } from './session-log.js'
import globalState from './global-state.js'

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
