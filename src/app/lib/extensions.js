import {
  getConf
} from './conf.js'
export async function applyExtensions (app, requireSession) {
  const conf = await getConf()
  if (conf && conf.extensions && conf.extensions.length) {
    for (const ext of conf.extensions) {
      if (ext && ext.appExtend) {
        ext.appExtend(app, requireSession, (err, req, res, next) => next(err))
      }
    }
  }
}
