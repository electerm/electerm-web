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

  if (!props.store.logined || !window.et.authEnabled) {
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
