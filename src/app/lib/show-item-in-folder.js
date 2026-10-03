import { exec } from 'child_process'
import {
  isWin,
  isMac
} from '../common/runtime-constants.js'
import { dirname, resolve } from 'path'

export async function showItemInFolder (filePath) {
  const itemPath = resolve(filePath)
  const folderPath = dirname(itemPath)
  let command = ''

  if (isWin) {
    // For Windows
    command = `explorer.exe /select,"${itemPath}"`
  } else if (isMac) {
    // For macOS
    command = `open -R "${folderPath}"`
  } else {
    // For Linux or other Unix-like systems
    command = `xdg-open "${folderPath}"`
  }

  return new Promise((resolve) => {
    // Best-effort: the file manager may simply not be there — a headless Linux
    // server (the usual way electerm-web is self-hosted) has no xdg-open, and a
    // container may have no handler at all. "Show in folder" is purely
    // cosmetic, so never reject: a missing handler used to surface as an
    // unhandled rejection on every call.
    exec(command, (error, _stdout, stderr) => {
      if (error) {
        resolve('no file manager available')
        return
      }
      if (stderr) {
        console.warn('showItemInFolder stderr:', stderr.toString())
      }
      resolve('Item shown in folder successfully.')
    })
  })
}
