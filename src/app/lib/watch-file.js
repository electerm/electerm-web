import fs from 'fs'
import globalState from './global-state.js'
import _ from 'lodash'

const onWatch = _.debounce(() => {
  try {
    const filePath = globalState.get('watchFilePath')
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8')
      globalState.get('win').webContents.send('file-change', text)
    } else {
      console.log('Watched file no longer exists')
      globalState.get('win').webContents.send('file-deleted')
    }
  } catch (e) {
    console.error('Error reading file:', e)
    globalState.get('win').webContents.send('file-read-error', e.message)
  }
}, 300, { leading: false, trailing: true })

export const watchFile = (path) => {
  globalState.set('watchFilePath', path)
  fs.watchFile(path, onWatch)
}

export const unwatchFile = (path) => {
  globalState.set('watchFilePath', '')
  fs.unwatchFile(path, onWatch)
}

const cleanWatchFile = () => {
  globalState.set('watchFilePath', '')
  const filePath = globalState.get('watchFilePath')
  if (!filePath) {
    return
  }
  fs.unwatchFile(filePath, onWatch)
}

process.on('exit', cleanWatchFile)
