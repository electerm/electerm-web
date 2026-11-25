import Fetch from '../electerm-react/common/fetch.jsx'
import { auto } from 'manate/react'
import {
  LogoutOutlined
} from '@ant-design/icons'
import './logout.styl'

export default auto(function Logout (props) {
  const handleLogout = async () => {
    const ok = await Fetch.post(window.et.url('/api/logout'), {}, {
      handleResponse: () => true
    })
    if (ok) window.location.reload()
  }

  // Only meaningful when there is a session to end. The pre-login screens
  // render this component too, and there the icon just sits in the corner of
  // an otherwise empty page. With auth disabled the server starts a local session
  // and there is nothing to log out of either.
  if (!props.store.logined || window.et.localOnly) {
    return null
  }

  return (
    <div className='logout-icon'>
      <LogoutOutlined
        className='pointer font16 control-icon iblock'
        onClick={handleLogout}
      />
    </div>
  )
})
