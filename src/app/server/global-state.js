import { EventEmitter } from 'node:events'

class GlobalState extends EventEmitter {
  #commonSockets = new Set()
  #sessions = {}

  // Common WebSocket management
  getCommonWs () {
    return Array.from(this.#commonSockets).findLast(ws => ws.readyState === 1) || null
  }

  addCommonWs (ws) {
    this.#commonSockets.add(ws)
    ws.on('close', () => {
      this.#commonSockets.delete(ws)
      this.emit('common-ws-close', ws)
    })
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
