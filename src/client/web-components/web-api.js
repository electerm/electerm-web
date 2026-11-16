// window preload
// import { message } from 'antd'
import { detectLanguage } from './detect-language.js'

// A same-origin server path has to carry the optional sub-path the app is
// served under (BASE_PATH, e.g. /electerm). One helper, so a new absolute path
// added anywhere in the client does not silently break sub-path deployments.
// Absolute urls (another origin) are left alone.
window.et.url = (url = '') => {
  const base = window.et.basePath || ''
  if (!base || !url.startsWith('/') || url.startsWith(base + '/')) {
    return url
  }
  return base + url
}

// Server -> client events: the web counterpart of the desktop app's ipc
// listeners. The desktop main process pushes on `ipcOnEvent(name, cb)`; here the
// same name arrives as a {type: name, payload} message on the common socket.
// Nothing else in the web app needs it yet, only the widget css push (see
// common/widget-style-host.js), so only named messages are dispatched and
// everything else on that socket is left to its own handler.
const ipcHandlers = new Map()
let commonWs = null

function onCommonWsMessage (e) {
  if (typeof e.data !== 'string' || e.data.charAt(0) !== '{') {
    return
  }
  let msg
  try {
    msg = JSON.parse(e.data)
  } catch (err) {
    return
  }
  const list = msg && msg.type && ipcHandlers.get(msg.type)
  if (!list || !list.size) {
    return
  }
  const payload = Object.prototype.hasOwnProperty.call(msg, 'payload')
    ? msg.payload
    : msg
  list.forEach(fn => {
    try {
      fn({}, payload)
    } catch (err) {
      console.error(`ipc event ${msg.type} handler fails:`, err)
    }
  })
}

function bindCommonWs (ws) {
  if (!ws || ws === commonWs) {
    return
  }
  if (commonWs) {
    try {
      commonWs.removeEventListener('message', onCommonWsMessage)
    } catch (e) {}
  }
  commonWs = ws
  keepEveryListener(ws)
  ws.addEventListener('message', onCommonWsMessage)
}

// The shared client re-registers only its *last* listener when a persistent
// socket reconnects (`addEventListener()` with no argument, see
// electerm-react/common/ws.js): the worker builds a fresh listener map on the
// new socket, so every earlier listener -- the MCP bridge among them -- was
// silently dropped for good. Remember the ones we see and replay them all on
// that no-argument call.
function keepEveryListener (ws) {
  if (typeof ws.addEventListener !== 'function' || ws.__electermKeepAll) {
    return
  }
  ws.__electermKeepAll = true
  const registered = []
  if (typeof ws.cb === 'function') {
    registered.push({ type: 'message', cb: ws.cb })
  }
  const add = ws.addEventListener
  ws.addEventListener = function (...args) {
    if (!args.length) {
      // reconnect: restore every listener we know about, not just the last
      registered.forEach(({ type, cb }) => {
        try {
          add.call(this, type, cb)
        } catch (e) {
          console.error('Failed to restore ws listener:', e)
        }
      })
      return
    }
    const [type = 'message', cb = this.cb] = args
    if (typeof cb === 'function' && !registered.some(e => e.cb === cb)) {
      registered.push({ type, cb })
    }
    return add.call(this, type, cb)
  }
}

// The shared client assigns `window.et.commonWs` once its socket is open
// (electerm-react/common/fetch-from-server.js), which can be after a handler is
// registered. Hook the assignment instead of polling for it.
try {
  Object.defineProperty(window.et, 'commonWs', {
    configurable: true,
    enumerable: true,
    get: () => commonWs,
    set: (ws) => bindCommonWs(ws)
  })
} catch (e) {
  console.error('Failed to hook window.et.commonWs:', e)
}

