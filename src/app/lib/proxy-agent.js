import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

// common proxy agent creator
export const createProxyAgent = (url = '') => {
  if (
    typeof url !== 'string' ||
    (!url.startsWith('http') && !url.startsWith('socks'))
  ) {
    return
  }
  const Cls = url.startsWith('http')
    ? HttpsProxyAgent
    : SocksProxyAgent
  return new Cls(url, {
    keepAlive: true
  })
}
