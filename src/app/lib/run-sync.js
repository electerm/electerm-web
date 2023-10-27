/**
 * serial port lib
 */
import open from 'open'
import log from '../common/log.js'
import { toCss } from '../lib/style.js'
import { listItermThemes } from '../lib/iterm-theme.js'
import { listSerialPorts } from '../lib/serial-port.js'
import { dbAction } from '../lib/db.js'
import { encryptAsync, decryptAsync } from '../lib/enc.js'
import { loadFontList } from './font-list.js'
import { loadSshConfig } from './ssh-config.js'
import { saveUserConfig } from './user-config.js'
import { checkDbUpgrade, doUpgrade } from '../upgrade/index.js'
import { watchFile, unwatchFile } from './watch-file.js'
import lookup from './lookup.js'
import { init } from './init.js'

const globs = {
  encryptAsync,
  decryptAsync,
  showItemInFolder: (pth) => {
    return open(pth)
  },
  dbAction,
  lookup,
  watchFile,
  unwatchFile,
  listSerialPorts,
  checkDbUpgrade,
  doUpgrade,
  loadSshConfig,
  listItermThemes,
  toCss,
  init,
  initCommandLine: () => Promise.resolve(0),
  loadFontList,
  saveUserConfig,
  setWindowSize: () => Promise.resolve(1),
  getScreenSize: () => Promise.resolve({ width: 1920, height: 1080 })
}

export function runSync (ws, msg) {
  const {
    id,
    func,
    args = []
  } = msg
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
