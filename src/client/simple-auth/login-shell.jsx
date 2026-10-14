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
  const { lang, onLangChange, children } = props

  return (
    <div className='login-page'>
      <LoginBg />
      <LoginLangSwitch lang={lang} onChange={onLangChange} />
      <LoginHero lang={lang} />
      <div className='login-main'>
        {children}
      </div>
      <LoginFooter lang={lang} />
    </div>
  )
}
