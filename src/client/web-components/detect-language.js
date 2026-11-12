/**
 * pick an electerm language id from the browser's language preferences
 *
 * The web app has no server round trip to spare here: the index page can be a
 * prebuilt static file (no SSR, nothing to read an Accept-Language header on),
 * so the browser answers for itself. `navigator.languages` is the same ordered
 * preference list an Accept-Language header would carry, minus proxies and CDN
 * caches that may rewrite or drop it.
 *
 * The matching patterns are not duplicated here: every locale shipped in
 * @electerm/electerm-locales carries a `match` regex for exactly this job
 * (`zh_cn` -> `zh(-|_)cn|zh(-|_)mo|zh(-|_)sg`), and the whole list already
 * reaches the client as `init().langs` -- the settings dropdown renders it. So
 * this module stays dependency-free and only needs that list passed in.
 */

export const defaultLanguage = 'en_us'

// anchored per candidate tag: `^en$` must not match `en_gb`, or every English
// region would collapse into en_us before its own locale gets a chance
function buildMatchers (langs) {
  const res = []
  for (const l of langs || []) {
    if (!l || !l.id || !l.match) {
      continue
    }
    try {
      res.push([l.id, new RegExp(`^(?:${l.match})$`)])
    } catch (e) {
      // a broken pattern in a locale pack must not take the whole startup
      // down, it only makes that one language unreachable by detection
    }
  }
  return res
}

// `zh-Hant-TW` -> ['zh_tw', 'zh_hant', 'zh'], see matchLocale below for how the
// locale patterns consume them
function candidates (tag) {
  const parts = tag.split(/[-_]/).filter(Boolean)
  const lang = parts[0]
  let script = ''
  let region = ''
  for (const p of parts.slice(1)) {
    if (!script && p.length === 4 && /^[a-z]+$/.test(p)) {
      script = p
    } else if (!region && /^([a-z]{2}|\d{3})$/.test(p)) {
      region = p
    }
  }
  const res = []
  // bare `zh` means mainland by convention, and the zh_cn pattern only lists
  // regions, so the region has to be filled in before matching
  if (lang === 'zh' && !region && !script) {
    res.push('zh_cn')
  }
  if (region) {
    res.push(`${lang}_${region}`)
  }
  // script subtags are what Firefox sends where Chrome sends a region
  // (zh-Hant-TW vs zh-TW); the locale pack has no zh_hant id, map it by hand
  if (script === 'hans') {
    res.push(`${lang}_cn`)
  } else if (script === 'hant') {
    res.push(`${lang}_tw`)
  }
  if (script) {
    res.push(`${lang}_${script}`)
  }
  res.push(lang)
  return [...new Set(res)]
}

function matchLocale (matchers, tag) {
  for (const [id, re] of matchers) {
    if (re.test(tag)) {
      return id
    }
  }
  return ''
}

/**
 * @param {string|string[]} preferences navigator.languages (ordered), or a
 * single tag such as navigator.language
 * @param {Array<{id: string, match: string}>} langs init().langs
 * @returns {string} electerm locale id, e.g. 'zh_cn'
 */
export function detectLanguage (preferences, langs) {
  const list = (Array.isArray(preferences) ? preferences : [preferences])
    .filter(d => typeof d === 'string')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)
  const matchers = buildMatchers(langs)
  for (const tag of list) {
    for (const candidate of candidates(tag)) {
      const id = matchLocale(matchers, candidate)
      if (id) {
        return id
      }
    }
  }
  return defaultLanguage
}
