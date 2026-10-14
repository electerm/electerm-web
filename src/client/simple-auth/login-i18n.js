/**
 * Copy for the pre-login screens (hero + footer ported from electerm.org, plus
 * the login form's own two strings).
 *
 * The login screen renders before the user's config - and therefore before
 * their language preference - is loaded, so window.translate() would resolve
 * to en_us here no matter what the visitor actually reads. It carries its own
 * two languages instead, and the strings are the en/zh-cn ones from
 * electerm.org's own data (src/data/{en,zh-cn}.json) so both sites keep
 * saying the same thing.
 */

const en = {
  heroTitle: 'electerm — Free Open-Source Terminal/SSH/SFTP/Telnet/Serial Port/RDP/VNC/Spice/FTP Client',
  heroTagline: 'Terminal/ssh/sftp/ftp/telnet/serialport/RDP/VNC/Spice client for Linux, Mac, Windows, Android, HarmonyOS, iOS',
  heroSupports: 'Besides mainstream Windows/macOS/Linux/Android/HarmonyOS/iOS, electerm also supports older systems — Ubuntu 18, Windows 7, macOS 10+, and special Chinese Linux distributions such as UOS, Kylin, and LoongArch (both old-world and new-world), as well as RISC-V (riscv64) and PowerPC 64-bit little-endian (ppc64le) Linux.',
  version: 'Version',
  password: 'Password',
  passwordRequired: 'password required',

  brandDesc: 'Free and open-source terminal/SSH/SFTP/Telnet/Serial port/RDP/VNC/Spice client for Linux, macOS, Windows, and Android.',
  product: 'Product',
  about: 'About',
  dl: 'Download',
  online: 'Electerm Online',
  videoGuides: 'Video Guides',
  blog: 'Blog',
  documentation: 'Documentation',
  sponsor: 'Sponsor',
  community: 'Community',
  discussions: 'Discussions',
  reportIssues: 'Report Issues',
  translations: 'Translations',
  related: 'Related',
  contact: 'Contact',
  faq: 'FAQ',
  terms: 'Terms & Conditions',
  privacyPolicy: 'Privacy Policy',
  author: 'Author',
  resume: 'Resume'
}

const zh = {
  heroTitle: 'electerm — 免费开源终端/SSH/SFTP/Telnet/串口/RDP/VNC/Spice/FTP客户端',
  heroTagline: '终端/SSH/SFTP/FTP/Telnet/串口/RDP/VNC/Spice客户端(支持Linux、Mac、Win、Android、HarmonyOS、iOS)',
  heroSupports: '除主流的 Windows/macOS/Linux/Android/HarmonyOS/iOS 外，electerm 还支持较旧的系统 —— Ubuntu 18、Windows 7、macOS 10+，以及统信 UOS、银河麒麟等国产 Linux 发行版和龙芯 LoongArch（新旧世界均支持），以及 RISC-V（riscv64）和 PowerPC 64 位小端（ppc64le）Linux。',
  version: '版本',
  password: '密码',
  passwordRequired: '请输入密码',

  brandDesc: '适用于 Linux、macOS、Windows 和 Android 的终端/SSH/SFTP/Telnet/串口/RDP/VNC/Spice 客户端。',
  product: '产品',
  about: '关于',
  dl: '下载',
  online: 'Electerm 在线版',
  videoGuides: '视频教程',
  blog: '博客',
  documentation: '文档',
  sponsor: '赞助',
  community: '社区',
  discussions: '讨论',
  reportIssues: '报告问题',
  translations: '翻译',
  related: '相关',
  contact: '联系我们',
  faq: '常见问题',
  terms: '条款',
  privacyPolicy: '隐私政策',
  author: '作者',
  resume: '简历'
}

const LANGS = { en, zh }

// Options for the top-right picker. Each label is written in its own language -
// a picker that says "English" to someone who reads Chinese is no use.
export const LOGIN_LANGS = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' }
]

// Only the pre-login screens read this: once the config is in, the app's own
// language setting takes over and this is not consulted again.
const STORE_KEY = 'electermWebLoginLang'

function stored () {
  try {
    return window.localStorage.getItem(STORE_KEY)
  } catch (e) {
    // storage disabled (private mode, blocked cookies)
    return null
  }
}

// The app's locale ids are zh_cn / zh_tw / en_us / ..., and until the config
// lands there is nothing but the visitor's own choice and the browser.
export function loginLang () {
  const { store } = window
  const set = store && store.config && store.config.language
  const lang = String(stored() || set || navigator.language || '')
  return /^zh/i.test(lang) ? 'zh' : 'en'
}

export function setLoginLang (lang) {
  try {
    window.localStorage.setItem(STORE_KEY, lang)
  } catch (e) {
    // choice just will not survive a reload
  }
}

export function loginText (lang) {
  return LANGS[lang] || LANGS[loginLang()] || en
}
