import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import { resolve } from 'path'
import { testDbContract } from './db-contract.js'

// always sandbox db files in a temp dir, never touch the real data folder
const tmpDbDir = fs.mkdtempSync(resolve(os.tmpdir(), 'electerm-db-sqlite-test-'))
process.env.DB_PATH = tmpDbDir
process.env.DB_TYPE = 'sqlite'

const { dbAction, getTables, loadDb } = await import('../../src/app/db/index.js')

after(() => {
  fs.rmSync(tmpDbDir, { recursive: true, force: true })
})

test('sqlite: loadDb with DB_TYPE=sqlite', async () => {
  const db = await loadDb(undefined, 'sqlite')
  assert.equal(typeof db.dbAction, 'function')
  assert.ok(Array.isArray(db.tables))
  assert.ok(db.tables.includes('bookmarks'))
  assert.ok(db.tables.includes('data'))
})

test('sqlite: default db type is sqlite when no config', async () => {
  delete process.env.DB_TYPE
  const db = await loadDb({})
  assert.ok(Array.isArray(db.tables))
  assert.ok(db.tables.includes('bookmarks'))
  process.env.DB_TYPE = 'sqlite'
})

test('sqlite: getTables from entry point', async () => {
  const tables = await getTables()
  assert.ok(tables.includes('bookmarks'))
})

test('sqlite: unknown table resolves without error', async () => {
  const result = await dbAction('no-such-table', 'find')
  assert.equal(result, undefined)
})

testDbContract(dbAction, 'bookmarks', 'sqlite')
