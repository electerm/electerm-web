// global-state.js
class GlobalState {
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
