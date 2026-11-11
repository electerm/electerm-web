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

// Where the socket lives, and which path prefix it carries.
// - an explicit `server` wins (cross-origin app server, or a dev setup pointing
//   at another machine). It may already include the app root, so its path is
//   used instead of the configured sub-path, never on top of it;
// - dev otherwise: the socket has to reach the app server directly, because the
//   vite dev server proxies http but not upgrades, and the app runs on another
//   port than the page. Same host the page was reached on (HOST may be 0.0.0.0,
//   which no browser can connect to) plus the app port: the session's one when
//   the server reports it, else the port the dev server proxies `/api` to;
// - prod: the page origin, the only one that knows the sub-path.
function wsTarget (host, port) {
  const { protocol, hostname, host: pageHost } = window.location
  const secure = protocol === 'https:'
  const server = window.et.server
  if (server) {
    try {
      const u = new URL(server, window.location.href)
      const path = u.pathname.replace(/\/+$/, '')
      return {
        origin: u.host,
        secure: u.protocol === 'https:',
        prefix: path || basePath
      }
    } catch (e) {
      return {
        origin: server.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
        secure: server.startsWith('https'),
        prefix: basePath
      }
    }
  }
  const appPort = port || window.et.serverPort
  // `0.0.0.0`/`::` means "every interface" — fine to listen on, useless to
  // connect to. Fall back to the host the page was reached on, then localhost.
  const unusable = h => !h || h === '0.0.0.0' || h === '::' || h === '[::]'
  const appHost = unusable(host) ? (unusable(hostname) ? '127.0.0.1' : hostname) : host
  return {
    origin: isDev && appPort
      ? `${appHost}:${appPort}`
      : pageHost,
    secure,
    prefix: basePath
  }
}

window.et.buildWsUrl = (
  host,
  port,
  tokenElecterm,
  id,
  type = 'terminals',
  extra = ''
) => {
  const { origin, secure, prefix } = wsTarget(host, port)
  const pre = secure ? 'wss' : 'ws'
  return `${pre}://${origin}${prefix}/${type}/${id}?token=${tokenElecterm}${extra}`
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
