<template>
  <f7-app v-bind="f7params">
    <f7-view main :url="initialUrl" />
    <ErrorDialog />
  </f7-app>
</template>

<script>
import { f7, f7ready } from 'framework7-vue'
import routes from './routes.js'
import { sessionStore } from './store/session.js'
import { installBackDismiss } from './utils/backDismiss.js'
import ErrorDialog from './components/ErrorDialog.vue'

export default {
  name: 'App',

  components: { ErrorDialog },

  data() {
    return {
      sessionStore, // exposed so the watcher below can see it
      f7params: {
        name: 'ByteGym',
        theme: 'md',
        darkMode: 'auto',
        // Framework7 still derives its palette from this, but main.css maps every
        // role it uses onto the app's own tokens.
        colors: { primary: '#8B5000' },
        routes,
      }
    }
  },

  computed: {
    initialUrl() {
      return sessionStore.isLoggedIn ? '/' : '/login/'
    }
  },

  watch: {
    // A 401 that cannot be re-authenticated ends the session (see api/auth.js).
    // Whoever hit that 401 shouldn't have to care about routing, so the app reacts
    // to the session itself going away.
    'sessionStore.isLoggedIn'(isLoggedIn) {
      if (!isLoggedIn) {
        f7.views.main?.router?.navigate('/login/', { reloadAll: true })
      }
    }
  },

  mounted() {
    // Back button / edge-swipe-back closes the top-most sheet instead of the app
    f7ready((f7) => installBackDismiss(f7))
  }
}
</script>
