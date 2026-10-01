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
import { getLogDir } from '../widgets/instance-log.js'
import { resolve } from 'path'
import fs from 'fs'

const defaultAIPreset = {
  baseURLAI: 'https://ai.electerm.org/api/ai',
  apiPathAI: '/chat/completions',
  modelAI: 'free',
  authHeaderNameAI: 'Authorization: Bearer',
  id: 'ai.electerm.org',
  nameAI: 'ai.electerm.org'
}

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
  if (process.env.DISABLE_LOCAL_TERMINAL) {
    return false
  }
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
  // eg: window.et.sysMenus = ['onNewSsh', 'bookmarks', 'openSetting', 'close']
  // available keys: onNewSsh, addTab, bookmarks, history, sessions, layout,
  // openAbout, openSetting, openDevTools, zoom, minimize, maximize, reload,
  // onCheckUpdate, restart, close
  const data = {
    isDev,
    isMac,
    isWin,
    packInfo,
    home,
    version: packInfo.version,
    siteName: packInfo.name,
    defaultAIPreset,
    fsFunctions,
    isWebApp: true,
    disableUpgradeCheck: true,
    extIconPath: cdn + extIconPath,
    cdn,
    sessionLogPath: logDir,
    // where running widgets write their logs; the widget manager reads them
    // straight off disk (see widgets/instance-log.js).
    // Exposed as window.et.widgetLogPath, mirroring sessionLogPath above.
    widgetLogPath: getLogDir(),
    query: req.query,
    server,
    hasNodePty,
    needMigrate,
    sysMenus: [
      'onNewSsh',
      'addTab',
      'openSetting',
      'history',
      'bookmarks',
      'sessions',
      'layout',
      'openAbout',
      'zoom',
      'reload'
    ]
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
