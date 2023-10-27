import pkg from 'shelljs'

const { rm } = pkg

rm('-rf', [
  'dist'
])
