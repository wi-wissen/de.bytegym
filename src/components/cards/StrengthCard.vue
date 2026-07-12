<template>
  <f7-card
    class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm cursor-pointer active:scale-98 transition-transform m-0"
    @click="$emit('tap', metric)"
  >
    <f7-card-content class="py-3 px-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium text-on-surface text-sm">{{ deviceName }}</h3>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-2xl font-bold text-on-surface">{{ score }}</span>
            <span class="text-sm text-on-surface-variant">kg {{ $t('progress.score') }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1" :class="trendColorClass">
          <f7-icon :material="trendIcon" size="14px" />
          <span class="text-xs font-medium">{{ trendShortLabel }}</span>
        </div>
      </div>
    </f7-card-content>
  </f7-card>
</template>

<script>
export default {
  name: 'StrengthCard',

  emits: ['tap'],

  props: {
    metric: { type: Object, required: true }
  },

  computed: {
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

    score() {
      return this.metric?.value ?? '–'
    },

    trendLabel() {
      const progress = this.metric?.progress
      if (progress === 'up' || progress === 'INCREASED') return this.$t('progress.trend.up')
      if (progress === 'down' || progress === 'DECREASED') return this.$t('progress.trend.down')
      return this.$t('progress.trend.stable')
    },

    trendIcon() {
      const progress = this.metric?.progress
      if (progress === 'up' || progress === 'INCREASED') return 'trending_up'
      if (progress === 'down' || progress === 'DECREASED') return 'trending_down'
      return 'remove'
    },

    trendColorClass() {
      const progress = this.metric?.progress
      if (progress === 'up' || progress === 'INCREASED') return 'text-emerald-600'
      if (progress === 'down' || progress === 'DECREASED') return 'text-red-500'
      return 'text-on-surface-variant'
    },

    trendShortLabel() {
      const pct = Number(this.metric?.percentageDiff)
      const progress = this.metric?.progress
      if (!Number.isFinite(pct) || pct === 0 || progress === 'stable' || progress === 'UNCHANGED') {
        return this.$t('progress.trend.stableShort')
      }
      const sign = pct > 0 ? '+' : ''
      return `${sign}${pct.toFixed(1)}%`
    }
  }
}
</script>
