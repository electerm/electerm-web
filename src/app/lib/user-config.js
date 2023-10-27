/**
 * user-controll.json controll
 */

import { dbAction } from './db.js'
import { userConfigId } from '../common/constants.js'

export async function saveUserConfig (userConfig) {
  const q = {
    _id: userConfigId
  }
  delete userConfig.host
  delete userConfig.terminalTypes
  delete userConfig.tokenElecterm
  delete userConfig.port
  delete userConfig.wsPort
  delete userConfig.wsHost
  delete userConfig.useSystemTitleBar
  await dbAction('data', 'update', q, {
    ...q,
    ...userConfig
  }, {
    upsert: true
  })
}
