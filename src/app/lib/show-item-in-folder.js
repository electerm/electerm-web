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

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to show item in folder: ${error.message}`))
        return
      }
      if (stderr) {
        reject(new Error(`Error: ${stderr}`))
        return
      }
      resolve('Item shown in folder successfully.')
    })
  })
}
