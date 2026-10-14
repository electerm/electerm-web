/**
 * sqlite db implementation
 * Updated to use two database files: one for 'data' table, one for others
 * conf is ignored, sqlite only needs the DB_PATH env
 */

import { cwd } from '../../common/runtime-constants.js'
import { resolve } from 'path'
import fs from 'fs'
import { tables, checkTable, toDoc, toRow } from '../common.js'
import { DatabaseSync } from 'node:sqlite'

// Define database folder and paths for two database files
const dbFolder = process.env.DB_PATH || resolve(cwd, 'data')
const baseFolder = resolve(dbFolder, 'sqlite')
const mainDbPath = resolve(baseFolder, 'electerm.db')
const dataDbPath = resolve(baseFolder, 'electerm_data.db')

// Ensure parent directory exists
if (!fs.existsSync(baseFolder)) {
  fs.mkdirSync(baseFolder, { recursive: true })
}
// Create two database instances
const mainDb = new DatabaseSync(mainDbPath)
const dataDb = new DatabaseSync(dataDbPath)

export { tables }

// Create tables in appropriate databases
for (const table of tables) {
  if (table === 'data') {
    dataDb.exec(`CREATE TABLE IF NOT EXISTS \`${table}\` (_id TEXT PRIMARY KEY, data TEXT)`)
  } else {
    mainDb.exec(`CREATE TABLE IF NOT EXISTS \`${table}\` (_id TEXT PRIMARY KEY, data TEXT)`)
  }
}

// Helper function to get the appropriate database for a table
function getDatabase (dbName) {
  return dbName === 'data' ? dataDb : mainDb
}

export async function dbAction (dbName, op, ...args) {
  if (op === 'compactDatafile') {
    return
  }
  if (!checkTable(dbName)) {
    return
  }

  // Get the appropriate database for this table
  const db = getDatabase(dbName)

  if (op === 'find') {
    const sql = `SELECT * FROM \`${dbName}\``
    const stmt = db.prepare(sql)
    const rows = stmt.all()
    return (rows || []).map(toDoc).filter(Boolean)
  } else if (op === 'findOne') {
    const query = args[0] || {}
    const sql = `SELECT * FROM \`${dbName}\` WHERE _id = ? LIMIT 1`
    const params = [query._id]
    const stmt = db.prepare(sql)
    const row = stmt.get(...params)
    return toDoc(row)
  } else if (op === 'insert') {
    const inserts = Array.isArray(args[0]) ? args[0] : [args[0]]
    const inserted = []
    for (const doc of inserts) {
      const { _id, data } = toRow(doc)
      const stmt = db.prepare(`INSERT OR REPLACE INTO \`${dbName}\` (_id, data) VALUES (?, ?)`)
      stmt.run(_id, data)
      inserted.push({ ...doc, _id })
    }
    return Array.isArray(args[0]) ? inserted : inserted[0]
  } else if (op === 'remove') {
    const query = args[0] || {}
    const sql = `DELETE FROM \`${dbName}\` WHERE _id = ?`
    const params = [query._id]
    const stmt = db.prepare(sql)
    const res = stmt.run(...params)
    return res.changes
  } else if (op === 'update') {
    const query = args[0]
    const updateObj = args[1]
    const options = args[2] || {}
    const { upsert = false } = options
    const qid = query._id || query.id
    const newData = updateObj.$set || updateObj
    const { _id, data } = toRow({
      _id: qid,
      ...newData
    })
    let stmt
    let res
    if (upsert) {
      stmt = db.prepare(`REPLACE INTO \`${dbName}\` (_id, data) VALUES (?, ?)`)
      res = stmt.run(_id, data)
    } else {
      stmt = db.prepare(`UPDATE \`${dbName}\` SET data = ? WHERE _id = ?`)
      res = stmt.run(data, qid)
    }
    return res.changes
  }
}

export function createDb () {
  return {
    tables,
    dbAction
  }
}
