/**
 * init app data then write main script to html body
 */
import '../electerm-react/css/basic.styl'
import '../web-components/style-overide.styl'
import '../electerm-react/css/mobile.styl'
import '../web-components/web-api.js'
import '../web-components/web-pre.js'
import { get as _get } from 'lodash-es'

const { isDev, version, cdn } = window.et
const basePath = window.et.basePath || ''

// Session cookies belong to the page host. In development only the port
// changes because the Vite server proxies HTTP and the app handles upgrades.
function socketRoot (port) {
  const url = new URL(window.location.origin)
  if (isDev && (port || window.et.serverPort)) url.port = port || window.et.serverPort
  url.pathname = basePath
  return url
}

window.et.buildWsUrl = (
  _host,
  port,
  _legacyToken,
  id,
  type = 'terminals',
  extra = ''
) => {
  const url = socketRoot(port)
  const pre = url.protocol === 'https:' ? 'wss' : 'ws'
  const query = extra.replace(/^[?&]/, '')
  return `${pre}://${url.host}${basePath}/${type}/${id}${query ? '?' + query : ''}`
}

async function loadWorker () {
  return new Promise((resolve) => {
    const url = !isDev ? cdn + `/js/worker-${version}.js` : cdn + '/js/worker.js'
    window.worker = new window.Worker(url)
    function onInit (e) {
      if (!e || !e.data) {
        return false
      }
      const {
        action
      } = e.data
      if (action === 'worker-init') {
        window.worker.removeEventListener('message', onInit)
        resolve(1)
      }
    }
    window.worker.addEventListener('message', onInit)
  })
}

async function load () {
  window.capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  function loadScript () {
    const rcs = document.createElement('script')
    const url = !isDev ? cdn + `/js/electerm-${version}.js` : cdn + '/js/electerm.js'
    rcs.src = url
    rcs.type = 'module'
    rcs.onload = () => {
      const loadingEl = document.getElementById('content-loading')
      if (loadingEl) {
        document.body.removeChild(loadingEl)
      }
    }
    document.body.appendChild(rcs)
  }
  window.getLang = (lang = window.store?.config.language || 'en_us') => {
    return _get(window.langMap, `[${lang}].lang`)
  }
  window.translate = txt => {
    const lang = window.getLang()
    const str = _get(lang, `[${txt}]`) || txt
    return window.capitalizeFirstLetter(str)
  }
  await loadWorker()
  window.worker.addEventListener('message', event => {
    if (event.data?.action === 'session-ended') window.location.reload()
  })
  window.worker.postMessage({
    action: 'init-url',
    url: socketRoot().href
  })
  loadScript()
}

// window.addEventListener('load', load)
load()
