import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import { loginText } from './login-i18n'
import LoginBg from './login-bg.jsx'
import LoginLangSwitch from './login-lang-switch.jsx'
import LoginHero from './login-hero.jsx'
import LoginFooter from './login-footer.jsx'
import './login-shell.styl'

/**
 * The pre-login scene: falling-star background, hero (which pulls in the 3D
 * wordmark), language picker and the project footer. The password field is
 * passed in as children - it belongs to the form, not to the scenery.
 *
 * Loaded with lazy() from web-login.jsx. An instance with no password set
 * (ENABLE_AUTH off) goes straight from the auth check to the app and never
 * renders this screen, so it must never download it either: between them these
 * are the starfield canvas, the three.js chunk and the .glb model.
 */
export default function LoginShell (props) {
  const { lang, onLangChange, mode, onToggleTheme, children } = props

  const label = loginText(lang).darkMode

  return (
    <div className='login-page' data-theme={mode}>
      <LoginBg />
      <div className='login-controls'>
        <button
          type='button'
          className='login-theme-toggle'
          aria-label={label}
          title={label}
          aria-pressed={mode === 'dark'}
          onClick={onToggleTheme}
        >
          {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </button>
        <LoginLangSwitch lang={lang} onChange={onLangChange} />
      </div>
      <LoginHero lang={lang} />
      <div className='login-main'>
        {children}
      </div>
      <LoginFooter lang={lang} />
    </div>
  )
}
