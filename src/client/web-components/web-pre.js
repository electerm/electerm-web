import * as path from './path.js'

const {
  ipcOnEvent,
  ipcOffEvent,
  runGlobalAsync,
  getZoomFactor,
  setZoomFactor,
  runSync
} = window.api

// Encoding function
function encodeUint8Array (uint8Array) {
  let str = ''
  const len = uint8Array.byteLength

  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(uint8Array[i])
  }

  return btoa(str)
}

// Decoding function
function decodeBase64String (base64String) {
  const str = atob(base64String)
  const len = str.length

  const uint8Array = new Uint8Array(len)

  for (let i = 0; i < len; i++) {
    uint8Array[i] = str.charCodeAt(i)
  }

  return uint8Array
}

window.log = window.console

window.pre = {
  resolve: (...args) => {
    return path.resolve(...args.map(d => d || ''))
  },
  transferKeys: [
    'pause',
    'resume',
    'destroy'
  ],
  osInfo: () => { return window.pre.osInfoData },
  extIconPath: window.et.extIconPath,
  readClipboard: () => {
    return window.et.clipboard || ''
  },

  writeClipboard: str => {
    window.et.clipboard = str
  },
  // readClipboard: function readClipboard () {
  //   if (!navigator.clipboard) {
  //     message.error('Clipboard API not available')
  //     return ''
  //   }
  //   try {
  //     return navigator.clipboard.readText()
  //   } catch (err) {
  //     message.error('Failed to read clipboard: ' + err.message)
  //   }
  // },

  // writeClipboard: function writeClipboard (str) {
  //   if (!navigator.clipboard) {
  //     message.error('Clipboard API not available')
  //     return
  //   }
  //   try {
  //     return navigator.clipboard.writeText(str)
  //   } catch (err) {
  //     message.error('Failed to copy text: ' + err)
  //   }
  // },
  showItemInFolder: (href) => runSync('showItemInFolder', href),
  ipcOnEvent,
  ipcOffEvent,
  getZoomFactor,
  setZoomFactor,
  openExternal: (url) => {
    window.open(url, '_blank')
  },
  runSync,
  runGlobalAsync
}

const fs = {
  stat: (path, cb) => {
    window.fs.statCustom(path)
      .catch(err => cb(err))
      .then(obj => {
        obj.isDirectory = () => obj.isD
        obj.isFile = () => obj.isF
        cb(undefined, obj)
      })
  },
  access: (...args) => {
    const cb = args.pop()
    window.fs.access(...args)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  open: (...args) => {
    const cb = args.pop()
    window.fs.openCustom(...args)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  read: (p1, arr, ...args) => {
    const cb = args.pop()
    window.fs.readCustom(
      p1,
      encodeUint8Array(arr),
      ...args
    )
      .then((data) => {
        const { n, newArr } = data
        const newArr1 = decodeBase64String(newArr)
        cb(undefined, n, newArr1)
      })
      .catch(err => cb(err))
  },
  close: (fd, cb) => {
    window.fs.closeCustom(fd)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  readdir: (p, cb) => {
    window.fs.readdir(p)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  mkdir: (...args) => {
    const cb = args.pop()
    window.fs.mkdir(...args)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  write: (p1, buf, cb) => {
    window.fs.writeCustom(p1, encodeUint8Array(buf))
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  },
  realpath: (p, cb) => {
    window.fs.realpath(p)
      .then((data) => cb(undefined, data))
      .catch((err) => cb(err))
  }
}

window.reqs = {
  path,
  fs
}

function require (name) {
  return window.reqs[name]
}

require.resolve = name => name

window.require = require
