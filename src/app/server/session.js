function getModulePath (type) {
  return `./session-${type}.js`
}
function getType (initOptions) {
  const type = initOptions.termType || initOptions.type
  const tail = [
    'telnet',
    'serial',
    'local',
    'rdp',
    'vnc',
    'spice'
  ].includes(type)
    ? type
    : 'ssh'
  return tail
}

export const terminal = async function (initOptions, ws) {
  const type = getType(initOptions)
  console.log('type', type)
  const modulePath = getModulePath(type)
  const { terminal } = await import(modulePath)
  return terminal(initOptions, ws)
}

export const testConnection = async (initOptions) => {
  const type = getType(initOptions)
  const modulePath = getModulePath(type)
  const { testConnection } = await import(modulePath)
  return testConnection(initOptions)
}
