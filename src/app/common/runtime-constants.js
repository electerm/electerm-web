import os from 'os'
import { resolve } from 'path'
import getJson from './get-json.js'

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
export const iconPath = resolve(
  cwd,
  isDev
    ? 'node_modules/@electerm/electerm-resource/res/imgs/electerm-round-128x128.png'
    : 'dist/assets/images/electerm-round-128x128.png'
)
export const extIconPath = isDev
  ? '/node_modules/vscode-icons/icons/'
  : '/icons/'
export const defaultUserName = 'default_user'
export const minWindowWidth = 590
export const minWindowHeight = 400
export const defaultLang = 'en_us'
export const tempDir = os.tmpdir()
export const homeOrTmp = os.homedir() || os.tmpdir()
export const packInfo = getJson(
  resolve(cwd, 'package.json')
)
export const isTest = !!NODE_TEST
