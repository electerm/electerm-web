// window preload
// import { message } from 'antd'

window.api = {
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
  runSync: (func, ...args) => {
    if (func === 'isMaximized') {
      return false
    } if (func === 'isSencondInstance') {
      return false
    } else if (func === 'getLoadTime' || func === 'setLoadTime') {
      return 0
    }
    return window.wsFetch({
      action: 'runSync',
      args,
      func
    })
  }
}
