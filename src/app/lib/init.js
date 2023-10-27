/**
 * ipc main
 */

import defaultSetting from '../common/config-default.js'
import { userConfigId } from '../common/constants.js'
import { isDev } from '../common/runtime-constants.js'
import { dbAction } from './db.js'
import * as langMap from '@electerm/electerm-locales/esm/index.mjs'

export async function getConfig () {
  const userConfig = await dbAction('data', 'findOne', {
    _id: userConfigId
  }) || {}
  delete userConfig._id
  delete userConfig.host
  delete userConfig.terminalTypes
  delete userConfig.tokenElecterm
  const config = {
    ...defaultSetting,
    ...userConfig,
    port: process.env.PORT,
    host: process.env.HOST,
    wsHost: isDev ? process.env.DEV_HOST : process.env.HOST,
    wsPort: isDev ? process.env.DEV_PORT : process.env.PORT,
    server: process.env.SERVER,
    useSystemTitleBar: true
  }
  return config
}

export async function init () {
  const config = await getConfig(true)
  return {
    config,
    langs: Object.keys(langMap),
    langMap
  }
}
