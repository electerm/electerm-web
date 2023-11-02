import pkg from 'shelljs'
import {
  resolve
} from 'path'
import os from 'os'
import { cwd } from './build-common.js'

const { exec, echo, rm, cp } = pkg

const platform = os.platform()
const isWin = platform === 'win32'

const p = resolve(cwd, 'build/iTerm2-Color-Schemes')
const run = resolve(cwd, 'build/bin/cp-iterm')
echo('install required modules')
echo('install iTerm2-Color-Schemes')
rm('-rf', p)
if (isWin) {
  exec(`git clone --depth 1 https://github.com/mbadolato/iTerm2-Color-Schemes.git ${p}`)
} else {
  exec(run)
}
rm('-rf', 'src/electerm-react')
cp('-r', 'node_modules/@electerm/electerm-react/client', 'src/electerm-react')
echo('done install required modules')
