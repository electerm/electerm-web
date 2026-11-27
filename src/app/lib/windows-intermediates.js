import tls from 'tls'
import { readWindowsIntermediates, useNativeWindowsCAs } from './system-ca.js'

async function installIntermediates () {
  const certs = await readWindowsIntermediates()
  if (certs.size) {
    const pem = Array.from(certs, der => `-----BEGIN CERTIFICATE-----\n${der}\n-----END CERTIFICATE-----`)
    tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...pem])
  }
}

let pending
export default function loadWindowsIntermediates () {
  if (!useNativeWindowsCAs()) return
  // Share the lookup across concurrent requests and both direct and proxy agents.
  pending ??= installIntermediates().catch(error => {
    pending = undefined
    console.warn('Unable to load Windows intermediate CAs:', error.message)
  })
  return pending
}
