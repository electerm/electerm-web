import express from 'express'
import pug from 'pug'
import { wsRoutes } from '../routes/ws.js'
import { httpRoutes } from '../routes/http.js'
import { applyExtensions } from '../lib/extensions.js'
import morgan from 'morgan'
import {
  isDev,
  cwd,
  basePath
} from '../common/runtime-constants.js'
import { resolve } from 'path'
import log from '../common/log.js'
import { applySystemCAsToGlobalAgent } from '../lib/system-ca.js'

export async function createApp () {
  const loadedCount = applySystemCAsToGlobalAgent()
  if (loadedCount > 0) {
    log.info(`[TLS] loaded ${loadedCount} system CA certificate(s) into main process`)
  }

  const app = express()
  // A configured `BASE_PATH` lets the whole app sit under a sub-path behind a
  // reverse proxy (https://host/electerm/). All routes/static/ws below are
  // registered at their root paths; stripping the prefix here means they work
  // unchanged whether the proxy forwards the sub-path verbatim or strips it
  // first. Direct root access (no prefix) also keeps working.
  app.use((req, res, next) => {
    if (basePath && (req.url === basePath || req.url.startsWith(basePath + '/'))) {
      req.url = req.url.slice(basePath.length) || '/'
    }
    next()
  })
  // parse application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }))

  // parse application/json
  app.use(express.json())

  app.use(morgan(
    ':method :url :status :res[content-length] - :response-time ms'
  ))
  app.set('view engine', 'pug')
  // Register the engine explicitly. Without this Express lazily `require('pug')`
  // at render time, which a bundler cannot see — the string is only produced at
  // runtime, so "pug" is missing from the bundle and GET / hangs forever.
  app.engine('pug', pug.__express)
  app.set(
    'views',
    process.env.VIEW_FOLDER ||
    (
      !isDev
        ? resolve(cwd, 'dist/views')
        : resolve(cwd, 'src/app/views')
    )
  )
  app.set('x-powered-by', false)

  httpRoutes(app)
  wsRoutes(app)
  await applyExtensions(app)
  return app
}
