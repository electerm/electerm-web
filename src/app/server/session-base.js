/**
 * terminal/sftp/serial class
 */
import uid from '../common/uid.js'
import { createLogFileName } from '../common/create-session-log-file-path.js'
import { SessionLog } from './session-log.js'
import _ from 'lodash'
import globalState from './global-state.js'

export class TerminalBase {
  constructor (initOptions, ws, isTest) {
    this.type = initOptions.termType || initOptions.type
    this.pid = initOptions.uid || uid()
    this.initOptions = initOptions
    if (initOptions.saveTerminalLogToFile) {
      this.sessionLogger = new SessionLog({
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
        fileName: createLogFileName(this.initOptions.logName)
      })
    }
  }

  onEndConn () {
    const inst = globalState.getSession(this.initOptions.sessionId)
    if (!inst) {
      return
    }
    if (this.ws) {
      delete this.ws
    }
    delete inst.sftps[this.pid]
    delete inst.terminals[this.pid]
    if (this.server && this.server.end) {
      this.server.end()
    }
    if (
      _.isEmpty(inst.sftps) &&
      _.isEmpty(inst.terminals)
    ) {
      this.endConns && this.endConns()
      globalState.removeSession(this.initOptions.sessionId)
    }
  }
}
