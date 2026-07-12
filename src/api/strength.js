import { apiGet, MOBILE_API } from './client.js'
import { ensureSession } from './auth.js'
import { sessionStore } from '../store/session.js'
import { strengthStore } from '../store/strength.js'
import { formatDateISO, subtractDays } from '../utils/time.js'

/** Load latest strength metrics (including `bodyRegion`). */
export async function loadLatestMetrics() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const uid = sessionStore.userId
  const data = await apiGet(`${MOBILE_API}/measurements/api/v1.0/exercisers/${uid}/strength/latest`)

  // Normalize `{ exercise, strength, bodyRegion }` to a flat object
  const raw = data?.strengthMeasurements || []
  const metrics = raw.map(m => ({
    type: m.exercise?.code,
    exerciseLabel: m.exercise?.label,
    bodyRegion: m.bodyRegion || 'UPPER',
    value: m.strength?.value,
    progress: m.strength?.progress,
    percentageDiff: m.strength?.percentageDiff,
    amountDiff: m.strength?.amountDiff,
    createdAt: m.createdAt,
    source: m.source
  }))
  strengthStore.setLatestMetrics(metrics)
  return metrics
}

/** Load bio age. */
export async function loadBioAge() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const uid = sessionStore.userId

  try {
    const bioAgeUrl = `${MOBILE_API}/analysis/api/v1.0/exercisers/${uid}/bioage`
    const profileUrl = sessionStore.brandApiUrl
      ? `${sessionStore.brandApiUrl}/np/exerciser/${uid}/profile`
      : null

    const [bioAgeResult, profileResult] = await Promise.allSettled([
      apiGet(bioAgeUrl),
      profileUrl ? apiGet(profileUrl) : Promise.resolve(null)
    ])

    const bioAgeData = bioAgeResult.status === 'fulfilled' ? bioAgeResult.value : null
    const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null

    if (bioAgeData) {
      strengthStore.setBioAge(bioAgeData)
    }
    if (profileData && Object.keys(profileData).length) {
      strengthStore.setUserProfile(profileData)
    }

    if (profileResult.status === 'rejected') {
      console.warn('[strength] profile load failed:', profileResult.reason)
    }

    return bioAgeData
  } catch (e) {
    console.warn('[strength] bio-age load failed:', e)
    return null
  }
}

/** Load total bio-age history. */
export async function loadBioAgeHistory(granularity = 'ONE_ITEM_PER_MONTH') {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const uid = sessionStore.userId
  const endDate = formatDateISO(new Date())
  const startDate = formatDateISO(subtractDays(new Date(), 365))

  const data = await apiGet(
    `${MOBILE_API}/analysis/api/v1.0/exercisers/${uid}/bioage/history` +
    `?startDate=${startDate}&endDate=${endDate}&types=TOTAL&granularity=${granularity}&timezone=Europe/Berlin`
  )

  const arr = Array.isArray(data) ? data : []
  const total = arr.find(d => String(d.type).toUpperCase() === 'TOTAL')
  return total?.history || []
}

/** Load history for one specific machine/exercise. */
export async function loadStrengthHistory(exerciseTypeCode) {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const uid = sessionStore.userId
  const endDate = formatDateISO(new Date())
  const startDate = formatDateISO(subtractDays(new Date(), 365))

  const data = await apiGet(
    `${MOBILE_API}/measurements/api/v1.0/exercisers/${uid}/strength/history` +
    `?startDate=${startDate}&endDate=${endDate}&types=${exerciseTypeCode}&granularity=ONE_ITEM_PER_DAY&timezone=Europe/Berlin`
  )

  // API returns `[{ type, history: [{ value, date }] }]`
  const arr = Array.isArray(data) ? data : []
  const exerciseData = arr.find(d => String(d.type) === String(exerciseTypeCode))
  const measurements = exerciseData?.history || []
  strengthStore.setHistory(exerciseTypeCode, measurements)
  return measurements
}
