import { resolve, join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { downloadPackage } from './npm.js'
import { cwd } from '../common/runtime-constants.js'

function getDataFolderPath () {
  const dbFolder = process.env.DB_PATH || resolve(cwd, 'data')
  return resolve(dbFolder, 'custom-modules')
}

function resolveModulePath (modulePath) {
  const packageJsonPath = join(modulePath, 'package.json')
  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    if (pkg.main) {
      return resolve(modulePath, pkg.main)
    }
  }
  if (existsSync(join(modulePath, 'index.js'))) {
    return join(modulePath, 'index.js')
  }
  return modulePath
}

export const customRequire = async (moduleName, options = {}) => {
  const customModulesFolderPath = options.customModulesFolderPath ||
    process.env.CUSTOM_MODULES_FOLDER_PATH ||
    getDataFolderPath()
  const isCustomModule = options.isCustomModule || false
  const downloadModule = options.downloadModule !== false

  const modulePath = resolve(customModulesFolderPath, 'node_modules', moduleName)

  if (isCustomModule) {
    try {
      const resolvedPath = resolveModulePath(modulePath)
      const mod = await import(resolvedPath)
      return mod.default || mod
    } catch (err) {
      if (!downloadModule) {
        throw err
      }
      await downloadPackage(moduleName, customModulesFolderPath)
      const resolvedPath = resolveModulePath(modulePath)
      const mod = await import(resolvedPath)
      return mod.default || mod
    }
  }

  try {
    const mod = await import(moduleName)
    return mod.default || mod
  } catch (err) {
    if (!downloadModule) {
      throw err
    }

    await downloadPackage(moduleName, customModulesFolderPath)
    const resolvedPath = resolveModulePath(modulePath)
    const mod = await import(resolvedPath)
    return mod.default || mod
  }
}
