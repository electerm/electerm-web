import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import { resolve } from 'path'
import { testDbContract } from './db-contract.js'

// always sandbox db files in a temp dir, never touch the real data folder
const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), 'electerm-db-custom-test-'))
process.env.DB_PATH = resolve(tmpDir, 'data')
process.env.DB_TYPE = 'custom'

// pure file db: one json file per table, stored under DB_PATH, no external deps
const fileDbSrc = (subDir) => `
import fs from 'node:fs'
import { resolve } from 'path'

const dir = resolve(process.env.DB_PATH, '${subDir}')

function uid () {
  return 'f-' + Math.random().toString(36).slice(2, 10)
}

function tableFile (tableName) {
  return resolve(dir, tableName + '.json')
}

function readDocs (tableName) {
  const file = tableFile(tableName)
  if (!fs.existsSync(file)) {
    return []
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeDocs (tableName, docs) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(tableFile(tableName), JSON.stringify(docs))
}
`

// custom db config, written to config.js like config.sample.js shows,
// mongo-like collection api, one instance per table, backed by json files
const customConfigSrc = fileDbSrc('custom-file-db') + `
export const db = {
  type: 'custom',
  conf: {
    engine: 'file'
  }
}

export class Db {
  constructor (conf) {
    this.conf = conf
    this.tableName = conf.tableName
  }

  async find () {
    return readDocs(this.tableName).map(d => ({ ...d }))
  }

  async findOne (query) {
    const doc = readDocs(this.tableName)
      .find(d => d._id === (query._id || query.id))
    return doc ? { ...doc } : null
  }

  async insert (docs) {
    const list = Array.isArray(docs) ? docs : [docs]
    const all = readDocs(this.tableName)
    const inserted = list.map(d => {
      const doc = { ...d, _id: d._id || d.id || uid() }
      all.push(doc)
      return { ...doc }
    })
    writeDocs(this.tableName, all)
    return Array.isArray(docs) ? inserted : inserted[0]
  }

  async update (query, updateObj, options) {
    const _id = query._id || query.id
    const docs = readDocs(this.tableName)
    const doc = { ...(updateObj.$set || updateObj), _id }
    const index = docs.findIndex(d => d._id === _id)
    if (index > -1) {
      docs[index] = doc
      writeDocs(this.tableName, docs)
      return 1
    }
    if (options && options.upsert) {
      docs.push(doc)
      writeDocs(this.tableName, docs)
      return 1
    }
    return 0
  }

  async remove (query) {
    const docs = readDocs(this.tableName)
    const index = docs.findIndex(d => d._id === (query._id || query.id))
    if (index < 0) {
      return 0
    }
    docs.splice(index, 1)
    writeDocs(this.tableName, docs)
    return 1
  }
}
`

// custom db as a standalone module, exporting dbAction + tables,
// also backed by json files, in its own folder
const customModuleSrc = fileDbSrc('custom-file-db-module') + `
export const tables = ['bookmarks']

export async function dbAction (dbName, op, ...args) {
  if (op === 'compactDatafile') {
    return
  }
  if (op === 'find') {
    return readDocs(dbName).map(d => ({ ...d }))
  }
  if (op === 'findOne') {
    const doc = readDocs(dbName)
      .find(d => d._id === (args[0]._id || args[0].id))
    return doc ? { ...doc } : null
  }
  if (op === 'insert') {
    const list = Array.isArray(args[0]) ? args[0] : [args[0]]
    const all = readDocs(dbName)
    const inserted = list.map(d => {
      const doc = { ...d, _id: d._id || d.id || uid() }
      all.push(doc)
      return { ...doc }
    })
    writeDocs(dbName, all)
    return Array.isArray(args[0]) ? inserted : inserted[0]
  }
  if (op === 'update') {
    const _id = args[0]._id || args[0].id
    const all = readDocs(dbName)
    const doc = { ...(args[1].$set || args[1]), _id }
    const index = all.findIndex(d => d._id === _id)
    if (index > -1) {
      all[index] = doc
      writeDocs(dbName, all)
      return 1
    }
    if (args[2] && args[2].upsert) {
      all.push(doc)
      writeDocs(dbName, all)
      return 1
    }
    return 0
  }
  if (op === 'remove') {
    const all = readDocs(dbName)
    const index = all.findIndex(d => d._id === (args[0]._id || args[0].id))
    if (index < 0) {
      return 0
    }
    all.splice(index, 1)
    writeDocs(dbName, all)
    return 1
  }
  throw new Error('unsupported op: ' + op)
}
`

// config.js is restored after all tests finished, see after() below
const configPath = resolve(process.cwd(), 'config.js')
const configExisted = fs.existsSync(configPath)
const configBackup = configExisted ? fs.readFileSync(configPath, 'utf8') : null
fs.writeFileSync(configPath, customConfigSrc)

const { dbAction, getDb, loadDb } = await import('../../src/app/db/index.js')

// warm up the cached db while config.js is still in place
const cachedDb = await getDb()
assert.equal(typeof cachedDb.dbAction, 'function')

