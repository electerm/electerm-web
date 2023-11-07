import logger from 'morgan'
import {
  viewPath,
  env,
  staticPaths,
  pack,
  isProd,
  cwd,
  isWin,
  isMac
} from './common.js'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import conf from './conf.js'
import os from 'os'
import copy from 'json-deep-copy'
import proxy from 'express-http-proxy'
import fsFunctions from '../../src/app/common/fs-functions.js'
import { createToken } from '../../src/app/lib/jwt.js'
import { logDir } from '../../src/app/server/session-log.js'
import { loadDevStylus } from '../../src/app/lib/style.js'

const devPort = env.DEV_PORT || 5570
const devHost = env.DEV_HOST || '127.0.0.1'
const port = env.PORT || 5577
const host = env.HOST || '127.0.0.1'
const h = `http://${devHost}:${devPort}`
const tar = `http://${host}:${port}`
const base = {
  version: pack.version,
  isDev: !isProd,
  siteName: pack.name,
  isWin,
  isMac,
  fsFunctions,
  packInfo: pack,
  home: os.homedir(),
  server: h,
  cdn: h,
  stylus: loadDevStylus(),
  sessionLogPath: logDir,
  tokenElecterm: process.env.ENABLE_AUTH ? '' : createToken()
}

function handleIndex (req, res) {
  const data = {
    ...base,
    query: req.query
  }
  const view = 'index'
  res.render(view, {
    ...data,
    _global: copy(data)
  })
}

function redirect (req, res) {
  const {
    name
  } = req.params
  const mapper = {
    electerm: '/src/client/entry-web/index.jsx',
    worker: '/src/client/entry-web/worker.js'
  }
  res.redirect(mapper[name])
}

async function createServer () {
  const app = express()

  // Create Vite server in middleware mode and configure the app type as
  // 'custom', disabling Vite's own HTML serving logic so parent server
  // can take control
  const vite = await createViteServer({
    ...conf,
    server: {
      port: 3040,
      middlewareMode: true
    },
    appType: 'custom'
  })
  app.use(
    logger(':method :url :status :res[content-length] - :response-time ms')
  )
  app.use(express.json())
  app.use(express.urlencoded({
    extended: true
  }))
  staticPaths.forEach(({ path, dir }) => {
    app.use(
      path,
      express.static(dir, { maxAge: '170d' })
    )
  })

  app.set('views', viewPath)
  app.set('view engine', 'pug')

  // Use vite's connect instance as middleware. If you use your own
  // express router (express.Router()), you should use router.use
  app.use(vite.middlewares)
  app.get(['/', '/index.html'], handleIndex)
  app.get('/:dir/:name.:ext', redirect)
  app.listen(devPort, devHost, () => {
    console.log('cwd:', cwd)
    console.log(`server started at ${h}`)
  })
  app.use(
    '/api/login',
    proxy(tar, {
      proxyReqPathResolver: function (req) {
        return '/api/login'
      }
    })
  )
  app.use(
    '/api/get-constants',
    proxy(tar, {
      proxyReqPathResolver: function (req) {
        return '/api/get-constants'
      }
    })
  )
}

createServer()
