import os from 'os'
import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'
import getJson from './get-json.js'

// Load .env here instead of relying on another module having done it already:
// BASE_PATH below is read at import time, and a plain `import` of this file can
// be evaluated before the app's own `dotenv` call runs (src/app/common/log.js
// imports this module, then calls config()). Without this, a BASE_PATH set in
// .env was silently ignored in production.
loadEnv()

export const cwd = process.cwd()

const platform = os.platform()
const arch = os.arch()
const { NODE_ENV, NODE_TEST } = process.env
export const home = os.homedir()
export const sshKeysPath = resolve(
  home,
  '.ssh'
)
export const isWin = platform === 'win32'
export const isMac = platform === 'darwin'
export const isLinux = platform === 'linux'
export const isArm = arch.includes('arm')
export const isDev = NODE_ENV === 'development'

// Optional sub-path the web app is served under behind a reverse proxy
// (e.g. `BASE_PATH=electerm` -> https://host/electerm/). Normalized to "" when
// unset/root, otherwise "/electerm" style (leading slash, no trailing slash).
export function normalizeBasePath (p) {
  const s = String(p || '').trim().replace(/^\/+|\/+$/g, '')
  return s ? '/' + s : ''
}

export const basePath = normalizeBasePath(process.env.BASE_PATH)

export const iconPath = resolve(
  cwd,
  isDev
    ? 'node_modules/@electerm/electerm-resource/res/imgs/electerm-round-128x128.png'
    : 'dist/assets/images/electerm-round-128x128.png'
)
export const extIconPath = isDev
  ? '/node_modules/electerm-icons/icons/'
  : '/icons/'
export const defaultUserName = 'default_user'
export const minWindowWidth = 320
export const minWindowHeight = 400
export const defaultLang = 'en_us'
export const tempDir = os.tmpdir()
export const homeOrTmp = os.homedir() || os.tmpdir()
export const packInfo = getJson(
  resolve(cwd, 'package.json')
)
export const isTest = !!NODE_TEST
