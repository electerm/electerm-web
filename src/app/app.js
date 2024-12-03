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

main()
