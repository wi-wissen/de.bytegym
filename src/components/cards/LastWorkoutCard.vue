<template>
  <f7-card class="m-0">
    <f7-card-content class="p-4">
      <div v-if="!firstItem" class="flex items-center gap-3 text-sm text-on-surface-variant">
        <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
          <f7-icon material="calendar_month" size="20px" />
        </div>
        {{ $t('home.noWorkoutYet') }}
      </div>

      <div v-else>
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
            <f7-icon material="calendar_month" size="20px" class="text-on-primary-container" />
          </div>
          <div>
            <h3 class="font-semibold text-on-surface text-sm">{{ $t('home.lastWorkoutCard') }}</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-on-surface">{{ formattedDate }}</span>
              <span class="text-xs text-on-surface-variant">{{ relativeLabel }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-around pt-3 border-t border-outline-variant">
          <div class="text-center">
            <div class="text-xl font-semibold tabular-nums text-on-surface leading-none">{{ exerciseCount }}</div>
            <div class="text-xs text-on-surface-variant mt-1">{{ $t('home.exercises') }}</div>
          </div>
          <div class="w-px bg-outline-variant" />
          <div class="text-center">
            <div class="text-xl font-semibold tabular-nums text-on-surface leading-none">{{ totalPoints }}</div>
            <div class="text-xs text-on-surface-variant mt-1">{{ $t('home.points') }}</div>
          </div>
        </div>
      </div>
    </f7-card-content>
  </f7-card>
</template>

<script>
import { relativeDays, formatDate } from '../../utils/time.js'

export default {
  name: 'LastWorkoutCard',

  props: {
    /** All feed items from the latest training day (EGYM_MACHINE) */
    workoutItems: { type: Array, default: () => [] }
  },

  computed: {
    firstItem() { return this.workoutItems?.[0] || null },

    formattedDate() {
      if (!this.firstItem) return ''
      return formatDate(this.firstItem.createdAt)
    },

    relativeLabel() {
      if (!this.firstItem) return ''
      return relativeDays(this.firstItem.createdAt, this.$t.bind(this))
    },

    allExercises() {
      return this.workoutItems.flatMap(w => w.payload?.exercises || [])
    },

    exerciseCount() {
      const sumTotalPerDay = this.workoutItems.reduce((s, w) => s + Number(w?.totalPerDay || 0), 0)
      if (sumTotalPerDay > 0) return sumTotalPerDay
      return this.allExercises.length
    },

    totalPoints() {
      return this.allExercises.reduce((s, e) => s + (e.points || 0), 0)
    },

    totalCalories() {
      return 0
    }
  }
}
</script>
