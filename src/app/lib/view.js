/**
 * simple login with password only
 */

import {
  isDev,
  isMac,
  isWin,
  packInfo,
  extIconPath
} from '../common/runtime-constants.js'
import fsFunctions from '../common/fs-functions.js'
import { loadDevStylus } from './style.js'
import copy from 'json-deep-copy'

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
    version: packInfo.version,
    siteName: packInfo.name,
    fsFunctions,
    isWebApp: true,
    extIconPath,
    server: process.env.SERVER || buildServer()
  }
  data._global = copy(data)
  res.render('index', data)
}
