/**
 * User widgets: a folder in <data dir>/widgets/<id>/ with a package.json.
 *
 *   package.json      metadata + entries (this is what the host reads to list)
 *   main (js)         main-process entry, same contract as a built-in widget:
 *                     widgetInfo + widgetRun(config, ctx), plus any extra
 *                     exported function the widget's UI calls through
 *                     `electerm.call(name, ...args)`
 *   electerm.ui       optional html file: the widget gets its own panel in the
 *                     renderer, served from this app inside an iframe
 *
 * A widget without `ui` is a config-mode widget: electerm renders the form
 * from `electerm.configs`, calls `electerm.action` (default "run") in the main
 * process on submit, and draws the returned result (message/details/table/
 * buttons/openTab) with its own components. No HTML, no CSS, no bridge.
 *
 * Metadata is read from package.json only: listing a widget must never execute
 * its code, so a broken widget still shows up (as an error) instead of taking
 * the whole list down.
 */

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
import {
  getUserWidgetDir,
  ensureUserWidgetDir,
  isValidWidgetId,
  resolveUserWidgetDir,
  isInside
} from './paths.js'

const WORKER_DEFAULT_ENTRY = 'index.js'
const WIDGET_TYPES = ['once', 'instance', 'frontend']
const CONFIG_TYPES = ['string', 'textarea', 'number', 'boolean', 'password', 'file', 'directory', 'select']
const DEFAULT_ACTION = 'run'
const ACTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/
// never copied on install
const IGNORED_DIRS = new Set(['.git'])

// ES modules are cached by URL and there is no require.cache to drop, so a
// widget folder is loaded through a versioned URL that a reinstall bumps.
// Everything else keeps one module instance per folder: a widget's exported
// functions share module state (its UI calls back into it), so re-importing on
// every call would reset that state.
const moduleCache = new Map()
const moduleVersions = new Map()
// a CommonJS widget's own modules are cached by file path, not by import url
const cjsRequire = createRequire(import.meta.url)

