/**
 * log ssh output to file
 */

import { resolve, dirname } from 'path'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { cwd } from '../common/runtime-constants.js'

function mkdirP (resolvedPath) {
  if (!existsSync(resolvedPath)) {
    mkdirP(dirname(resolvedPath))
    mkdirSync(resolvedPath)
  }
}

const { DB_PATH } = process.env
const dataPath = DB_PATH || resolve(cwd, 'data')

export const logDir = resolve(dataPath, 'electerm_session_logs')

export class SessionLog {
  constructor (options) {
    const { logDir } = options
    const logPath = resolve(logDir, options.fileName)
    mkdirP(logDir)
    this.stream = createWriteStream(logPath)
  }

  write (text) {
    this.stream.write(text)
  }

  destroy () {
    this.stream.destroy()
  }
}
