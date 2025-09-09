/**
 * for new user, they do not have old json db
 * just need init db
 */

import { dbAction } from '../../../temp/nedb-lib.js'
import log from '../common/log.js'
import defaults from './db-defaults.js'

export default async function initData () {
  log.info('start: init db')
  for (const conf of defaults) {
    const {
      db, data
    } = conf
    await dbAction(db, 'insert', data).catch(log.error)
  }
  log.info('end: init db')
}
