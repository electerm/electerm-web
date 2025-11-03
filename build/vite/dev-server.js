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
import { resolve } from 'path'
import fs from 'fs'
import { defaultUserName } from '../../src/app/common/runtime-constants.js'
import { migrationNotice } from '../../src/app/lib/fancy-console.js'

const devPort = env.DEV_PORT || 5570
const devHost = env.DEV_HOST || '127.0.0.1'
const port = env.PORT || 5577
const host = env.HOST || '127.0.0.1'
const h = ''
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
  isWebApp: true,
  sessionLogPath: logDir,
  tokenElecterm: process.env.ENABLE_AUTH ? '' : createToken()
}
let needMigrate
function checkNeedMigrate () {
  if (needMigrate !== undefined) {
    return needMigrate
  }

  const nedbPath = process.env.DB_PATH || resolve(cwd, 'data/nedb-database')
  const nedbUserPath = resolve(nedbPath, 'users', defaultUserName)

  // Check if nedb directory exists and has .nedb files
  if (fs.existsSync(nedbUserPath)) {
    const nedbFiles = fs.readdirSync(nedbUserPath).filter(file => file.endsWith('.nedb'))

    if (nedbFiles.length > 0) {
      needMigrate = true
      return needMigrate
    }
  }

  needMigrate = false
  return needMigrate
}

async function checkNodePty () {
  return import('node-pty')
    .then(() => true)
    .catch(() => false)
}

async function handleIndex (req, res) {
  const hasNodePty = await checkNodePty()
  const needMigrate = checkNeedMigrate()
  if (needMigrate) {
    migrationNotice(
      'electerm-web v3',
      'nedb',
      'sqlite',
      'electerm-data-tool --data-path "/path/to/data/nedb-database" export data.json'
    )
  }
  const data = {
    ...base,
    query: req.query,
    hasNodePty,
    needMigrate
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
    electerm: '/src/client/entry-web/electerm.jsx',
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
      middlewareMode: true,
      hmr: {
        overlay: true,
        port: env.DEV_HMR_PORT || 24679
      }
    },
    appType: 'custom'
  })
  app.use(
    logger('dev')
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
    console.log(`server started at ${h || `http://${devHost}:${devPort}`}`)
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
