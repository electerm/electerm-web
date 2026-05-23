import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { getSystemCAsList } from './system-ca.js'

// common proxy agent creator
export const createProxyAgent = (url = '', options = {}) => {
  if (
    typeof url !== 'string' ||
    (!url.startsWith('http') && !url.startsWith('socks'))
  ) {
    return
  }
  const Cls = url.startsWith('http')
    ? HttpsProxyAgent
    : SocksProxyAgent
  const certs = getSystemCAsList()
  const caOptions = certs.length ? { ca: certs } : {}
  return new Cls(url, {
    keepAlive: true,
    ...caOptions,
    ...options
  })
}
