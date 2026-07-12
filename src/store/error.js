import { reactive } from 'vue'

/**
 * Global error store.
 * Usage: errorStore.show(err, 'login')
 */
export const errorStore = reactive({
  visible: false,
  detail: '',

  show(err, context = '') {
    // An ended session is a normal state, not a fault: the app already routes back
    // to the login screen for it (see App.vue). Popping a technical error report on
    // top of that would be noise — and every in-flight request produces one.
    if (err?.sessionExpired) {
      console.info('[ByteGym] session ended, returning to login')
      return
    }
    console.error('[ByteGym]', context || 'Error:', err)
    this.detail = buildDetail(err, context)
    this.visible = true
  },

  hide() {
    this.visible = false
    // Keep detail until close animation ends (via `clearDetail`)
  },

  clearDetail() {
    this.detail = ''
  }
})

function buildDetail(err, context) {
  const lines = []
  lines.push('ByteGym - Error Report')
  lines.push(`Time:     ${new Date().toISOString()}`)
  if (context) lines.push(`Context:  ${context}`)
  lines.push('')

  if (err instanceof Error) {
    lines.push(`Typ:      ${err.constructor?.name ?? 'Error'}`)
    lines.push(`Message:  ${err.message || '(empty)'}`)
    const ownKeys = Object.keys(err).filter(k => !['name', 'message', 'stack'].includes(k))
    if (ownKeys.length) {
      lines.push('')
      lines.push('Details:')
      for (const key of ownKeys) {
        let value = err[key]
        if (typeof value === 'object' && value !== null) {
          try {
            value = JSON.stringify(value, null, 2)
          } catch {
            value = String(value)
          }
        }
        lines.push(`${key}: ${String(value)}`)
      }
    }
    if (err.responseBody) {
      lines.push('')
      lines.push('API Response:')
      lines.push(err.responseBody)
    }
    if (err.stack) {
      lines.push('')
      lines.push('Stack:')
      // Stack without leading "Error: message" line since it's shown above
      const stackLines = err.stack.split('\n').slice(1)
      lines.push(stackLines.join('\n'))
    }
  } else if (err !== null && err !== undefined) {
    try {
      lines.push(`Object:   ${JSON.stringify(err, null, 2)}`)
    } catch {
      lines.push(`Object:   ${String(err)}`)
    }
  } else {
    lines.push('(no error object)')
  }

  return lines.join('\n')
}
