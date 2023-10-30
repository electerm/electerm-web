import assert from 'assert'
import { test as it } from '@playwright/test'
import { basename as nodejsBasename } from 'path'
import { basename as myBasename } from '../../src/client/web-components/path.js'

const { describe } = it

describe('basename', () => {
  it('should return the filename if no extension is provided', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    assert.strictEqual(myBasename('/foo/bar/baz.txt'), nodejsBasename('/foo/bar/baz.txt'))
    assert.strictEqual(myBasename('/foo/bar/baz'), nodejsBasename('/foo/bar/baz'))
    assert.strictEqual(myBasename('/foo/bar/baz/'), nodejsBasename('/foo/bar/baz/'))
    global.window = {
      et: {
        isWin: true
      }
    }
    assert.strictEqual(myBasename('\\foo\\bar\\baz.txt'), 'baz.txt')
    assert.strictEqual(myBasename('\\foo\\bar\\baz'), 'baz')
    assert.strictEqual(myBasename('\\foo\\bar\\baz\\'), 'baz')
  })

  it('should return the filename without the extension if an extension is provided', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    assert.strictEqual(myBasename('/foo/bar/baz.txt', '.txt'), nodejsBasename('/foo/bar/baz.txt', '.txt'))
    assert.strictEqual(myBasename('/foo/bar/baz.html', '.html'), nodejsBasename('/foo/bar/baz.html', '.html'))
    assert.strictEqual(myBasename('/foo/bar/baz.html.txt', '.txt'), nodejsBasename('/foo/bar/baz.html.txt', '.txt'))
    assert.strictEqual(myBasename('\\foo\\bar\\baz.txt', '.txt'), nodejsBasename('\\foo\\bar\\baz.txt', '.txt'))
    assert.strictEqual(myBasename('\\foo\\bar\\baz.html', '.html'), nodejsBasename('\\foo\\bar\\baz.html', '.html'))
    assert.strictEqual(myBasename('\\foo\\bar\\baz.html.txt', '.txt'), nodejsBasename('\\foo\\bar\\baz.html.txt', '.txt'))
  })
})
