/** Format date as ISO string (YYYY-MM-DD). */
export function formatDateISO(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/** Return date minus N days. */
export function subtractDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

/** Format time as HH:MM. */
export function formatTime(date) {
  const d = new Date(date)
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** Format date as DD.MM.YYYY. */
export function formatDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Relative day label ("today", "yesterday", "X days ago"). */
export function relativeDays(date, t) {
  const d = new Date(date)
  const today = new Date()
  // Compare calendar dates only (ignore time).
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((todayDay - dDay) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('home.today')
  if (diffDays === 1) return t('home.oneDayAgo')
  return t('home.daysAgo', { days: diffDays })
}

/**
 * Parse API opening-hours string.
 * Format: "7:30 AM-8:00 PM" oder "Closed"
 * Returns { open: Date|null, close: Date|null, closed: bool }
 */
export function parseWorkingHours(hoursString) {
  if (!hoursString || hoursString === 'Closed') {
    return { open: null, close: null, closed: true }
  }

  const parts = hoursString.split('-')
  if (parts.length < 2) return { open: null, close: null, closed: true }

  function parseTime(str) {
    const trimmed = str.trim()
    const match = trimmed.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return null
    let hour = parseInt(match[1])
    const min = parseInt(match[2])
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && hour !== 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    const d = new Date()
    d.setHours(hour, min, 0, 0)
    return d
  }

  const open = parseTime(parts[0])
  const close = parseTime(parts[1])
  return { open, close, closed: false }
}

/**
 * Compute studio status.
 * Returns { status: 'open'|'closed'|'opening_soon', minutesUntilOpen }
 */
export function getStudioStatus(workingHours) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const today = days[new Date().getDay()]
  const todayHours = workingHours[today]

  if (!todayHours) return { status: 'closed', minutesUntilOpen: null }

  const { open, close, closed } = parseWorkingHours(todayHours)
  if (closed) return { status: 'closed', minutesUntilOpen: null }

  const now = new Date()

  if (now >= open && now <= close) {
    return { status: 'open', minutesUntilOpen: null }
  }

  if (now < open) {
    const diffMs = open - now
    const minutes = Math.floor(diffMs / 60000)
    if (minutes <= 60) {
      return { status: 'opening_soon', minutesUntilOpen: minutes }
    }
  }

  return { status: 'closed', minutesUntilOpen: null }
}

/** Weekday index (0=Mon, 6=Sun) for a date. */
export function getDayIndex(date) {
  const d = new Date(date)
  return (d.getDay() + 6) % 7 // 0=Mon, 6=Sun
}

/** ISO week number. */
export function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/** Monday of the current week. */
export function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 30-minute slot index (0-47) for a timestamp. */
export function getHalfHourSlot(date) {
  const d = new Date(date)
  return d.getHours() * 2 + Math.floor(d.getMinutes() / 30)
}

/** Slot label "HH:MM". */
export function slotLabel(slotIndex) {
  const h = Math.floor(slotIndex / 2)
  const m = slotIndex % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}

/**
 * "7:30 AM-8:00 PM" → "07:30 – 20:00"
 * Returns null for 'Closed' or unknown input.
 */
export function formatHoursDE(hoursString) {
  if (!hoursString || hoursString === 'Closed') return null
  const parts = hoursString.split('-')
  if (parts.length < 2) return hoursString
  const fmt = (s) => {
    const m = s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return s.trim()
    let h = parseInt(m[1])
    const ap = m[3].toUpperCase()
    if (ap === 'PM' && h !== 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m[2]}`
  }
  return `${fmt(parts[0])} – ${fmt(parts[1])}`
}
