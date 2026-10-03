/**
 * load font list after start
 */
import log from '../common/log.js'

// `font-list` shells out to the platform's font tooling (fc-list, system_profiler,
// PowerShell). Load it on demand rather than at import time, so a missing or
// broken install degrades the font list instead of preventing the server from
// starting at all.
let fontsPromise = null
function loadGetFonts () {
  if (!fontsPromise) {
    fontsPromise = import('font-list')
      .then(m => m.getFonts)
      .catch(err => {
        log.warn('font-list is not available:', err.message)
        return null
      })
  }
  return fontsPromise
}

export const loadFontList = async () => {
  const getFonts = await loadGetFonts()
  if (!getFonts) {
    return []
  }
  try {
    const fonts = await getFonts()
    return fonts.map(f => f.replace(/"/g, ''))
  } catch (err) {
    log.error('load font list error')
    log.error(err)
    return []
  }
}
