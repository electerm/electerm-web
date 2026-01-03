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
        _config: {
          tokenElecterm: window.localStorage.getItem('tokenElecterm') || ''
        }
      }
    )
  }
}

Store.prototype.initMcpHandler = function () {
  // Listen for MCP requests from main process
  window.et.commonWs.addEventListener('message', (e) => {
    if (e &&
      e.data &&
      typeof e.data === 'string' &&
      e.data.startsWith('{') &&
      e.data.endsWith('}') &&
      JSON.parse(e.data).type === 'mcp-request'
    ) {
      const { requestId, action, data } = JSON.parse(e.data)
      if (action === 'tool-call') {
        window.store.handleMcpToolCall(requestId, data.toolName, data.args)
      }
    }
  })
}

loginExtend(Store)

const store = manage(new Store())

window.store = store
export default store
