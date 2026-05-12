/**
 * ipc main
 */

import * as constants from '../common/runtime-constants.js'
import { transferKeys } from '../server/transfer.js'
import fs from 'fs'
import os from 'os'
import _ from 'lodash'
import { sep } from 'path'
import { getConfig } from './init.js'
import copy from 'json-deep-copy'
const allowList = new Set([
  'HOME', 'USER', 'USERNAME', 'LOGNAME',
  'SHELL', 'TERM', 'LANG', 'LC_ALL', 'LC_CTYPE',
  'TZ', 'PATH', 'TMPDIR', 'TEMP', 'TMP',
  'XDG_RUNTIME_DIR', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME',
  'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH'
])

export function getEnv (key) {
  const safeEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => allowList.has(k))
  )
  return key ? safeEnv[key] : safeEnv
}

export async function getConstants (req, res) {
  const config = await getConfig(true)
  const data = {
    osInfoData: (() => {
      return Object.keys(os).map((k, i) => {
        const vf = os[k]
        if (!_.isFunction(vf)) {
          return null
        }
        let v
        try {
          v = vf()
        } catch (e) {
          return null
        }
        if (!v) {
          return null
        }
        v = JSON.stringify(v, null, 2)
        return { k, v }
      }).filter(d => d)
    })(),
    config,
    sep,
    fsConstants: fs.constants,
    ...constants,
    env: (() => {
      return Object.fromEntries(
        Object.entries(process.env).filter(([k]) => allowList.has(k))
      )
    })(),
    versions: copy(process.versions),
    transferKeys
  }
  res.send(
    data
  )
}
