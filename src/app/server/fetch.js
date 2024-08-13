/**
 * node fetch in server side
 */

import rp from 'axios'
import { createProxyAgent } from '../lib/proxy-agent.js'

rp.defaults.proxy = false

function fetch (options) {
  return rp(options)
    .then((res) => {
      return res.data
    })
    .catch(error => {
      return {
        error
      }
    })
}

export default async function wsFetchHandler (ws, msg) {
  const { id, options, proxy } = msg
  const agent = createProxyAgent(proxy)
  if (agent) {
    options.httpsAgent = agent
  } else {
    options.proxy = false
  }
  const res = await fetch(options)
  if (res.error) {
    console.log(res.error)
    ws.s({
      error: res.error.message,
      id
    })
  } else {
    ws.s({
      data: res,
      id
    })
  }
}
