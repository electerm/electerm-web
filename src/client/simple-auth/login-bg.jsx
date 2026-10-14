import { useEffect, useRef } from 'react'
import startLoginBg from './login-bg.js'
import './login-bg.styl'

/**
 * Full-viewport animated background of the pre-login screens: a white page
 * with stars falling across it (see login-bg.js for the starfield itself).
 *
 * Rendered behind everything (z-index -1, and .login-wrap owns the stacking
 * context that keeps it there), decorative only, and free of anything the
 * login form needs - if the canvas never comes up, the page is still white.
 */
export default function LoginBg () {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) {
      return
    }
    return startLoginBg(canvas)
  }, [])

  return (
    <div className='login-bg' aria-hidden='true'>
      <canvas className='login-bg-canvas' ref={ref} />
    </div>
  )
}
