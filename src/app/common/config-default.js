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
  // No `language` default on purpose. A missing `language` is the signal the
  // client uses to ask the browser (navigator.languages) and write the answer
  // back with the rest of the config -- see web-components/web-api.js. A
  // default here -- in the config or in the init db -- would look like a
  // deliberate user choice and silently win over the browser, which is exactly
  // the bug this replaces.
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
