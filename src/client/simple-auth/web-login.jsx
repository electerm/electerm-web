import { Component } from '../electerm-react/components/common/react-subx'
import LogoElem from '../electerm-react/components/common/logo-elem.jsx'
import {
  Input,
  message,
  Spin
} from 'antd'
import {
  ArrowRightOutlined,
  Loading3QuartersOutlined
} from '@ant-design/icons'
import Main from '../electerm-react/components/main/main.jsx'

const { prefix } = window
const f = prefix('form')

export default class Login extends Component {
  state = {
    pass: ''
  }

  componentDidMount () {
    this.props.store.getConstants()
  }

  handlePassChange = e => {
    this.setState({
      pass: e.target.value
    })
  }

  handleSubmit = () => {
    const {
      pass
    } = this.state
    if (!pass) {
      return message.warning('password required')
    } else if (
      this.submitting
    ) {
      return
    }
    this.props.store.login(
      this.state.pass
    )
  }

  renderUnchecked () {
    return (
      <div className='pd3 aligncenter'>
        <LogoElem />
        <div className='pd3 aligncenter'>
          <Loading3QuartersOutlined
            spin
          />
        </div>
      </div>
    )
  }

  renderAfter = () => {
    return (
      <ArrowRightOutlined
        className='mg1x pointer'
        onClick={this.handleSubmit}
      />
    )
  }

  renderLogin () {
    const {
      logining,
      fetchingUser
    } = this.props.store
    const {
      pass
    } = this.state
    return (
      <div className='pd3 aligncenter'>
        <LogoElem />
        <div className='pd3 aligncenter'>
          <Input.Password
            value={pass}
            readOnly={logining || fetchingUser}
            onChange={this.handlePassChange}
            placeholder={f('password')}
            addonAfter={this.renderAfter()}
            onPressEnter={this.handleSubmit}
          />
        </div>
        <div className='aligncenter'>
          <Spin
            spinning={logining || fetchingUser}
          />
        </div>
      </div>
    )
  }

  render () {
    const {
      authChecked
    } = this.props.store
    if (!authChecked) {
      return this.renderUnchecked()
    } else if (!this.props.store.logined) {
      return this.renderLogin()
    }
    return (
      <Main
        store={this.props.store}
      />
    )
  }
}
