<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <div class="flex items-center justify-between px-4 pt-1 pb-2 sticky top-0 bg-background z-10">
      <h3 class="font-bold text-on-surface">{{ $t('progress.totalBioAge') }}</h3>
      <f7-link @click="$emit('close')" class="text-on-surface-variant text-xl">✕</f7-link>
    </div>

    <div class="px-4 pb-6">
      <div class="bg-surface rounded-2xl p-3 shadow-sm">
        <p class="text-xs text-on-surface-variant mb-2">
          {{ $t('strengthDetail.history') }}
        </p>

        <line-chart
          :data="chartData"
          :svg-width="340"
          :svg-height="180"
          :force-zero="true"
          :reference-value="chronologicalAge"
          :reference-label="chronologicalAgeLabel"
        />

        <p class="text-xs text-on-surface-variant mt-2" v-if="chronologicalAge != null">
          {{ $t('progress.userAgeLine') }}: <strong>{{ chronologicalAge }}</strong>
        </p>
      </div>

      <div class="bg-surface rounded-2xl shadow-sm overflow-hidden mt-3">
        <p class="text-xs text-on-surface-variant px-4 pt-3 pb-1 font-semibold">
          {{ $t('strengthDetail.measurements') }}
        </p>
        <div
          v-for="(entry, i) in tableRows"
          :key="i"
          class="flex items-center justify-between px-4 py-2 border-b border-outline-variant last:border-0"
        >
          <span class="text-sm text-on-surface">{{ formatDate(entry.date) }}</span>
          <span class="text-sm font-semibold text-on-surface">{{ entry.value }} {{ $t('units.years') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { loadBioAge, loadBioAgeHistory } from '../../api/strength.js'
import { strengthStore } from '../../store/strength.js'
import LineChart from '../charts/LineChart.vue'

export default {
  name: 'BioAgeHistoryPanel',

  components: { LineChart },

  emits: ['close'],

  props: {
    opened: { type: Boolean, default: false },
    chronologicalAge: { type: Number, default: null }
  },

  data() {
    return {
      history: [],
      loading: false
    }
  },

  computed: {
    chartData() {
      return (this.history || [])
        .map(h => ({ date: h.date, value: Number(h.value || 0) }))
        .filter(h => h.date && Number.isFinite(h.value))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    },

    tableRows() {
      return [...this.chartData]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    },

    chronologicalAgeLabel() {
      if (this.chronologicalAge == null) return ''
      return `${this.chronologicalAge} ${this.$t('units.yearsShort')}`
    }
  },

  watch: {
    opened: {
      immediate: true,
      handler(v) {
        if (v) this.load()
      }
    }
  },

  methods: {
    formatDate(iso) {
      if (!iso) return '–'
      return new Date(iso).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    },

    async load() {
      this.loading = true
      try {
        const [history] = await Promise.all([
          loadBioAgeHistory('ONE_ITEM_PER_MONTH'),
          loadBioAge().catch(() => null)
        ])

        const rows = Array.isArray(history) ? [...history] : []

        const latestValue = strengthStore.bioAge?.totalDetails?.totalBioAge?.value
        const latestCreatedAt = strengthStore.bioAge?.totalDetails?.totalBioAge?.createdAt
        const latestDate = latestCreatedAt ? String(latestCreatedAt).slice(0, 10) : null

        if (latestDate && Number.isFinite(Number(latestValue))) {
          const idx = rows.findIndex(r => String(r?.date) === latestDate)
          const latestRow = { date: latestDate, value: Number(latestValue) }
          if (idx >= 0) {
            rows[idx] = latestRow
          } else {
            rows.push(latestRow)
          }
        }

        this.history = rows
      } catch (e) {
        this.history = []
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
