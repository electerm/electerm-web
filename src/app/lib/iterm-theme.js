/**
 * read themes from https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/electerm
 */

import {
  resolve
} from 'path'
import {
  isDev,
  cwd
} from '../common/runtime-constants.js'
import log from '../common/log.js'
import { promises as fs } from 'fs'

const folder = resolve(
  cwd,
  (
    isDev
      ? 'build/iTerm2-Color-Schemes/electerm'
      : 'dist/assets/iTerm2-Color-Schemes'
  )
)

export async function listItermThemes (ws, msg) {
  const list = await fs.readdir(folder)
    .catch(e => {
      log.error(e)
      return ''
    })
  if (!list) {
    return []
  }
  const all = list.map(f => {
    return fs.readFile(
      resolve(folder, f)
    ).then(t => t.toString())
  })
  return Promise.all(all).catch(e => {
    log.error('list Iterm Themes error', e)
    return []
  })
}
