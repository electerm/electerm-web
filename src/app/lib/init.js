/**
 * ipc main
 */

import defaultSetting from '../common/config-default.js'
import { userConfigId } from '../common/constants.js'
import { isDev } from '../common/runtime-constants.js'
import { dbAction } from './db.js'
import installSrc from './install-src.js'
import { getLogDir } from '../widgets/instance-log.js'
import * as langMap from '@electerm/electerm-locales'

// `pasteWhenContextMenu` (boolean) was replaced by `rightClickBehavior`
// ('context' | 'paste' | 'passthrough'). Configs saved by an older version
// still carry the boolean, so translate it once here — where the stored
// config first meets the defaults — and drop the dead key so the next save
// does not write it back.
function migrateRightClickBehavior (userConfig) {
  if (userConfig.rightClickBehavior === undefined) {
    userConfig.rightClickBehavior = userConfig.pasteWhenContextMenu
      ? 'paste'
      : defaultSetting.rightClickBehavior
  }
  delete userConfig.pasteWhenContextMenu
}

export async function getConfig () {
  const userConfig = await dbAction('data', 'findOne', {
    _id: userConfigId
  }) || {}
  delete userConfig._id
  delete userConfig.host
  delete userConfig.terminalTypes
  delete userConfig.tokenElecterm
  migrateRightClickBehavior(userConfig)
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
    isPortable: true,
    installSrc,
    // where running widgets write their logs; the widget manager
    // (store.widgetLogPath) reads them straight off disk
    // (see widgets/instance-log.js, mirrors desktop ipc.js init globs)
    widgetLogPath: getLogDir(),
    langs: Object.keys(langMap).map(id => {
      return {
        id,
        ...langMap[id]
      }
    }),
    langMap
  }
}
