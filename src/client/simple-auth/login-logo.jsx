import { useEffect, useRef } from 'react'
import { logoPath2 } from '../electerm-react/common/constants'
import './login-logo.styl'

/**
 * The login page brand block: the electerm wordmark with the electerm 3D logo
 * model animated on top of it.
 *
 * Both halves matter, which is why both live here:
 * - the image is the layout box, the no-JS/pre-load state and the fallback, so
 *   the login screen is never blank and never shows an empty headline
 * - the model (three.js + electerm.glb, in login-logo-3d.js) is what makes the
 *   screen feel alive; it is fetched through a dynamic import so it lands in a
 *   chunk of its own, loaded while the user is typing their password
 */
export default function LoginLogo () {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    let destroy
    let cancelled = false
    import('./login-logo-3d.js').then((mod) => {
      if (cancelled) {
        return
      }
      destroy = mod.default({
        wrap: wrapRef.current,
        canvas: canvasRef.current,
        img: imgRef.current
      })
    }).catch((err) => {
      console.warn('[login-logo] 3D logo unavailable, using the logo image:', err)
    })
    return () => {
      cancelled = true
      if (destroy) {
        destroy()
      }
    }
  }, [])

  return (
    <div className='login-logo' ref={wrapRef}>
      <img
        className='login-logo-img'
        src={logoPath2}
        alt='electerm'
        ref={imgRef}
      />
      <canvas className='login-logo-canvas' ref={canvasRef} />
    </div>
  )
}
