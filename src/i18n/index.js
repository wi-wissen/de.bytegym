import { createI18n } from 'vue-i18n'
import de from './de.json'
import en from './en.json'

// Detect locale: OS language with English fallback
const osLang = navigator.language?.split('-')[0] || 'en'
const locale = ['de', 'en'].includes(osLang) ? osLang : 'en'

// Composition mode. `globalInjection` keeps `$t` working in templates and
// `this.$t` in Options API components, so no call sites had to change.
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale,
  fallbackLocale: 'en',
  messages: { de, en }
})

/**
 * Locale for Intl/`toLocale*String` formatting. Follows the UI language, so an
 * English UI doesn't print German dates (and vice versa).
 */
export function dateLocale() {
  return i18n.global.locale.value === 'de' ? 'de-DE' : 'en-GB'
}
