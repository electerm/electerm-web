/**
 * db loader
 * loads the db implementation from ../db/index.js,
 * which picks the implementation by env DB_TYPE (default sqlite)
 * or a custom db config in config.js
 */

export {
  dbAction,
  getDb,
  getTables,
  loadDb
} from '../db/index.js'
