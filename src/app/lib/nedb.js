/**
 * nedb api wrapper
 */

import { defaultUserName, cwd } from '../common/runtime-constants.js'
import { resolve } from 'path'
import Datastore from '@seald-io/nedb'

const reso = (name) => {
  const nedbPath = process.env.DB_PATH || resolve(cwd, 'data/nedb-database')
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
