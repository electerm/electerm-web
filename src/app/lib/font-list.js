/**
 * load font list after start
 */
import log from '../common/log.js'
import { getFonts } from 'font-list'

export const loadFontList = () => {
  return getFonts()
    .then(fonts => {
      return fonts.map(f => f.replace(/"/g, ''))
    })
    .catch(err => {
      log.error('load font list error')
      log.error(err)
      return []
    })
}
