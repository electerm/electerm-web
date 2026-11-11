import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeBasePath } from '../../src/app/common/runtime-constants.js'
import { stripBasePath } from '../../src/app/server/base-path.js'

test('normalizeBasePath: unset and root collapse to empty', () => {
  for (const p of ['', ' ', '/', '//', undefined, null]) {
    assert.equal(normalizeBasePath(p), '')
  }
})

test('normalizeBasePath: always leading slash, never trailing', () => {
  const cases = {
    electerm: '/electerm',
    '/electerm': '/electerm',
    '/electerm/': '/electerm',
    '  /electerm/  ': '/electerm',
    'a/b/': '/a/b',
    '/a//': '/a'
  }
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(normalizeBasePath(input), expected, input)
  }
})

function runStrip (bp, url) {
  const req = { url }
  let called = false
  stripBasePath(bp)(req, {}, () => { called = true })
  assert.ok(called, 'next() must always run')
  return req.url
}

test('stripBasePath: no base path leaves the url alone', () => {
  assert.equal(runStrip('', '/api/login'), '/api/login')
  assert.equal(runStrip('', '/electerm/x'), '/electerm/x')
})

test('stripBasePath: prefix is removed exactly once', () => {
  assert.equal(runStrip('/electerm', '/electerm'), '/')
  assert.equal(runStrip('/electerm', '/electerm/'), '/')
  assert.equal(runStrip('/electerm', '/electerm?x=1'), '/?x=1')
  assert.equal(runStrip('/electerm', '/electerm/terminals/1?token=x'), '/terminals/1?token=x')
  assert.equal(runStrip('/electerm', '/electerm/api/icon/a.png'), '/api/icon/a.png')
})

test('stripBasePath: lookalike paths and other sub-paths are untouched', () => {
  assert.equal(runStrip('/electerm', '/electermfoo'), '/electermfoo')
  assert.equal(runStrip('/electerm', '/electerm-other/x'), '/electerm-other/x')
  assert.equal(runStrip('/electerm', '/'), '/')
  assert.equal(runStrip('/electerm', '/api/login'), '/api/login')
  // a nested base path must not be stripped by a shorter one
  assert.equal(runStrip('/a', '/a/b/c'), '/b/c')
})
