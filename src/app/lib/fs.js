import fs, { promises as fss } from 'fs'
import log from '../common/log.js'
import { isWin, isMac } from '../common/runtime-constants.js'
import path from 'path'
import { promisify } from 'util'
import { getSizeCount, getSizeCountWin } from '../common/count-folder-data.js'
import { exec, spawn } from 'child_process'
const execAsync = promisify(exec)

const ROOT_PATH = '/'

function encodeUtf8Base64 (value) {
  return Buffer.from(String(value), 'utf8').toString('base64')
}

function spawnDetachedCommand (command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: false,
      stdio: ['ignore', 'ignore', 'pipe'],
      ...options
    })
    let stderr = ''

    child.stderr.on('data', data => {
      stderr += data.toString()
    })
    child.on('error', reject)

    let settled = false
    const settle = (err) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      child.unref()
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    }

    child.on('close', code => {
      if (code !== 0) {
        settle(new Error(stderr.trim() || `Command exited with code ${code}`))
      } else {
        settle(null)
      }
    })

    const timer = setTimeout(() => settle(null), 5000)
  })
}

// Encoding function
function encodeUint8Array (uint8Arr) {
  return Buffer.from(uint8Arr).toString('base64')
}

// Decoding function
function decodeBase64String (base64String) {
  return new Uint8Array(Buffer.from(base64String, 'base64'))
}

const isWinDrive = function (path) {
  return /^\w+:$/.test(path)
}

/**
 * `node-bash` spawns a login shell, which is a pointless cost to pay at import
 * time for every process that merely touches this module. Load it on demand and
 * tolerate its absence, so a platform without a usable shell degrades the
 * shell-backed helpers instead of preventing the server from starting.
 */
let bashPromise = null
function loadBash () {
  if (!bashPromise) {
    bashPromise = import('node-bash')
      .then(m => m.Bash)
      .catch(err => {
        log.warn('node-bash is not available, local shell features will be limited:', err.message)
        return null
      })
  }
  return bashPromise
}

/**
 * run cmd
 * @param {string} cmd
 */
const run = async (cmd) => {
  const Bash = await loadBash()
  if (!Bash) {
    throw new Error('Local shell (node-bash) is not available on this platform')
  }
  const ps = new Bash({
    executableOptions: {
      '--login': true
    }
  })
  return ps.invokeCommand(cmd)
    .then(s => s.stdout.toString())
}

/**
 * run windows cmd
 * @param {string} cmd
 */
const runWinCmd = (cmd) => {
  return execAsync(`powershell.exe -Command "${cmd}"`)
}

/**
 * Escape a string for safe use inside POSIX single quotes.
 * Within single quotes the only special character is the single quote itself;
 * escape it by closing the quote, inserting an escaped quote, and reopening:
 *   '  ->  '\''
 */
