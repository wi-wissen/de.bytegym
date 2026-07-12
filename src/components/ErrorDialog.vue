<template>
  <f7-sheet
    v-model:opened="errorStore.visible"
    @sheet:closed="errorStore.clearDetail()"
    swipe-to-close
    backdrop
    class="sheet-surface"
    style="height: auto; max-height: 82vh; border-radius: 16px 16px 0 0;"
  >
    <f7-page-content style="padding: 0 16px 32px;">
      <!-- Title -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 20px;">⚠️</span>
        <h2 style="margin: 0; font-size: 16px; font-weight: 700;">{{ $t('errorDialog.title') }}</h2>
      </div>
      <p style="font-size: 13px; opacity: 0.6; margin: 0 0 16px;">
        {{ $t('errorDialog.sendHint') }}
      </p>

      <!-- Technical details -->
      <div
        style="
          background: rgba(0,0,0,0.06);
          border-radius: 12px;
          padding: 12px;
          max-height: 220px;
          overflow-y: auto;
          margin-bottom: 16px;
        "
      >
        <pre
          style="
            margin: 0;
            font-size: 11px;
            font-family: 'Menlo', 'Consolas', monospace;
            white-space: pre-wrap;
            word-break: break-all;
            user-select: all;
          "
        >{{ errorStore.detail }}</pre>
      </div>

      <!-- Buttons -->
      <f7-button fill @click="copyDetail" style="margin-bottom: 8px;">
        {{ copied ? $t('errorDialog.copied') : $t('errorDialog.copy') }}
      </f7-button>
      <f7-button @click="errorStore.hide()">
        {{ $t('errorDialog.close') }}
      </f7-button>
    </f7-page-content>
  </f7-sheet>
</template>

<script>
import { errorStore } from '../store/error.js'

export default {
  name: 'ErrorDialog',

  data() {
    return {
      errorStore,
      copied: false
    }
  },

  methods: {
    async copyDetail() {
      try {
        await navigator.clipboard.writeText(this.errorStore.detail)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2500)
      } catch {
        // Clipboard is not available - ignore
      }
    }
  }
}
</script>
