// src/app/lib/global-state.js

class GlobalState {
  constructor () {
    this._state = {
      win: null,
      config: {},
      closeAction: '',
      requireAuth: false,
      serverInited: false,
      langMap: null,
      getLang: null,
      translate: null,
      timer: null,
      childPid: null,
      app: null,
      rawArgs: null,
      loadTime: null,
      initTime: Date.now(),
      watchFilePath: '',
      oldRectangle: null,
      serverPort: null,
      isSecondInstance: false
    }
  }

  get (key) {
    return this._state[key]
  }

  set (key, value) {
    this._state[key] = value
  }

  update (key, updates) {
    this._state[key] = { ...this._state[key], ...updates }
  }
}

export default new GlobalState()
