import { auto } from 'manate/react'
import { useState, useEffect, useRef } from 'react'
import {
  ConfigProvider,
  Input,
  Spin,
  theme as antdTheme
} from 'antd'
import LogoElem from '../electerm-react/components/common/logo-elem.jsx'
import message from '../electerm-react/components/common/message'
import {
  ArrowRightOutlined,
  Loading3QuartersOutlined
} from '@ant-design/icons'
import Main from '../electerm-react/components/main/main.jsx'
import UiTheme from '../electerm-react/components/main/ui-theme'
import { defaultThemeLight } from '../electerm-react/common/theme-defaults'
import isColorDark from '../electerm-react/common/is-color-dark'
import './web-login.styl'

const f = window.translate

// The login screen renders before the user's config (thus their theme) is
// loaded, and outside of Main's ConfigProvider/UiTheme, so nothing writes
// the electerm css variables (--main, --primary, ...) and antd would fall
// back to its own default theme. Wrap the pre-login screens in a static
// theme - the default light one - so they stay consistent; once logged in,
// Main mounts and applies the real user theme on top of it.
const loginThemeConfig = defaultThemeLight().uiThemeConfig
const loginAntdTheme = {
  token: {
    borderRadius: 3,
    colorPrimary: loginThemeConfig.primary,
    colorBgBase: loginThemeConfig.main,
    colorError: loginThemeConfig.error,
    colorInfo: loginThemeConfig.info,
    colorSuccess: loginThemeConfig.success,
    colorWarning: loginThemeConfig.warn,
    colorTextBase: loginThemeConfig.text,
    colorLink: loginThemeConfig['text-light'],
    motion: false
  },
  algorithm: isColorDark(loginThemeConfig.main)
    ? antdTheme.darkAlgorithm
    : antdTheme.defaultAlgorithm
}

function withStaticTheme (node) {
  return (
    <ConfigProvider theme={loginAntdTheme}>
      <UiTheme themeConfig={loginThemeConfig} />
      {node}
    </ConfigProvider>
  )
}

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
      <div className='login-wrap'>
        <LogoElem />
        <div className='pd2y aligncenter'>
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
      <div className='login-wrap'>
        <LogoElem />
        <div className='pd2x aligncenter'>
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
    return withStaticTheme(renderUnchecked())
  } else if (!store.logined) {
    return withStaticTheme(renderLogin())
  }

  return (
    <Main
      store={store}
    />
  )
})