window.api = {
  fetch: (url, options = {}) => {
    const headers = {
      token: window.store?.config.tokenElecterm,
      ...options.headers
    }
    return window.fetch(window.et.url(url), { ...options, headers })
      .then(res => {
        if (res.status > 304) {
          return res.json()
            .catch(() => ({}))
            .then(data => {
              throw new Error(data.error || `Request failed (${res.status})`)
            })
        }
        return res
      })
  },
  getZoomFactor: () => 1,
  setZoomFactor: (nl) => {
    // message.info('Set ZoomFactor not supported')
  },
  openDialog: (opts) => {
    return new Promise((resolve, reject) => {
      window.et.handleDialogEvent = (e) => {
        if (e?.data?.type === 'handleDialog') {
          window.removeEventListener('message', window.et.handleDialogEvent)
          delete window.et.handleDialogEvent
          resolve(e.data.data)
        } else if (e?.data?.type === 'closeDialog') {
          window.removeEventListener('message', window.et.handleDialogEvent)
          delete window.et.handleDialogEvent
          resolve(false)
        }
      }
      window.addEventListener('message', window.et.handleDialogEvent)
      window.postMessage({
        type: 'openDialog',
        data: opts
      }, '*')
    })
  },
  saveDialog: (opts) => {
    return new Promise((resolve, reject) => {
      window.et.handleSaveDialogEvent = (e) => {
        if (e?.data?.type === 'handleSaveDialog') {
          window.removeEventListener('message', window.et.handleSaveDialogEvent)
          delete window.et.handleSaveDialogEvent
          resolve(e.data.data)
        } else if (e?.data?.type === 'closeSaveDialog') {
          window.removeEventListener('message', window.et.handleSaveDialogEvent)
          delete window.et.handleSaveDialogEvent
          resolve({ canceled: true, filePath: '' })
        }
      }
      window.addEventListener('message', window.et.handleSaveDialogEvent)
      window.postMessage({
        type: 'saveDialog',
        data: opts
      }, '*')
    })
  },
  ipcOnEvent: (event, cb) => {
    if (typeof event !== 'string' || typeof cb !== 'function') {
      return
    }
    const list = ipcHandlers.get(event) || new Set()
    list.add(cb)
    ipcHandlers.set(event, list)
    bindCommonWs(commonWs)
  },
  ipcOffEvent: (event, cb) => {
    const list = ipcHandlers.get(event)
    if (!list) {
      return
    }
    list.delete(cb)
    if (!list.size) {
      ipcHandlers.delete(event)
    }
  },
  runGlobalAsync: async (func, ...args) => {
    if (func === 'initCommandLine') {
      try {
        const { init } = window.et.query
        return init ? JSON.parse(window.et.query.init) : null
      } catch (err) {
        console.log('initCommandLine error:', err)
      }
    } else if (func === 'setTitle') {
      document.title = args[0]
      return
    } else if (func === 'openNewInstance') {
      return window.open(args[0], '_blank')
    } else if (func === 'closeApp') {
      return window.close()
    } else if (func === 'restart') {
      return window.location.reload()
    } else if (func === 'init') {
      const d = await window.wsFetch({
        action: 'runSync',
        args,
        func
      })
      d.config.tokenElecterm = window.localStorage.getItem('tokenElecterm') || ''
      // No `language` in the stored config means nobody has picked one yet, so
      // the browser answers for itself -- works the same whether the page was
      // rendered by the server or is a prebuilt static index.html. The picked
      // id is written back with the rest of the config right after load
      // (store/watch.js), so this runs on the first open only and a later
      // choice in the settings always wins.
      if (!d.config.language) {
        d.config.language = detectLanguage(
          navigator.languages || navigator.language,
          d.langs
        )
      }
      return d
    }
    return window.wsFetch({
      action: 'runSync',
      args,
      func
    })
  },
  sendMcpResponse: data => {
    window.et.commonWs.s({
      type: 'mcp-response-back',
      ...data
    })
  },
  runSync: (func, ...args) => {
    if (func === 'isMaximized') {
      return false
    } else if (func === 'isSecondInstance') {
      return false
    } else if (func === 'windowMove') {
      return false
    } else if (func === 'getLoadTime' || func === 'setLoadTime') {
      return 0
    } else if (func === 'getInitTime') {
      if (window.et.initTime !== undefined) {
        return window.et.initTime
      } else {
        window.et.initTime = Date.now()
        return window.et.initTime
      }
    } else if (func === 'nodePtyCheck') {
      return window.et.hasNodePty
    }
    return window.wsFetch({
      action: 'runSync',
      args,
      func
    })
  }
}
