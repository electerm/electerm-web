import pkg from 'shelljs'

const { echo, rm, cp } = pkg

echo('install required modules')

rm('-rf', 'src/electerm-react')
cp('-r', 'node_modules/@electerm/electerm-react/client', 'src/electerm-react')
echo('done install required modules')
