<template>
  <f7-page no-navbar login-screen>
    <f7-login-screen-title>
      <img src="/app-icon.png" alt="ByteGym" class="w-14 h-14 mx-auto rounded-2xl" />
    </f7-login-screen-title>
    <f7-block class="text-center mb-6">
      <h1 class="text-2xl font-bold text-center">{{ $t('login.title') }}</h1>
      <p class="text-sm opacity-60 mt-1 text-center">{{ $t('login.subtitle') }}</p>
    </f7-block>

    <f7-list inset>
      <!-- Email -->
      <f7-list-input
        type="email"
        :placeholder="$t('login.email')"
        :value="email"
        @input="email = $event.target.value"
        autocomplete="email"
        autocapitalize="none"
        clear-button
      />

      <!-- Password -->
      <f7-list-input
        :type="showPassword ? 'text' : 'password'"
        :placeholder="$t('login.password')"
        :value="password"
        @input="password = $event.target.value"
        autocomplete="current-password"
      />

      <f7-list-item
        :title="$t('login.showPassword')"
      >
        <f7-toggle
          :checked="showPassword"
          @toggle:change="showPassword = $event"
        />
      </f7-list-item>

      <!-- Studio code -->
      <f7-list-input
        type="text"
        :placeholder="$t('login.studioCode')"
        :value="studioCode"
        @focus="hardenStudioInput"
        @input="onStudioCodeInput"
        autocomplete="new-password"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        inputmode="verbatim"
        clear-button
      />

      <!-- Off by default: with this unchecked the password is never written to disk -->
      <f7-list-item
        :title="$t('login.staySignedIn')"
        :footer="$t('login.staySignedInHint')"
      >
        <f7-toggle
          :checked="staySignedIn"
          @toggle:change="staySignedIn = $event"
        />
      </f7-list-item>
    </f7-list>

    <!-- Error message -->
    <f7-block v-if="errorMsg">
      <p class="text-sm text-red-600 dark:text-red-400 text-center">{{ errorMsg }}</p>
    </f7-block>

    <f7-block class="mx-4">
      <f7-button
        fill
        large
        :disabled="loading"
        @click="handleLogin"
      >
        {{ loading ? $t('login.loggingIn') : $t('login.loginButton') }}
      </f7-button>
    </f7-block>
  </f7-page>
</template>

<script>
import { f7 } from 'framework7-vue'
import { setupStudio, login } from '../api/auth.js'
import { loadStudioInfo } from '../api/studio.js'
import { sessionStore } from '../store/session.js'
import { storePassword, clearStoredPassword } from '../store/credentials.js'
import { errorStore } from '../store/error.js'

export default {
  name: 'LoginPage',

  data() {
    return {
      email: sessionStore.email || '',
      password: '',
      studioCode: sessionStore.studioKeyword || '',
      showPassword: false,
      staySignedIn: false,
      loading: false,
      errorMsg: null
    }
  },

  methods: {
    hardenStudioInput(event) {
      const input = event?.target
      if (!input) return
      input.setAttribute('autocomplete', 'new-password')
      input.setAttribute('autocorrect', 'off')
      input.setAttribute('autocapitalize', 'off')
      input.setAttribute('spellcheck', 'false')
      input.setAttribute('inputmode', 'verbatim')
      input.spellcheck = false
    },

    onStudioCodeInput(event) {
      this.hardenStudioInput(event)
      this.studioCode = event?.target?.value || ''
    },

    async handleLogin() {
      if (!this.email || !this.password || !this.studioCode) return
      this.errorMsg = null
      this.loading = true

      try {
        // 1) Resolve studio
        let brandApiUrl = sessionStore.brandApiUrl
        if (!brandApiUrl || sessionStore.studioKeyword !== this.studioCode) {
          brandApiUrl = await setupStudio(this.studioCode)
        }

        // 2) Log in
        const { userId, jsessionid, cookieString } = await login(this.email, this.password, brandApiUrl)

        // 3) Save session. The password is only persisted if the user asked for it;
        //    otherwise an expired session just sends them back here.
        sessionStore.setCredentials(this.email, this.studioCode)
        sessionStore.staySignedIn = this.staySignedIn
        if (this.staySignedIn) {
          storePassword(this.password)
        } else {
          clearStoredPassword()
        }
        sessionStore.setSession(userId, jsessionid, brandApiUrl, cookieString)

        // 4) Load studio info (best effort)
        try { await loadStudioInfo() } catch (e) { /* ignore */ }

        // 5) Navigate to main app
        f7.views.main.router.navigate('/', { reloadAll: true })
      } catch (e) {
        console.error('[ByteGym] login failed:', e)
        const msg = e?.message || ''
        errorStore.show(e, `login:${msg || 'unknown_error'}`)
        if (msg === 'wrong_credentials') {
          this.errorMsg = this.$t('login.errors.wrongCredentials')
        } else if (msg === 'studio_not_found') {
          this.errorMsg = this.$t('login.errors.studioNotFound')
        } else if (msg === 'url_not_allowed') {
          this.errorMsg = this.$t('login.errors.urlNotAllowed')
        } else if (msg === 'compressed_response_not_parsed' || msg === 'invalid_json_response' || msg === 'login_response_parse_failed') {
          this.errorMsg = this.$t('login.errors.networkError')
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
          this.errorMsg = this.$t('login.errors.networkError')
        } else {
          this.errorMsg = this.$t('login.errors.unknown')
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
