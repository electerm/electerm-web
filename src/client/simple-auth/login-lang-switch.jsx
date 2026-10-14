import { LOGIN_LANGS } from './login-i18n'
import './login-lang-switch.styl'

// Language picker for the pre-login screens. It sits in the page corner and out
// of the content flow: the page scrolls all the way down to a dark footer, and
// the picker has to stay where it is and stay readable over both the hero and
// the footer - hence fixed + a translucent surface of its own.
export default function LoginLangSwitch (props) {
  const { lang, onChange } = props
  const label = lang === 'zh' ? '语言' : 'Language'

  return (
    <div className='login-lang-switch' role='group' aria-label={label}>
      {LOGIN_LANGS.map(l => {
        const active = l.id === lang
        return (
          <button
            key={l.id}
            type='button'
            className={
              'login-lang-btn' + (active ? ' login-lang-btn-active' : '')
            }
            aria-pressed={active}
            onClick={() => onChange(l.id)}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
