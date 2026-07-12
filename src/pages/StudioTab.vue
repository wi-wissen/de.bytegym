<template>
  <div class="px-4 pt-4 pb-24 space-y-4">
    <!-- Map banner -->
    <div id="map-container" class="w-full h-40 rounded-2xl bg-surface-variant relative overflow-hidden" @click="openOsm">
      <div v-if="!mapReady" class="absolute inset-0 flex items-center justify-center text-on-surface-variant text-sm">
        <f7-icon material="location_on" size="16px" class="mr-1" /> {{ $t('studio.map') }}
      </div>
    </div>

    <!-- Freshness indicator -->
    <p v-if="lastUpdated" class="text-xs text-on-surface-variant flex items-center gap-1.5">
      <f7-icon material="schedule" size="13px" />
        {{ $t('freshness', { time: formatTime(lastUpdated) }) }}
    </p>

    <!-- Studio info -->
    <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
      <f7-card-header class="flex-wrap gap-1 items-start">
            <span class="font-bold text-on-surface text-base wrap-break-word min-w-0">{{ studioName }}</span>
            <f7-badge :class="statusBadgeClass" class="text-xs shrink-0 whitespace-nowrap rounded-full px-2 py-1">{{ statusLabel }}</f7-badge>
      </f7-card-header>
      <f7-card-content class="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <div v-if="address" class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-2 min-w-0">
            <f7-icon material="location_on" size="16px" class="text-on-surface-variant" />
            <span class="text-on-surface truncate">{{ address }}</span>
          </div>
          <f7-link icon-material="content_copy" @click="copyAddress" class="text-on-surface-variant" />
        </div>

        <a v-if="phone" :href="'tel:' + phone" class="text-sm text-amber-600 flex items-center gap-2">
          <f7-icon material="call" size="16px" /> {{ phone }}
        </a>
        <a v-if="email" :href="'mailto:' + email" class="text-sm text-amber-600 flex items-center gap-2">
          <f7-icon material="mail" size="16px" /> {{ email }}
        </a>
        <a v-if="website" :href="website" external class="text-sm text-amber-600 flex items-center gap-2 truncate">
          <f7-icon material="language" size="16px" /> {{ website }}
        </a>
      </f7-card-content>
    </f7-card>

    <!-- Opening hours -->
    <f7-card v-if="hasHours" class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
      <f7-card-header class="font-semibold text-on-surface">{{ $t('studio.hours') }}</f7-card-header>
      <f7-card-content class="pt-0!">
          <div
            v-for="(day, key) in orderedHours"
            :key="key"
            :class="['flex justify-between py-1 text-sm border-b border-outline-variant last:border-0', isToday(key) ? 'font-bold text-primary' : 'text-on-surface']"
          >
            <span>{{ $t('studio.days.' + key) }}</span>
            <span>{{ day === 'Closed' ? $t('studio.closed') : (formatHoursDE(day) || day) }}</span>
          </div>
      </f7-card-content>
    </f7-card>

    <!-- Weekly heat map -->
    <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
      <f7-card-header class="font-semibold text-on-surface">
        {{ $t('studio.weeklyHeatmap') }}
      </f7-card-header>
      <f7-card-content class="space-y-3 pt-0!">
        <week-heatmap
          :feed-items="egymItems"
          :weeks-count="visibleWeeks"
          @week-tap="openWeekDrilldown"
        />
        <f7-button
          v-if="visibleWeeks < 12"
          small
          outline
          @click="visibleWeeks += 4"
        >{{ $t('studio.showMore') }}</f7-button>
      </f7-card-content>
    </f7-card>

    <div v-if="errorMsg" class="text-sm text-error bg-error-container rounded-xl px-4 py-2">
      {{ errorMsg }}
    </div>

    <!-- Hour drilldown sheet -->
    <f7-sheet
      ref="studioSheet"
      :opened="!!drilldownWeek"
      @sheet:closed="drilldownWeek = null"
      @sheet:opened="onStudioSheetOpened"
      swipe-to-close
      :breakpoints="[1]"
      :backdrop-breakpoint="0"
      backdrop
      style="--f7-sheet-height: 95vh; height: 95vh"
      class="h-[95vh] rounded-t-2xl sheet-surface"
    >
      <div class="flex flex-col h-full overflow-y-auto">
        <div class="flex items-center justify-between px-4 pt-1 pb-2 sticky top-0 bg-background z-10">
          <p class="text-sm font-semibold text-on-surface">{{ $t('studio.weeklyHeatmap') }}</p>
          <f7-link class="text-on-surface-variant text-xl" @click="drilldownWeek = null">✕</f7-link>
        </div>
        <div class="px-4 pb-4">
          <hour-drilldown
            v-if="drilldownWeek"
            :feed-items="egymItems"
            :week-start="drilldownWeek"
            :working-hours="workingHours"
          />
        </div>
      </div>
    </f7-sheet>
  </div>
</template>

<script>
import { studioStore } from '../store/studio.js'
import { feedStore } from '../store/feed.js'
import { loadStudioInfo } from '../api/studio.js'
import { getStudioStatus, formatHoursDE } from '../utils/time.js'
import WeekHeatmap from '../components/heatmap/WeekHeatmap.vue'
import HourDrilldown from '../components/heatmap/HourDrilldown.vue'

