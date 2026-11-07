/**
 * Load system-trusted CA certificates for the main web app process.
 */

import { execFileSync } from 'child_process'
import { existsSync, readdirSync, readFileSync } from 'fs'
import https from 'https'
import os from 'os'
import { join } from 'path'

// A certificate store dump is a few hundred KB on a stock system and grows with
// every CA the user adds (163 certs / 244KB on a default macOS install), so the
// 1MB default is too close for comfort.
const MAX_BUFFER = 64 * 1024 * 1024

let cachedPem = null
let globalApplied = false

/**
 * Keychains to read on macOS. Every entry is its own argv element and the
 * command never goes through a shell: the login keychain path used to be
 * concatenated into a shell command line, so a home directory containing a
 * space (`/Users/john doe`) made `security` fail and this function returned ''
 * — silently, because the failure is swallowed below. The CA store then held
 * nothing from the OS and every sync to a server with an internal CA failed
 * with "unable to get local issuer certificate" no matter what the user
 * installed.
 * @param {string} home
 * @returns {string[]}
 */
export function buildMacArgs (home) {
  return [
    'find-certificate',
    '-a',
    '-p',
    '/System/Library/Keychains/SystemRootCertificates.keychain',
    '/Library/Keychains/System.keychain',
    join(home, 'Library/Keychains/login.keychain-db')
  ]
}

// The script has no interpolation, but it is still handed over as
// -EncodedCommand: through `powershell -Command "<script>"` the quoting is
// re-parsed by console applications, which is the trap described in
// buildWinCmdArgs() in lib/fs.js.
export const WIN_CA_SCRIPT =
  'Get-ChildItem -Path Cert:\\LocalMachine\\Root, Cert:\\LocalMachine\\CA, ' +
  'Cert:\\CurrentUser\\Root, Cert:\\CurrentUser\\CA ' +
  '| Where-Object { $_.NotAfter -gt (Get-Date) } ' +
  '| ForEach-Object { \'-----BEGIN CERTIFICATE-----\'; ' +
  '[System.Convert]::ToBase64String($_.RawData, \'InsertLineBreaks\'); ' +
  '\'-----END CERTIFICATE-----\' }'

/**
 * @returns {string[]}
 */
export function buildWinArgs () {
  return [
    '-NoLogo',
    '-NonInteractive',
    '-NoProfile',
    '-EncodedCommand',
    Buffer.from(WIN_CA_SCRIPT, 'utf16le').toString('base64')
  ]
}

function loadMacOS () {
  try {
    return execFileSync('security', buildMacArgs(os.homedir()), {
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: MAX_BUFFER
    })
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
    return execFileSync('powershell.exe', buildWinArgs(), {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
      maxBuffer: MAX_BUFFER
    })
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
