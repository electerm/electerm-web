/**
 * simple login with password only
 */

import {
  isDev,
  isMac,
  isWin,
  packInfo,
  home,
  extIconPath,
  defaultUserName,
  cwd
} from '../common/runtime-constants.js'
import { migrationNotice } from './fancy-console.js'
import fsFunctions from '../common/fs-functions.js'
import copy from 'json-deep-copy'
import { createToken } from './jwt.js'
import { logDir } from '../server/session-log.js'
import { resolve } from 'path'
import fs from 'fs'

let needMigrate

function buildServer () {
  return `http://${process.env.HOST}:${process.env.PORT}`
}

function checkNeedMigrate () {
  if (needMigrate !== undefined) {
    return needMigrate
  }

  const nedbPath = process.env.DB_PATH || resolve(cwd, 'data/nedb-database')
  const nedbUserPath = resolve(nedbPath, 'users', defaultUserName)

  // Check if nedb directory exists and has .nedb files
  if (fs.existsSync(nedbUserPath)) {
    const nedbFiles = fs.readdirSync(nedbUserPath).filter(file => file.endsWith('.nedb'))

    if (nedbFiles.length > 0) {
      needMigrate = true
      return needMigrate
    }
  }

  needMigrate = false
  return needMigrate
}

async function checkNodePty () {
  return import('node-pty')
    .then(() => true)
    .catch(() => false)
}

export async function index (req, res) {
  const server = process.env.SERVER || (isDev ? buildServer() : '')
  const cdn = process.env.CDN || server
  const hasNodePty = await checkNodePty()
  const needMigrate = checkNeedMigrate()
  if (needMigrate) {
    migrationNotice(
      'electerm-web v3',
      'nedb',
      'sqlite',
      'electerm-data-tool --data-path "/path/to/data/nedb-database" export data.json'
    )
  }
  const data = {
    isDev,
    isMac,
    isWin,
    packInfo,
    home,
    version: packInfo.version,
    siteName: packInfo.name,
    fsFunctions,
    isWebApp: true,
    extIconPath: cdn + extIconPath,
    cdn,
    sessionLogPath: logDir,
    query: req.query,
    server,
    hasNodePty,
    needMigrate
  }
  const {
    ENABLE_AUTH
  } = process.env
  if (!ENABLE_AUTH) {
    data.tokenElecterm = createToken()
  }
  data._global = copy(data)
  res.render('index', data)
}
