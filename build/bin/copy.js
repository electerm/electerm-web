import { resolve } from 'path'
import pkg from 'shelljs'
import { cwd } from './build-common.js'

const { cp } = pkg

const from0 = resolve(
  cwd,
  'node_modules/vscode-icons/icons'
)
const from1 = resolve(
  cwd,
  'src/app/views'
)
const from3 = resolve(
  cwd,
  '../iTerm2-Color-Schemes/electerm/*'
)
const to1 = resolve(
  cwd,
  'dist'
)
const to2 = resolve(
  cwd,
  'dist/assets/icons'
)
const to4 = resolve(
  cwd,
  'dist/assets/iTerm2-Color-Schemes/'
)
const arr = [
  {
    from: from1,
    to: to1
  },
  {
    from: from0,
    to: to2
  }, {
    from: from3,
    to: to4
  }
]

for (const obj of arr) {
  const {
    file, from, to
  } = obj
  if (file) {
    cp(from, to)
  } else {
    cp('-r', from, to)
  }
}
