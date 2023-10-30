import ErrorBoundary from '../../electerm-react/components/main/error-wrapper'
import Login from './web-login'
import store from './web-store'
import FileSelectDialog from '../file-select-dialog/file-select-dialog'

export default function MainEntry () {
  return (
    <ErrorBoundary>
      <Login store={store} />
      <FileSelectDialog />
    </ErrorBoundary>
  )
}
