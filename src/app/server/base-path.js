/**
 * BASE_PATH support: let the whole app sit under a sub-path behind a reverse
 * proxy (https://host/electerm/) without touching any route definition.
 *
 * Every route, static mount and websocket upgrade is registered at its root
 * path, so stripping the prefix once, before routing, keeps them all working
 * whether the proxy forwards the sub-path verbatim or strips it first. Requests
 * without the prefix are left alone, so direct root access keeps working too.
 *
 * Express-ws feeds the upgrade request through `app.handle()`, i.e. through this
 * same middleware stack, so websocket paths get stripped here as well.
 */
import { basePath } from '../common/runtime-constants.js'

/**
 * Prefix a same-origin path with the configured base path ("" when none).
 *
 * This is the one place server code should build a url the browser will see:
 * a hand-written `basePath + '/api/x'` per file is how a path quietly loses the
 * prefix when someone adds the next one.
 * @param {string} path a path starting with '/'
 */
export function bp (path = '') {
  return basePath + path
}

export function stripBasePath (prefix = basePath) {
  if (!prefix) {
    return (req, res, next) => next()
  }
  return (req, res, next) => {
    if (
      req.url === prefix ||
      req.url.startsWith(prefix + '/') ||
      req.url.startsWith(prefix + '?')
    ) {
      // keep the query string, and never hand routing an empty path
      const rest = req.url.slice(prefix.length)
      req.url = rest.startsWith('?') ? '/' + rest : (rest || '/')
    }
    next()
  }
}
