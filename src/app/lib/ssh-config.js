/**
 * read ssh config
 */

import sshConfig from 'ssh-config'
import { resolve } from 'path'
import { home } from '../common/runtime-constants.js'
import log from '../common/log.js'
import fs from 'fs/promises'

export async function loadSshConfig () {
  const defaultPort = 22
  let config = []
  try {
    const configStr = await fs.readFile(
      resolve(home, '.ssh', 'config'), 'utf8'
    )
    const sshConf = sshConfig.parse(configStr)
    config = sshConf.map((c, i) => {
      const { value } = c
      if (!value) {
        return null
      }
      const obj = sshConf.compute(value.split(/\s/g)[0])
      const { HostName, User, Port = defaultPort, Host } = obj
      if (!Host) {
        return null
      }
      return {
        host: HostName,
        username: User,
        port: Port,
        title: value,
        type: 'ssh-config',
        id: 'ssh' + i
      }
    }).filter(d => d)
  } catch (e) {
    log.debug('error parsing $HOME/.ssh/config')
    log.debug('maybe no $HOME/.ssh/config, it is ok')
  }
  return config
}
