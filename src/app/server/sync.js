/**
 * handle sync with github/gitee
 */

import GitHubOri from 'gist-wrapper'
import GiteeOri from 'gitee-client'
import customSync from 'electerm-sync'
import log from '../common/log.js'
import { createProxyAgent } from '../lib/proxy-agent.js'

class Gitee extends GiteeOri {
  create (data, conf) {
    return this.post('/v5/gists', data, conf)
  }

  update (gistId, data, conf) {
    return this.patch(`/v5/gists/${gistId}`, data, conf)
  }

  getOne (gistId, conf) {
    return this.get(`/v5/gists/${gistId}`, conf)
  }

  delOne (gistId, conf) {
    return this.delete(`/gists/${gistId}`, conf)
  }

  test (conf) {
    return this.get('/v5/gists?page=1&per_page=1', conf)
  }
}

class GitHub extends GitHubOri {
  test (conf) {
    return this.get('/gists?page=1&per_page=1', conf)
  }
}

const dist = {
  gitee: Gitee,
  github: GitHub,
  custom: customSync,
  cloud: customSync
}

async function doSync (type, func, args, token, proxy) {
  const argsArr = [...args]
  const inst = new dist[type](token)
  if (type === 'cloud') {
    argsArr[0] = ''
  }
  const agent = createProxyAgent(proxy)
  const conf = agent
    ? {
        httpsAgent: agent
      }
    : {
        proxy: false
      }
  return inst[func](...argsArr, conf)
    .then(r => r.data)
    .catch(e => {
      log.error('sync error')
      log.error(e)
      return {
        error: e
      }
    })
}

export default async function wsSyncHandler (ws, msg) {
  const { id, type, args, func, token, proxy } = msg
  const res = await doSync(type, func, args, token, proxy)
  if (res.error) {
    ws.s({
      error: res.error,
      id
    })
  } else {
    ws.s({
      data: res,
      id
    })
  }
}
