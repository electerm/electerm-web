/**
 * common data upgrade process
 * It will check current version in db and check version in package.json,
 * run every upgrade script one by one
 */

import { packInfo } from '../common/runtime-constants.js'
import log from '../common/log.js'
import compare from '../common/version-compare.js'
import { dbAction } from '../lib/db.js'
import _ from 'lodash'
import initData from './init-nedb.js'
import { updateDBVersion } from './version-upgrade.js'

const { version: packVersion } = packInfo
const emptyVersion = '0.0.0'
const versionQuery = {
  _id: 'version'
}

// Registry of versioned upgrade scripts.
//
// This used to scan this directory with readdirSync and import each `v*.js`
// by a path computed at runtime. That works unbundled, but a computed import
// is invisible to bundlers, so packaged deployments silently ran no migrations
// at all. Register each script here instead; the import path is a static
// string literal, so bundlers can see it.
//
//   { version: '4.1.0', run: () => import('./v4.1.0.js').then(d => d.default) }
const versionUpgradeScripts = [
]

async function getDBVersion () {
  const version = await dbAction('data', 'findOne', versionQuery)
    .then(doc => {
      return doc ? doc.value : emptyVersion
    })
    .catch(e => {
      log.error(e)
      return emptyVersion
    })
  return version
}

/**
 * get upgrade versions should be run as version upgrade
 */
async function getUpgradeVersionList () {
  const version = await getDBVersion()
  return versionUpgradeScripts.filter(({ version: vv }) => {
    return compare(vv, version) > 0 && compare(vv, packVersion) <= 0
  }).sort((a, b) => compare(a.version, b.version))
}

async function versionShouldUpgrade () {
  const dbVersion = await getDBVersion()
  log.info('database version:', dbVersion)
  return compare(dbVersion, packVersion) < 0
}

export async function checkDbUpgrade () {
  const shouldUpgradeVersion = await versionShouldUpgrade()
  if (!shouldUpgradeVersion) {
    return false
  }
  const dbVersion = await getDBVersion()
  log.info('dbVersion', dbVersion)
  if (dbVersion === emptyVersion) {
    await initData()
    await updateDBVersion(packVersion)
    return false
  }
  const list = await getUpgradeVersionList()
  if (_.isEmpty(list)) {
    await updateDBVersion(packVersion)
    return false
  }
  return {
    dbVersion,
    packVersion
  }
}

export async function doUpgrade () {
  const list = await getUpgradeVersionList()
  log.info('Upgrading...')
  for (const { version: vv, run } of list) {
    try {
      const runFn = await run()
      await runFn()
    } catch (e) {
      // A single broken migration script must never brick app startup:
      // log it, stamp its version so it is not retried forever, continue
      log.error(`Upgrade script ${vv} fails, skip it`, e)
      if (vv) {
        await updateDBVersion(vv)
      }
    }
  }
  log.info('Upgrade end')
}
