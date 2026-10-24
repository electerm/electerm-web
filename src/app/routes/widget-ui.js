/**
 * Serve one user widget folder to the browser.
 *
 * The desktop app serves the same files from a privileged custom scheme
 * (`electerm-widget://<id>/<ui>`, see widgets/protocol.js there). A browser has
 * no such scheme, so the web app needs a real http url the renderer can put in
 * an <iframe src>. The shape is:
 *
 *   GET /api/widget-ui/<id>/<path inside the widget folder>
 *   GET /api/widget-ui/<id>/__bridge.js       window.electerm, injected into html
 *
 * Relative references inside the widget (`<script src="./app.js">`) resolve
 * under the same prefix, so a widget folder works unmodified.
 *
 * Security notes, because this is the one route that serves files off disk:
 *  - only files that resolve inside <data dir>/widgets/<id>/ are served, checked
 *    on the realpath so a symlink cannot point out of the folder;
 *  - only known asset extensions are served (a widget's `.pem`/`.db` stays
 *    unreachable), hidden segments are refused, directories are refused;
 *  - the html carries a CSP `sandbox` directive without allow-same-origin, so
 *    the document gets an opaque origin instead of inheriting the app's. That is
 *    what the custom scheme gave for free on the desktop: widget code must not
 *    be able to read window.store or the token in localStorage. It still reaches
 *    the host through window.electerm only (postMessage), which is the contract.
 *    The trade-off is that a widget cannot use localStorage; its own key/value
 *    store is reachable through electerm.getConfig/updateConfig.
 *  - no token on purpose: an <iframe> cannot send the `token` header, and the
 *    widget's own asset requests carry no query string, so a per-request token
 *    would 401 every <script>/<img>. Nothing here is user data: only the widget
 *    author's own front-end files.
 */

import fs from 'fs'
import path from 'path'
import {
  isValidWidgetId,
  resolveUserWidgetDir,
  isInside
} from '../widgets/paths.js'
import bridgeSource from '../widgets/bridge.js'

const BRIDGE_FILE = '__bridge.js'

// Serve by ourselves (the bridge, the injected html) needs an explicit type.
// Anything not in this map is not served at all.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

// Opaque origin for widget documents, see the note at the top of the file.
const WIDGET_CSP = [
  'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads'
].join('; ')

function mimeTypeOf (file) {
  return MIME_TYPES[path.extname(file).toLowerCase()]
}

// Put the bridge first in <head> so window.electerm exists before any script
// the widget loads from there.
function injectBridge (html, id) {
  const tag = `<script src="/api/widget-ui/${id}/${BRIDGE_FILE}"></script>`
  const head = /<head[^>]*>/i.exec(html)
  if (head) {
    const at = head.index + head[0].length
    return html.slice(0, at) + tag + html.slice(at)
  }
  const root = /<html[^>]*>/i.exec(html)
  if (root) {
    const at = root.index + root[0].length
    return html.slice(0, at) + tag + html.slice(at)
  }
  return tag + html
}

function notFound (res) {
  res.status(404).type('text/plain').send('Not found')
}

function setCommonHeaders (res) {
  // widget folders are replaced on reinstall, and the renderer reloads the
  // iframe by changing the url, so never let a stale copy win
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

/**
 * Resolve `<widgets>/<id>/<segments>` to a real file inside that widget.
 *
 * Returns null for anything that must not be served: an invalid id, a hidden
 * segment, a directory, a missing file, an unknown extension, or a path that
 * leaves the folder once symlinks are resolved.
 */
function resolveWidgetFile (id, segments) {
  if (!isValidWidgetId(id) || !Array.isArray(segments) || !segments.length) {
    return null
  }
  if (segments.some(seg => !seg || seg.startsWith('.') || seg.includes('\0'))) {
    return null
  }
  let root
  try {
    root = fs.realpathSync(resolveUserWidgetDir(id))
  } catch (e) {
    return null
  }
  const target = path.resolve(root, ...segments)
  if (!isInside(root, target)) {
    return null
  }
  let real
  try {
    real = fs.realpathSync(target)
  } catch (e) {
    return null
  }
  // symlink pointing outside the folder, or a directory
  if (!isInside(root, real)) {
    return null
  }
  if (!mimeTypeOf(real)) {
    return null
  }
  let stat
  try {
    stat = fs.statSync(real)
  } catch (e) {
    return null
  }
  if (!stat.isFile()) {
    return null
  }
  return real
}

export function widgetUIRoutes (app) {
  app.get(`/api/widget-ui/:id/${BRIDGE_FILE}`, (req, res) => {
    const { id } = req.params
    if (!isValidWidgetId(id)) {
      return notFound(res)
    }
    setCommonHeaders(res)
    res.type('text/javascript; charset=utf-8').send(bridgeSource)
  })

  // express 5: a wildcard needs a name, and arrives as an array of segments
  app.get('/api/widget-ui/:id/*file', (req, res) => {
    const { id } = req.params
    const file = resolveWidgetFile(id, req.params.file)
    if (!file) {
      return notFound(res)
    }
    const mimeType = mimeTypeOf(file)
    setCommonHeaders(res)
    if (mimeType.startsWith('text/html')) {
      let html
      try {
        html = fs.readFileSync(file, 'utf8')
      } catch (e) {
        return notFound(res)
      }
      res.setHeader('Content-Security-Policy', WIDGET_CSP)
      return res.type(mimeType).send(injectBridge(html, id))
    }
    res.type(mimeType)
    res.sendFile(file, { headers: { 'Cache-Control': 'no-store' } })
  })
}
