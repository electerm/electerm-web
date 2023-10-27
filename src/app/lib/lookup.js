/**
 * dns lookup
 */
import { lookup } from 'dns'

export default (host) => {
  return new Promise((resolve, reject) => {
    lookup(host, function (err, result) {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  })
}
