import { auto } from 'manate/react'
import {
  LogoutOutlined
} from '@ant-design/icons'
import './logout.styl'

export default auto(function Logout (props) {
  const handleLogout = () => {
    window.localStorage.removeItem('tokenElecterm')
    props.store.logined = false
  }

  if (window.et.tokenElecterm) {
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
