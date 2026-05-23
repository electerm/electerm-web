/**
 * Load system-trusted CA certificates for the main web app process.
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import https from 'https'
import os from 'os'
import { join } from 'path'

let cachedPem = null
let globalApplied = false

function loadMacOS () {
  try {
    return execSync(
      'security find-certificate -a -p ' +
      '/System/Library/Keychains/SystemRootCertificates.keychain ' +
      '/Library/Keychains/System.keychain ' +
      `${os.homedir()}/Library/Keychains/login.keychain-db`,
      { encoding: 'utf8', timeout: 10000 }
    )
  } catch {
    return ''
  }
}

function loadLinux () {
  const dirs = [
    '/etc/ssl/certs',
    '/etc/pki/tls/certs',
    '/etc/pki/ca-trust/extracted/pem',
    '/usr/local/share/certs'
  ]
  const files = []
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      continue
    }
    try {
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.crt') || f.endsWith('.pem')) {
          files.push(join(dir, f))
        }
      }
      break
    } catch {
      // try next directory
    }
  }

  if (files.length > 0) {
    return files.map((f) => {
      try {
        return readFileSync(f, 'utf8')
      } catch {
        return ''
      }
    }).join('\n')
  }

  const bundlePaths = [
    '/etc/ssl/certs/ca-certificates.crt',
    '/etc/pki/tls/certs/ca-bundle.crt',
    '/etc/ssl/ca-bundle.pem'
  ]
  for (const p of bundlePaths) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf8')
    }
  }
  return ''
}

function loadWindows () {
  try {
    return execSync(
      'powershell -Command ' +
      '"Get-ChildItem -Path Cert:\\LocalMachine\\Root, Cert:\\LocalMachine\\CA, Cert:\\CurrentUser\\Root, Cert:\\CurrentUser\\CA ' +
      '| Where-Object { $_.NotAfter -gt (Get-Date) } ' +
      '| ForEach-Object { \'-----BEGIN CERTIFICATE-----\'; ' +
      '[System.Convert]::ToBase64String($_.RawData, \'InsertLineBreaks\'); ' +
      '\'-----END CERTIFICATE-----\' }"',
      { encoding: 'utf8', timeout: 10000, windowsHide: true }
    )
  } catch {
    return ''
  }
}

export function getSystemCAsPem () {
  if (cachedPem !== null) {
    return cachedPem
  }
  switch (os.platform()) {
    case 'darwin':
      cachedPem = loadMacOS()
      break
    case 'linux':
      cachedPem = loadLinux()
      break
    case 'win32':
      cachedPem = loadWindows()
      break
    default:
      cachedPem = ''
      break
  }
  return cachedPem
}

export function getSystemCAsList () {
  const pem = getSystemCAsPem()
  if (!pem) {
    return []
  }
  return pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || []
}

export function applySystemCAsToGlobalAgent () {
  if (globalApplied) {
    return 0
  }
  const certs = getSystemCAsList()
  if (!certs.length) {
    return 0
  }

  const existing = https.globalAgent.options.ca
  const existingList = Array.isArray(existing)
    ? existing
    : (typeof existing === 'string' ? [existing] : [])
  const merged = Array.from(new Set(existingList.concat(certs)))
  https.globalAgent.options.ca = merged
  globalApplied = true
  return certs.length
}
