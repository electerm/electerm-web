export function join (...parts) {
  const { isWin } = window.et
  const separator = isWin ? '\\' : '/'
  const joined = parts.join(separator)
  const regex = new RegExp(`${separator}{2,}`, 'g')
  return joined.replace(regex, separator)
}

export function resolve (...paths) {
  const { isWin } = window.et
  const separator = isWin ? '\\' : '/'
  const resolved = []

  let root = ''
  if (paths[0].startsWith(separator)) {
    root = separator
    paths[0] = paths[0].slice(1)
  } else if (paths[0].match(/^[a-zA-Z]+:/)) {
    root = paths.shift() + separator
  }
  const len = paths.length
  if (paths[len - 1].endsWith(separator)) {
    paths[len - 1] = paths[len - 1].slice(0, -1)
  }

  for (const path of paths) {
    if (typeof path !== 'string') {
      throw new TypeError(`Invalid argument type: ${typeof path}`)
    }

    const parts = path.split(separator).filter(d => d)

    for (const part of parts) {
      if (part === '') {
        resolved.length = 0
        break
      } else if (part === '.') {
        continue
      } else if (part === '..') {
        resolved.pop()
      } else {
        resolved.push(part)
      }
    }
  }

  return `${root}${resolved.join(separator)}`
}

export function basename (path, ext) {
  const { isWin } = window.et
  const separator = isWin ? '\\' : '/'
  const parts = path.split(separator).filter(d => d)
  const lastPart = parts[parts.length - 1]
  const basename = ext ? lastPart.slice(0, -ext.length) : lastPart
  return basename
}
