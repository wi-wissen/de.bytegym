<template>
  <div class="flex flex-col overflow-y-auto h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-1 pb-2 sticky top-0 bg-background z-10">
      <h2 class="text-lg font-bold text-on-surface">{{ $t('strengthDetail.history') }}</h2>
      <f7-link @click="$emit('close')" class="text-on-surface-variant text-xl leading-none">✕</f7-link>
    </div>

    <div class="px-4 pb-4">
      <!-- Title -->
      <h2 class="text-xl font-bold text-on-surface mb-1">{{ deviceName }}</h2>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ $t('progress.score') }}: <strong>{{ currentScore }} kg</strong>
        <span v-if="metric.progress" :class="trendClass" class="ml-2 text-xs">
          {{ trendLabel }}
        </span>
      </p>

      <!-- Loading indicator -->
      <div v-if="loading" class="flex justify-center py-8">
        <f7-preloader />
      </div>

      <!-- Empty state -->
      <div v-else-if="!history.length" class="text-center py-8 text-on-surface-variant">
        <p class="text-sm italic">{{ $t('strengthDetail.noHistory') }}</p>
      </div>

      <template v-else>
        <!-- Line chart -->
        <div class="bg-surface rounded-2xl p-3 shadow-sm mb-4">
          <p class="text-xs text-on-surface-variant mb-2">{{ $t('strengthDetail.history') }}</p>
          <line-chart :data="chartData" :svg-width="320" :svg-height="150" :force-zero="true" />
        </div>

        <!-- Measurements table -->
        <div class="bg-surface rounded-2xl shadow-sm overflow-hidden">
          <p class="text-xs text-on-surface-variant px-4 pt-3 pb-1 font-semibold">
            {{ $t('strengthDetail.measurements') }}
          </p>
          <div
            v-for="(entry, i) in history"
            :key="i"
            class="flex items-center justify-between px-4 py-2 border-b border-outline-variant last:border-0"
          >
            <span class="text-sm text-on-surface">{{ formatDate(entry.date || entry.createdAt) }}</span>
            <span class="text-sm font-semibold text-on-surface">{{ entry.value ?? entry.strength?.value ?? '–' }} kg</span>
            <span :class="entryTrendClass(entry)" class="text-xs">
              {{ entryTrendLabel(entry) }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { strengthStore } from '../store/strength.js'
import { loadStrengthHistory } from '../api/strength.js'
import LineChart from '../components/charts/LineChart.vue'

export default {
  name: 'StrengthDetail',

  emits: ['close'],

  components: { LineChart },

  props: {
    metric: { type: Object, required: true }
  },

  data() {
    return {
      loading: false,
      errorMsg: null
    }
  },

  computed: {
    exerciseCode() {
      return this.metric?.type
    },

    deviceName() {
      const name = this.metric?.exerciseLabel || ''
      if (!name) return '–'
      const stripped = name.replace(/^EGYM\s+/i, '').trim()

      const normalizeWords = (s) => s
        .split(/\s+/)
        .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w)
        .join(' ')
      const key = normalizeWords(stripped)
      if (this.$te && this.$te('devices.' + key)) return this.$t('devices.' + key)

      const fallbackMap = {
        'lat pulldown': 'Latzug',
        'chest press': 'Brustpresse',
        'seated row': 'Rudern sitzend',
        'rotary torso': 'Torsorotation',
        'abdominal crunch': 'Bauchpresse',
        'back extension': 'Rückenstrecker',
        'leg press': 'Beinpresse'
      }
      const mapped = fallbackMap[stripped.toLowerCase()]
      if (mapped) return mapped

      return stripped
    },

    currentScore() {
      return this.metric?.value ?? '–'
    },

    trendLabel() {
      const p = this.metric?.progress
      if (p === 'up' || p === 'INCREASED') return this.$t('progress.trend.up')
      if (p === 'down' || p === 'DECREASED') return this.$t('progress.trend.down')
      return this.$t('progress.trend.stable')
    },

    trendClass() {
      const p = this.metric?.progress
      if (p === 'up' || p === 'INCREASED') return 'text-green-600 dark:text-green-400'
      if (p === 'down' || p === 'DECREASED') return 'text-red-600 dark:text-red-400'
      return 'text-on-surface-variant'
    },

    history() {
      if (!this.exerciseCode) return []
      return [...(strengthStore.history[this.exerciseCode] || [])].sort(
        (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      )
    },

    chartData() {
      return this.history
        .map(e => ({
          date: e.date || e.createdAt,
          value: e.value ?? e.strength?.value ?? 0
        }))
        .filter(e => e.value)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    }
  },

  mounted() {
    this.loadHistory()
  },

  methods: {
    async loadHistory() {
      if (!this.exerciseCode) return
      // Show cached data immediately, but still refresh in background
      const hasCache = !!strengthStore.history[this.exerciseCode]?.length
      if (hasCache) {
        loadStrengthHistory(this.exerciseCode).catch(() => {
          this.errorMsg = this.$t('error')
        })
        return
      }
      this.loading = true
      try {
        await loadStrengthHistory(this.exerciseCode)
      } catch (e) {
        this.errorMsg = this.$t('error')
      } finally {
        this.loading = false
      }
    },

    formatDate(iso) {
      if (!iso) return '–'
      return new Date(iso).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    },

    entryTrendLabel(entry) {
      const p = entry.progress || entry.strength?.progress
      if (p === 'up' || p === 'INCREASED') return '↑'
      if (p === 'down' || p === 'DECREASED') return '↓'
      return '→'
    },

    entryTrendClass(entry) {
      const p = entry.progress || entry.strength?.progress
      if (p === 'up' || p === 'INCREASED') return 'text-green-600'
      if (p === 'down' || p === 'DECREASED') return 'text-red-600'
      return 'text-on-surface-variant'
    }
  }
}
</script>
