/**
 * db entry point
 *
 * decides which db implementation to use:
 *   - env DB_TYPE picks a built-in implementation, default 'sqlite'
 *   - DB_TYPE=custom, or a custom db config in config.js,
 *     loads the custom db implementation from config.js
 *
 * every db implementation exports the same interface:
 *   tables: string[]                          optional, managed by the impl
 *   dbAction(dbName, op, ...args)             mongo-like api:
 *     find()                                  all docs of the table
 *     findOne({_id})                          one doc or null
 *     insert(doc | [doc])                     inserted doc(s) with _id
 *     update({_id}, doc, {upsert})            replace doc by _id, upsert to create
 *     remove({_id})                           delete by _id, returns changed count
 *     compactDatafile                         no-op for most implementations
 *
 * built-in implementations are created with createDb(conf),
 * conf is config.js db.conf, for connection settings
 */

import { cwd } from '../common/runtime-constants.js'
import { resolve } from 'path'
import { pathToFileURL } from 'node:url'
import { getConf } from '../lib/conf.js'

const defaultDbType = 'sqlite'

// built-in db implementations, one folder each, all export the same interface
const builtins = {
  sqlite: () => import('./sqlite/index.js')
}

/**
 * get db conf (connection settings) from config.js exports
 * @param {object} [conf] config.js exports
 * @returns {object}
 */
function getDbConf (conf) {
  const dbConf = conf && typeof conf.db === 'object' ? conf.db : {}
  return dbConf.conf || {}
}

/**
 * get custom db definition from config.js exports
 * supported shapes, see config.sample.js:
 *   export const db = { type: 'custom', conf: {...} }
 *   export class Db { constructor (conf) {} ... }
 *   export const db = { type: 'custom', module: './my-db.js' }
 * db can also be the Db class itself: export const db = class Db {}
 * @param {object} [conf] config.js exports
 * @returns {{type?: string, Db?: Function, module?: string, conf?: object}|null}
 */
function getCustomDb (conf) {
  if (!conf) {
    return null
  }
  const dbConf = typeof conf.db === 'function'
    ? { Db: conf.db }
    : (conf.db || {})
  return {
    type: dbConf.type,
    Db: dbConf.Db || (typeof conf.Db === 'function' ? conf.Db : null),
    module: dbConf.module,
    conf: dbConf.conf
  }
}

/**
 * decide which db type to use
 * env DB_TYPE wins, then custom db config in config.js, then default
 * @param {object} [conf] config.js exports
 * @param {string} [dbType] defaults to env DB_TYPE
 * @returns {string}
 */
function resolveDbType (conf, dbType = process.env.DB_TYPE) {
  if (dbType) {
    return dbType
  }
  const custom = getCustomDb(conf)
  if (custom && (custom.Db || custom.module || custom.type)) {
    return custom.type || 'custom'
  }
  return defaultDbType
}

/**
 * wrap a custom db implementation into the common db interface
 * @param {Function|object} DbImpl Db class or module with dbAction
 * @param {object} [conf] forwarded to the Db constructor
 * @returns {{tables?: string[], dbAction: Function}}
 */
function toDbInterface (DbImpl, conf) {
  // class with a dbAction method, same interface as built-in dbs
  if (typeof DbImpl === 'function' && typeof DbImpl.prototype?.dbAction === 'function') {
    const db = new DbImpl(conf)
    return {
      tables: db.tables,
      dbAction: (dbName, op, ...args) => db.dbAction(dbName, op, ...args)
    }
  }
  // mongo-like class, one instance per table, see config.sample.js
  if (typeof DbImpl === 'function') {
    const proto = DbImpl.prototype || {}
    const collectionLike = ['find', 'findOne', 'insert', 'update', 'remove']
      .some(name => typeof proto[name] === 'function')
    if (collectionLike) {
      return collectionAdapter(DbImpl, conf)
    }
    throw new Error(
      'custom Db class must implement dbAction(dbName, op, ...args) ' +
      'or the collection api: find/findOne/insert/update/remove'
    )
  }
  // module namespace or plain object
  if (typeof DbImpl.dbAction === 'function') {
    return {
      tables: DbImpl.tables,
      dbAction: (dbName, op, ...args) => DbImpl.dbAction(dbName, op, ...args)
    }
  }
  throw new Error('custom db must implement dbAction(dbName, op, ...args)')
}

/**
 * adapt a mongo-like collection class to the dbAction interface
 * one collection instance per table, like mongodb
 */
function collectionAdapter (Db, conf) {
  const collections = new Map()
  const getCollection = (tableName) => {
    if (!collections.has(tableName)) {
      collections.set(tableName, new Db({ ...conf, tableName }))
    }
    return collections.get(tableName)
  }
  return {
    async dbAction (dbName, op, ...args) {
      if (op === 'compactDatafile') {
        return
      }
      const col = getCollection(dbName)
      switch (op) {
        case 'find':
          return (await col.find(...args)) || []
        case 'findOne':
          return (await col.findOne(args[0] || {})) || null
        case 'insert':
          return await col.insert(args[0])
        case 'update':
          return await col.update(args[0], args[1], args[2] || {})
        case 'remove':
          return await col.remove(args[0] || {})
        default:
          throw new Error(`unsupported db op: ${op}`)
      }
    }
  }
}

/**
 * load a db implementation, no caching
 * @param {object} [conf] config.js exports, defaults to reading config.js
 * @param {string} [dbType] defaults to env DB_TYPE resolution
 * @returns {Promise<{tables?: string[], dbAction: Function}>}
 */
export async function loadDb (conf, dbType) {
  const theConf = conf === undefined ? await getConf() : conf
  const type = resolveDbType(theConf, dbType)
  const builtin = builtins[type]
  if (builtin) {
    const mod = await builtin()
    if (typeof mod.createDb !== 'function') {
      throw new Error(`db implementation "${type}" does not export createDb`)
    }
    return mod.createDb(getDbConf(theConf))
  }
  const custom = getCustomDb(theConf)
  if (!custom || !(custom.Db || custom.module)) {
    if (type === 'custom') {
      throw new Error(
        'custom db type requires a Db class or module path in config.js, see config.sample.js'
      )
    }
    throw new Error(
      `db type "${type}" is not available, ` +
      `built-in db types: ${Object.keys(builtins).join(', ')}, ` +
      'or provide a custom db in config.js'
    )
  }
  if (custom.module) {
    const modulePath = resolve(cwd, custom.module)
    const mod = await import(pathToFileURL(modulePath).href)
    return toDbInterface(mod.default || mod, custom.conf)
  }
  return toDbInterface(custom.Db, custom.conf)
}

let dbPromise = null

/**
 * get the resolved db implementation, cached
 * @returns {Promise<{tables?: string[], dbAction: Function}>}
 */
export function getDb () {
  if (!dbPromise) {
    dbPromise = loadDb()
  }
  return dbPromise
}

export async function dbAction (dbName, op, ...args) {
  const db = await getDb()
  return db.dbAction(dbName, op, ...args)
}

export async function getTables () {
  const db = await getDb()
  return db.tables || []
}
