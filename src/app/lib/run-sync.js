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
import {
  AIchat,
  AIchatWithTools,
  AIlistModels,
  getStreamContent,
  stopStream,
  abortAIRequest
} from './ai.js'
import {
  listWidgets,
  runWidget,
  stopWidget,
  runWidgetFunc,
  callWidgetFunc,
  importWidget,
  deleteWidget
} from '../widgets/load-widget.js'
import globalState from './global-state.js'
import { getEnv } from './get-constants.js'

const globs = {
  AIchat,
  AIchatWithTools,
  AIlistModels,
  getStreamContent,
  stopStream,
  abortAIRequest,
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
  },
  listWidgets,
  runWidget,
  stopWidget,
  runWidgetFunc,
  // user widgets: main-process functions their own UI calls, install and
  // uninstall of a widget folder
  callWidgetFunc,
  importWidget,
  deleteWidget,
  // macOS RDP with Control/Command swapped: on the desktop app a registered
  // app-menu accelerator would swallow Cmd+C/V/A/Z/X before the page sees the
  // keydown. A browser has no app menu, so there is nothing to disable here;
  // the stub exists so the renderer's call is not rejected as an unknown
  // function.
  setRdpSwapCtrlCmd: () => Promise.resolve(1),
  getPendingDeepLink: () => Promise.resolve(null),
  // the renderer asks for a .vv file handed to the OS during startup; only the
  // desktop app can receive one, so there is never anything pending here
  getPendingVvFile: () => Promise.resolve(null),
  getEnv: () => Promise.resolve(getEnv())
}

export function runSync (ws, msg) {
  const {
    id,
    func,
    args = []
  } = msg
  // Security: only dispatch to functions that are explicitly wired into
  // the globs object as own properties. Checking hasOwnProperty (instead of
  // a hand-maintained name list) means the allowlist can never drift from the
  // real exports, and it blocks prototype-chain pivots like 'constructor',
  // 'toString', '__proto__', 'hasOwnProperty' (CWE-863 / CWE-749).
  if (!Object.prototype.hasOwnProperty.call(globs, func) || typeof globs[func] !== 'function') {
    log.error('[security] blocked runSync call: ' + func)
    ws.s({
      error: {
        message: 'invalid function: ' + func,
        stack: ''
      },
      id
    })
    return
  }
  // Not every entry is async: importWidget/stopWidget return their result (or
  // throw) synchronously, the same way the desktop app's sync ipc channel does.
  // Going through a resolved promise first normalises both shapes, and keeps a
  // synchronous throw inside this handler instead of letting it escape into the
  // dispatcher and leave the renderer's promise unsettled forever.
  Promise.resolve()
    .then(() => globs[func](...args))
    .then(data => {
      ws.s({
        data,
        id: msg.id
      })
    })
    .catch(err => {
      log.error(id, func, args, err)
      // An Error instance does not survive JSON: it serialises to {} and the
      // renderer then rejects with "Error: undefined". Send the fields the
      // client actually reads, like the invalid-function reply above.
      ws.s({
        error: {
          message: err && err.message ? err.message : String(err),
          stack: err && err.stack ? err.stack : ''
        },
        id
      })
    })
}
