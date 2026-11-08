<template>
  <f7-page :page-content="false" class="bg-surface-container">
    <!-- Dynamic navbar -->
    <f7-navbar>
      <template #title>{{ navTitle }}</template>
      <template v-if="navSubtitle" #subtitle>
        <span class="text-sm opacity-70">{{ navSubtitle }}</span>
      </template>
      <template #right>
        <div class="flex items-center gap-1">
          <f7-link
            icon-material="refresh"
            :aria-label="$t('refresh')"
            @click="refreshActiveTab"
            class="text-on-surface-variant"
          />
          <f7-link
            v-if="activeTab === 'home'"
            icon-material="logout"
            :aria-label="$t('home.logout')"
            @click="confirmLogout"
            class="text-on-surface-variant"
          />
        </div>
      </template>
    </f7-navbar>

    <!-- Tab bar -->
    <!-- `icons` (not `labels`) is what gives F7 the icon+label tabbar: it sets the
         Material 3 nav-bar height and keeps the page-content bottom offset in sync -->
    <f7-toolbar tabbar icons bottom>
      <f7-toolbar-pane>
        <f7-link tab-link="#tab-home" tab-link-active>
          <f7-icon material="home" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.home') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-progress">
          <f7-icon material="show_chart" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.progress') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-studio">
          <f7-icon material="fitness_center" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.studio') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-leaderboard">
          <f7-icon material="emoji_events" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.leaderboard') }}</span>
        </f7-link>
      </f7-toolbar-pane>
    </f7-toolbar>

    <!-- Tabs.
         These are f7-page-content, not f7-tab: f7-tab has no `ptr` prop and never
         emits `ptr:refresh`, so pull-to-refresh silently did nothing. f7-page-content
         carries both the tab and the pull-to-refresh behaviour. -->
    <f7-tabs>
      <f7-page-content id="tab-home" tab tab-active
        ptr @ptr:refresh="(done) => $refs.startTab.onRefresh(done)"
        @tab:show="activeTab = 'home'">
        <start-tab ref="startTab" @open-studio-tab="openStudioTab" />
      </f7-page-content>
      <f7-page-content id="tab-progress" tab
        ptr @ptr:refresh="(done) => $refs.progressTab.onRefresh(done)"
        @tab:show="activeTab = 'progress'">
        <progress-tab ref="progressTab" />
      </f7-page-content>
      <f7-page-content id="tab-studio" tab
        ptr @ptr:refresh="(done) => $refs.studioTab.onRefresh(done)"
        @tab:show="activeTab = 'studio'; $refs.studioTab?.onTabShow()">
        <studio-tab ref="studioTab" />
      </f7-page-content>
      <f7-page-content id="tab-leaderboard" tab
        ptr @ptr:refresh="(done) => $refs.leaderboardTab.onRefresh(done)"
        @tab:show="activeTab = 'leaderboard'">
        <leaderboard-tab ref="leaderboardTab" />
      </f7-page-content>
    </f7-tabs>
  </f7-page>
</template>

<script>
import { f7 } from 'framework7-vue'
import { sessionStore } from '../store/session.js'
import { studioStore } from '../store/studio.js'
import { feedStore } from '../store/feed.js'
import { logout } from '../api/auth.js'
import StartTab from './StartTab.vue'
import ProgressTab from './ProgressTab.vue'
import StudioTab from './StudioTab.vue'
import LeaderboardTab from './LeaderboardTab.vue'
import { setRootBackHandler } from '../utils/backDismiss.js'

export default {
  name: 'MainPage',

  components: { StartTab, ProgressTab, StudioTab, LeaderboardTab },

  data() {
    return {
      activeTab: 'home'
    }
  },

  computed: {
    navTitle() {
      if (this.activeTab === 'home')        return 'ByteGym'
      if (this.activeTab === 'progress')    return this.$t('progress.title')
      if (this.activeTab === 'studio')      return this.$t('studio.title')
      if (this.activeTab === 'leaderboard') return this.$t('leaderboard.title')
      return 'ByteGym'
    },

    navSubtitle() {
      if (this.activeTab !== 'home') return ''
      const items = feedStore.getUserEgymItems(sessionStore.userId)
      if (!items.length) return ''
      const item = items[0]
      return [item.user?.firstName || '', item.user?.lastName || ''].filter(Boolean).join(' ')
    }
  },

  watch: {
    // Android navigation: back from any other tab returns to Home first; only back
    // from Home leaves the app.
    activeTab(tab) {
      setRootBackHandler(tab === 'home' ? null : () => f7.tab.show('#tab-home'))
    }
  },

  beforeUnmount() {
    setRootBackHandler(null)
  },

  methods: {
    // Runs the same pull-to-refresh as the gesture, so the button shows the same
    // spinner and goes through the same `ptr:refresh` handler.
    refreshActiveTab() {
      const el = document.querySelector(`#tab-${this.activeTab}`)
      if (el && !el.classList.contains('ptr-refreshing')) f7.ptr.refresh(el)
    },

    openStudioTab() {
      f7.tab.show('#tab-studio')
    },

    confirmLogout() {
      f7.dialog.confirm(
        this.$t('home.logout') + '?',
        async () => {
          try { await logout(sessionStore.brandApiUrl) } catch (e) { /* ignore */ }
          sessionStore.logout()
          f7.views.main.router.navigate('/login/', { reloadAll: true })
        }
      )
    }
  }
}
</script>
