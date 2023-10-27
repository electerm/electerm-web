import {
  jwtAuth,
  errHandler
} from './jwt.js'
import {
  getConf
} from './conf.js'
export async function applyExtensions (app) {
  const conf = await getConf()
  if (conf && conf.extensions && conf.extensions.length) {
    for (const ext of conf.extensions) {
      if (ext && ext.appExtend) {
        ext.appExtend(app, jwtAuth, errHandler)
      }
    }
  }
}
