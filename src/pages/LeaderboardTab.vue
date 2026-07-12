<template>
  <div class="px-4 pb-24">
      <p class="text-xs text-on-surface-variant mb-4 flex items-center gap-1.5 px-1">
        <f7-icon material="calendar_month" size="13px" />
        {{ $t('leaderboard.period', { from: fromFormatted, to: toFormatted }) }}
      </p>

      <!-- User rank banner -->
      <f7-card v-if="myRank" class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm m-0 mb-4">
        <f7-card-content class="p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <f7-icon material="emoji_events" size="20px" class="text-amber-600" />
            </div>
            <div>
              <span class="block text-sm font-medium text-amber-700">{{ $t('leaderboard.yourRank') }}</span>
              <span class="block text-3xl font-bold text-amber-900 dark:text-amber-300 leading-none">{{ rankNumberDisplay(myRank.rank) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-1.5 justify-end">
              <f7-icon material="military_tech" size="16px" class="text-amber-600" />
              <span class="text-xl font-bold text-amber-900 dark:text-amber-300">{{ myRank.totalPoints }}</span>
              <span class="text-sm text-amber-700">Pts</span>
            </div>
            <span class="block text-xs text-amber-600 mt-0.5 pr-0!">{{ myRank.sessionCount }} {{ $t('leaderboard.trainingDays') }}</span>
          </div>
        </f7-card-content>
      </f7-card>
      <div v-else class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 mb-4 text-center text-xs text-on-surface-variant">
        {{ $t('leaderboard.notInRanking') }}
      </div>

      <div v-if="!entries.length" class="flex flex-col items-center py-12 text-on-surface-variant">
        <span class="text-4xl mb-3">🏆</span>
        <p class="text-sm">{{ $t('leaderboard.noData') }}</p>
      </div>

      <div ref="listRef" class="flex flex-col gap-2">
        <div
          v-for="entry in entries"
          :key="entry.userId"
          :ref="entry.isMe ? 'myEntry' : undefined"
          :class="[
            'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 shadow-sm cursor-pointer active:opacity-80 transition-opacity',
            entry.isMe ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : ''
          ]"
          @click="openUserHistory(entry)"
        >
          <div class="flex items-center gap-3">
            <div :class="rankBubbleClass(entry.rank)">
              {{ bubbleLabel(entry.rank) }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium truncate" :class="entry.isMe ? 'text-amber-900 dark:text-amber-300' : 'text-on-surface'">
                  {{ entry.displayName }}
                  <span v-if="entry.isMe" class="text-xs ml-1">(Du)</span>
                </span>
                <div class="flex items-center gap-1">
                  <span class="text-lg font-bold text-on-surface">{{ entry.totalPoints }}</span>
                  <span class="text-xs text-on-surface-variant">Pts</span>
                </div>
              </div>

              <div class="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                <div
                  class="h-full bg-amber-400 rounded-full transition-all duration-500"
                  :style="{ width: progressPct(entry) + '%' }"
                />
              </div>

              <div class="text-xs text-on-surface-variant mt-1">{{ sessionCount(entry) }}</div>
            </div>
          </div>
        </div>
      </div>
  </div>

  <!-- User history sheet -->
  <f7-sheet
    ref="leaderboardUserSheet"
    :opened="!!selectedUser"
    @sheet:closed="selectedUser = null"
    @sheet:opened="onUserSheetOpened"
    swipe-to-close
    :breakpoints="[1]"
    :backdrop-breakpoint="0"
    backdrop
    style="--f7-sheet-height: 95vh; height: 95vh"
    class="h-[95vh] rounded-t-2xl sheet-surface"
  >
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between px-4 pt-1 pb-2 sticky top-0 bg-background z-10">
        <div>
          <h3 class="font-bold text-on-surface text-base">{{ selectedUser?.displayName }}</h3>
          <p class="text-xs text-on-surface-variant">{{ $t('leaderboard.trainingHistory') }}</p>
        </div>
        <f7-link @click="selectedUser = null" class="text-on-surface-variant text-xl">✕</f7-link>
      </div>
      <div class="overflow-y-auto px-4 pb-8 flex flex-col gap-1">
        <div
          v-for="day in userTrainingDays"
          :key="day.date"
          class="flex items-center justify-between py-2 border-b border-outline-variant text-sm"
        >
          <span class="text-on-surface">{{ day.dateLabel }}</span>
          <span class="text-on-surface-variant text-xs">{{ day.exerciseCount }} {{ $t('home.exercises') }} · {{ day.points }} Pts</span>
        </div>
        <p v-if="!userTrainingDays.length" class="text-sm text-on-surface-variant italic text-center py-8">
          {{ $t('leaderboard.noData') }}
        </p>
      </div>
    </div>
  </f7-sheet>
</template>

<script>
import { feedStore } from '../store/feed.js'
import { sessionStore } from '../store/session.js'
import { buildLeaderboard, rankDisplay, progressPercent } from '../utils/leaderboard.js'
import { updateFeed } from '../api/feed.js'

export default {
  name: 'LeaderboardTab',

  data() {
    return {
      fromDate: null,
      toDate: null,
      selectedUser: null
    }
  },

  computed: {
    myRank() {
      const myId = sessionStore.userId
      const me = this.entries.find(e => e.userId === myId)
      return me || null
    },

    leaderboardData() {
      return buildLeaderboard(feedStore.items, 4)
    },

    entries() {
      const myId = sessionStore.userId
      return this.leaderboardData.entries.map(e => ({
        ...e,
        isMe: e.userId === myId
      }))
    },

    maxPoints() {
      return this.entries.length ? this.entries[0].totalPoints : 1
    },

    fromFormatted() {
      const d = this.leaderboardData.fromDate
      return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
    },

    toFormatted() {
      const d = this.leaderboardData.toDate
      return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
    },

    userTrainingDays() {
      if (!this.selectedUser) return []
      const uid = this.selectedUser.userId
      const toDate = new Date()
      const fromDate = new Date(toDate.getTime() - 4 * 7 * 24 * 60 * 60 * 1000)
      const items = feedStore.items.filter(i =>
        i.userId === uid &&
        i.payload?.type === 'WORKOUT' &&
        i.payload?.exercises?.some(e => e?.dataSource === 'EGYM_MACHINE') &&
        new Date(i.createdAt) >= fromDate
      )
      const dayMap = new Map()
      for (const item of items) {
        const day = item.createdAt.split('T')[0]
        if (!dayMap.has(day)) dayMap.set(day, { date: day, points: 0, exerciseCount: 0 })
        const entry = dayMap.get(day)
        const exercises = item.payload?.exercises || []
        entry.points += Number(item.totalPerDay || exercises.length || 0)
        entry.exerciseCount += Number(item.totalPerDay || exercises.length || 0)
      }
      // Debug: verify whether `totalPerDay` is available (instead of sampled exercise length)
      const sample = items.slice(0, 5).map(i => ({
        id: i.id,
        day: String(i.createdAt || '').split('T')[0],
        totalPerDay: i.totalPerDay,
        exercisesLen: (i.payload?.exercises || []).length,
        dataSources: [...new Set((i.payload?.exercises || []).map(e => e?.dataSource).filter(Boolean))]
      }))
      console.log('[leaderboard][devices-debug] sample:', sample)
      return [...dayMap.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(d => ({
          ...d,
          dateLabel: new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })
        }))
    }
  },

  mounted() {
    this.$nextTick(() => this.scrollToMe())
  },

  methods: {
    rankDisplay,

    rankNumberDisplay(rank) {
      return `${rank}.`
    },

    bubbleLabel(rank) {
      return rank <= 3 ? String(rank) : `${rank}`
    },

    rankBubbleClass(rank) {
      if (rank === 1) return 'relative w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500 ring-2 ring-amber-300 text-sm font-bold text-amber-900 shrink-0'
      if (rank === 2) return 'relative w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 ring-2 ring-slate-200 text-sm font-bold text-slate-700 shrink-0'
      if (rank === 3) return 'relative w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-orange-300 text-sm font-bold text-orange-900 shrink-0'
      return 'w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium text-neutral-500 shrink-0'
    },

    sessionCount(entry) {
      const label = this.$t('leaderboard.trainingDays')
      return `${entry.sessionCount} ${label}`
    },

    progressPct(entry) {
      return progressPercent(entry.totalPoints, this.maxPoints)
    },

    openUserHistory(entry) {
      this.selectedUser = entry
    },

    onUserSheetOpened(sheet) {
      sheet?.setBreakpoint?.(1)
    },

    scrollToMe() {
      const myEl = this.$refs.myEntry
      if (myEl) {
        const el = Array.isArray(myEl) ? myEl[0] : myEl
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      }
    },

    async onRefresh(done) {
      try {
        await updateFeed()
      } catch (e) { /* ignore */ }
      done()
      this.$nextTick(() => this.scrollToMe())
    }
  }
}
</script>