// custom db module, referenced by path from config
const modulePath = resolve(tmpDir, 'my-db.js')
fs.writeFileSync(modulePath, customModuleSrc)
const moduleDb = await loadDb({ db: { type: 'custom', module: modulePath } }, 'custom')

after(() => {
  if (configExisted) {
    fs.writeFileSync(configPath, configBackup)
  } else {
    fs.rmSync(configPath, { force: true })
  }
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// full path: config.js custom Db -> entry point dbAction
testDbContract(dbAction, 'bookmarks', 'custom config file db')

test('custom: file db writes one json file per table', async () => {
  const file = resolve(process.env.DB_PATH, 'custom-file-db', 'bookmarks.json')
  assert.ok(fs.existsSync(file), 'expected bookmarks.json on disk')
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.ok(Array.isArray(onDisk))
  assert.ok(onDisk.length > 0)
})

test('custom: db from config.js handles any table name', async () => {
  // sqlite builtin would refuse this table, custom db should not
  const inserted = await dbAction('customOnlyTable', 'insert', { _id: 'x', name: 'y' })
  assert.equal(inserted._id, 'x')
  const found = await dbAction('customOnlyTable', 'findOne', { _id: 'x' })
  assert.equal(found.name, 'y')
})

test('custom: db module path from config', async () => {
  assert.deepEqual(moduleDb.tables, ['bookmarks'])
})

// custom db loaded from a module file, through the same contract
testDbContract(moduleDb.dbAction, 'bookmarks', 'custom module file db')

test('custom: file db persists across instances', async () => {
  const first = await loadDb({ db: { type: 'custom', module: modulePath } }, 'custom')
  await first.dbAction('bookmarks', 'insert', { _id: 'persist-1', name: 'p' })
  // a fresh instance must read the doc back from the json file
  const second = await loadDb({ db: { type: 'custom', module: modulePath } }, 'custom')
  const found = await second.dbAction('bookmarks', 'findOne', { _id: 'persist-1' })
  assert.equal(found.name, 'p')
})

test('custom: env DB_TYPE=sqlite overrides custom config', async () => {
  const db = await loadDb({ db: { type: 'custom', Db: MemoryDb } }, 'sqlite')
  assert.ok(Array.isArray(db.tables))
  assert.ok(db.tables.includes('bookmarks'))
})

test('custom: DB_TYPE unset uses custom Db from config', async () => {
  delete process.env.DB_TYPE
  const db = await loadDb({ db: { type: 'custom', Db: MemoryDb } })
  assert.equal(typeof db.dbAction, 'function')
  process.env.DB_TYPE = 'custom'
})

test('custom: dbAction style class gets conf and tables', async () => {
  let received = null
  class ConfDb {
    constructor (conf) {
      received = conf
      this.tables = ['t1']
    }

    async dbAction () {}
  }
  const db = await loadDb({
    db: { type: 'custom', Db: ConfDb, conf: { host: 'localhost' } }
  }, 'custom')
  assert.deepEqual(received, { host: 'localhost' })
  assert.deepEqual(db.tables, ['t1'])
})

test('custom: mongo-like Db gets one instance per table', async () => {
  const names = []
  class ColDb {
    constructor (conf) {
      names.push(conf.tableName)
      this.docs = []
    }

    async find () { return [] }
    async findOne () { return null }
    async insert (d) { return d }
    async update () { return 0 }
    async remove () { return 0 }
  }
  const db = await loadDb({ db: { type: 'custom', Db: ColDb } }, 'custom')
  await db.dbAction('t1', 'find')
  await db.dbAction('t2', 'find')
  await db.dbAction('t1', 'find')
  assert.deepEqual(names, ['t1', 't2'])
})

test('custom: DB_TYPE=custom without config throws', async () => {
  await assert.rejects(
    () => loadDb({}, 'custom'),
    /custom db type requires a Db class or module path/
  )
})

test('custom: unknown db type throws', async () => {
  await assert.rejects(
    () => loadDb({}, 'mysql'),
    /db type "mysql" is not available/
  )
})

test('custom: invalid Db class throws', async () => {
  class Empty {}
  await assert.rejects(
    () => loadDb({ db: { type: 'custom', Db: Empty } }, 'custom'),
    /must implement dbAction/
  )
})

// minimal in-memory db, only for db type resolution tests
class MemoryDb {
  constructor (conf) {
    this.conf = conf
    this.tables = ['memoryTable']
    this.docs = []
  }

  async dbAction (dbName, op, ...args) {
    if (op === 'find') {
      return this.docs.map(d => ({ ...d }))
    }
    if (op === 'findOne') {
      const doc = this.docs.find(d => d._id === args[0]._id)
      return doc ? { ...doc } : null
    }
    if (op === 'insert') {
      const doc = {
        ...args[0],
        _id: args[0]._id || 'mem-' + Math.random().toString(36).slice(2, 9)
      }
      this.docs.push(doc)
      return { ...doc }
    }
    return 0
  }
}
