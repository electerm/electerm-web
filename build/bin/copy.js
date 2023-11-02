import { resolve } from 'path'
import pkg from 'shelljs'
import { cwd } from './build-common.js'

const { cp } = pkg

const f1 = resolve(
  cwd,
  'src/client/statics/*'
)
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
  'build/iTerm2-Color-Schemes/electerm/*'
)
const t1 = resolve(
  cwd,
  'dist/assets/'
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
    from: f1,
    to: t1
  },
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
