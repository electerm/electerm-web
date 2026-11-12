import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as localeModule from '@electerm/electerm-locales'
import { detectLanguage, defaultLanguage } from '../../src/client/web-components/detect-language.js'

// the same shape init() sends to the client (see src/app/lib/init.js)
const langs = Object.entries(localeModule)
  .filter(([id]) => id !== 'default')
  .map(([id, l]) => ({ id, ...l }))

test('detectLanguage: navigator.languages is already ordered, first match wins', () => {
  assert.equal(detectLanguage(['zh-CN', 'zh', 'en'], langs), 'zh_cn')
  assert.equal(detectLanguage(['en-US', 'en'], langs), 'en_us')
  assert.equal(detectLanguage(['fr-FR', 'fr'], langs), 'fr_fr')
})

test('detectLanguage: simplified / traditional Chinese', () => {
  const cases = {
    'zh-CN': 'zh_cn',
    'zh-Hans-CN': 'zh_cn',
    'zh-SG': 'zh_cn',
    zh: 'zh_cn',
    'zh-TW': 'zh_tw',
    'zh-HK': 'zh_tw',
    'zh-Hant': 'zh_tw',
    'zh-Hant-TW': 'zh_tw'
  }
  for (const [tag, expected] of Object.entries(cases)) {
    assert.equal(detectLanguage([tag], langs), expected, tag)
  }
})

test('detectLanguage: region falls back to the only locale of that language', () => {
  assert.equal(detectLanguage(['en-GB', 'en'], langs), 'en_us')
  assert.equal(detectLanguage(['de-AT', 'de'], langs), 'de_de')
  assert.equal(detectLanguage('pt-PT', langs), 'pt_br')
  assert.equal(detectLanguage('ja', langs), 'ja_jp')
})

test('detectLanguage: unusable input falls back to the default', () => {
  for (const prefs of ['', '   ', null, undefined, true, {}, [], ['  ']]) {
    assert.equal(detectLanguage(prefs, langs), defaultLanguage)
  }
  // a language with no locale in the pack is not guessed at
  assert.equal(detectLanguage(['sr-Latn-RS', 'sr'], langs), defaultLanguage)
})

test('detectLanguage: no lang list means no matching, never a crash', () => {
  for (const list of [undefined, null, [], [{ id: 'zh_cn' }], [{ id: 'zh_cn', match: '(' }]]) {
    assert.equal(detectLanguage(['zh-CN'], list), defaultLanguage)
  }
})
