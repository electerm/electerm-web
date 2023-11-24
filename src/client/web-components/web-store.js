/**
 * central state store powered by manate - https://github.com/tylerlong/manate
 */

import { manage } from 'manate'
import initState from '../electerm-react/store/init-state'
import { StateStore } from '../electerm-react/store/index.js'
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
        _config: JSON.stringify({
          tokenElecterm: window.localStorage.getItem('tokenElecterm') || ''
        })
      }
    )
  }
}

loginExtend(Store)

const store = manage(new Store())

window.store = store
export default store
