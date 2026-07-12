import { reactive } from 'vue'
import { clearStoredPassword } from './credentials.js'

const STORAGE_KEY = 'bytegym_session'

export const sessionStore = reactive({
  userId: null,
  jsessionid: null,
  cookieString: null,
  loginTime: null,
  email: null,
  studioKeyword: null,
  brandApiUrl: null,
  isLoggedIn: false,

  /** Whether the user opted in to keeping their password for silent re-login. */
  staySignedIn: false,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)

      this.userId = data.userId || null
      this.jsessionid = data.jsessionid || null
      this.cookieString = data.cookieString || null
      this.loginTime = data.loginTime || null
      this.email = data.email || null
      this.studioKeyword = data.studioKeyword || null
      this.brandApiUrl = data.brandApiUrl || null
      this.staySignedIn = !!data.staySignedIn
      this.isLoggedIn = !!(this.userId && this.jsessionid && this.brandApiUrl)
    } catch (e) {
      console.error('[session] load failed:', e)
    }
  },

  save() {
    // The password is deliberately NOT part of this record — see credentials.js.
    const data = {
      userId: this.userId,
      jsessionid: this.jsessionid,
      cookieString: this.cookieString,
      loginTime: this.loginTime,
      email: this.email,
      studioKeyword: this.studioKeyword,
      brandApiUrl: this.brandApiUrl,
      staySignedIn: this.staySignedIn,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  },

  setSession(userId, jsessionid, brandApiUrl, cookieString = null) {
    this.userId = userId
    this.jsessionid = jsessionid
    this.cookieString = cookieString
    this.loginTime = Date.now()
    this.brandApiUrl = brandApiUrl
    this.isLoggedIn = true
    this.save()
  },

  setCredentials(email, studioKeyword) {
    this.email = email
    this.studioKeyword = studioKeyword
    this.save()
  },

  logout() {
    // Keep email and studio code so the next login is not typed from scratch.
    const { email, studioKeyword, brandApiUrl } = this
    this.userId = null
    this.jsessionid = null
    this.cookieString = null
    this.loginTime = null
    this.isLoggedIn = false
    this.staySignedIn = false
    this.email = email
    this.studioKeyword = studioKeyword
    this.brandApiUrl = brandApiUrl
    clearStoredPassword()
    this.save()
  },
})
