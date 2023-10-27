import {
  cwd
} from '../common/runtime-constants.js'
import log from '../common/log.js'
import {
  resolve
} from 'path'

const glob = {}

export async function getConf () {
  if (glob.conf) {
    return glob.conf
  }
  const conf = await import(
    resolve(cwd, 'config.js')
  ).catch(err => {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      return
    }
    log.error('read config.js failed', err)
  })
  if (conf) {
    glob.conf = conf
  }
  return glob.conf || {}
}
