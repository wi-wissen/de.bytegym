<template>
  <div class="px-4 pt-4 pb-24 space-y-3">
    <div class="flex flex-col gap-3">
      <!-- Freshness indicator -->
      <p v-if="lastUpdated" class="text-xs text-on-surface-variant flex items-center gap-1.5 px-1 my-0!">
        <f7-icon material="schedule" size="13px" />
        {{ $t('freshness', { time: formatTime(lastUpdated) }) }}
      </p>

      <!-- Overall bio age banner -->
      <f7-card :class="bioAgeCardClass" class="rounded-2xl shadow-sm m-0 cursor-pointer mt-0!" @click="showBioAgeSheet = true">
        <f7-card-content class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="bioAgeIconBg">
                <f7-icon material="favorite" size="20px" :class="bioAgeIconColor" />
              </div>
              <div>
                <span class="text-sm font-medium" :class="bioAgeLabelColor">{{ $t('progress.totalBioAge') }}</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold" :class="bioAgeValueColor">{{ totalBioAge ?? '–' }}</span>
                  <span :class="bioAgeLabelColor">{{ $t('units.years') }}</span>
                </div>
              </div>
            </div>
            <div :class="bioAgeDeltaColor" class="text-right">
              <div class="text-lg font-bold">{{ bioAgeDeltaLabel }}</div>
              <div class="text-xs">{{ $t('progress.vsChronologicalAge') }}</div>
            </div>
          </div>
        </f7-card-content>
      </f7-card>

      <div
        v-if="!loading && !hasData"
        class="flex flex-col items-center py-12 text-on-surface-variant"
      >
        <span class="text-4xl mb-3">💪</span>
        <p class="text-sm">{{ $t('progress.noData') }}</p>
      </div>

      <template v-for="region in ['UPPER', 'CORE', 'LOWER']" :key="region">
        <div v-if="metricsByRegion[region] && metricsByRegion[region].length" class="space-y-2">
          <div class="flex items-center gap-2 mt-1 px-1">
            <h2 class="font-semibold text-on-surface text-base">
              {{ $t('progress.' + region.toLowerCase()) }}
            </h2>
            <span
              v-if="bioAgeFor(region)"
              class="text-xs px-2 py-0.5 rounded-full"
              :class="bioAgeFor(region) > Number(totalBioAge || 0) ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
            >
              {{ $t('progress.bioAge', { age: bioAgeFor(region) }) }}
            </span>
          </div>

          <strength-card
            v-for="metric in metricsByRegion[region]"
            :key="metric.type"
            :metric="metric"
            @tap="openDetail"
          />
        </div>
      </template>

      <!-- Error -->
      <div v-if="errorMsg" class="text-sm text-error bg-error-container rounded-xl px-4 py-2 mt-2">
        {{ errorMsg }}
        <f7-link class="ml-2 text-primary" @click="loadData">{{ $t('retry') }}</f7-link>
      </div>
    </div>

    <!-- Detail sheet -->
    <f7-sheet
      ref="metricSheet"
      :opened="!!selectedMetric"
      @sheet:closed="selectedMetric = null"
      @sheet:opened="onMetricSheetOpened"
      swipe-to-close
      :breakpoints="[1]"
      :backdrop-breakpoint="0"
      backdrop
      style="--f7-sheet-height: 95vh; height: 95vh"
      class="h-[95vh] rounded-t-2xl sheet-surface"
    >
      <strength-detail
        v-if="selectedMetric"
        :metric="selectedMetric"
        @close="selectedMetric = null"
      />
    </f7-sheet>

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
import { strengthStore } from '../store/strength.js'
import { loadLatestMetrics, loadBioAge } from '../api/strength.js'
import StrengthCard from '../components/cards/StrengthCard.vue'
import StrengthDetail from './StrengthDetail.vue'
import BioAgeHistoryPanel from '../components/bioage/BioAgeHistoryPanel.vue'

export default {
  name: 'ProgressTab',

  components: { StrengthCard, StrengthDetail, BioAgeHistoryPanel },

  data() {
    return {
      loading: false,
      errorMsg: null,
      selectedMetric: null,
      showBioAgeSheet: false
    }
  },

  computed: {
    metricsByRegion() {
      return strengthStore.getByRegion()
    },

    hasData() {
      return strengthStore.latestMetrics.length > 0
    },

    lastUpdated() {
      return strengthStore.lastUpdated
    },

    totalBioAge() {
      return strengthStore.getTotalBioAge()
    },

    chronologicalAge() {
      return strengthStore.getChronologicalAge()
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
    bioAgeCardClass() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
      if (delta > 0) return 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
      return 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
    },
    bioAgeIconBg() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'bg-gray-100'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'bg-emerald-100'
      if (delta > 0) return 'bg-red-100'
      return 'bg-gray-100'
    },
    bioAgeIconColor() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'text-gray-500'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'text-emerald-600'
      if (delta > 0) return 'text-red-500'
      return 'text-on-surface'
    },
    bioAgeLabelColor() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'text-gray-500'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'text-emerald-700'
      if (delta > 0) return 'text-red-700'
      return 'text-on-surface-variant'
    },
    bioAgeValueColor() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return 'text-on-surface'
      const delta = Number(this.totalBioAge) - Number(this.chronologicalAge)
      if (delta < 0) return 'text-emerald-900 dark:text-emerald-300'
      if (delta > 0) return 'text-red-900 dark:text-red-300'
      return 'text-on-surface'
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    formatTime(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    bioAgeFor(region) {
      return strengthStore.getBioAgeForRegion(region)
    },

    async loadData() {
      this.errorMsg = null
      this.loading = true
      try {
        await Promise.all([loadLatestMetrics(), loadBioAge()])
      } catch (e) {
        this.errorMsg = this.$t('error')
      } finally {
        this.loading = false
      }
    },

    async onRefresh(done) {
      try {
        await this.loadData()
      } finally {
        // Must run even if loadData throws — see StartTab.onRefresh
        done()
      }
    },

    onMetricSheetOpened(sheet) {
      sheet?.setBreakpoint?.(1)
    },

    openDetail(metric) {
      this.selectedMetric = metric
    }
  }
}
</script>
