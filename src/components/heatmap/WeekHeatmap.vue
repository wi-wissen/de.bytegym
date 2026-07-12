<template>
  <div>
    <!-- Wochentag-Header -->
    <div class="grid grid-cols-7 gap-1 mt-1 mb-2 ml-0">
      <div
        v-for="d in dayHeaders"
        :key="d"
        class="text-center text-xs text-on-surface-variant"
      >{{ d }}</div>
    </div>

    <!-- Wochen-Zeilen -->
    <div
      v-for="(week, wi) in weeks"
      :key="wi"
      class="mb-1 cursor-pointer"
      @click="$emit('week-tap', week)"
    >
      <!-- Wochen-Label -->
      <p class="text-xs text-on-surface-variant mb-0.5 ml-1">
        {{ weekLabel(week.weekStart) }}
      </p>
      <!-- 7 Tages-Zellen -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(day, di) in week.days"
          :key="di"
          :title="dayTitle(day)"
          :style="cellStyle(day)"
          class="aspect-square rounded-md transition-opacity"
        />
      </div>
    </div>

    <!-- Legende -->
    <div class="flex items-center gap-1 mt-3 ml-1">
      <span class="text-xs text-on-surface-variant mr-1">{{ $t('studio.heatmapLegend') }}</span>
      <span
        v-for="(level, i) in [0,1,2,3,4]"
        :key="i"
        :style="legendStyle(level)"
        class="w-4 h-4 rounded-sm inline-block"
      />
      <span class="text-xs text-on-surface-variant ml-1">{{ maxCount }}</span>
    </div>
  </div>
</template>

<script>
import { buildWeekHeatmap, intensityLevelDynamic, intensityStyle } from '../../utils/heatmap.js'

export default {
  name: 'WeekHeatmap',

  emits: ['week-tap'],

  props: {
    feedItems: { type: Array, default: () => [] },
    weeksCount: { type: Number, default: 4 }
  },

  computed: {
    dayHeaders() {
      return [
        this.$t('studio.daysShort.Mo'),
        this.$t('studio.daysShort.Tu'),
        this.$t('studio.daysShort.We'),
        this.$t('studio.daysShort.Th'),
        this.$t('studio.daysShort.Fr'),
        this.$t('studio.daysShort.Sa'),
        this.$t('studio.daysShort.Su')
      ]
    },

    weeks() {
      return buildWeekHeatmap(this.feedItems, this.weeksCount)
    },

    maxCount() {
      const counts = this.weeks.flatMap(w => w.days.map(d => d.count))
      return Math.max(1, ...counts)
    }
  },

  methods: {
    weekLabel(weekStart) {
      return weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        + ' – '
        + new Date(weekStart.getTime() + 6 * 86400000)
            .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    },

    cellStyle(day) {
      if (day.isFuture) {
        return { backgroundColor: 'rgba(128,128,128,0.1)' }
      }
      const level = intensityLevelDynamic(day.count, this.maxCount)
      return intensityStyle(level)
    },

    dayTitle(day) {
      const d = day.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
      return `${d}: ${day.count} ${this.$t('studio.trainers')}`
    },

    legendStyle(level) {
      return intensityStyle(level)
    }
  }
}
</script>
