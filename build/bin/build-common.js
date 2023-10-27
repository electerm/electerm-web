/**
 * common functions for build
 */

import { exec } from 'child_process'

export const run = function (cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err || stderr) {
        return reject(err || stderr)
      }
      resolve(stdout)
    })
  }).then(console.log).catch(console.error)
}

export const cwd = process.cwd()
