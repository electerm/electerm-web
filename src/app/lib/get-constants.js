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
  'SHELL', 'TERM', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'COLORTERM',
  'LANG', 'LC_ALL', 'LC_CTYPE', 'LC_TERMINAL', 'LC_TERMINAL_VERSION',
  'HOME', 'USER', 'LOGNAME', 'USERNAME',
  'PATH', 'PATHEXT',
  'TMPDIR', 'TMP', 'TEMP',
  'DISPLAY', 'WAYLAND_DISPLAY', 'XDG_SESSION_TYPE', 'XDG_RUNTIME_DIR',
  'XDG_DATA_DIRS', 'XDG_CONFIG_DIRS', 'XDG_CURRENT_DESKTOP', 'XDG_SEAT', 'XDG_VTNR',
  'SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'SSH_CLIENT', 'SSH_CONNECTION', 'SSH_TTY',
  'NODE_PATH', 'NODE_ENV', 'NVM_DIR', 'NVM_BIN',
  'NPM_CONFIG_PREFIX', 'NPM_CONFIG_CACHE',
  'GIT_EDITOR', 'GIT_PAGER', 'GIT_TERMINAL_PROMPT',
  'EDITOR', 'VISUAL', 'PAGER',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'APPDATA', 'LOCALAPPDATA', 'ProgramFiles', 'ProgramFiles(x86)', 'CommonProgramFiles',
  'ComSpec', 'SystemRoot', 'SystemDrive', 'USERPROFILE', 'USERDOMAIN',
  'COMPUTERNAME', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS',
  'Apple_PubSub_Socket_Render',
  'DBUS_SESSION_BUS_ADDRESS', 'DESKTOP_SESSION', 'GNOME_DESKTOP_SESSION_ID', 'KDE_FULL_SESSION',
  'CI', 'DOCKER_HOST', 'CONTAINER'
])

export function getEnv (key) {
  if (key) {
    if (!allowList.has(key)) {
      return ''
    }
    return process.env[key]
  }
  return Object.fromEntries(
    Object.entries(process.env).filter(([k]) => allowList.has(k))
  )
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
