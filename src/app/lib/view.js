/**
 * simple login with password only
 */

import {
  isDev,
  isMac,
  isWin,
  packInfo,
  home,
  extIconPath
} from '../common/runtime-constants.js'
import fsFunctions from '../common/fs-functions.js'
import { loadDevStylus } from './style.js'
import copy from 'json-deep-copy'
import { createToken } from './jwt.js'
import { logDir } from '../server/session-log.js'

const stylus = loadDevStylus()

function buildServer () {
  return `http://${process.env.HOST}:${process.env.PORT}`
}

export function index (req, res) {
  const data = {
    stylus,
    isDev,
    isMac,
    isWin,
    packInfo,
    home,
    version: packInfo.version,
    siteName: packInfo.name,
    fsFunctions,
    isWebApp: true,
    extIconPath,
    sessionLogPath: logDir,
    server: process.env.SERVER || buildServer()
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
