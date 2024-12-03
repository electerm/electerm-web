import fs from 'fs'
import globalState from './global-state.js'

function onWatch (curr, prev) {
  try {
    const text = fs.readFileSync(globalState.get('watchFilePath')).toString()
    globalState.get('win').webContents.send('file-change', text)
  } catch (e) {
    console.log('send file change fail', e)
  }
}

export const watchFile = (path) => {
  globalState.set('watchFilePath', path)
  fs.watchFile(path, onWatch)
}

export const unwatchFile = (path) => {
  globalState.set('watchFilePath', '')
  fs.unwatchFile(path, onWatch)
}
