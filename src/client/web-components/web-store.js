/**
 * central state store powered by manate - https://github.com/tylerlong/manate
 */

import { manage } from 'manate'
import initState from '../electerm-react/store/init-state'
import { StateStore } from '../electerm-react/store/store'
import loginExtend from './store-login'

class Store extends StateStore {
  constructor () {
    super()
    Object.assign(
      this,
      initState,
      {
        logined: false,
        authChecked: false,
        fetchingUser: false,
        logining: false,
        height: window.innerHeight,
        _config: {}
      }
    )
  }
}

let mcpHandlerBound = false

Store.prototype.initMcpHandler = function () {
  // The desktop build gets this called when the main process starts the MCP
  // widget; the web build has no such push, so module init below calls it too.
  // Register through the web-api ipc dispatch (`ipcOnEvent`) instead of a raw
  // `addEventListener` on the current socket: the common socket is replaced on
  // every (re)connect and only listeners recorded here are replayed onto the
  // new one — a raw listener would silently die with the old socket.
  // Idempotent, so both call paths can coexist.
  if (mcpHandlerBound) {
    return
  }
  mcpHandlerBound = true
  window.pre.ipcOnEvent('mcp-request', (e, msg) => {
    const { requestId, action, data } = msg || {}
    if (action === 'tool-call') {
      window.store.handleMcpToolCall(requestId, data.toolName, data.args)
    }
  })
}

loginExtend(Store)

const store = manage(new Store())

window.store = store

// web build: nothing ever calls initMcpHandler here, wire the MCP bridge up
// as soon as the store exists (safe before login, see the note above)
store.initMcpHandler()

export default store
