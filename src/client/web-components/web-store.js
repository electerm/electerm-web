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

loginExtend(Store)

const store = manage(new Store())

window.store = store
store.initMcpHandler()
export default store
