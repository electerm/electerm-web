import {
  LogoutOutlined
} from '@ant-design/icons'
import { Component } from '../electerm-react/components/common/react-subx'
import './logout.styl'

export default class Logout extends Component {
  handleLogout = () => {
    window.localStorage.removeItem('tokenElecterm')
    this.props.store.logined = false
  }

  render () {
    if (window.et.tokenElecterm) {
      return null
    }
    return (
      <div className='control-icon-wrap logout-icon'>
        <LogoutOutlined
          className='pointer font16 control-icon iblock'
          onClick={this.handleLogout}
        />
      </div>
    )
  }
}
