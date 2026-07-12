<template>
  <div class="p-4 pb-24 space-y-3">
    <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm cursor-pointer active:opacity-90 transition-opacity m-0 mt-0!" @click="goStudio">
      <f7-card-content class="p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-on-surface truncate">{{ studioName }}</h2>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex items-center gap-1.5" :class="studioOpen ? 'text-emerald-600' : 'text-red-500'">
                <span class="w-2 h-2 rounded-full" :class="studioOpen ? 'bg-emerald-500' : 'bg-red-500'" />
                <span class="text-sm font-medium">{{ studioStatusLabel }}</span>
              </div>
              <span v-if="studioMetaLabel" class="text-xs text-on-surface-variant">{{ studioMetaLabel }}</span>
            </div>
          </div>
          <div class="text-on-surface-variant flex items-center gap-1">
            <f7-icon material="location_on" size="18px" />
            <f7-icon material="chevron_right" size="18px" />
          </div>
        </div>
      </f7-card-content>
    </f7-card>

    <div class="space-y-3">
      <currently-training-card
        :count="liveCount"
        :loading="liveLoading"
        :loaded-at="liveLoadedAt"
        :studio-open="studioOpen"
      />

      <last-workout-card :workout-items="lastWorkoutItems" />

      <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm cursor-pointer m-0 mb-0!" @click="showBioAgeSheet = true">
        <f7-card-content class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <f7-icon material="favorite" size="18px" class="text-amber-600" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-on-surface-variant">{{ $t('home.bioAgeLabel') }}</span>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-on-surface">{{ totalBioAge ?? '–' }}</span>
                  <span v-if="totalBioAge != null" class="text-sm text-on-surface-variant">{{ $t('units.years') }}</span>
                </div>
              </div>
            </div>
            <div :class="bioAgeDeltaColor" class="text-right">
              <div class="flex items-center gap-1">
                <f7-icon :material="bioAgeDeltaIcon" size="16px" />
                <span class="text-sm font-medium">{{ bioAgeDeltaLabel }}</span>
              </div>
            </div>
          </div>
        </f7-card-content>
      </f7-card>

      <div class="grid grid-cols-2 gap-2">
        <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
          <f7-card-content class="p-4">
            <div class="flex items-center gap-2 mb-2">
              <f7-icon material="trending_up" size="16px" class="text-amber-600" />
              <span class="text-sm font-medium text-on-surface-variant">{{ $t('leaderboard.trainingDays') }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-on-surface">{{ trainingDaysLast4 }}</span>
              <span class="text-xs text-on-surface-variant">{{ $t('home.last4WeeksShort') }}</span>
            </div>
          </f7-card-content>
        </f7-card>

        <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
          <f7-card-content class="p-4">
            <div class="flex items-center gap-2 mb-2">
              <f7-icon material="emoji_events" size="16px" class="text-amber-600" />
              <span class="text-sm font-medium text-on-surface-variant">{{ $t('leaderboard.rank') }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-on-surface">{{ myRank ? rankDisplay(myRank.rank) : '–' }}</span>
              <span v-if="myRank" class="text-xs text-on-surface-variant">{{ myRank.totalPoints }} Pts</span>
            </div>
          </f7-card-content>
        </f7-card>
      </div>

      <div v-if="errorMsg" class="text-sm text-red-600 dark:text-red-400">
        {{ errorMsg }}
        <f7-link class="ml-2" @click="loadData">{{ $t('retry') }}</f7-link>
      </div>
    </div>

    <f7-sheet
      :opened="showBioAgeSheet"
      @sheet:closed="showBioAgeSheet = false"
      swipe-to-close
      :breakpoints="[1]"
      :backdrop-breakpoint="0"
      backdrop
      style="--f7-sheet-height: 95vh; height: 95vh"
      class="rounded-t-2xl sheet-surface"
    >
      <bio-age-history-panel
        :opened="showBioAgeSheet"
        :chronological-age="chronologicalAge"
        @close="showBioAgeSheet = false"
      />
    </f7-sheet>
  </div>
</template>

<script>
import { sessionStore } from '../store/session.js'
import { studioStore } from '../store/studio.js'
import { feedStore } from '../store/feed.js'
import { strengthStore } from '../store/strength.js'
import { loadInitialFeed, updateFeed, fetchLiveCount } from '../api/feed.js'
import { loadBioAge } from '../api/strength.js'
import { loadStudioInfo } from '../api/studio.js'
import { errorStore } from '../store/error.js'
import { buildLeaderboard, rankDisplay } from '../utils/leaderboard.js'
import { getStudioStatus, parseWorkingHours } from '../utils/time.js'
import CurrentlyTrainingCard from '../components/cards/CurrentlyTrainingCard.vue'
import LastWorkoutCard from '../components/cards/LastWorkoutCard.vue'
import BioAgeHistoryPanel from '../components/bioage/BioAgeHistoryPanel.vue'

export default {
  name: 'StartTab',

  emits: ['open-studio-tab'],

  components: { CurrentlyTrainingCard, LastWorkoutCard, BioAgeHistoryPanel },

  data() {
    return {
      liveCount: null,
      liveLoading: true,
      liveLoadedAt: null,
      errorMsg: null,
      showBioAgeSheet: false
    }
  },

  computed: {
    studioName() {
      return studioStore.name || 'ByteGym'
    },
    osmUrl() { return studioStore.osmUrl },
    lastWorkoutItems() {
      const items = feedStore.getUserEgymItems(sessionStore.userId)
      if (!items.length) return []
      // Merge all items from the latest training day
      const lastDay = String(items[0].createdAt || '').split('T')[0]
      return items.filter(i => String(i.createdAt || '').startsWith(lastDay))
    },
    totalBioAge() {
      return strengthStore.getTotalBioAge()
    },
    chronologicalAge() {
      return strengthStore.getChronologicalAge()
    },
    myRank() {
      const data = buildLeaderboard(feedStore.items, 4)
      return data.entries.find(e => e.userId === sessionStore.userId) || null
    },
    trainingDaysLast4() {
      return this.myRank?.sessionCount || 0
    },
    studioOpen() {
      return this.studioStatus.status === 'open'
    },
    studioStatus() {
      return getStudioStatus(studioStore.workingHours || {})
    },
    studioStatusLabel() {
      if (this.studioStatus.status === 'open') return this.$t('studio.openNow')
      if (this.studioStatus.status === 'opening_soon') {
        return this.$t('studio.opensIn', { minutes: this.studioStatus.minutesUntilOpen })
      }
      return this.$t('studio.closed')
    },
    studioMetaLabel() {
      if (this.studioStatus.status !== 'open') return ''
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      const key = days[new Date().getDay()]
      const parsed = parseWorkingHours((studioStore.workingHours || {})[key])
      if (!parsed?.close) return ''
      const diffMs = parsed.close.getTime() - Date.now()
      if (diffMs <= 0) return ''
      const hours = Math.floor(diffMs / 3600000)
      const mins = Math.floor((diffMs % 3600000) / 60000)
      return this.$t('studio.openFor', { hours, minutes: mins })
    },
    bioAgeDeltaLabel() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return '–'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      const sign = delta > 0 ? '+' : ''
      return `${sign}${Math.round(delta)}`
    },
    bioAgeDeltaColor() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'text-gray-400'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'text-emerald-600'
      if (delta > 0) return 'text-red-500'
      return 'text-on-surface'
    },
    bioAgeDeltaIcon() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'remove'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'keyboard_arrow_down'
      if (delta > 0) return 'keyboard_arrow_up'
      return 'remove'
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    rankDisplay,

    goStudio() {
      this.$emit('open-studio-tab')
    },

    async loadData() {
      this.errorMsg = null
      try {
        // Missing `gymLocationId`? Load studio info first
        if (!studioStore.gymLocationId) {
          await loadStudioInfo()
        }

        if (!feedStore.items.length) {
          await loadInitialFeed()
        } else {
          await updateFeed()
        }

        const hasBioAgeInCache = strengthStore.getTotalBioAge() != null
        if (!hasBioAgeInCache) {
          await loadBioAge().catch(() => null)
        } else {
          // Show cached data immediately and refresh in background
          loadBioAge().catch(() => null)
        }

        this.logLastWorkoutDebug()
      } catch (e) {
        console.error('[StartTab] loadData error:', e)
        const msg = e?.message || ''
        if (msg === 'no_gym_id' || msg === 'session_invalid') {
          this.errorMsg = this.$t('error') + ' (' + msg + ')'
        } else {
          // Unknown error -> show global dialog
          errorStore.show(e, 'StartTab.loadData')
          this.errorMsg = this.$t('error')
        }
      }
      await this.loadLive()
    },

    async loadLive() {
      this.liveLoading = true
      try {
        this.liveCount = await fetchLiveCount()
        this.liveLoadedAt = new Date()
      } catch (e) {
        console.warn('[StartTab] loadLive error:', e)
        this.liveCount = 0
      } finally {
        this.liveLoading = false
      }
    },

    async onRefresh(done) {
      try {
        await this.loadLive()
        await updateFeed().catch(() => {})
        await loadBioAge().catch(() => null)
        this.logLastWorkoutDebug()
      } finally {
        // Must run even if a request throws, or the pull-to-refresh spinner keeps
        // spinning and MainPage's refresh button stays stuck on "refreshing".
        done()
      }
    },

    logLastWorkoutDebug() {
      const userId = sessionStore.userId
      const allWorkouts = (feedStore.items || []).filter(item => {
        const payload = item?.payload || {}
        return item?.userId === userId && payload?.type === 'WORKOUT'
      })

      const egymWorkouts = allWorkouts.filter(item => {
        const payload = item?.payload || {}
        const exercises = Array.isArray(payload.exercises) ? payload.exercises : []
        return exercises.some(ex => ex?.dataSource === 'EGYM_MACHINE')
      })

      const byDay = {}
      for (const item of egymWorkouts) {
        const payload = item?.payload || {}
        const exercises = Array.isArray(payload.exercises) ? payload.exercises : []
        const day = String(item?.createdAt || '').split('T')[0]
        if (!day) continue

        const exerciseCount = exercises.length
        const devicesFromTotalPerDay = Number(item?.totalPerDay || 0)
        const points = exercises.reduce((sum, ex) => sum + Number(ex?.points || 0), 0)
        const calories = exercises.reduce((sum, ex) => sum + Number(ex?.calories || 0), 0)

        if (!byDay[day]) {
          byDay[day] = { day, itemCount: 0, exerciseCount: 0, devicesFromTotalPerDay: 0, points: 0, calories: 0 }
        }
        byDay[day].itemCount += 1
        byDay[day].exerciseCount += exerciseCount
        byDay[day].devicesFromTotalPerDay += devicesFromTotalPerDay
        byDay[day].points += points
        byDay[day].calories += calories
      }

      const perDayLatest7 = Object.values(byDay)
        .sort((a, b) => String(b.day).localeCompare(String(a.day)))
        .slice(0, 7)

      console.log('[StartTab][LastWorkoutDebug] userId:', userId)
      console.log('[StartTab][LastWorkoutDebug] workouts all:', allWorkouts.length)
      console.log('[StartTab][LastWorkoutDebug] workouts egym:', egymWorkouts.length)
      console.log('[StartTab][LastWorkoutDebug] per-day latest 7:', perDayLatest7)

      const latestDay = perDayLatest7[0]?.day || null
      const latestItems = latestDay
        ? egymWorkouts.filter(item => String(item?.createdAt || '').startsWith(latestDay))
        : []

      const latestDayDetails = latestItems.map(item => {
        const payload = item?.payload || {}
        const exercises = Array.isArray(payload.exercises) ? payload.exercises : []
        return {
          id: item?.id,
          createdAt: item?.createdAt,
          totalPerDay: item?.totalPerDay,
          feedTitle: item?.feedTitle,
          exercises: exercises.map(ex => ({
            id: ex?.id,
            activityId: ex?.activityId,
            dataSource: ex?.dataSource,
            points: ex?.points,
            calories: ex?.calories
          }))
        }
      })

      console.log('[StartTab][LastWorkoutDebug] latest day:', latestDay)
      console.log('[StartTab][LastWorkoutDebug] latest day items:', latestDayDetails)
    }
  }
}
</script>
