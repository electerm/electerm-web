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

  for (const path of paths) {
    if (typeof path !== 'string') {
      throw new TypeError(`Invalid argument type: ${typeof path}`)
    }

    const parts = path.split(separator)

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

  return `${isWin ? '' : '/'}${resolved.join(separator)}`
}

export function basename (path, ext) {
  const { isWin } = window.et
  const separator = isWin ? '\\' : '/'
  const parts = path.split(separator)
  let name = parts[parts.length - 1]

  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length)
  }

  return name
}
