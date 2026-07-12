<template>
  <f7-page :page-content="false" class="bg-background">
    <!-- Dynamic navbar -->
    <f7-navbar class="border-b border-neutral-200/80 dark:border-neutral-700/70">
      <template #title>{{ navTitle }}</template>
      <template v-if="navSubtitle" #subtitle>
        <span class="text-sm opacity-70">{{ navSubtitle }}</span>
      </template>
      <template #right>
        <div class="flex items-center gap-1">
          <f7-link
            :icon-material="refreshing ? 'hourglass_top' : 'refresh'"
            @click="refreshActiveTab"
            :class="refreshing ? 'opacity-50 pointer-events-none' : 'text-on-surface-variant'"
          />
          <f7-link v-if="activeTab === 'home'" icon-material="logout" @click="confirmLogout" class="text-amber-700" />
        </div>
      </template>
    </f7-navbar>

    <!-- Tab bar -->
    <!-- `icons` (not `labels`) is what gives F7 the icon+label tabbar: it sets the
         Material 3 nav-bar height and keeps the page-content bottom offset in sync -->
    <f7-toolbar tabbar icons bottom class="border-t border-neutral-200/90 dark:border-neutral-700/70">
      <f7-toolbar-pane>
        <f7-link tab-link="#tab-home" tab-link-active @click="activeTab = 'home'">
          <f7-icon material="home" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.home') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-progress" @click="activeTab = 'progress'">
          <f7-icon material="show_chart" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.progress') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-studio" @click="activeTab = 'studio'">
          <f7-icon material="fitness_center" size="24px" />
          <span class="tabbar-label">{{ $t('tabs.studio') }}</span>
        </f7-link>
        <f7-link tab-link="#tab-leaderboard" @click="activeTab = 'leaderboard'">
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
        ptr @ptr:refresh="(done) => $refs.startTab.onRefresh(done)">
        <start-tab ref="startTab" @open-studio-tab="openStudioTab" />
      </f7-page-content>
      <f7-page-content id="tab-progress" tab
        ptr @ptr:refresh="(done) => $refs.progressTab.onRefresh(done)">
        <progress-tab ref="progressTab" />
      </f7-page-content>
      <f7-page-content id="tab-studio" tab
        ptr @ptr:refresh="(done) => $refs.studioTab.onRefresh(done)"
        @tab:show="$refs.studioTab?.onTabShow()">
        <studio-tab ref="studioTab" />
      </f7-page-content>
      <f7-page-content id="tab-leaderboard" tab
        ptr @ptr:refresh="(done) => $refs.leaderboardTab.onRefresh(done)">
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

export default {
  name: 'MainPage',

  components: { StartTab, ProgressTab, StudioTab, LeaderboardTab },

  data() {
    return {
      activeTab: 'home',
      refreshing: false
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

  methods: {
    async refreshActiveTab() {
      if (this.refreshing) return
      this.refreshing = true

      try {
        const donePromise = new Promise((resolve) => {
          if (this.activeTab === 'home') {
            return this.$refs.startTab?.onRefresh?.(resolve)
          }
          if (this.activeTab === 'progress') {
            return this.$refs.progressTab?.onRefresh?.(resolve)
          }
          if (this.activeTab === 'studio') {
            return this.$refs.studioTab?.onRefresh?.(resolve)
          }
          if (this.activeTab === 'leaderboard') {
            return this.$refs.leaderboardTab?.onRefresh?.(resolve)
          }
          resolve()
        })

        await donePromise
      } finally {
        this.refreshing = false
      }
    },

    openStudioTab() {
      f7.tab.show('#tab-studio')
      this.activeTab = 'studio'
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
