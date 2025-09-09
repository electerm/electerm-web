/**
 * common data upgrade process
 * It will check current version in db and check version in package.json,
 * run every upgrade script one by one
 */

import { packInfo } from '../common/runtime-constants.js'
import { resolve, dirname } from 'path'
import fs from 'fs'
import log from '../common/log.js'
import compare from '../common/version-compare.js'
import { dbAction } from '../../../temp/nedb-lib.js'
import _ from 'lodash'
import initData from './init-nedb.js'
import { updateDBVersion } from './version-upgrade.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { version: packVersion } = packInfo
const emptyVersion = '0.0.0'
const versionQuery = {
  _id: 'version'
}

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
  const list = fs.readdirSync(__dirname)
  return list.filter(f => {
    const vv = f.replace('.js', '').replace('v', '')
    return /^v\d/.test(f) && compare(vv, version) > 0 && compare(vv, packVersion) <= 0
  }).sort((a, b) => {
    return compare(a, b)
  })
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
  for (const v of list) {
    const p = resolve(__dirname, v)
    const run = import(p).then(d => d.default)
    await run()
  }
  log.info('Upgrade end')
}