function escapePosixShellArg (value) {
  return String(value).replace(/'/g, "'\\''")
}

/**
 * Escape a string for safe use inside PowerShell single-quoted strings.
 * Single quotes are escaped by doubling them:  '  ->  ''
 */
function escapePowerShellArg (value) {
  return String(value).replace(/'/g, "''")
}

function getFolderSizeWin (folderPath) {
  const safePath = escapePowerShellArg(folderPath)
  return runWinCmd(
    `Get-ChildItem -Path '${safePath}' -Recurse | Where-Object { ! $_.PSIsContainer } | Measure-Object -Property Length -Sum`
  ).then(res => getSizeCountWin(res.stdout))
}

function getFolderSize (folderPath) {
  if (isWin) {
    return getFolderSizeWin(folderPath)
  }
  const safePath = escapePosixShellArg(folderPath)
  return run(`du -sh '${safePath}' && find '${safePath}' -type f | wc -l`)
    .then(getSizeCount)
}

/**
 * rm -rf directory
 * @param {string} localFolderPath absolute path of directory
 */
const rmrf = (localFolderPath) => {
  return fss.rm(localFolderPath, { recursive: true, force: true })
}

/**
 * Recursive copy helper for Node.js < 16.7.0 (where fs.cp doesn't exist)
 */
async function cpRecursive (src, dest) {
  const stat = await fss.stat(src)
  if (stat.isDirectory()) {
    await fss.mkdir(dest, { recursive: true })
    const entries = await fss.readdir(src)
    for (const entry of entries) {
      await cpRecursive(path.join(src, entry), path.join(dest, entry))
    }
  } else {
    await fss.copyFile(src, dest)
  }
}

/**
 * cp from to
 * @param {string} from absolute source path
 * @param {string} to absolute destination path
 */
const cp = async (from, to) => {
  if (typeof fss.cp === 'function') {
    return fss.cp(from, to, { recursive: true, force: true })
  }
  return cpRecursive(from, to)
}

/**
 * mv from to
 * @param {string} from absolute source path
 * @param {string} to absolute destination path
 */
const mv = async (from, to) => {
  try {
    await fss.rename(from, to)
  } catch (error) {
    if (!error || error.code !== 'EXDEV') {
      throw error
    }
    // Cross-device move: copy then remove
    await cp(from, to)
    await fss.rm(from, { recursive: true, force: true })
  }
  return true
}

/**
 * touch file
 * @param {string} localFolderPath absolute path
 */
const touch = (localFilePath) => {
  return fss.writeFile(localFilePath, '')
}

/**
 * open file
 * @param {string} localFolderPath absolute path
 */
const openFile = (localFilePath) => {
  if (isWin) {
    const script = '$path = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($env:ELECTERM_OPEN_FILE_PATH_B64)); Invoke-Item -LiteralPath $path'
    return spawnDetachedCommand('powershell.exe', [
      '-NoLogo',
      '-NonInteractive',
      '-Command',
      script
    ], {
      windowsHide: true,
      env: {
        ...process.env,
        ELECTERM_OPEN_FILE_PATH_B64: encodeUtf8Base64(localFilePath)
      }
    })
  }
  return spawnDetachedCommand(isMac ? 'open' : 'xdg-open', [localFilePath])
}

async function listWindowsRootPath () {
  const drives = await new Promise((resolve, reject) => {
    const command = 'powershell.exe -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root"'

    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      if (stderr) {
        reject(new Error(stderr))
        return
      }
      const drives = stdout.split('\r\n')
        .map(line => line.trim())
        // Accept any valid Windows path that ends with backslash
        .filter(line => /^[^<>:"/\\|?*]+:\\$/.test(line))
        .map(drive => drive.slice(0, -1)) // Remove trailing backslash
      resolve(drives)
    })
  })
  const distros = await listWslDistros()
  return [...drives, ...distros]
}

async function listWslDistros () {
  try {
    const { stdout } = await execAsync('wsl.exe -l -q', { encoding: 'buffer' })
    const output = Buffer.from(stdout).toString('utf16le').replace(/^\uFEFF/, '')
    const distros = output.split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(name => '\\\\wsl.localhost\\' + name)
    return distros
  } catch {
    return []
  }
}

const readCustom = (p1, len, ...args) => {
  return new Promise((resolve, reject) => {
    fs.read(p1, new Uint8Array(len), ...args, (err, n, buffer) => {
      if (err) {
        return reject(err)
      }
      return resolve({ n, newArr: encodeUint8Array(buffer) })
    })
  })
}

const writeCustom = (p1, arr) => {
  return new Promise((resolve, reject) => {
    const narr = decodeBase64String(arr)
    fs.write(p1, narr, (err, n) => {
      if (err) {
        return reject(err)
      }
      return resolve(1)
    })
  })
}

const openCustom = async (...args) => {
  return new Promise((resolve, reject) => {
    fs.open(...args, (err, n) => {
      if (err) {
        return reject(err)
      }
      return resolve(n)
    })
  })
}

const closeCustom = async (...args) => {
  return new Promise((resolve, reject) => {
    fs.close(...args, (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(true)
    })
  })
}

const statCustom = async (...args) => {
  const st = await fss.stat(...args)
  st.isD = st.isDirectory()
  st.isF = st.isFile()
  return st
}

const readdirOnly = async (path) => {
  const r = await fss.readdir(path, { withFileTypes: true })
  return r.filter(dirent => dirent.isDirectory())
    .map(d => {
      return {
        name: d.name,
        isDirectory: true
      }
    })
}

const readdirAndFiles = async (path) => {
  const r = await fss.readdir(path, { withFileTypes: true })
  return r.map(d => {
    return {
      name: d.name,
      isDirectory: d.isDirectory()
    }
  })
}

export const fsExport = Object.assign(
  {},
  fss,
  {
    run,
    getFolderSize,
    runWinCmd,
    rmrf,
    touch,
    cp,
    mv,
    openFile,
    readCustom,
    statCustom,
    openCustom,
    closeCustom,
    writeCustom,
    readdirOnly,
    readdirAndFiles
  },
  {
    readdirAsync: (_path) => {
      if (_path === ROOT_PATH && isWin) {
        return listWindowsRootPath()
      }
      let path = _path
      if (isWin && isWinDrive(path)) {
        path = path + '\\'
      }
      return fss.readdir(path)
    },
    statAsync: (...args) => {
      return fss.stat(...args)
        .then(res => {
          return {
            ...res,
            isDirectory: res.isDirectory()
          }
        })
    },
    lstatAsync: (...args) => {
      return fss.lstat(...args)
        .then(res => {
          return {
            ...res,
            isDirectory: res.isDirectory(),
            isSymbolicLink: res.isSymbolicLink()
          }
        })
    },
    readFile: (...args) => {
      return fss.readFile(...args, 'utf8')
    },
    readFileAsBase64: (...args) => {
      return fss.readFile(...args)
        .then(res => {
          return res.toString('base64')
        })
    },
    writeFile: (path, txt, mode) => {
      return fss.writeFile(path, txt, { mode })
        .then(() => true)
        .catch((e) => {
          log.error('fs.writeFile', e)
          return false
        })
    }
  }
)
