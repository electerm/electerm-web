import { test as it } from '@playwright/test'
import { expect } from 'chai'
import * as path from '../../src/client/web-components/path.js'

const { describe } = it

describe('path.resolve', () => {
  // it('should resolve a path relative to the current working directory', () => {
  //   global.window = {
  //     et: {
  //       isWin: false
  //     }
  //   }
  //   const result = path.resolve('foo/bar', 'baz');
  //   expect(result).to.equal(`${process.cwd()}/foo/bar/baz`);
  // });

  it('1. should resolve an absolute path', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    const result = path.resolve('/foo/bar', 'baz')
    expect(result).to.equal('/foo/bar/baz')
  })

  it('2. should resolve a Windows-style absolute path', () => {
    global.window = {
      et: {
        isWin: true
      }
    }
    const result = path.resolve('C:\\foo\\bar', 'baz')
    expect(result).to.equal('C:\\foo\\bar\\baz')
  })

  it('3. should resolve a path with .. segments', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    const result = path.resolve('/foo/bar', '../baz')
    expect(result).to.equal('/foo/baz')
  })

  it('4. should resolve a path with . segments', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    const result = path.resolve('/foo/bar', './baz')
    expect(result).to.equal('/foo/bar/baz')
  })

  it('5. should resolve a path with multiple segments', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    const result = path.resolve('/foo/bar', 'baz', '../qux')
    expect(result).to.equal('/foo/bar/qux')
  })

  it('6. should resolve a path with a trailing separator', () => {
    global.window = {
      et: {
        isWin: false
      }
    }
    const result = path.resolve('/foo/bar/', 'baz/')
    expect(result).to.equal('/foo/bar/baz')
  })
})
