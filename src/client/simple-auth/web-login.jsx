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
import { defaultTheme, defaultThemeLight } from '../electerm-react/common/theme-defaults'
import './web-login.styl'

// Everything decorative about this screen - starfield, hero (and with it the
// 3D wordmark), language picker, footer - is one lazy chunk. It is only mounted
// once we know a password is actually wanted, so an instance that has none
// (ENABLE_AUTH off) goes from the auth check straight to the app without ever
// downloading the scene: no three.js, no .glb, no starfield canvas.
const LoginShell = lazy(() => import('./login-shell.jsx'))

const themeKey = 'electermWebLoginTheme'

function readLoginTheme () {
  try {
    return window.localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function withLoginTheme (node, mode) {
  const { config, antd } = loginThemes[mode]
  return (
    <ConfigProvider theme={antd}>
      <UiTheme themeConfig={config} />
      {node}
    </ConfigProvider>
  )
}

function makeLoginTheme (config, algorithm) {
  return {
    config,
    antd: {
      algorithm,
      token: {
        borderRadius: 3,
        colorPrimary: config.primary,
        colorBgBase: config.main,
        colorBgContainer: config['main-light'],
        colorError: config.error,
        colorInfo: config.info,
        colorSuccess: config.success,
        colorWarning: config.warn,
        colorTextBase: config.text,
        colorLink: config['text-light'],
        motion: false
      }
    }
  }
}

const loginThemes = {
  dark: makeLoginTheme(defaultTheme().uiThemeConfig, antdTheme.darkAlgorithm),
  light: makeLoginTheme(defaultThemeLight().uiThemeConfig, antdTheme.defaultAlgorithm)
}

// window.translate() would be en_us on this screen whatever the visitor reads
// (the user config, and with it the language, is not loaded until the password
// is accepted), so the form's own strings come from the same place as the
// scene's.
export default auto(function Login ({ store }) {
  const [pass, setPass] = useState('')
  const [lang, setLang] = useState(loginLang)
  const [mode, setMode] = useState(readLoginTheme)
  const submitting = useRef(false)

  const t = loginText(lang)

  useEffect(() => {
    store.getConstants()
  }, [])

  const handleLangChange = (next) => {
    setLoginLang(next)
    setLang(next)
  }

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    try {
      window.localStorage.setItem(themeKey, next)
    } catch {
      // Storage may be unavailable. Keep the choice for this visit.
    }
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
          <LoginShell lang={lang} onLangChange={handleLangChange} mode={mode} onToggleTheme={toggleTheme}>
            {renderForm()}
          </LoginShell>
        </Suspense>
      </LoginSceneBoundary>
    )
  }

  if (!store.authChecked) {
    return withLoginTheme(renderLoading(), mode)
  } else if (!store.logined) {
    return withLoginTheme(renderLogin(), mode)
  }

  return (
    <Main
      store={store}
    />
  )
})
