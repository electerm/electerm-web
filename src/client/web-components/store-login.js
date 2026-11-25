import Fetch from '../electerm-react/common/fetch.jsx'
import { initWsCommon } from '../electerm-react/common/fetch-from-server.js'

export default Store => {
  Store.prototype.getConstants = async function () {
    const { store } = window
    store.fetchingUser = true
    const res = await Fetch.get(window.et.url('/api/get-constants'), null, {
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
      console.log('getConstants err')
      store.authChecked = true
      Object.assign(store, {
        authChecked: true,
        logined: false,
        fetchingUser: false
      })
      return false
    }
  }
  Store.prototype.login = async function (password) {
    const { store } = window
    store.logining = true
    try {
      const res = await window.fetch(window.et.url('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.status === 401) return 'incorrectPassword'
      if (res.status === 429) return 'tooManyAttempts'
      if (!res.ok || !await store.getConstants()) return 'loginFailed'
      return ''
    } catch {
      return 'loginFailed'
    } finally {
      store.logining = false
      store.fetchingUser = false
      store.authChecked = true
    }
  }
}
