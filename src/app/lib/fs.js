import { spawn, exec } from 'child_process'
import fs, { promises as fss } from 'fs'
import log from '../common/log.js'
import * as tar from 'tar'
import { isWin, isMac, tempDir } from '../common/runtime-constants.js'
import uid from '../common/uid.js'
import path from 'path'
import { promisify } from 'util'
import { Bash } from 'node-bash'
import { getSizeCount, getSizeCountWin } from '../common/count-folder-data.js'

const ROOT_PATH = '/'
const execAsync = promisify(
  exec
)

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
 * run cmd
 * @param {string} cmd
 */
const run = (cmd) => {
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

function getFolderSizeWin (folderPath) {
  return runWinCmd(
    `Get-ChildItem -Path "${folderPath}" -Recurse | Where-Object { ! $_.PSIsContainer } | Measure-Object -Property Length -Sum`
  ).then(res => getSizeCountWin(res.stdout))
}

function getFolderSize (folderPath) {
  if (isWin) {
    return getFolderSizeWin(folderPath)
  }
  return run(`du -sh "${folderPath}" && find "${folderPath}" -type f | wc -l`)
    .then(getSizeCount)
}

/**
 * rm -rf directory
 * @param {string} localFolderPath absolute path of directory
 */
const rmrf = (localFolderPath) => {
  const cmd = isWin
    ? `Remove-Item '${localFolderPath}' -Force -Recurse -ErrorAction SilentlyContinue`
    : `rm -rf "${localFolderPath}"`
  return isWin ? runWinCmd(cmd) : run(cmd)
}

/**
 * mv from to
 * @param {string} localFolderPath absolute path of directory
 */
const mv = (from, to) => {
  const cmd = isWin
    ? `Move-Item '${(from)}' '${to}'`
    : `mv '${from}' '${to}'`
  return isWin ? runWinCmd(cmd) : run(cmd)
}

/**
 * cp from to
 * @param {string} localFolderPath absolute path of directory
 */
const cp = (from, to) => {
  const cmd = isWin
    ? `Copy-Item '${from}' -Destination '${to}' -Recurse`
    : `cp -r "${from}" "${to}"`
  return isWin ? runWinCmd(cmd) : run(cmd)
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
  let cmd
  if (isWin) {
    cmd = `Invoke-Item '${localFilePath}'`
    return runWinCmd(cmd)
  }
  cmd = (isMac
    ? 'open'
    : 'xdg-open') +
    ` "${localFilePath}"`
  return run(cmd)
}

/**
 * zip file
 * @param {string} localFolerPath absolute path of a folder
 */
const zipFolder = (localFolerPath) => {
  return new Promise((resolve, reject) => {
    const n = uid()
    const p = path.resolve(tempDir, `electerm-temp-${n}.tar.gz`)
    const cwd = path.dirname(localFolerPath)
    const file = path.basename(localFolerPath)
    return tar.c({
      gzip: true,
      file: p,
      cwd
    }, [file])
  })
}

/**
 * unzip file
 * @param {string} localFilePath absolute path of a zip file
 * @param {string} targetFolderPath absolute path of unzip target folder
 */
const unzipFile = (localFilePath, targetFolderPath) => {
  return new Promise((resolve, reject) => {
    try {
      tar.x({
        file: localFilePath,
        C: targetFolderPath
      }, () => {
        resolve(1)
      })
    } catch (e) {
      log.error(e)
      reject(e)
    }
  })
}

async function listWindowsRootPath () {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
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
}

const readCustom = (p1, arr, ...args) => {
  return new Promise((resolve, reject) => {
    fs.read(p1, decodeBase64String(arr), ...args, (err, n, buffer) => {
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

const statCustom = async (...args) => {
  const st = await fss.stat(...args)
  st.isD = st.isDirectory()
  st.isF = st.isFile()
  return st
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
    zipFolder,
    unzipFile,
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
