/**
 * serial port lib
 */
import log from '../common/log.js'
import { listItermThemes } from '../lib/iterm-theme.js'
import { listSerialPorts } from '../lib/serial-port.js'
import { dbAction } from './db.js'
import { encryptAsync, decryptAsync } from '../lib/enc.js'
import { loadFontList } from './font-list.js'
import { loadSshConfig } from './ssh-config.js'
import { saveUserConfig } from './user-config.js'
import { checkDbUpgrade, doUpgrade } from '../upgrade/index.js'
import { watchFile, unwatchFile } from './watch-file.js'
import lookup from './lookup.js'
import { init } from './init.js'
import { showItemInFolder } from './show-item-in-folder.js'
import { AIchat, getStreamContent } from './ai.js'
import globalState from './global-state.js'

const globs = {
  AIchat,
  getStreamContent,
  encryptAsync,
  decryptAsync,
  showItemInFolder,
  dbAction,
  lookup,
  watchFile,
  unwatchFile,
  listSerialPorts,
  checkDbUpgrade,
  doUpgrade,
  loadSshConfig,
  listItermThemes,
  init,
  initCommandLine: () => Promise.resolve(0),
  getInitTime: () => {
    return globalState.get('initTime')
  },
  loadFontList,
  saveUserConfig,
  registerDeepLink: () => Promise.resolve(1),
  setWindowSize: () => Promise.resolve(1),
  getScreenSize: () => Promise.resolve({ width: 1920, height: 1080 }),
  checkMigrate: () => Promise.resolve(false),
  setBackgroundColor: () => {
    return Promise.resolve(1)
  }
}

export function runSync (ws, msg) {
  const {
    id,
    func,
    args = []
  } = msg
  // console.log('runSync', func, args)
  globs[func](...args)
    .then(data => {
      ws.s({
        data,
        id: msg.id
      })
    })
    .catch(err => {
      log.error(id, func, args, err)
      ws.s({
        error: err,
        id
      })
    })
}
