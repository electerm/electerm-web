import {
  getConf
} from './conf.js'

const db = {}
let dbActionRef = null

const tables = [
  'bookmarks',
  'history',
  'bookmarkGroups',
  'addressBookmarks',
  'terminalThemes',
  'lastStates',
  'data',
  'quickCommands',
  'log',
  'dbUpgradeLog'
]

export async function getDb () {
  if (dbActionRef) {
    return dbActionRef
  }
  const conf = await getConf()
  let Db = null
  if (conf.Db) {
    Db = conf.Db
  } else {
    Db = await import('./nedb.js').then(d => d.Db)
  }
  tables.forEach(table => {
    const conf = {
      tableName: table
    }
    db[table] = new Db(conf)
  })
  dbActionRef = (dbName, op, ...args) => {
    return new Promise((resolve, reject) => {
      db[dbName][op](...args, (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result)
      })
    })
  }
  return dbActionRef
}

export async function dbAction (...args) {
  const func = await getDb()
  return func(...args)
}
