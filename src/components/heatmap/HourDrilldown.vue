<template>
  <div class="overflow-x-auto">
    <p class="text-sm font-semibold mb-2">
      {{ weekLabel }}
    </p>

    <!-- Grid: columns = weekdays, rows = hourly slots -->
    <div
      class="grid gap-px"
      :style="{ gridTemplateColumns: `2.5rem repeat(7, 1fr)` }"
    >
      <!-- Header: weekdays -->
      <div class="text-xs text-on-surface-variant text-right pr-1" />
      <div
        v-for="d in dayHeaders"
        :key="d"
        class="text-xs text-center text-on-surface-variant pb-1"
      >{{ d }}</div>

      <!-- Hour rows -->
      <template v-for="slotIdx in displayedSlots" :key="slotIdx">
        <!-- Slot label every 2 hours -->
        <div class="text-right pr-1 flex items-center justify-end">
          <span v-if="slotIdx % 4 === 0" class="text-xs text-on-surface-variant leading-none">
            {{ slotLabel(slotIdx) }}
          </span>
        </div>
        <!-- 7 day cells -->
        <div
          v-for="dayIdx in 7"
          :key="dayIdx"
          :style="cellStyle(dayIdx - 1, slotIdx)"
          class="h-3 rounded-sm"
          :title="cellTitle(dayIdx - 1, slotIdx)"
        />
      </template>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-1 mt-3">
      <span class="text-xs text-on-surface-variant mr-1">{{ $t('studio.heatmapLegend') }}</span>
      <span
        v-for="level in [0,1,2,3,4]"
        :key="level"
        :style="legendStyle(level)"
        class="w-3 h-3 rounded-sm inline-block"
      />
      <span class="text-xs text-on-surface-variant ml-1">{{ maxCount }}</span>
    </div>
  </div>
</template>

<script>
import { buildHourHeatmap, intensityLevelDynamic, intensityStyle } from '../../utils/heatmap.js'
import { slotLabel } from '../../utils/time.js'

export default {
  name: 'HourDrilldown',

  props: {
    feedItems: { type: Array, default: () => [] },
    weekStart: { type: Date, required: true },
    workingHours: { type: Object, default: () => ({}) }
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

    weekLabel() {
      const from = this.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
      const toDate = new Date(this.weekStart.getTime() + 6 * 86400000)
      const to = toDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      return `${from} – ${to}`
    },

    /** Compute slot range from studio opening hours. */
    slotRange() {
      const ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
      let minSlot = 47, maxSlot = 0
      for (const key of ORDER) {
        const h = (this.workingHours || {})[key]
        if (!h || h === 'Closed') continue
        const parts = h.split('-')
        if (parts.length < 2) continue
        const parseSlot = (s) => {
          const m = s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i)
          if (!m) return null
          let hour = parseInt(m[1])
          const ap = m[3].toUpperCase()
          if (ap === 'PM' && hour !== 12) hour += 12
          if (ap === 'AM' && hour === 12) hour = 0
          return hour * 2 + Math.floor(parseInt(m[2]) / 30)
        }
        const os = parseSlot(parts[0])
        const cs = parseSlot(parts[1])
        if (os !== null) minSlot = Math.min(minSlot, os)
        if (cs !== null) maxSlot = Math.max(maxSlot, cs)
      }
      if (minSlot > maxSlot) return { start: 12, end: 46 } // fallback 6:00-23:00
      return { start: Math.max(0, minSlot - 2), end: Math.min(47, maxSlot + 2) }
    },

    displayedSlots() {
      const result = []
      for (let i = this.slotRange.start; i <= this.slotRange.end; i++) result.push(i)
      return result
    },

    grid() {
      return buildHourHeatmap(this.feedItems, this.weekStart)
    },

    maxCount() {
      const vals = this.grid.flatMap(row => row)
      return Math.max(1, ...vals)
    }
  },

  methods: {
    slotLabel(idx) {
      return slotLabel(idx)
    },

    cellStyle(dayIdx, slotIdx) {
      const count = this.grid?.[dayIdx]?.[slotIdx] || 0
      const level = intensityLevelDynamic(count, this.maxCount)
      return intensityStyle(level)
    },

    cellTitle(dayIdx, slotIdx) {
      const count = this.grid?.[dayIdx]?.[slotIdx] || 0
      return `${slotLabel(slotIdx)}: ${count} ${this.$t('studio.trainers')}`
    },

    legendStyle(level) {
      return intensityStyle(level)
    }
  }
}
</script>
