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

export function httpRoutes (router) {
  router.get('/', index)
  router.post('/api/login', login)
  router.get('/api/get-constants', jwtAuth, errHandler, getConstants)
  if (isDev) {
    router.use(express.static(
      resolve(cwd, 'node_modules')
    ))
    router.use(express.static(
      resolve(cwd, 'src/client/statics')
    ))
  } else {
    router.use(express.static(
      resolve(cwd, 'dist/assets')
    ))
  }
}
