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

export function stripBasePath (bp = basePath) {
  if (!bp) {
    return (req, res, next) => next()
  }
  return (req, res, next) => {
    if (
      req.url === bp ||
      req.url.startsWith(bp + '/') ||
      req.url.startsWith(bp + '?')
    ) {
      // keep the query string, and never hand routing an empty path
      const rest = req.url.slice(bp.length)
      req.url = rest.startsWith('?') ? '/' + rest : (rest || '/')
    }
    next()
  }
}
