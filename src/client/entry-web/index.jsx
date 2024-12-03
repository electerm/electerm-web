import { createRoot } from 'react-dom/client'
import '../../../node_modules/antd/dist/reset.css'
import '../../../node_modules/@xterm/xterm/css/xterm.css'
import '../electerm-react/common/trzsz'
import Main from '../web-components/web-main'

const rootElement = document.getElementById('container')
const root = createRoot(rootElement)

root.render(<Main />)
