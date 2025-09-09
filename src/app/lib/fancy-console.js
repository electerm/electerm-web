/**
 * Fancy console logging utilities with colors and decorations
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
}

// Emoji collections
const emoji = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  lightning: '⚡',
  gear: '⚙️',
  package: '📦',
  sparkles: '✨',
  fire: '🔥',
  folder: '📁',
  file: '📄',
  arrow: '➤',
  bullet: '•',
  star: '⭐',
  hourglass: '⏳',
  checkmark: '✔️',
  cross: '✖️',
  diamond: '💎',
  heart: '❤️',
  thumbsUp: '👍'
}

/**
 * Create a fancy box with title and content
 * @param {string} title - Box title
 * @param {string[]} lines - Content lines
 * @param {object} options - Styling options
 */
export function fancyBox (title, lines = [], options = {}) {
  const {
    width = 80,
    color = colors.cyan,
    titleColor = colors.yellow,
    borderChar = '═',
    lineChar = '─'
  } = options

  const titleLine = `${titleColor}${title}${colors.reset}`
  const topBorder = borderChar.repeat(width)
  const bottomBorder = borderChar.repeat(width)

  console.log('\n' + color + topBorder + colors.reset)
  console.log(titleLine)
  console.log(color + topBorder + colors.reset)

  lines.forEach(line => {
    console.log(line)
  })

  if (lines.length > 0) {
    console.log(color + lineChar.repeat(width) + colors.reset)
  }
  console.log(color + bottomBorder + colors.reset + '\n')
}

/**
 * Log success message with decoration
 */
export function success (message, details = []) {
  fancyBox(`${emoji.success} SUCCESS`, [
    `${colors.green}${message}${colors.reset}`,
    ...details
  ], { color: colors.green, titleColor: colors.bright + colors.green })
}

/**
 * Log error message with decoration
 */
export function error (message, details = []) {
  fancyBox(`${emoji.error} ERROR`, [
    `${colors.red}${message}${colors.reset}`,
    ...details
  ], { color: colors.red, titleColor: colors.bright + colors.red })
}

/**
 * Log warning message with decoration
 */
export function warning (message, details = []) {
  fancyBox(`${emoji.warning} WARNING`, [
    `${colors.yellow}${message}${colors.reset}`,
    ...details
  ], { color: colors.yellow, titleColor: colors.bright + colors.yellow })
}

/**
 * Log info message with decoration
 */
export function info (message, details = []) {
  fancyBox(`${emoji.info} INFO`, [
    `${colors.cyan}${message}${colors.reset}`,
    ...details
  ], { color: colors.cyan, titleColor: colors.bright + colors.cyan })
}

/**
 * Log migration notice with special styling
 */
export function migrationNotice (version, oldDb, newDb, command) {
  const lines = [
    `${colors.cyan}${emoji.gear} Since ${version}, electerm-web uses ${newDb} for better performance and stability.${colors.reset}`,
    `${colors.yellow}${emoji.package} Old ${oldDb} database detected!${colors.reset}`,
    `${colors.green}${emoji.sparkles} Please migrate your data to ${newDb} for enhanced performance and stability.${colors.reset}`,
    '',
    `${colors.magenta}${emoji.arrow} MIGRATION COMMAND:${colors.reset}`,
    `${colors.white}   ${command}${colors.reset}`,
    `${colors.cyan}${emoji.file} Then import data.json in the new version via data sync panel${colors.reset}`
  ]

  fancyBox(`${emoji.lightning} ELECTERM-WEB MIGRATION NOTICE ${emoji.lightning}`, lines, {
    color: colors.magenta,
    titleColor: colors.bright + colors.yellow
  })
}

/**
 * Log startup message with ASCII art
 */
export function startup (appName, version, port) {
  const art = [
    '    ___________                __                         ',
    '   / ____/ / /__  _____  ____ / /_ ___  ______ ___        ',
    '  / __/ / / / _ \\/ ___/ / __ `/ __/ _ \\/ ___/ __ `__ \\   ',
    ' / /___/ / /  __/ /    / /_/ / /_/  __/ /  / / / / / /     ',
    '/_____/_/_/\\___/_/     \\__,_/\\__/\\___/_/  /_/ /_/ /_/   '
  ]

  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset)
  art.forEach(line => {
    console.log(colors.bright + colors.blue + line + colors.reset)
  })
  console.log(colors.cyan + '═'.repeat(60) + colors.reset)
  console.log(`${colors.yellow}${emoji.rocket} ${appName} v${version}${colors.reset}`)
  console.log(`${colors.green}${emoji.gear} Running on port ${port}${colors.reset}`)
  console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n')
}

/**
 * Simple colored log
 */
export function colorLog (message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`)
}

// Export colors and emoji for direct use
export { colors, emoji }
