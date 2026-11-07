/**
 * copy the things vite does not build: statics, the server's pug views and
 * the electerm-icons set
 *
 * Every copy here has to be idempotent. `cp -r src dst` copies src *into* dst
 * when dst already exists, so copying `node_modules/electerm-icons/icons` onto
 * `dist/assets/icons` gave `dist/assets/icons/icons/*.svg` on the second build
 * and every `extIconPath` url (`/icons/<name>.svg` in production, see
 * src/app/common/runtime-constants.js) 404'd. Directory targets are therefore
 * emptied before they are filled, and statics are copied entry by entry.
 */
import { basename, resolve } from 'path'
import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync
} from 'fs'
import { cwd } from './build-common.js'

const dist = resolve(cwd, 'dist')
const assets = resolve(dist, 'assets')
const statics = resolve(cwd, 'src/client/statics')

const dirCopies = [
  // served at /icons/<name>.svg, target is ours alone, so clearing it is safe
  {
    from: resolve(cwd, 'node_modules/electerm-icons/icons'),
    to: resolve(assets, 'icons')
  },
  // the pug templates index() renders
  {
    from: resolve(cwd, 'src/app/views'),
    to: resolve(dist, 'views')
  }
]

for (const { from, to } of dirCopies) {
  rmSync(to, {
    recursive: true,
    force: true
  })
  cpSync(from, to, {
    recursive: true
  })
}

mkdirSync(assets, {
  recursive: true
})
for (const name of readdirSync(statics)) {
  cpSync(resolve(statics, name), resolve(assets, basename(name)), {
    recursive: true
  })
}
