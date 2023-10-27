/**
 * nedb api wrapper
 */

import { defaultUserName, cwd } from '../common/runtime-constants.js'
import { resolve } from 'path'
import Datastore from '@yetzt/nedb'

const reso = (name) => {
  const nedbPath = process.env.DB_PATH || resolve(cwd, 'database/nedb-database')
  return resolve(nedbPath, 'users', defaultUserName, `electerm.${name}.nedb`)
}

export class Db extends Datastore {
  constructor (params) {
    const conf = {
      filename: reso(params.tableName),
      autoload: true
    }
    super(conf)
  }
}
