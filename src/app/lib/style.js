/**
 * style compiler
 * collect all stylus files in src/client and merge into one str
 */

import { globSync } from 'glob'
import stylus from 'stylus'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  packInfo,
  isDev,
  cwd
} from '../common/runtime-constants.js'

const { version } = packInfo

function findFiles (pattern) {
  return globSync(pattern)
}

function removeUnused (str) {
  const names = [
    'contrastColor',
    'main',
    'main-dark',
    'main-light',
    'text',
    'text-light',
    'text-dark',
    'text-disabled',
    'primary',
    'info',
    'success',
    'error',
    'warn'
  ]
  const lines = str.split('\n').filter(d => {
    return d &&
      !d.startsWith('@require') &&
      !/^ *\/\//.test(d) &&
      !/^ *\*/.test(d) &&
      !/^ *\/\*/.test(d)
  })
  const sections = []
  let section = []
  let prevIsHead = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isIndent = line.startsWith('  ')
    if (
      isIndent
    ) {
      prevIsHead = false
      section.push(line)
    } else if (!isIndent && (prevIsHead || !section.length)) {
      section.push(line)
      prevIsHead = true
    } else {
      sections.push(section.join('\n'))
      section = [line]
      prevIsHead = true
    }
  }
  if (section.length) {
    sections.push(section.join('\n'))
  }
  return sections.filter(s => {
    return names.some(name => s.includes(name))
  }).join('\n') + '\n'
}

export function loadDevStylus () {
  const dir = resolve(cwd, 'src')
  const pat = dir + '/**/*.styl'
  const arr = findFiles(pat)
  const key = 'theme-default.styl'
  arr.sort((a, b) => {
    const ai = a.includes(key) ? 1 : 0
    const bi = b.includes(key) ? 1 : 0
    return bi - ai
  })
  let all = ''
  for (const p of arr) {
    const text = readFileSync(p).toString()
    if (text.includes(' = ')) {
      all = all + text
    } else if (text.includes('@require')) {
      const after = removeUnused(text)
      all = all + after
    }
  }
  // all = all.replace(/@require[^\n]+\n/g, '\n')
  return all
}

function stylus2Css (str) {
  return new Promise((resolve, reject) => {
    stylus.render(str, (err, css) => {
      if (err) {
        reject(err)
      } else {
        resolve(css)
      }
    })
  })
}

export async function toCss (stylus) {
  const stylusCss = await stylus2Css(stylus)
  // console.log('stylusCss', stylusCss)
  return {
    stylusCss,
    version,
    isDev
  }
}
