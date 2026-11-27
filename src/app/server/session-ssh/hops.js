import pick from 'lodash/pick.js'
import { connectEndpoint } from './connect.js'
import { endpointFields, getAgentOptions, getShareOptions, resolveKeyFiles } from './options.js'

export function firstHopOptions (options) {
  const result = { ...options }
  if (!options.hasHopping || !options.connectionHoppings?.length) return result

  const [first, ...rest] = options.connectionHoppings
  const destination = {}
  for (const field of [...endpointFields, 'interactiveValues', 'isMFA']) {
    destination[field] = options[field]
    result[field] = first[field]
  }
  result.connectionHoppings = [...rest, destination]
  return result
}

async function connectHop (session, upstream, hop, forwardX11) {
  const options = resolveKeyFiles({
    ...pick(hop, endpointFields),
    ...getAgentOptions(session.initOptions),
    ...getShareOptions(session.initOptions)
  })
  const { host, port = 22 } = options
  const candidates = [{ options, keyName: options.privateKeyPath }]
  return connectEndpoint(session, options, candidates, {
    upstream,
    target: { host, port },
    forwardX11,
    keyboardOnly: !!hop.isMFA,
    interactiveValues: hop.interactiveValues
  })
}

export async function connectHops (session, hops) {
  session.conns = []
  for (const [index, hop] of hops.entries()) {
    const upstream = session.conn
    const downstream = await connectHop(session, upstream, hop, index === hops.length - 1)
    session.conns.push(upstream)
    session.conn = downstream
  }
}