function readJSON (file) {
  let source
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch (e) {
    throw new Error(`cannot read ${path.basename(file)}: ${e.message}`)
  }
  try {
    return JSON.parse(source)
  } catch (e) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${e.message}`)
  }
}

// `My Widget@1` -> `my-widget-1`; the id doubles as a folder name and as the
// last segment of the widget asset URL, so it is kept strictly to [a-z0-9-].
export function normalizeWidgetId (name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeChoices (choices) {
  if (!Array.isArray(choices)) {
    return undefined
  }
  const list = choices
    .map(choice => (
      choice && typeof choice === 'object'
        ? { label: String(choice.label == null ? choice.value : choice.label), value: String(choice.value) }
        : { label: String(choice), value: String(choice) }
    ))
    .filter(choice => choice.value !== 'undefined')
  return list.length ? list : undefined
}

/**
 * One config entry becomes one form row.
 *
 * `name` is the storage key (same field built-in widgets use); `label` is what
 * the user reads. Everything else is presentation, and only known keys are
 * copied, so a package.json cannot smuggle props into the antd controls.
 */
function sanitizeConfigs (configs) {
  if (!Array.isArray(configs)) {
    return []
  }
  return configs
    .filter(item => item && typeof item.name === 'string' && item.name)
    .map(item => {
      const type = CONFIG_TYPES.includes(item.type) ? item.type : 'string'
      const res = {
        name: item.name,
        label: typeof item.label === 'string' && item.label ? item.label : item.name,
        type,
        description: typeof item.description === 'string' ? item.description : '',
        placeholder: typeof item.placeholder === 'string' ? item.placeholder : '',
        required: !!item.required,
        default: item.default
      }
      const choices = sanitizeChoices(item.choices)
      if (choices) {
        res.choices = choices
      }
      if (type === 'file' && Array.isArray(item.filters)) {
        const filters = item.filters
          .filter(filter => filter && typeof filter.name === 'string' && Array.isArray(filter.extensions))
          .map(filter => ({
            name: filter.name,
            extensions: filter.extensions.map(String)
          }))
        if (filters.length) {
          res.filters = filters
        }
      }
      return res
    })
}

function errorEntry (id, message) {
  const safeId = isValidWidgetId(id) ? id : (normalizeWidgetId(id) || 'widget')
  return {
    id: safeId,
    builtin: false,
    state: 'error',
    error: message,
    info: {
      name: id,
      description: message,
      version: '0.0.0',
      author: '',
      type: 'frontend',
      builtin: false,
      singleInstance: false,
      configs: [],
      ui: '',
      action: DEFAULT_ACTION,
      submitLabel: '',
      persist: false
    }
  }
}

// Resolve one folder into a registry entry. Throws with a readable message so
// the caller can list the widget as broken rather than drop it silently.
function readWidget (dir, folderName) {
  const pkgFile = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgFile)) {
    return null
  }
  const pkg = readJSON(pkgFile)
  const conf = pkg.electerm && typeof pkg.electerm === 'object' ? pkg.electerm : {}

  const id = typeof conf.id === 'string' && conf.id ? conf.id : folderName
  if (id !== folderName) {
    throw new Error(`widget id "${id}" does not match its folder name "${folderName}"`)
  }

  const ui = typeof conf.ui === 'string' ? conf.ui.trim() : ''
  const type = conf.type || (ui ? 'frontend' : 'instance')
  if (!WIDGET_TYPES.includes(type)) {
    throw new Error(`invalid widget type "${type}" (expected one of ${WIDGET_TYPES.join(', ')})`)
  }

  const main = typeof pkg.main === 'string' && pkg.main ? pkg.main : WORKER_DEFAULT_ENTRY
  const mainPath = path.resolve(dir, main)
  if (!isInside(dir, mainPath)) {
    throw new Error(`main entry must stay inside the widget folder: ${main}`)
  }
  if (!fs.existsSync(mainPath)) {
    throw new Error(`widget entry not found: ${main}`)
  }

  if (ui) {
    const uiPath = path.resolve(dir, ui)
    if (!isInside(dir, uiPath)) {
      throw new Error(`ui entry must stay inside the widget folder: ${ui}`)
    }
    if (!fs.existsSync(uiPath)) {
      throw new Error(`widget ui not found: ${ui}`)
    }
  }

  const author = conf.author || (typeof pkg.author === 'string'
    ? pkg.author
    : (pkg.author && pkg.author.name) || '')
  // Config mode: no ui file, the host renders the form from configs and calls
  // this main-process export on submit. Invalid names fall back instead of
  // failing the widget, since the action is only reachable at submit time.
  const action = typeof conf.action === 'string' && ACTION_NAME.test(conf.action)
    ? conf.action
    : DEFAULT_ACTION

  return {
    id,
    builtin: false,
    state: 'ok',
    info: {
      name: conf.name || pkg.displayName || pkg.name || id,
      description: conf.description || pkg.description || '',
      version: conf.version || pkg.version || '0.0.0',
      author,
      homepage: conf.homepage || pkg.homepage || '',
      type,
      builtin: false,
      singleInstance: !!conf.singleInstance,
      configs: sanitizeConfigs(conf.configs),
      // relative to the widget folder; the renderer builds the iframe url out
      // of it, see widgets/protocol.js
      ui,
      action,
      submitLabel: typeof conf.submitLabel === 'string' ? conf.submitLabel : '',
      // remember non-password values in local storage between panel visits
      persist: !!conf.persist
    }
  }
}

export function listUserWidgets () {
  let root
  try {
    root = ensureUserWidgetDir()
  } catch (e) {
    console.error('Failed to create user widget directory:', e)
    return []
  }
  let names = []
  try {
    names = fs.readdirSync(root)
  } catch (e) {
    console.error(`Failed to read user widget directory ${root}:`, e)
    return []
  }
  const res = []
  for (const name of names) {
    if (name.startsWith('.')) {
      continue
    }
    const dir = path.join(root, name)
    try {
      if (!fs.statSync(dir).isDirectory()) {
        continue
      }
      const entry = readWidget(dir, name)
      // no package.json: not a widget, just a folder someone keeps here
      if (entry) {
        res.push(entry)
      }
    } catch (error) {
      console.error(`Error loading user widget ${name}:`, error)
      res.push(errorEntry(name, error.message))
    }
  }
  return res
}

export function resolveUserWidgetEntry (id) {
  const dir = resolveUserWidgetDir(id)
  const pkgFile = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgFile)) {
    throw new Error(`Widget ${id} not found`)
  }
  const pkg = readJSON(pkgFile)
  const main = typeof pkg.main === 'string' && pkg.main ? pkg.main : WORKER_DEFAULT_ENTRY
  const entry = path.resolve(dir, main)
  if (!isInside(dir, entry)) {
    throw new Error(`Invalid widget ID: ${id}`)
  }
  if (!fs.existsSync(entry)) {
    throw new Error(`Widget ${id} entry not found: ${main}`)
  }
  return entry
}

export function isUserWidget (id) {
  try {
    return fs.existsSync(path.join(resolveUserWidgetDir(id), 'package.json'))
  } catch (e) {
    return false
  }
}

/**
 * Import a widget module, one instance per folder until it is reinstalled.
 *
 * The widget's own package.json decides whether its entry is ESM or CommonJS
 * (no "type" field there means CommonJS, which is what most widgets ship), so
 * the CommonJS namespace is unwrapped to the plain exports object.
 */
export function importUserWidgetModule (entry) {
  const key = path.resolve(entry)
  if (moduleCache.has(key)) {
    return moduleCache.get(key)
  }
  const version = moduleVersions.get(key) || 0
  const url = `${pathToFileURL(key).href}?v=${version}`
  // the promise is cached too, so two concurrent callers share one evaluation
  const loaded = import(url).then(m => (
    m && m.default && !m.widgetInfo && typeof m.default === 'object'
      ? m.default
      : m
  ))
  moduleCache.set(key, loaded)
  return loaded
}

/**
 * Every spelling of one widget folder: as resolved, and as the filesystem
 * reports it. They differ whenever the data dir sits behind a symlink (macOS
 * /tmp -> /private/tmp), and the require cache stores the real path while our
 * own keys use the resolved one.
 */
function dirSpellings (dir) {
  const resolved = path.resolve(dir)
  const spellings = new Set([resolved])
  const real = (() => {
    try {
      return fs.realpathSync(resolved)
    } catch (e) {
      // the folder is already gone (uninstall): resolve its parent instead
      try {
        return path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved))
      } catch (e2) {
        return null
      }
    }
  })()
  if (real) {
    spellings.add(real)
  }
  return [...spellings]
}

function isInDir (file, spellings) {
  return spellings.some(
    dir => file === dir || file.startsWith(dir + path.sep)
  )
}

// Drop the cached instance of a widget folder, so the next load reads the files
// on disk (import dropped, uninstalled, overwritten).
export function purgeUserWidgetCache (dir) {
  const spellings = dirSpellings(dir)
  for (const key of [...moduleCache.keys()]) {
    if (isInDir(key, spellings)) {
      moduleCache.delete(key)
      moduleVersions.set(key, (moduleVersions.get(key) || 0) + 1)
    }
  }
  // A CommonJS widget is keyed by its file path in the require cache and the
  // versioned import url is ignored for it, so `?v=` alone would keep serving
  // the copy that was replaced. Drop those entries too, helpers included.
  for (const key of Object.keys(cjsRequire.cache)) {
    if (isInDir(key, spellings)) {
      delete cjsRequire.cache[key]
    }
  }
}

function copyInto (from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !IGNORED_DIRS.has(path.basename(src))
  })
}

/**
 * Install a widget folder into <data dir>/widgets/<id>/.
 *
 * Returns { id } on success, or { needOverwrite: true, id } when a widget with
 * that id is already installed and `overwrite` was not requested, so the caller
 * can ask the user instead of silently replacing their copy.
 */
export function importWidget (srcDir, overwrite = false) {
  if (typeof srcDir !== 'string' || !srcDir) {
    throw new Error('no widget folder given')
  }
  const source = path.resolve(srcDir)
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`not a folder: ${srcDir}`)
  }
  const pkgFile = path.join(source, 'package.json')
  if (!fs.existsSync(pkgFile)) {
    throw new Error('the folder has no package.json, it is not an electerm widget')
  }
  const pkg = readJSON(pkgFile)
  const conf = pkg.electerm && typeof pkg.electerm === 'object' ? pkg.electerm : {}
  const id = normalizeWidgetId(
    conf.id || pkg.name || path.basename(source)
  )
  if (!isValidWidgetId(id)) {
    throw new Error(
      `cannot derive a widget id from "${conf.id || pkg.name || path.basename(source)}", ` +
      'use lower case letters, digits and dashes only'
    )
  }
  // Validate before copying: a folder that cannot load would otherwise land in
  // the widgets dir and linger there as an error entry.
  readWidget(source, id)

  ensureUserWidgetDir()
  const target = resolveUserWidgetDir(id)
  if (fs.existsSync(target)) {
    if (!overwrite) {
      return { id, needOverwrite: true }
    }
    fs.rmSync(target, { recursive: true, force: true })
  }
  copyInto(source, target)
  purgeUserWidgetCache(target)
  return { id, success: true }
}

export function removeUserWidget (id) {
  const dir = resolveUserWidgetDir(id)
  if (!fs.existsSync(dir)) {
    throw new Error(`Widget ${id} not found`)
  }
  fs.rmSync(dir, { recursive: true, force: true })
  purgeUserWidgetCache(dir)
  return { id, success: true }
}

export { getUserWidgetDir }
