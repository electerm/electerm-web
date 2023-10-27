import express from 'express'
import { login } from '../lib/login.js'
import { index } from '../lib/view.js'
import { getConstants } from '../lib/get-constants.js'
import { resolve } from 'path'
import {
  cwd,
  isDev
} from '../common/runtime-constants.js'
import {
  jwtAuth,
  errHandler
} from '../lib/jwt.js'

export function httpRoutes (app) {
  app.get('/', index)
  app.post('/api/login', login)
  app.get('/api/get-constants', jwtAuth, errHandler, getConstants)
  if (isDev) {
    app.use(express.static(
      resolve(cwd, 'node_modules')
    ))
  } else {
    app.use(express.static(
      resolve(cwd, 'dist/assets')
    ))
  }
}
