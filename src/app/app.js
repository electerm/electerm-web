/**
 * app entry
 */

import log from './common/log.js'
import { createApp } from './server/server.js'
import { packInfo } from './common/runtime-constants.js'

process.on('uncaughtException', (err) => {
  log.error('uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  log.error('unhandledRejection', err)
})

async function main () {
  log.info('app start')
  const app = await createApp()

  const { HOST, PORT } = process.env

  const onError = (err) => {
    log.error('server', 'failed to listen on', `${HOST}:${PORT}`, err.message)
    // let the log land before the process goes away, then fail loudly: a
    // server that is up but not listening is worse than one that is down,
    // because a supervisor can not see the difference
    setTimeout(() => process.exit(1), 100)
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`server runs on http://${HOST}:${PORT}`)
  })
  // Without this a port failure only surfaced as an uncaughtException (logged
  // and swallowed below) while the process kept running with nothing listening.
  // express-ws re-emits the http server's errors on its WebSocketServer, and an
  // unhandled 'error' there throws before this listener runs, so both get one.
  server.on('error', onError)
  const wss = app.getWss && app.getWss()
  if (wss) {
    wss.on('error', onError)
  }
}

// main() is async, so anything thrown inside it (a failed import, an
// unreadable config, a bad platform integration) used to surface only as an
// UnhandledPromiseRejection while the server silently never listened.
// Fail loudly instead, so the next one of these is diagnosable from the
// message and a process supervisor can restart it.
main().catch((err) => {
  log.error(`Failed to start ${packInfo.name}:`, err)
  process.exit(1)
})
