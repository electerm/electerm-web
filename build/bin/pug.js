// build html
/**
 * build common files with react module in it
 *
 * Generates a static dist/index.html from the pug template, injecting the
 * same data the runtime server (src/app/lib/view.js) provides to the client.
 * Mirrors upstream electerm's build/bin/pug.js, ported to ESM for this project.
 */
import fs from 'fs'
import pug from 'pug'
import { resolve } from 'path'
import deepCopy from 'json-deep-copy'

const pack = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
)

const entryPug = resolve(
  __dirname,
  '../../src/app/views/index.pug'
)
const targetFilePath = resolve(
  __dirname,
  '../../dist/index.html'
)
const pugContent = fs.readFileSync(entryPug, 'utf-8')
const defaultAIPreset = {
  baseURLAI: 'https://ai.electerm.org/api/ai',
  apiPathAI: '/chat/completions',
  modelAI: 'free',
  authHeaderNameAI: 'Authorization: Bearer',
  id: 'ai.electerm.org',
  nameAI: 'ai.electerm.org'
}

const data = {
  version: pack.version,
  siteName: pack.name,
  isDev: false,
  cdn: '',
  // the template interpolates this; a static build always sits at the root
  basePath: '',
  tokenElecterm: '',
  defaultAIPreset
}
const htmlContent = pug.render(pugContent, {
  filename: entryPug,
  ...data,
  _global: deepCopy(data)
})
fs.writeFileSync(targetFilePath, htmlContent, 'utf8')
