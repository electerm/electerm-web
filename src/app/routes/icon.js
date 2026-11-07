/**
 * Serve a bookmark icon that was downloaded into `<data dir>/icons`.
 *
 * The desktop app hands the renderer a local path and lets it read the file
 * through the app (`icon-assets.js` builds a data url out of it). A browser has
 * no such scheme, and although the fs bridge here can read the file too, a url
 * is the better fit for an `<img>`: one cached request instead of a ws round
 * trip per row, and it keeps working while the socket is reconnecting.
 *
 * The shape is:
 *
 *   GET /api/icon/<file>
 *
 * Security notes, because this is a route that serves files off disk:
 *  - one path segment only: no nesting, no separators, no hidden names;
 *  - the name has to resolve inside `<data dir>/icons` after symlinks are
 *    followed, so a link planted by a zip cannot reach out of the folder;
 *  - only extensions an `<img>` can actually show are served;
 *  - no token on purpose: an `<img>` cannot send the `token` header, and the
 *    names are the sha256 prefix of the file (see lib/icon-download.js), so the
 *    folder cannot be listed or guessed, only addressed byte for byte. Same
 *    reasoning as the widget assets in ./widget-ui.js.
 *
 * Names are content addressed, so a name always means the same bytes: the
 * response can be cached forever, and replacing an icon writes a new name.
 */

import fs from 'fs'
import path from 'path'
import { getIconDir } from '../lib/icon-download.js'
import { isInside } from '../widgets/paths.js'

// Anything else has no business being an icon, and is not sent with a type an
// unknown extension would only confuse.
const MIME_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif'
}

// longest icon file name we ever write: 16 hash chars + '.' + a 4 char ext, so
// this only rejects garbage
const MAX_NAME_LENGTH = 128

function notFound (res) {
  res.status(404)
    .type('text/plain')
    .send('Not found')
}

/**
 * Resolve one requested name to a real file inside the icons dir.
 * @param {string} name file name as it appears in the url
 * @returns {string|null} absolute real path, or null when it must not be served
 */
export function resolveIconFile (name) {
  if (typeof name !== 'string' || !name || name.length > MAX_NAME_LENGTH) {
    return null
  }
  // a decoded `%2F` or `%5C` would otherwise reach path.join as a separator
  if (
    name.startsWith('.') ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    return null
  }
  const extension = path.extname(name).toLowerCase()
  if (!MIME_TYPES[extension]) {
    return null
  }
  let realDir
  try {
    // the folder only exists once a first icon was downloaded
    realDir = fs.realpathSync(getIconDir())
  } catch (e) {
    return null
  }
  let real
  try {
    real = fs.realpathSync(path.join(realDir, name))
  } catch (e) {
    return null
  }
  if (!isInside(realDir, real)) {
    return null
  }
  try {
    if (!fs.statSync(real).isFile()) {
      return null
    }
  } catch (e) {
    return null
  }
  return real
}

export function iconRoutes (app) {
  app.get('/api/icon/:name', (req, res) => {
    const file = resolveIconFile(req.params.name)
    if (!file) {
      return notFound(res)
    }
    res.sendFile(file, {
      // content addressed, explanation at the top of this file
      maxAge: '365d',
      immutable: true,
      headers: {
        'X-Content-Type-Options': 'nosniff'
      }
    }, err => {
      if (err && !res.headersSent) {
        notFound(res)
      }
    })
  })
}
