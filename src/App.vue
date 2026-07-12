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
        colors: { primary: '#F59E0B' },
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

<style>
/* Material Design color tokens (amber primary) */
:root {
  --f7-theme-color: #F59E0B;
  --f7-theme-color-rgb: 245, 158, 11;
  --f7-theme-color-shade: #D97706;
  --f7-theme-color-tint: #FCD34D;
  --f7-page-bg-color: #f8f8f7;
  --f7-card-bg-color: #ffffff;
  --f7-bars-bg-color: #f8f8f7;
  --f7-tabbar-link-active-color: #D97706;
  font-family: 'Roboto', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  :root {
    --f7-page-bg-color: #1a1a1a;
    --f7-card-bg-color: #262626;
    --f7-bars-bg-color: #1a1a1a;
  }
}

/* Color utility classes */
.text-on-surface         { color: #1c1a14; }
.text-on-surface-variant { color: #5c5543; }
.text-primary            { color: var(--f7-theme-color); }
.bg-surface              { background: var(--f7-card-bg-color); }
.bg-surface-variant      { background: #f0e8d0; }
.bg-primary              { background: var(--f7-theme-color); }
.bg-primary-container    { background: #fef3c7; }
.text-on-primary         { color: #ffffff; }
.text-on-primary-container  { color: #78350f; }
.bg-secondary-container  { background: #fde68a; }
.text-on-secondary-container { color: #92400e; }
.text-error              { color: #b91c1c; }
.bg-error-container      { background: #fee2e2; }
.bg-background           { background: var(--f7-page-bg-color); }
.text-on-background      { color: #1c1a14; }
.border-outline-variant  { border-color: #d6c89a; }

@media (prefers-color-scheme: dark) {
  .text-on-surface         { color: #f0e8d0; }
  .text-on-surface-variant { color: #c9b97a; }
  .bg-surface-variant      { background: #3d3520; }
  .bg-primary-container    { background: #92400e; }
  .text-on-primary-container { color: #fef3c7; }
  .bg-secondary-container  { background: #78350f; }
  .text-on-secondary-container { color: #fde68a; }
  .bg-background           { background: #1c1a14; }
  .text-on-background      { color: #f0e8d0; }
  .border-outline-variant  { border-color: #3d3520; }
  .text-error              { color: #fca5a5; }
  .bg-error-container      { background: #7f1d1d; }
}

/* F7 cards without horizontal outer margins */
.card { margin-left: 0 !important; margin-right: 0 !important; }
</style>
