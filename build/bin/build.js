/**
 * build
 */
import pkg from 'shelljs'
const { exec, echo } = pkg

echo('start build')

const timeStart = Date.now()

// echo('clean')
// exec('npm run clean')
echo('js/css file')
exec('npm run vite-build')
echo('copy file')
exec('node ./build/bin/copy.js')

const endTime = Date.now()
echo(`done build in ${(endTime - timeStart) / 1000} s`)
