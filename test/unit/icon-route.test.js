import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import { resolve } from 'path'

// sandbox the data dir before the module reads it (getIconDir reads the env on
// every call, but keeping it ahead of the import documents the intent)
const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), 'electerm-icon-route-test-'))
process.env.DATA_PATH = tmpDir

const { resolveIconFile } = await import('../../src/app/routes/icon.js')

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const iconsDir = resolve(tmpDir, 'icons')

test('icon route: serves a file inside <data dir>/icons', () => {
  fs.mkdirSync(iconsDir, { recursive: true })
  fs.writeFileSync(resolve(iconsDir, 'a1b2c3.svg'), '<svg/>')
  // realpath: macOS resolves the tmp dir through /private, and the route
  // answers with the real path on purpose
  assert.equal(
    resolveIconFile('a1b2c3.svg'),
    fs.realpathSync(resolve(iconsDir, 'a1b2c3.svg'))
  )
})

test('icon route: missing icons dir is not an error', () => {
  const dir = resolve(tmpDir, 'no-such-data-dir')
  const previous = process.env.DATA_PATH
  process.env.DATA_PATH = dir
  assert.equal(resolveIconFile('a1b2c3.svg'), null)
  process.env.DATA_PATH = previous
})

test('icon route: refuses anything that is not one image file name', () => {
  const names = [
    '',
    '.',
    '..',
    '.hidden.svg',
    'nested/a1b2c3.svg',
    'nested\\a1b2c3.svg',
    'a1b2c3.txt',
    'a1b2c3',
    'a1b2c3.svg\0.png',
    `${'a'.repeat(200)}.svg`
  ]
  for (const name of names) {
    assert.equal(resolveIconFile(name), null, `should refuse ${JSON.stringify(name)}`)
  }
})

test('icon route: a symlink pointing out of the folder is refused', () => {
  const secret = resolve(tmpDir, 'secret.svg')
  fs.writeFileSync(secret, '<svg/>')
  const link = resolve(iconsDir, 'link.svg')
  fs.rmSync(link, { force: true })
  fs.symlinkSync(secret, link)
  assert.equal(resolveIconFile('link.svg'), null)
})

test('icon route: a directory is not served', () => {
  fs.mkdirSync(resolve(iconsDir, 'folder.png'), { recursive: true })
  assert.equal(resolveIconFile('folder.png'), null)
})