export default {
  name: 'StudioTab',

  components: { WeekHeatmap, HourDrilldown },

  data() {
    return {
      mapReady: false,
      mapInstance: null,
      mapLoadToken: 0,
      tabSeen: false,
      visibleWeeks: 4,
      drilldownWeek: null,
      errorMsg: null
    }
  },

  computed: {
    studioName() { return studioStore.name || '–' },
    address() { return studioStore.addressLine },
    phone() { return studioStore.phone },
    email() { return studioStore.email },
    website() { return studioStore.website },
    osmUrl() { return studioStore.osmUrl },
    lastUpdated() { return studioStore.lastUpdated },

    egymItems() {
      return feedStore.getEgymMachineItems()
    },

    workingHours() { return studioStore.workingHours || {} },

    hasHours() {
      return Object.keys(studioStore.workingHours || {}).length > 0
    },

    orderedHours() {
      const ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
      const result = {}
      for (const key of ORDER) {
        if (studioStore.workingHours[key] !== undefined) {
          result[key] = studioStore.workingHours[key]
        }
      }
      return result
    },

    studioStatus() {
      return getStudioStatus(studioStore.workingHours || {})
    },

    statusLabel() {
      const s = this.studioStatus
      if (s.status === 'open') return this.$t('studio.openNow')
      if (s.status === 'opening_soon') return this.$t('studio.opensIn', { minutes: s.minutesUntilOpen })
      return this.$t('studio.closed')
    },

    statusBadgeClass() {
      const s = this.studioStatus.status
      if (s === 'open') return 'bg-green-500 text-white'
      if (s === 'opening_soon') return 'bg-orange-400 text-white'
      return 'bg-red-500 text-white'
    }
  },

  async mounted() {
    if (!studioStore.lat || !studioStore.lng) {
      await loadStudioInfo().catch(() => null)
    }
    // Only build the map if this tab is already the visible one — F7 mounts every
    // tab up front, so building it here unconditionally would pull the maplibre
    // chunk on app start even for users who never open Studio.
    if (this.tabSeen) this.initMap()
  },

  beforeUnmount() {
    // Without this the map keeps its WebGL context and listeners alive
    this.mapLoadToken++
    this.mapInstance?.remove()
    this.mapInstance = null
  },

  methods: {
    formatHoursDE,

    formatTime(iso) {
      return new Date(iso).toLocaleString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    isToday(dayKey) {
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      return days[new Date().getDay()] === dayKey
    },

    openOsm() {
      if (studioStore.osmUrl) {
        window.open(studioStore.osmUrl, '_blank')
      }
    },

    async copyAddress() {
      try {
        await navigator.clipboard.writeText(studioStore.addressLine)
        this.$f7.toast.create({ text: this.$t('studio.addressCopied'), closeTimeout: 2000 }).open()
      } catch (e) { /* Tauri desktop: clipboard can differ by platform */ }
    },

    /** Called by MainPage when this tab becomes visible. */
    onTabShow() {
      this.tabSeen = true
      if (!this.mapInstance) this.initMap()
    },

    initMap() {
      const lat = studioStore.lat
      const lng = studioStore.lng
      if (!lat || !lng) return
      this.$nextTick(() => this.createMap(lat, lng))
    },

    async createMap(lat, lng) {
      const container = document.getElementById('map-container')
      if (!container) return

      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const style = dark
        ? 'https://tiles.openfreemap.org/styles/dark'
        : 'https://tiles.openfreemap.org/styles/liberty'

      // Marks any load still in flight as stale, so a second call can't leave two
      // maps behind while the first is still awaiting the import below.
      const token = ++this.mapLoadToken

      try {
        this.mapReady = false
        if (this.mapInstance) {
          this.mapInstance.remove()
          this.mapInstance = null
        }

        // maplibre-gl is ~800 kB and only this tab ever draws a map — keep it out
        // of the startup bundle and pull it in on first use.
        const [{ default: maplibregl }] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl.css')
        ])
        if (token !== this.mapLoadToken) return

        this.mapInstance = new maplibregl.Map({
          container: 'map-container',
          style,
          center: [lng, lat],
          zoom: 16,
          attributionControl: false
        })

        // Replace missing sprite images with transparent 1x1 placeholders
        this.mapInstance.on('styleimagemissing', (e) => {
          if (this.mapInstance.hasImage(e.id)) return
          this.mapInstance.addImage(e.id, {
            width: 1,
            height: 1,
            data: new Uint8Array([0, 0, 0, 0])
          })
        })

        // Use app icon as map marker
        const markerEl = document.createElement('div')
        markerEl.style.cssText = 'width:32px;height:32px;background-image:url(/app-icon.png);background-size:contain;background-repeat:no-repeat;background-position:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));'
        new maplibregl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .addTo(this.mapInstance)

        this.mapInstance.on('load', () => {
          this.mapReady = true
        })
      } catch (e) {
        console.warn('[studio] map initialization failed:', e)
      }
    },

    openWeekDrilldown(week) {
      this.drilldownWeek = week.weekStart
    },

    onStudioSheetOpened(sheet) {
      sheet?.setBreakpoint?.(1)
    },

    async onRefresh(done) {
      try {
        await loadStudioInfo()
      } catch (e) {
        this.errorMsg = this.$t('error')
      }
      done()
    }
  }
}
</script>
