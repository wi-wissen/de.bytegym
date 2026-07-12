<template>
  <f7-card :class="cardClass" class="rounded-2xl shadow-sm m-0">
    <f7-card-content class="p-4">
      <div v-if="loading" class="flex flex-col gap-2">
        <div class="skeleton-block h-6 rounded-lg w-3/4" />
        <div class="skeleton-block h-3 rounded w-1/3 mt-1" />
      </div>

      <div v-else>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="iconBoxClass">
              <f7-icon material="groups" size="20px" :class="iconClass" />
            </div>
            <div>
              <h3 class="font-semibold" :class="titleClass">{{ $t('home.currentlyTrainingCard') }}</h3>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full" :class="dotClass" />
                <span class="text-sm" :class="statusClass">{{ statusText }}</span>
              </div>
            </div>
          </div>
          <div class="text-3xl font-bold" :class="countClass">{{ countNumber }}</div>
        </div>
        <div class="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
          <f7-icon material="schedule" size="13px" />
          <span>{{ $t('freshness', { time: freshTime }) }}</span>
        </div>
      </div>
    </f7-card-content>
  </f7-card>
</template>

<script>
export default {
  name: 'CurrentlyTrainingCard',

  props: {
    count: { type: Number, default: null },
    loading: { type: Boolean, default: false },
    loadedAt: { type: Date, default: null },
    studioOpen: { type: Boolean, default: true }
  },

  computed: {
    effectiveCount() {
      if (!this.studioOpen) return 0
      return this.count
    },

    cardClass() {
      return this.studioOpen
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
    },

    iconBoxClass() {
      return this.studioOpen ? 'bg-emerald-100' : 'bg-neutral-100 dark:bg-neutral-700'
    },

    iconClass() {
      return this.studioOpen ? 'text-emerald-600' : 'text-neutral-500'
    },

    titleClass() {
      return this.studioOpen ? 'text-emerald-900 dark:text-emerald-300' : 'text-on-surface'
    },

    dotClass() {
      return this.studioOpen ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
    },

    statusClass() {
      return this.studioOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-on-surface-variant'
    },

    countClass() {
      return this.studioOpen ? 'text-emerald-600' : 'text-neutral-500'
    },

    countNumber() {
      if (this.effectiveCount === null) return '–'
      return String(this.effectiveCount)
    },

    statusText() {
      if (!this.studioOpen) return this.$t('studio.closed')
      if (this.effectiveCount === null) return this.$t('home.loading')
      if (this.effectiveCount === 0) return this.$t('home.nobodyTraining')
      if (this.effectiveCount === 1) return this.$t('home.onePersonTraining')
      return this.$t('home.currentlyTraining', { count: this.effectiveCount })
    },

    freshTime() {
      if (!this.loadedAt) return '–'
      return new Date(this.loadedAt).toLocaleTimeString('de-DE', {
        hour: '2-digit', minute: '2-digit'
      })
    }
  }
}
</script>
