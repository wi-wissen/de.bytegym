import { createApp } from 'vue'

// Icon font, bundled so icons render offline (was a Google Fonts request)
import 'material-icons/iconfont/filled.css'

// Tailwind CSS
import './assets/main.css'

// ⚠️ Framework7 must be initialized before `createApp`
import Framework7 from 'framework7/lite-bundle'
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle'

// Framework7 styles. `css/bundle` ships every component (~556 kB) including ones
// this app never renders — calendar, color-picker, data-table, photo-browser…
// The core carries page/navbar/toolbar/tabbar/list/button/ripple; everything below
// is a component we actually use. Add a line here when you introduce a new one.
import 'framework7/css'
import 'framework7/components/tabs/css'
import 'framework7/components/card/css'
import 'framework7/components/input/css'
import 'framework7/components/login-screen/css'
import 'framework7/components/preloader/css'
import 'framework7/components/sheet/css'
import 'framework7/components/dialog/css'
import 'framework7/components/toast/css'
import 'framework7/components/toggle/css'
import 'framework7/components/pull-to-refresh/css'
import 'framework7/components/typography/css'

import App from './App.vue'
import { i18n } from './i18n/index.js'
import { installNativeInsets } from './utils/nativeInsets.js'

import { sessionStore } from './store/session.js'
import { feedStore } from './store/feed.js'
import { strengthStore } from './store/strength.js'
import { studioStore } from './store/studio.js'
import { errorStore } from './store/error.js'

// Cache reset: old feed items used a wrong wrapper format -> clear once
const CACHE_VERSION = '3'
if (localStorage.getItem('bytegym_cache_version') !== CACHE_VERSION) {
  localStorage.removeItem('bytegym_feed')
  localStorage.removeItem('bytegym_studio')
  localStorage.setItem('bytegym_cache_version', CACHE_VERSION)
}

// Load stores from localStorage
sessionStore.load()
feedStore.load()
strengthStore.load()
studioStore.load()

// Initialize Framework7-Vue plugin (before `createApp`)
Framework7.use(Framework7Vue)

// System-bar insets from the Android shell (edge-to-edge), before the first paint
installNativeInsets()

const app = createApp(App)

// Global Vue error handler (uncaught lifecycle/render errors)
app.config.errorHandler = (err, _instance, info) => {
  errorStore.show(err, `Vue: ${info}`)
}

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorStore.show(event.reason, 'Promise (unhandled)')
})

// Register all `f7-*` components globally
registerComponents(app)

app.use(i18n)
app.mount('#app')