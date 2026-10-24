/**
 * Where user-installed widgets live: <data dir>/widgets/<id>/.
 *
 * The data dir is the same one the db and the widget logs use (see lib/sqlite.js
 * and widgets/instance-log.js): DATA_PATH wins, else DB_PATH, else <cwd>/data.
 * Resolved lazily and defensively, because these modules are also imported from
 * unit tests, where nothing has set an env var.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { cwd } from '../common/runtime-constants.js'

export const WIDGETS_DIR_NAME = 'widgets'
const WIDGET_ID_PATTERN = /^[a-z0-9-]+$/

export function getDataDir () {
  if (process.env.DATA_PATH) {
    return process.env.DATA_PATH
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH
  }
  try {
    return path.resolve(cwd, 'data')
  } catch (e) {
    return path.join(os.tmpdir(), 'electerm')
  }
}

export function getUserWidgetDir () {
  return path.join(getDataDir(), WIDGETS_DIR_NAME)
}

export function ensureUserWidgetDir () {
  const dir = getUserWidgetDir()
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// The id is used as a folder name in three places (listing, running, the
// asset route), so it is validated the same way everywhere.
export function isValidWidgetId (id) {
  return typeof id === 'string' && WIDGET_ID_PATTERN.test(id)
}

// Absolute folder of one user widget, guaranteed to sit directly under the
// widgets root.
export function resolveUserWidgetDir (id) {
  if (!isValidWidgetId(id)) {
    throw new Error(`Invalid widget ID: ${id}`)
  }
  const root = getUserWidgetDir()
  const dir = path.resolve(root, id)
  if (path.dirname(dir) !== path.resolve(root)) {
    throw new Error(`Invalid widget ID: ${id}`)
  }
  return dir
}

// Is `target` inside `root` (and not root itself)? Used for every path that
// comes out of a manifest, so `../..` in package.json cannot escape the widget.
export function isInside (root, target) {
  const rel = path.relative(root, target)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}
