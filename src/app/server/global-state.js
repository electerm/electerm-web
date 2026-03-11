// global-state.js
class GlobalState {
  #commonWs = null
  #sessions = {}

  // Common WebSocket management
  getCommonWs () {
    return this.#commonWs
  }

  setCommonWs (ws) {
    this.#commonWs = ws
  }

  // Sessions management
  getSession (id) {
    return this.#sessions[id]
  }

  setSession (id, data) {
    this.#sessions[id] = data
  }

  removeSession (id) {
    delete this.#sessions[id]
  }

  get data () {
    return this.#sessions
  }
}

// Export a singleton instance
export default new GlobalState()
