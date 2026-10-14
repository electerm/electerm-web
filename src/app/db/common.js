/**
 * common db helpers, shared by all db implementations
 * every implementation stores docs the same way:
 * one row/doc per _id, data is a json string of the doc fields
 */

import uid from '../common/uid.js'
import log from '../common/log.js'

// all table names used by the app, every implementation works with these
export const tables = [
  'bookmarks',
  'bookmarkGroups',
  'addressBookmarks',
  'terminalThemes',
  'lastStates',
  'data',
  'quickCommands',
  'log',
  'dbUpgradeLog',
  'profiles',
  'workspaces',
  'triggers',
  'history',
  'terminalCommandHistory',
  'aiChatHistory',
  'autoRunWidgets'
]

export function checkTable (dbName) {
  if (!tables.includes(dbName)) {
    console.error(`Table ${dbName} does not exist`)
    return false
  }
  return true
}

export function toDoc (row) {
  if (!row) return null
  let r = {}
  try {
    r = JSON.parse(row.data || '{}')
  } catch (e) {
    log.error(e)
  }
  return {
    ...r,
    _id: row._id
  }
}

export function toRow (doc) {
  const _id = doc._id || doc.id || uid()
  const copy = { ...doc }
  delete copy._id
  delete copy.id
  return {
    _id,
    data: JSON.stringify(copy)
  }
}
