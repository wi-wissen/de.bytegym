import { getDayIndex, getHalfHourSlot, getMondayOf, subtractDays } from './time.js'

function localDateKey(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Aggregate weekly heatmap data.
 * @param {Array} feedItems - EGYM_MACHINE-Items
 * @param {number} weeks - number of weeks to include
 * @returns Array of week objects:
 *   { weekStart: Date, days: [{ date: Date, count: number }] }
 */
export function buildWeekHeatmap(feedItems, weeks = 4) {
  // Map: ISO date string -> training count
  const countByDay = new Map()
  for (const item of feedItems) {
    const d = new Date(item.createdAt)
    const key = localDateKey(d)
    countByDay.set(key, (countByDay.get(key) || 0) + 1)
  }

  const result = []
  const todayMonday = getMondayOf(new Date())

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(todayMonday)
    weekStart.setDate(weekStart.getDate() - w * 7)

    const days = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = localDateKey(day)
      days.push({
        date: new Date(day),
        count: countByDay.get(key) || 0,
        isFuture: day > new Date()
      })
    }
    result.push({ weekStart: new Date(weekStart), days })
  }

  return result // newest week first
}

/**
 * Build hourly heatmap for one week.
 * @param {Array} feedItems - EGYM_MACHINE-Items
 * @param {Date} weekStart - Monday of the week
 * @returns 2D array [dayIndex 0-6][slotIndex 0-47] = count
 */
export function buildHourHeatmap(feedItems, weekStart) {
  const grid = Array.from({ length: 7 }, () => new Array(48).fill(0))

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  for (const item of feedItems) {
    const d = new Date(item.createdAt)
    if (d < weekStart || d >= weekEnd) continue

    const dayIdx = getDayIndex(d) // 0=Mon, 6=Sun
    const slot = getHalfHourSlot(d)

    if (dayIdx >= 0 && dayIdx < 7 && slot >= 0 && slot < 48) {
      grid[dayIdx][slot]++
    }
  }

  return grid
}

/** Color intensity level (5 steps: 0-4). */
export function intensityLevel(count) {
  if (count === 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 10) return 3
  return 4
}

/** Dynamic intensity relative to maximum. */
export function intensityLevelDynamic(count, maxCount) {
  if (count === 0 || !maxCount) return 0
  const pct = count / maxCount
  if (pct <= 0.25) return 1
  if (pct <= 0.5) return 2
  if (pct <= 0.75) return 3
  return 4
}

/** CSS class for intensity level. */
export function intensityClass(level) {
  const classes = [
    'bg-surface-variant opacity-30',   // 0: empty
    'bg-primary opacity-30',            // 1: low
    'bg-primary opacity-50',            // 2: medium
    'bg-primary opacity-70',            // 3: high
    'bg-primary opacity-100'            // 4: very high
  ]
  return classes[level] || classes[0]
}

/** Inline style for intensity (works without Tailwind purge issues). */
export function intensityStyle(level, accentColor = '#6750A4') {
  if (level <= 0) {
    return { backgroundColor: 'rgba(148,163,184,0.22)' }
  }
  const alphas = [0.08, 0.25, 0.45, 0.65, 0.90]
  const alpha = alphas[Math.min(level, 4)]
  return { backgroundColor: hexToRgba(accentColor, alpha) }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
