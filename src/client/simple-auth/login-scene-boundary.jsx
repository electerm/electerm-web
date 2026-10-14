import { Component } from 'react'

/**
 * Error boundary for the lazily loaded login scene (login-shell.jsx).
 *
 * A chunk fetch can fail - stale chunk after a web-app redeploy, flaky network
 * - and that must not cost the visitor the password field: this renders the
 * bare form instead, so the instance stays reachable. Without it the error
 * bubbles to the root ErrorBoundary and replaces the whole app with the error
 * page.
 *
 * Local to simple-auth on purpose: the shared LazyBoundary renders nothing on
 * failure, which is the right call for a widget and the wrong one for the only
 * thing standing between the visitor and the app.
 */
export default class LoginSceneBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError () {
    return { failed: true }
  }

  componentDidCatch (error) {
    window.store.onError(error)
  }

  render () {
    const { failed } = this.state
    const { children, fallback } = this.props

    return failed ? fallback : children
  }
}
