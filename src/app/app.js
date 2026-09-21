/**
 * app entry
 */

import log from './common/log.js'
import { createApp } from './server/server.js'

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

  app.listen(PORT, HOST, () => {
    log.info(`server runs on http://${HOST}:${PORT}`)
  })
}

// main() is async, so anything thrown inside it (a failed import, an
// unreadable config, a bad platform integration) used to surface only as an
// UnhandledPromiseRejection while the server silently never listened.
// Fail loudly instead, so the next one of these is diagnosable from the
// message and a process supervisor can restart it.
main().catch((err) => {
  log.error('Failed to start electerm-web:', err)
  process.exit(1)
})
