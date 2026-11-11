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

window.et.buildWsUrl = (
  host,
  port,
  tokenElecterm,
  id,
  type = 'terminals',
  extra = ''
) => {
  // The ws has to hit the origin (and sub-path) the page was served from, never
  // the page's full href: that one still carries the query string and the hash.
  const raw = (isDev && window.et.server) || window.location.href
  let origin = `${host}:${port}`
  let secure = window.location.protocol === 'https:'
  try {
    const u = new URL(raw, window.location.href)
    origin = u.host || origin
    secure = u.protocol === 'https:'
  } catch (e) {}
  const pre = secure ? 'wss' : 'ws'
  return `${pre}://${origin}${basePath}/${type}/${id}?token=${tokenElecterm}${extra}`
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
  if (!window.et.isDev) {
    window.worker.postMessage({
      action: 'init-url',
      url: window.location.href
    })
  }
  loadScript()
}

// window.addEventListener('load', load)
load()
