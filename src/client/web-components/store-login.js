import Fetch from '../../external/common/fetch.jsx'
import { initWsCommon } from '../../external/common/fetch-from-server.js'

export default Store => {
  Store.prototype.getConstants = async function () {
    const { store } = window
    store.fetchingUser = true
    const res = await Fetch.get('/api/get-constants', null, {
      handleErr: console.log
    })
    if (res) {
      Object.assign(window.pre, res)
      window.reqs.fs.constants = window.pre.fsConstants
      store.updateConfig(res.config)
      await initWsCommon()
      Object.assign(store, {
        logined: true,
        authChecked: true,
        fetchingUser: false,
        logining: false
      })
      return true
    } else {
      Object.assign(store, {
        authChecked: true,
        fetchingUser: false
      })
      return false
    }
  }
  Store.prototype.login = async function (password) {
    const { store } = window
    store.logining = true
    const res = await Fetch.post('/api/login', {
      password
    })
    if (res) {
      store.updateConfig({
        tokenElecterm: res
      })
      window.localStorage.setItem('tokenElecterm', res)
      store.getConstants()
    }
    Object.assign(store, {
      logining: false
    })
  }
}
