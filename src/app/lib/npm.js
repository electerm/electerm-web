import path from 'path'
import fs from 'fs'
import * as tar from 'tar'
import axios from 'axios'
import { pipeline } from 'stream/promises'
import zlib from 'zlib'

const npmRegistry = (process.env.NPM_REGISTRY || 'https://registry.npmjs.org').replace(/\/$/, '')

async function fetchManifest (packageName) {
  const encoded = packageName.replace('/', '%2f')
  const { data } = await axios.get(`${npmRegistry}/${encoded}/latest`)
  return data
}

async function extractTarball (tarballUrl, destDir) {
  const { data: stream } = await axios.get(tarballUrl, { responseType: 'stream' })
  fs.mkdirSync(destDir, { recursive: true })
  try {
    await pipeline(
      stream,
      zlib.createGunzip(),
      tar.extract({ cwd: destDir, strip: 1 })
    )
  } catch (err) {
    fs.rmSync(destDir, { recursive: true, force: true })
    throw err
  }
}

function isPackageInstalled (packageDir) {
  return fs.existsSync(path.join(packageDir, 'package.json'))
}

async function installPackage (packageName, targetFolder, visited = new Set()) {
  const cacheKey = `${packageName}@${npmRegistry}`
  if (visited.has(cacheKey)) {
    return
  }
  visited.add(cacheKey)

  const packageDir = path.join(targetFolder, 'node_modules', packageName)
  if (isPackageInstalled(packageDir)) {
    return
  }

  const manifest = await fetchManifest(packageName)
  const tarballUrl = manifest.dist && manifest.dist.tarball
  if (!tarballUrl) {
    throw new Error(`No tarball URL found for ${packageName}`)
  }

  await extractTarball(tarballUrl, packageDir)

  const deps = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies
  }

  for (const [depName] of Object.entries(deps || {})) {
    await installPackage(depName, targetFolder, visited)
  }
}

export async function downloadPackage (packageName, targetFolder) {
  const npmPath = path.join(targetFolder, 'node_modules', packageName)
  if (isPackageInstalled(npmPath)) {
    return npmPath
  }

  await installPackage(packageName, targetFolder)

  return npmPath
}
