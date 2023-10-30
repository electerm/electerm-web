import assert from 'assert'
import { test as it } from '@playwright/test'
import { join as nodejsJoin } from 'path'
import { join as myJoin } from '../../src/client/web-components/path.js'

const { describe } = it

describe('join', () => {
  it('should return the input string if only one argument is passed', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    assert.strictEqual(myJoin('foo'), nodejsJoin('foo'))
  })

  it('should join two or more strings with the correct separator', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    assert.strictEqual(myJoin('foo', 'bar'), nodejsJoin('foo', 'bar'))
    assert.strictEqual(myJoin('foo/', '/bar'), nodejsJoin('foo/', '/bar'))
    assert.strictEqual(myJoin('/foo', 'bar/'), nodejsJoin('/foo', 'bar/'))
  })

  it('should normalize the path separators', () => {
    global.window = {
      et: {
        isWin: true
      }
    }
    assert.strictEqual(myJoin('foo\\bar', 'baz\\qux'), 'foo\\bar\\baz\\qux')
  })

  it('should handle absolute paths correctly', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    assert.strictEqual(myJoin('/foo', '/bar'), nodejsJoin('/foo', '/bar'))
    assert.strictEqual(myJoin('/foo/', '/bar'), nodejsJoin('/foo/', '/bar'))
    assert.strictEqual(myJoin('/foo', 'bar'), nodejsJoin('/foo', 'bar'))
  })
})
