import defaultSettings from './default-setting.js'

export default {
  keepaliveInterval: 10000,
  rightClickSelectsWord: false,
  // Pass mouse reports to the app only while Alt/Option is held. Lets wheel
  // keep scrolling tmux/vim history while plain drags stay local selections.
  mouseEventsRequireAlt: false,
  // 'context' | 'paste' | 'passthrough' — see
  // src/client/common/right-click-behavior.js
  rightClickBehavior: 'context',
  ctrlOrMetaOpenTerminalLink: false,
  ...defaultSettings,
  terminalTimeout: 5000,
  enableGlobalProxy: false,
  zoom: 1,
  debug: false,
  theme: 'default',
  // `en_us` is a real locale id from @electerm/electerm-locales. It has to be
  // here rather than in the init db defaults: the client loads the config
  // before checkDbUpgrade seeds the db, then writes that config straight back
  // with saveUserConfig, which would overwrite a seed-only value.
  language: 'en_us',
  syncSetting: {
    lastUpdateTime: Date.now(),
    autoSync: false,
    autoSyncInterval: 0,
    autoSyncDirection: 'upload'
  },
  terminalTypes: [
    'xterm-256color',
    'xterm-new',
    'xterm-color',
    'xterm-vt220',
    'xterm',
    'linux',
    'vt100',
    'ansi',
    'rxvt'
  ],
  host: '127.0.0.1',
  keyword2FA: 'verification code,otp,one-time,two-factor,2fa,totp,authenticator,duo,yubikey,security code,mfa,passcode',
  enableSixel: true
}
