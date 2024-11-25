import { auto } from 'manate/react'
import { useState, useEffect, useRef } from 'react'
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

const f = window.translate

export default auto(function Login ({ store }) {
  const [pass, setPass] = useState('')
  const submitting = useRef(false)

  useEffect(() => {
    store.getConstants()
  }, [])

  const handlePassChange = e => {
    setPass(e.target.value)
  }

  const handleSubmit = async () => {
    if (!pass) {
      return message.warning('password required')
    } else if (submitting.current) {
      return
    }
    submitting.current = true
    await store.login(pass)
    submitting.current = false
  }

  const renderUnchecked = () => {
    return (

      <div>
        <LogoElem />
        <div className='pd3 aligncenter'>
          <Loading3QuartersOutlined spin />
        </div>

      </div>
    )
  }

  const renderAfter = () => {
    return (
      <ArrowRightOutlined
        className='mg1x pointer'
        onClick={handleSubmit}
      />
    )
  }

  const renderLogin = () => {
    const {
      logining,
      fetchingUser
    } = store

    return (

      <div>
        <LogoElem />
        <div className='pd3 aligncenter'>
          <Input.Password
            value={pass}
            readOnly={logining || fetchingUser}
            onChange={handlePassChange}
            placeholder={f('password')}
            addonAfter={renderAfter()}
            onPressEnter={handleSubmit}
          />
        </div>

        <div>
          <Spin
            spinning={logining || fetchingUser}
          />
        </div>

      </div>
    )
  }

  if (!store.authChecked) {
    return renderUnchecked()
  } else if (!store.logined) {
    return renderLogin()
  }

  return (
    <Main
      store={store}
    />
  )
})
