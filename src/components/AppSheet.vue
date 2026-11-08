<template>
  <!-- A Material bottom sheet that is easy to get out of:
       - drag the header (grabber, title) down — always closes
       - drag the content down — closes once it is scrolled to the top, otherwise it
         scrolls. Framework7 only makes that call for a `.page-content`; a plain
         overflow div left it guessing, so a drag either got stuck or fought the scroll.
       - tap the dimmed backdrop, the close button, or press back (backDismiss.js)
       No breakpoints: with a single breakpoint the sheet snapped back up on release
       instead of closing. -->
  <f7-sheet
    :opened="opened"
    swipe-to-close
    backdrop
    close-by-backdrop-click
    class="app-sheet sheet-surface rounded-t-2xl"
    @sheet:closed="$emit('closed')"
  >
    <div class="app-sheet-header">
      <div class="min-w-0">
        <h2 class="text-lg font-bold text-on-surface truncate">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-on-surface-variant truncate">{{ subtitle }}</p>
      </div>
      <f7-link
        icon-only
        icon-material="close"
        :aria-label="$t('close')"
        class="sheet-close text-on-surface-variant shrink-0"
      />
    </div>
    <f7-page-content class="app-sheet-body">
      <slot />
    </f7-page-content>
  </f7-sheet>
</template>

<script>
export default {
  name: 'AppSheet',

  emits: ['closed'],

  props: {
    opened: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' }
  }
}
</script>

<style>
/* Hug the content (like a Material bottom sheet), but never cover the status bar —
   there is always a strip of backdrop left to tap. */
.sheet-modal.app-sheet {
  --app-sheet-max: calc(100vh - var(--f7-safe-area-top) - 48px);
  height: auto;
  max-height: var(--app-sheet-max);
}

.sheet-modal.app-sheet .sheet-modal-inner {
  display: flex;
  flex-direction: column;
  height: auto;
  max-height: var(--app-sheet-max);
}

.app-sheet-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px 8px 16px;
}

.sheet-modal.app-sheet .page-content.app-sheet-body {
  flex: 0 1 auto;
  min-height: 0;
  height: auto;
  padding: 0 16px calc(16px + var(--f7-safe-area-bottom));
}
</style>
