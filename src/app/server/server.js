import express from 'express'
import { wsRoutes } from '../routes/ws.js'
import { httpRoutes } from '../routes/http.js'
import { applyExtensions } from '../lib/extensions.js'
import morgan from 'morgan'
import {
  isDev,
  cwd
} from '../common/runtime-constants.js'
import { resolve } from 'path'

export async function createApp () {
  const app = express()
  // parse application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }))

  // parse application/json
  app.use(express.json())

  app.use(morgan(
    'combined'
  ))
  app.set('view engine', 'pug')
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
