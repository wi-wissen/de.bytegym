<template>
  <!-- Inline error, Material style: a tonal error container with an optional retry.
       The inline width beats Framework7, which makes bare <button>s full width. -->
  <div role="alert" class="flex items-center gap-3 rounded-2xl bg-error-container text-on-error-container pl-4 pr-2 py-2 min-h-12">
    <f7-icon material="error_outline" size="20px" class="shrink-0" />
    <span class="flex-1 min-w-0 text-sm">{{ message }}</span>
    <button
      v-if="retryable"
      type="button"
      class="ripple relative overflow-hidden shrink-0 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap"
      style="width: auto"
      @click="$emit('retry')"
    >{{ $t('retry') }}</button>
  </div>
</template>

<script>
export default {
  name: 'ErrorBanner',

  emits: ['retry'],

  props: {
    message: { type: String, required: true },
    retryable: { type: Boolean, default: false }
  }
}
</script>
