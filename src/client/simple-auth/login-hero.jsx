import { lazy, Suspense } from 'react'
import LazyBoundary from '../electerm-react/components/common/lazy-boundary'
import { loginText } from './login-i18n'
import './login-hero.styl'

// Ported from electerm.org's hero section (src/views/parts/hero.pug +
// src/css/parts/hero.styl): brand stage, tagline, the "also runs on" line and
// the version pill. Left out on purpose: the #hero-anim canvas (this page has
// its own starfield background), the ad/badge slots, and the CTA row - the
// point of this screen is the password field, so the hero does not compete
// with it for the click.
//
// The brand block is the only thing on this screen that logging in does not
// need, and by far the heaviest (three.js, the model, a WebGL context), so it
// arrives as its own chunk once the page is up.
const LoginLogo = lazy(() => import('./login-logo.jsx'))

const renderBrand = () => (
  <LazyBoundary>
    <Suspense fallback={<div className='login-logo' />}>
      <LoginLogo />
    </Suspense>
  </LazyBoundary>
)

export default function LoginHero (props) {
  const t = loginText(props.lang)
  const version = window.et.version

  return (
    <section className='login-hero'>
      <div className='login-hero-inner'>
        <div className='login-hero-brand'>{renderBrand()}</div>
        {/* the wordmark image carries the title visually - same as electerm.org */}
        <h1 className='login-hero-title'>{t.heroTitle}</h1>
        <p className='login-hero-tagline'>{t.heroTagline}</p>
        <p className='login-hero-supports'>{t.heroSupports}</p>
        <div className='login-hero-version'>
          <span className='login-hero-dot' />
          <span>{t.version} {version}</span>
        </div>
      </div>
    </section>
  )
}
