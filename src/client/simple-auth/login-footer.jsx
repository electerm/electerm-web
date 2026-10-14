import { loginText } from './login-i18n'
import { logoPath2 } from '../electerm-react/common/constants'
import './login-footer.styl'

// Ported from electerm.org's footer (src/views/parts/footer.pug +
// src/css/parts/footer.styl). The links are the same ones, absolute to
// electerm.org since this page is a different site - that is the whole point
// of the section: whatever is on this screen, the project's pages are one
// click away. The only parts left out are the ad slots and the site.js logic
// that sized the watermark around them.

const SITE = 'https://electerm.org'

const columns = (t) => [
  {
    title: t.product,
    links: [
      { label: t.about, href: SITE + '/about/' },
      { label: t.dl, href: SITE + '/#downloads' },
      { label: t.online, href: 'https://cloud.electerm.org' },
      { label: t.videoGuides, href: SITE + '/videos/' },
      { label: t.blog, href: SITE + '/blogs/' },
      { label: t.documentation, href: 'https://github.com/electerm/electerm/wiki' },
      { label: t.sponsor, href: SITE + '/sponsor-electerm/' }
    ]
  },
  {
    title: t.community,
    links: [
      { label: 'GitHub', href: 'https://github.com/electerm/electerm' },
      { label: t.discussions, href: 'https://github.com/electerm/electerm/discussions' },
      { label: t.reportIssues, href: 'https://github.com/electerm/electerm/issues' },
      { label: t.translations, href: 'https://github.com/electerm/electerm-locales' }
    ]
  },
  {
    title: t.related,
    links: [
      { label: 'electerm cloud', href: 'https://sync.electerm.org/' },
      { label: 'electerm-web', href: 'https://github.com/electerm/electerm-web' },
      { label: 'AtomGit mirror (CN)', href: 'https://atomgit.com/electerm/electerm' },
      { label: 'AtomGit releases (CN)', href: 'https://atomgit.com/electerm/electerm/releases' },
      { label: 'electerm theme', href: 'https://theme.electerm.org/' },
      { label: 'manate', href: 'https://github.com/tylerlong/manate' }
    ]
  }
]

const bottomLinks = (t) => [
  { label: t.about, href: SITE + '/about/' },
  { label: t.contact, href: SITE + '/contact/' },
  { label: t.faq, href: SITE + '/faq/' },
  { label: t.terms, href: SITE + '/terms/' },
  { label: t.privacyPolicy, href: SITE + '/privacy-policy/' },
  { label: t.author, href: 'https://html5beta.com' },
  { label: 'GitHub', href: 'https://github.com/zxdong262' },
  { label: t.resume, href: 'https://html5beta.com/page/timeline.html' }
]

const renderLinks = (links) => (
  <ul>
    {links.map(l => (
      <li key={l.href}>
        <a href={l.href} target='_blank' rel='noreferrer noopener'>{l.label}</a>
      </li>
    ))}
  </ul>
)

export default function LoginFooter (props) {
  const t = loginText(props.lang)

  return (
    <footer className='site-footer'>
      <div className='site-footer-inner'>
        <div className='footer-grid'>
          <div className='footer-brand'>
            <div className='footer-brand-name'>electerm</div>
            <p>{t.brandDesc}</p>
          </div>
          {columns(t).map(col => (
            <div className='footer-col' key={col.title}>
              <h4>{col.title}</h4>
              {renderLinks(col.links)}
            </div>
          ))}
        </div>
        <div className='footer-bottom'>
          <p>© 2026 ZHAO Xudong. MIT License.</p>
          <div className='footer-bottom-links'>
            {bottomLinks(t).map(l => (
              <a key={l.href} href={l.href} target='_blank' rel='noreferrer noopener'>{l.label}</a>
            ))}
          </div>
        </div>
        {/* last, in flow: electerm.org parks this in the space it reserves
            below the bottom bar, so it never lands behind the links */}
        <div
          className='site-footer-watermark'
          style={{
            backgroundImage: `url("${logoPath2}")`
          }}
        />
      </div>
    </footer>
  )
}
