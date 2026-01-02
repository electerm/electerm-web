// global-state.js
class GlobalState {
  #commonWs = null

  // Common WebSocket management
  getCommonWs () {
    return this.#commonWs
  }

  setCommonWs (ws) {
    this.#commonWs = ws
  }

  #sessions = {}

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
}

// Export a singleton instance
export default new GlobalState()
