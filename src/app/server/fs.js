/**
 * fs in child process
 */

import { fsExport as fs } from '../lib/fs.js'

export default function handleFs (ws, msg) {
  const { id, args, func } = msg
  console.log('handleFs', id, args, func)
  fs[func](...args)
    .then(data => {
      ws.s({
        id,
        data
      })
    })
    .catch(err => {
      ws.s({
        id,
        error: {
          message: err.message,
          stack: err.stack
        }
      })
    })
}
