import ErrorBoundary from '../../external/components/main/error-wrapper'
import Login from './web-login'
import store from './web-store'

export default function MainEntry () {
  return (
    <ErrorBoundary>
      <Login store={store} />
    </ErrorBoundary>
  )
}
