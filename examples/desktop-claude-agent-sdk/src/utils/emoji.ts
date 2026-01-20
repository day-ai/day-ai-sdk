/**
 * Common emoji shortcode to unicode mapping
 * Supports formats like :sunny: or :sun:
 */
const EMOJI_MAP: Record<string, string> = {
  // Weather
  ':sunny:': '☀️',
  ':sun:': '☀️',
  ':cloud:': '☁️',
  ':cloudy:': '☁️',
  ':rain:': '🌧️',
  ':rainy:': '🌧️',
  ':snow:': '❄️',
  ':snowy:': '❄️',
  ':thunder:': '⛈️',
  ':storm:': '⛈️',
  ':wind:': '💨',
  ':fog:': '🌫️',

  // Search & Query
  ':mag:': '🔍',
  ':search:': '🔍',
  ':magnifying_glass:': '🔍',
  ':mag_right:': '🔎',

  // Documents & Files
  ':page_facing_up:': '📄',
  ':document:': '📄',
  ':file:': '📄',
  ':page_with_curl:': '📃',
  ':bookmark_tabs:': '📑',
  ':books:': '📚',
  ':book:': '📖',
  ':notebook:': '📓',
  ':ledger:': '📒',
  ':memo:': '📝',
  ':pencil:': '✏️',
  ':edit:': '✏️',

  // Communication
  ':email:': '📧',
  ':envelope:': '✉️',
  ':mailbox:': '📬',
  ':bell:': '🔔',
  ':notification:': '🔔',
  ':speech_balloon:': '💬',
  ':chat:': '💬',
  ':phone:': '📞',
  ':telephone:': '📞',

  // People & Contacts
  ':bust_in_silhouette:': '👤',
  ':person:': '👤',
  ':contact:': '👤',
  ':busts_in_silhouette:': '👥',
  ':people:': '👥',
  ':contacts:': '👥',
  ':handshake:': '🤝',

  // Business & CRM
  ':briefcase:': '💼',
  ':business:': '💼',
  ':chart_with_upwards_trend:': '📈',
  ':chart:': '📈',
  ':chart_with_downwards_trend:': '📉',
  ':bar_chart:': '📊',
  ':moneybag:': '💰',
  ':money:': '💰',
  ':dollar:': '💵',
  ':credit_card:': '💳',
  ':trophy:': '🏆',
  ':deal:': '🤝',
  ':opportunity:': '💎',
  ':gem:': '💎',

  // Organizations
  ':office:': '🏢',
  ':building:': '🏢',
  ':company:': '🏢',
  ':organization:': '🏢',
  ':factory:': '🏭',
  ':house:': '🏠',

  // Calendar & Time
  ':calendar:': '📅',
  ':date:': '📅',
  ':clock:': '🕐',
  ':time:': '⏰',
  ':alarm_clock:': '⏰',
  ':hourglass:': '⏳',
  ':stopwatch:': '⏱️',

  // Meetings & Video
  ':video_camera:': '📹',
  ':video:': '📹',
  ':movie_camera:': '🎥',
  ':meeting:': '🎥',
  ':microphone:': '🎤',
  ':headphones:': '🎧',
  ':recording:': '⏺️',

  // Technology & Tools
  ':computer:': '💻',
  ':desktop:': '🖥️',
  ':laptop:': '💻',
  ':keyboard:': '⌨️',
  ':globe:': '🌐',
  ':globe_with_meridians:': '🌐',
  ':web:': '🌐',
  ':link:': '🔗',
  ':gear:': '⚙️',
  ':settings:': '⚙️',
  ':wrench:': '🔧',
  ':tool:': '🔧',
  ':hammer:': '🔨',
  ':hammer_and_wrench:': '🛠️',
  ':tools:': '🛠️',
  ':terminal:': '💻',
  ':code:': '💻',

  // Status & Actions
  ':white_check_mark:': '✅',
  ':check:': '✅',
  ':success:': '✅',
  ':x:': '❌',
  ':error:': '❌',
  ':fail:': '❌',
  ':warning:': '⚠️',
  ':exclamation:': '❗',
  ':question:': '❓',
  ':info:': 'ℹ️',
  ':information:': 'ℹ️',
  ':bulb:': '💡',
  ':idea:': '💡',
  ':zap:': '⚡',
  ':lightning:': '⚡',
  ':fire:': '🔥',
  ':sparkles:': '✨',
  ':star:': '⭐',
  ':stars:': '🌟',
  ':rocket:': '🚀',
  ':tada:': '🎉',
  ':lock:': '🔒',
  ':unlock:': '🔓',
  ':key:': '🔑',

  // Arrows & Navigation
  ':arrow_up:': '⬆️',
  ':arrow_down:': '⬇️',
  ':arrow_left:': '⬅️',
  ':arrow_right:': '➡️',
  ':arrow_forward:': '▶️',
  ':play:': '▶️',
  ':arrow_backward:': '◀️',
  ':refresh:': '🔄',
  ':sync:': '🔄',

  // Data & Database
  ':database:': '🗄️',
  ':db:': '🗄️',
  ':floppy_disk:': '💾',
  ':save:': '💾',
  ':inbox_tray:': '📥',
  ':download:': '📥',
  ':outbox_tray:': '📤',
  ':upload:': '📤',
  ':package:': '📦',

  // Notes & Tasks
  ':note:': '📝',
  ':notes:': '📝',
  ':clipboard:': '📋',
  ':task:': '📋',
  ':pushpin:': '📌',
  ':pin:': '📌',
  ':paperclip:': '📎',
  ':attach:': '📎',
  ':label:': '🏷️',
  ':tag:': '🏷️',

  // Misc
  ':robot:': '🤖',
  ':ai:': '🤖',
  ':agent:': '🤖',
  ':eyes:': '👀',
  ':look:': '👀',
  ':thinking:': '🤔',
  ':brain:': '🧠',
  ':heart:': '❤️',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':clap:': '👏',
  ':wave:': '👋',
  ':point_right:': '👉',
  ':point_left:': '👈',
  ':point_up:': '👆',
  ':point_down:': '👇',
}

/**
 * Convert an emoji shortcode to its unicode representation
 * @param shortcode - The shortcode like ":sunny:" or "sunny"
 * @returns The unicode emoji or the original shortcode if not found
 */
export function emojiFromShortcode(shortcode: string): string {
  // Normalize the shortcode to have colons
  const normalized = shortcode.startsWith(':') ? shortcode : `:${shortcode}:`
  const withEndColon = normalized.endsWith(':') ? normalized : `${normalized}:`

  return EMOJI_MAP[withEndColon.toLowerCase()] || shortcode
}

/**
 * Check if a string is a valid emoji shortcode
 */
export function isEmojiShortcode(str: string): boolean {
  const normalized = str.startsWith(':') ? str : `:${str}:`
  const withEndColon = normalized.endsWith(':') ? normalized : `${normalized}:`
  return withEndColon.toLowerCase() in EMOJI_MAP
}
