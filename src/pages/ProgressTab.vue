<template>
  <div class="px-4 pt-4 pb-24 space-y-3">
    <div class="flex flex-col gap-3">
      <!-- Freshness indicator -->
      <p v-if="lastUpdated" class="text-xs text-on-surface-variant flex items-center gap-1.5 px-1 my-0!">
        <f7-icon material="schedule" size="13px" />
        {{ $t('freshness', { time: formatTime(lastUpdated) }) }}
      </p>

      <!-- Overall bio age banner -->
      <f7-card :class="bioAgeCardClass" class="m-0 ripple relative overflow-hidden mt-0!" @click="showBioAgeSheet = true">
        <f7-card-content class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="bioAgeIconBg">
                <f7-icon material="favorite" size="20px" :class="bioAgeIconColor" />
              </div>
              <div>
                <span class="text-sm font-medium" :class="bioAgeLabelColor">{{ $t('progress.totalBioAge') }}</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl font-semibold tabular-nums" :class="bioAgeValueColor">{{ totalBioAge ?? '–' }}</span>
                  <span :class="bioAgeLabelColor">{{ $t('units.years') }}</span>
                </div>
              </div>
            </div>
            <div :class="bioAgeDeltaColor" class="text-right">
              <div class="text-xl font-semibold tabular-nums">{{ bioAgeDeltaLabel }}</div>
              <div class="text-xs opacity-80">{{ $t('progress.vsChronologicalAge') }}</div>
            </div>
          </div>
        </f7-card-content>
      </f7-card>

      <div
        v-if="!loading && !hasData"
        class="flex flex-col items-center py-12 text-on-surface-variant"
      >
        <f7-icon material="fitness_center" size="40px" class="mb-3 opacity-60" />
        <p class="text-sm">{{ $t('progress.noData') }}</p>
      </div>

      <template v-for="region in ['UPPER', 'CORE', 'LOWER']" :key="region">
        <div v-if="metricsByRegion[region] && metricsByRegion[region].length" class="space-y-2">
          <div class="flex items-center gap-2 mt-1 px-1">
            <h2 class="font-medium text-on-surface-variant text-sm">
              {{ $t('progress.' + region.toLowerCase()) }}
            </h2>
            <span
              v-if="bioAgeFor(region)"
              class="text-xs font-medium px-2.5 py-1 rounded-lg"
              :class="bioAgeFor(region) > Number(totalBioAge || 0) ? 'bg-error-container text-on-error-container' : 'bg-success-container text-on-success-container'"
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
      <error-banner v-if="errorMsg" :message="errorMsg" retryable @retry="loadData" />
    </div>

    <!-- Detail sheet -->
    <app-sheet
      :opened="!!selectedMetric"
      :title="$t('strengthDetail.history')"
      @closed="selectedMetric = null"
    >
      <strength-detail
        v-if="selectedMetric"
        :metric="selectedMetric"
      />
    </app-sheet>

    <app-sheet
      :opened="showBioAgeSheet"
      :title="$t('progress.totalBioAge')"
      @closed="showBioAgeSheet = false"
    >
      <bio-age-history-panel
        :opened="showBioAgeSheet"
        :chronological-age="chronologicalAge"
      />
    </app-sheet>
  </div>
</template>

<script>
import { dateLocale } from '../i18n/index.js'
import { strengthStore } from '../store/strength.js'
import { loadLatestMetrics, loadBioAge } from '../api/strength.js'
import StrengthCard from '../components/cards/StrengthCard.vue'
import StrengthDetail from './StrengthDetail.vue'
import BioAgeHistoryPanel from '../components/bioage/BioAgeHistoryPanel.vue'
import AppSheet from '../components/AppSheet.vue'
import ErrorBanner from '../components/ErrorBanner.vue'

export default {
  name: 'ProgressTab',

  components: { StrengthCard, StrengthDetail, BioAgeHistoryPanel, AppSheet, ErrorBanner },

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
    // -1 younger than chronological age, 1 older, 0 equal, null unknown
    bioAgeTrend() {
      if (this.totalBioAge == null || this.chronologicalAge == null) return null
      return Math.sign(Number(this.totalBioAge) - Number(this.chronologicalAge))
    },
    // On a tonal card everything inherits the card's "on" colour.
    bioAgeCardClass() {
      return { [-1]: 'card-success', 1: 'card-error' }[this.bioAgeTrend] || ''
    },
    bioAgeIconBg() {
      return { [-1]: 'bg-success', 1: 'bg-error' }[this.bioAgeTrend] || 'bg-primary-container'
    },
    bioAgeIconColor() {
      return { [-1]: 'text-success-container', 1: 'text-error-container' }[this.bioAgeTrend] || 'text-on-primary-container'
    },
    bioAgeDeltaColor() {
      return this.bioAgeTrend ? '' : 'text-on-surface-variant'
    },
    bioAgeLabelColor() {
      return this.bioAgeTrend ? 'opacity-80' : 'text-on-surface-variant'
    },
    bioAgeValueColor() {
      return this.bioAgeTrend ? '' : 'text-on-surface'
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    formatTime(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleString(dateLocale(), {
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


    openDetail(metric) {
      this.selectedMetric = metric
    }
  }
}
</script>
