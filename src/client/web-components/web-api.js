// window preload
// import { message } from 'antd'

window.api = {
  getZoomFactor: () => 1,
  setZoomFactor: (nl) => {
    // message.info('Set ZoomFactor not supported')
  },
  openDialog: (opts) => {
    // todo
  },
  ipcOnEvent: (event, cb) => {

  },
  ipcOffEvent: (event, cb) => {

  },
  runGlobalAsync: async (func, ...args) => {
    if (func === 'setTitle') {
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
