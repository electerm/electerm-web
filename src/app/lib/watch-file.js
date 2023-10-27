import fs from 'fs'

function onWatch (curr, prev) {
  try {
    const text = fs.readFileSync(global.watchFilePath).toString()
    global.win.webContents.send('file-change', text)
  } catch (e) {
    console.log('send file change fail', e)
  }
}

export const watchFile = (path) => {
  global.watchFilePath = path
  fs.watchFile(path, onWatch)
}

export const unwatchFile = (path) => {
  global.watchFilePath = ''
  fs.watchFile(path, onWatch)
}
