/**
 * Macro UI strings. Most macro keys are not in @electerm/electerm-locales
 * yet, and window.translate would show a missing key as "MacroAlreadyRunning".
 * Use the translation when the key exists, the English text otherwise.
 */

export default function t (key, en) {
  const lang = window.getLang ? window.getLang() : null
  return lang && lang[key] ? window.translate(key) : en
}
