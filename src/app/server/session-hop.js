/**
 * Shared SSH connection-hopping utility.
 *
 * Creates a dynamic-SOCKS5 SSH tunnel through one or more hop servers
 * and returns the proxy URL to use for the final connection.
 *
 * Used by both VNC and RDP sessions.
 */

import uid from '../common/uid.js'
import { terminalSsh } from './session-ssh.js'
import findFreePort from 'find-free-port'

function getPort (fromPort = 12023) {
  return new Promise((resolve, reject) => {
    findFreePort(fromPort, '127.0.0.1', function (err, freePort) {
      if (err) {
        reject(err)
      } else {
        resolve(freePort)
      }
    })
  })
}

/**
 * Set up an SSH hop tunnel if connectionHoppings are configured.
 *
 * @param {object} initOptions - Session init options
 * @param {Array} initOptions.connectionHoppings - Hop server definitions (mutated: last item is popped)
 * @param {string} [initOptions.proxy] - Existing proxy URL to chain through
 * @returns {Promise<{ proxyUrl: string|null, ssh: object|null }>}
 *   proxyUrl - SOCKS5 URL to use for the final connection, or original proxy, or null
 *   ssh - SSH session that must be killed on cleanup, or null
 */
async function createHopProxy (initOptions) {
  const {
    proxy,
    connectionHoppings
  } = initOptions

  if (!connectionHoppings || !connectionHoppings.length) {
    return { proxyUrl: proxy || null, ssh: null }
  }

  const hop = connectionHoppings.pop()
  const fp = await getPort()

  const initOpts = {
    connectionHoppings,
    ...hop,
    hasHopping: true,
    cols: 80,
    rows: 24,
    term: 'xterm-256color',
    saveTerminalLogToFile: false,
    id: uid(),
    enableSsh: true,
    encode: 'utf-8',
    envLang: 'en_US.UTF-8',
    proxy,
    sshTunnels: [
      {
        sshTunnel: 'dynamicForward',
        sshTunnelLocalHost: '127.0.0.1',
        sshTunnelLocalPort: fp,
        id: uid()
      }
    ]
  }

  const ssh = await terminalSsh(initOpts)
  return { proxyUrl: `socks5://127.0.0.1:${fp}`, ssh }
}

export { createHopProxy, getPort }
