import { auto } from 'manate/react'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import {
  ConfigProvider,
  Input,
  Spin,
  theme as antdTheme
} from 'antd'
import message from '../electerm-react/components/common/message'
import {
  ArrowRightOutlined,
  Loading3QuartersOutlined
} from '@ant-design/icons'
import Main from '../electerm-react/components/main/main.jsx'
import UiTheme from '../electerm-react/components/main/ui-theme'
import LoginSceneBoundary from './login-scene-boundary.jsx'
import { loginLang, loginText, setLoginLang } from './login-i18n'
import { defaultThemeLight } from '../electerm-react/common/theme-defaults'
import isColorDark from '../electerm-react/common/is-color-dark'
import './web-login.styl'

// Everything decorative about this screen - starfield, hero (and with it the
// 3D wordmark), language picker, footer - is one lazy chunk. It is only mounted
// once we know a password is actually wanted, so an instance that has none
// (ENABLE_AUTH off) goes from the auth check straight to the app without ever
// downloading the scene: no three.js, no .glb, no starfield canvas.
const LoginShell = lazy(() => import('./login-shell.jsx'))

// Login screen renders before the user's config (thus their theme) is loaded,
// and outside of Main's ConfigProvider/UiTheme, so nothing writes the electerm
// css variables (--main, --primary, ...) and antd would fall back to its own
// default theme. Wrap the pre-login screens in a static theme - the default
// light one - so they stay consistent; once logged in, Main mounts and applies
// the real user theme on top of it.
const loginThemeConfig = defaultThemeLight().uiThemeConfig
const loginAntdTheme = {
  token: {
    borderRadius: 3,
    colorPrimary: loginThemeConfig.primary,
    colorBgBase: loginThemeConfig.main,
    // the form floats on the animated background, so the input needs a solid
    // surface of its own instead of blending into it
    colorBgContainer: '#fff',
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

// window.translate() would be en_us on this screen whatever the visitor reads
// (the user config, and with it the language, is not loaded until the password
// is accepted), so the form's own strings come from the same place as the
// scene's.
export default auto(function Login ({ store }) {
  const [pass, setPass] = useState('')
  const [lang, setLang] = useState(loginLang)
  const submitting = useRef(false)

  const t = loginText(lang)

  useEffect(() => {
    store.getConstants()
  }, [])

  const handleLangChange = (next) => {
    setLoginLang(next)
    setLang(next)
  }

  const handlePassChange = e => {
    setPass(e.target.value)
  }

  const handleSubmit = async () => {
    if (!pass) {
      return message.warning(t.passwordRequired)
    } else if (submitting.current) {
      return
    }
    submitting.current = true
    await store.login(pass)
    submitting.current = false
  }

  // Shown while the auth check is in flight, and while the scene chunk is on
  // the wire. No hero/spinner-inside-a-page here: the point is that neither the
  // scene nor its chunk is referenced until we know we need it.
  const renderLoading = () => (
    <div className='login-loading'>
      <Loading3QuartersOutlined spin />
    </div>
  )

  const renderAfter = () => {
    return (
      <ArrowRightOutlined
        className='mg1x pointer'
        onClick={handleSubmit}
      />
    )
  }

  // The form itself, kept separate from the scene around it: if the scene chunk
  // fails to load, this is what the fallback renders, so a password can still
  // be typed and the visitor is never stuck on a blank page.
  const renderForm = () => {
    const {
      logining,
      fetchingUser
    } = store

    return (
      <>
        <h2 className='login-form-title'>electerm-web</h2>
        <div className='pd2x aligncenter'>
          <Input.Password
            value={pass}
            readOnly={logining || fetchingUser}
            onChange={handlePassChange}
            placeholder={t.password}
            addonAfter={renderAfter()}
            onPressEnter={handleSubmit}
          />
        </div>

        <div>
          <Spin
            spinning={logining || fetchingUser}
          />
        </div>
      </>
    )
  }

  const renderLogin = () => {
    return (
      <LoginSceneBoundary fallback={<div className='login-plain'>{renderForm()}</div>}>
        <Suspense fallback={renderLoading()}>
          <LoginShell lang={lang} onLangChange={handleLangChange}>
            {renderForm()}
          </LoginShell>
        </Suspense>
      </LoginSceneBoundary>
    )
  }

  if (!store.authChecked) {
    return withStaticTheme(renderLoading())
  } else if (!store.logined) {
    return withStaticTheme(renderLogin())
  }

  return (
    <Main
      store={store}
    />
  )
})
