import express from 'express'
import { index } from '../lib/view.js'
import { getConstants } from '../lib/get-constants.js'
import { resolve } from 'path'
import {
  cwd,
  isDev
} from '../common/runtime-constants.js'
import { fileTransferRoutes } from './file-transfer.js'
import { mountWidgetAssets } from '../widgets/client-assets.js'
import { widgetUIRoutes } from './widget-ui.js'
import { iconRoutes } from './icon.js'

export function httpRoutes (app, auth) {
  app.get('/', index)
  app.post('/api/login', auth.login)
  app.post('/api/logout', auth.logout)
  app.get('/api/get-constants', auth.requireSession, getConstants)
  fileTransferRoutes(app, auth.requireSession)
  // downloaded bookmark icons, `<data dir>/icons`; an <img> is the client, so
  // no token — see the notes in the file
  iconRoutes(app)
  // a widget's own <iframe> document and its assets; no token, see the file
  widgetUIRoutes(app)
  mountWidgetAssets(app, auth.requireSession)
  if (isDev) {
    app.use(express.static(
      resolve(cwd, 'node_modules')
    ))
    app.use(express.static(
      resolve(cwd, 'src/client/statics')
    ))
  } else {
    app.use(express.static(
      resolve(cwd, 'dist/assets')
    ))
  }
}
