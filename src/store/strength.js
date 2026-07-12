import { reactive } from 'vue'

const STORAGE_KEY = 'bytegym_strength'

function parseBirthDate(raw) {
  if (!raw) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw

  const value = String(raw).trim()
  if (!value) return null

  // Expected format from `/np/exerciser/{uid}/profile`: "DD/MM/YYYY"
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    const month = Number(dmyMatch[2])
    const year = Number(dmyMatch[3])
    const parsed = new Date(year, month - 1, day)
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed
    }
    return null
  }

  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}

export const strengthStore = reactive({
  latestMetrics: [],   // From `/strength/latest-metrics`
  bioAge: null,        // From `/bioage`
  userProfile: null,   // From brand API `/np/exerciser/{uid}/profile`
  history: {},         // { [exerciseTypeCode]: [ { date, value, progress } ] }
  lastUpdated: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      this.latestMetrics = data.latestMetrics || []
      this.bioAge = data.bioAge || null
      this.userProfile = data.userProfile || null
      this.history = data.history || {}
      this.lastUpdated = data.lastUpdated || null
    } catch (e) {
      console.error('[strength] load failed:', e)
    }
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        latestMetrics: this.latestMetrics,
        bioAge: this.bioAge,
        userProfile: this.userProfile,
        history: this.history,
        lastUpdated: this.lastUpdated
      }))
    } catch (e) {
      console.error('[strength] save failed:', e)
    }
  },

  setLatestMetrics(metrics) {
    this.latestMetrics = metrics || []
    this.lastUpdated = new Date().toISOString()
    this.save()
  },

  setBioAge(bioAge) {
    this.bioAge = bioAge
    this.save()
  },

  setUserProfile(profile) {
    this.userProfile = profile || null
    this.save()
  },

  setHistory(exerciseTypeCode, measurements) {
    this.history[exerciseTypeCode] = measurements || []
    this.save()
  },

  /** Group by body region (UPPER / CORE / LOWER). */
  getByRegion() {
    const groups = { UPPER: [], CORE: [], LOWER: [] }
    for (const m of this.latestMetrics) {
      const region = m.bodyRegion || 'UPPER'
      if (groups[region]) {
        groups[region].push(m)
      } else {
        groups['UPPER'].push(m)
      }
    }
    return groups
  },

  /** Bio age for one body region. */
  getBioAgeForRegion(region) {
    if (!this.bioAge?.muscleDetails) return null
    const md = this.bioAge.muscleDetails
    if (region === 'UPPER') return md.upperBodyAge?.value ?? null
    if (region === 'CORE') return md.coreAge?.value ?? null
    if (region === 'LOWER') return md.lowerBodyAge?.value ?? null
    return null
  },

  /** Total bio age (from `totalDetails`). */
  getTotalBioAge() {
    if (!this.bioAge?.totalDetails) return null
    const td = this.bioAge.totalDetails

    // Common field names
    const direct = td.bioAge?.value
      ?? td.biologicalAge?.value
      ?? td.overallAge?.value
      ?? td.totalAge?.value
      ?? td.age?.value
      ?? (typeof td.bioAge === 'number' ? td.bioAge : null)
      ?? (typeof td.biologicalAge === 'number' ? td.biologicalAge : null)
      ?? (typeof td.totalAge === 'number' ? td.totalAge : null)

    if (direct != null) return direct

    // Fallback: find first numeric field deep inside `totalDetails`
    const findNumber = (obj) => {
      if (obj == null) return null
      if (typeof obj === 'number' && Number.isFinite(obj)) return obj
      if (typeof obj !== 'object') return null
      for (const value of Object.values(obj)) {
        const n = findNumber(value)
        if (n != null) return n
      }
      return null
    }

    return findNumber(td)
  },

  /** Chronological age (if provided by API). */
  getChronologicalAge() {
    const root = this.bioAge || {}
    const td = root.totalDetails || {}
    const profile = this.userProfile || {}

    const direct = td.chronologicalAge?.value
      ?? td.currentAge?.value
      ?? td.realAge?.value
      ?? root.chronologicalAge?.value
      ?? root.currentAge?.value
      ?? root.realAge?.value
      ?? (typeof td.chronologicalAge === 'number' ? td.chronologicalAge : null)
      ?? (typeof td.currentAge === 'number' ? td.currentAge : null)
      ?? (typeof td.realAge === 'number' ? td.realAge : null)

    if (direct != null && Number.isFinite(Number(direct))) {
      return Number(direct)
    }

    // Fallback: calculate age from birth date (if available in profile)
    const birthDateRaw = profile.birthDate
      ?? profile.dateOfBirth
      ?? profile.birthday
      ?? profile.dob
      ?? td.birthDate
      ?? td.dateOfBirth
      ?? root.birthDate
      ?? root.dateOfBirth
      ?? null

    if (!birthDateRaw) {
      return null
    }

    const birthDate = parseBirthDate(birthDateRaw)
    if (!birthDate || Number.isNaN(birthDate.getTime())) return null

    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1
    }

    const resolvedAge = age >= 0 ? age : null
    return resolvedAge
  }
})
