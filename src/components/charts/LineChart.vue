<template>
  <div class="w-full overflow-x-auto">
    <svg
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      class="w-full"
      :style="{ height: svgHeight + 'px' }"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Y-Achse Gitterlinien -->
      <g v-for="line in yLines" :key="line.y">
        <line
          :x1="paddingLeft"
          :y1="line.y"
          :x2="svgWidth - paddingRight"
          :y2="line.y"
          stroke="currentColor"
          stroke-opacity="0.12"
          stroke-width="1"
        />
        <text
          :x="paddingLeft - 4"
          :y="line.y + 4"
          text-anchor="end"
          font-size="9"
          fill="currentColor"
          fill-opacity="0.5"
        >{{ line.label }}</text>
      </g>

      <!-- Optionale Referenzlinie -->
      <g v-if="hasReferenceLine">
        <line
          :x1="paddingLeft"
          :y1="referenceLineY"
          :x2="svgWidth - paddingRight"
          :y2="referenceLineY"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          stroke-opacity="0.9"
        />
        <text
          :x="svgWidth - paddingRight - 2"
          :y="referenceLineY - 4"
          text-anchor="end"
          font-size="9"
          fill="#ef4444"
        >{{ referenceLabel || referenceValue }}</text>
      </g>

      <!-- Linie -->
      <polyline
        v-if="points.length > 1"
        :points="svgPolylinePoints"
        fill="none"
        stroke="var(--f7-theme-color, #6750A4)"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Fläche unter der Linie -->
      <polygon
        v-if="points.length > 1"
        :points="svgAreaPoints"
        fill="var(--f7-theme-color, #6750A4)"
        fill-opacity="0.12"
      />

      <!-- Datenpunkte -->
      <circle
        v-for="(pt, i) in points"
        :key="i"
        :cx="pt.x"
        :cy="pt.y"
        r="3"
        fill="var(--f7-theme-color, #6750A4)"
      />

      <!-- X-Achse Labels (nur jedes Nth) -->
      <g v-for="(pt, i) in xLabels" :key="'xl' + i">
        <text
          :x="pt.x"
          :y="svgHeight - 2"
          text-anchor="middle"
          font-size="8"
          fill="currentColor"
          fill-opacity="0.5"
        >{{ pt.label }}</text>
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  name: 'LineChart',

  props: {
    /** Array von { date: string, value: number } */
    data: { type: Array, default: () => [] },
    svgWidth: { type: Number, default: 340 },
    svgHeight: { type: Number, default: 140 },
    forceZero: { type: Boolean, default: false },
    referenceValue: { type: Number, default: null },
    referenceLabel: { type: String, default: '' }
  },

  data() {
    return {
      paddingLeft: 28,
      paddingRight: 8,
      paddingTop: 12,
      paddingBottom: 18
    }
  },

  computed: {
    sorted() {
      return [...this.data].sort((a, b) => new Date(a.date) - new Date(b.date))
    },

    minVal() {
      if (this.forceZero) return 0
      const values = this.sorted.map(d => Number(d.value)).filter(v => Number.isFinite(v))
      if (this.referenceValue != null) values.push(Number(this.referenceValue))
      if (!values.length) return 0
      return Math.min(...values)
    },

    maxVal() {
      const values = this.sorted.map(d => Number(d.value)).filter(v => Number.isFinite(v))
      if (this.referenceValue != null) values.push(Number(this.referenceValue))
      if (!values.length) return 100
      return Math.max(...values)
    },

    range() {
      return Math.max(this.maxVal - this.minVal, 1)
    },

    chartW() {
      return this.svgWidth - this.paddingLeft - this.paddingRight
    },

    chartH() {
      return this.svgHeight - this.paddingTop - this.paddingBottom
    },

    points() {
      return this.sorted.map((d, i) => ({
        x: this.paddingLeft + (i / Math.max(this.sorted.length - 1, 1)) * this.chartW,
        y: this.paddingTop + (1 - (d.value - this.minVal) / this.range) * this.chartH,
        value: d.value,
        date: d.date
      }))
    },

    svgPolylinePoints() {
      return this.points.map(p => `${p.x},${p.y}`).join(' ')
    },

    svgAreaPoints() {
      const top = this.points.map(p => `${p.x},${p.y}`).join(' ')
      const bottom = `${this.points[this.points.length - 1].x},${this.paddingTop + this.chartH} ${this.paddingLeft},${this.paddingTop + this.chartH}`
      return `${top} ${bottom}`
    },

    yLines() {
      const lines = []
      const steps = 3
      for (let i = 0; i <= steps; i++) {
        const val = this.minVal + (this.range / steps) * i
        const y = this.paddingTop + (1 - (val - this.minVal) / this.range) * this.chartH
        lines.push({ y, label: Math.round(val) })
      }
      return lines
    },

    hasReferenceLine() {
      return this.referenceValue != null && Number.isFinite(Number(this.referenceValue))
    },

    referenceLineY() {
      const val = Number(this.referenceValue)
      return this.paddingTop + (1 - (val - this.minVal) / this.range) * this.chartH
    },

    xLabels() {
      if (!this.points.length) return []
      const step = Math.max(1, Math.floor(this.points.length / 5))
      return this.points
        .filter((_, i) => i % step === 0 || i === this.points.length - 1)
        .map(p => ({
          x: p.x,
          label: new Date(p.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        }))
    }
  }
}
</script>
