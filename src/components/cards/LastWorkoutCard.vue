<template>
  <f7-card class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm m-0">
    <f7-card-content class="p-4">
      <span v-if="!firstItem" class="block text-sm text-on-surface-variant italic">
        {{ $t('home.noWorkoutYet') }}
      </span>

      <div v-else>
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <f7-icon material="calendar_month" size="17px" class="text-amber-600" />
          </div>
          <div>
            <h3 class="font-semibold text-on-surface text-sm">{{ $t('home.lastWorkoutCard') }}</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-on-surface">{{ formattedDate }}</span>
              <span class="text-xs text-on-surface-variant">{{ relativeLabel }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-around pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div class="text-center">
            <span class="block text-xl font-bold text-on-surface leading-none">{{ exerciseCount }}</span>
            <span class="block text-xs text-on-surface-variant mt-1">{{ $t('home.exercises') }}</span>
          </div>
          <div class="w-px bg-neutral-200 dark:bg-neutral-700" />
          <div class="text-center">
            <span class="block text-xl font-bold text-on-surface leading-none">{{ totalPoints }}</span>
            <span class="block text-xs text-on-surface-variant mt-1">{{ $t('home.points') }}</span>
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
