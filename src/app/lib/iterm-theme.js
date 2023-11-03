/**
 * read themes from https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/electerm
 */

import log from '../common/log.js'

export async function listItermThemes (ws, msg) {
  const all = await import('@electerm/electerm-themes/dist/index.mjs').then(d => d.default)
  return Promise.all(all).catch(e => {
    log.error('list Iterm Themes error', e)
    return []
  })
}
