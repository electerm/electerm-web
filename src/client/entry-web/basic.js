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
  document.body.removeChild(document.getElementById('content-loading'))
}

// window.addEventListener('load', load)
load()
