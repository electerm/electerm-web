import { render } from 'react-dom'
import '../../../node_modules/antd/dist/reset.css'
import '../../../node_modules/xterm/css/xterm.css'
import '../../external/common/trzsz'
import Main from '../web-components/web-main'
import { notification } from 'antd'
notification.config({
  placement: 'bottomRight'
})

const rootElement = document.getElementById('container')
render(
  <Main />,
  rootElement
)
