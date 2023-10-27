/**
 * log ssh output to file
 */

import { resolve } from 'path'
import { createWriteStream } from 'fs'
import { cwd } from '../common/runtime-constants.js'

const { SESSION_LOG_PATH } = process.env
const logDir = SESSION_LOG_PATH || resolve(cwd, 'electerm_session_logs')

export class SessionLog {
  constructor (options) {
    this.options = options
    const logPath = resolve(logDir, options.fileName)
    this.stream = createWriteStream(logPath)
  }

  write (text) {
    this.stream.write(text)
  }

  destroy () {
    this.stream.destroy()
  }
}
