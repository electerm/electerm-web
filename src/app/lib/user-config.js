/**
 * user-controll.json controll
 */

import { dbAction } from './db.js'
import { userConfigId } from '../common/constants.js'
import log from '../common/log.js'

export async function saveUserConfig (userConfig) {
  const q = {
    _id: userConfigId
  }
  delete userConfig.host
  delete userConfig.terminalTypes
  delete userConfig.tokenElecterm
  delete userConfig.port
  delete userConfig.server
  delete userConfig.wsPort
  delete userConfig.wsHost
  delete userConfig.useSystemTitleBar
  // `debug` is the one setting that changes the log level itself, and the app
  // is already running when it is flipped -- apply it here so the trace shows
  // up without a restart (the server process picks it up per session, see
  // ../server/session-ssh.js)
  if ('debug' in userConfig) {
    log.setDebugMode(!!userConfig.debug)
  }
  await dbAction('data', 'update', q, {
    ...q,
    ...userConfig
  }, {
    upsert: true
  })
}
