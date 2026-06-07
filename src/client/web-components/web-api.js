// window preload
// import { message } from 'antd'

window.api = {
  fetch: (url, options = {}) => {
    const headers = {
      token: window.store?.config.tokenElecterm,
      ...options.headers
    }
    return window.fetch(url, { ...options, headers })
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

  },
  ipcOffEvent: (event, cb) => {

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
