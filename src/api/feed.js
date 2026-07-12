import { apiGet, MOBILE_API } from './client.js'
import { ensureSession } from './auth.js'
import { sessionStore } from '../store/session.js'
import { studioStore } from '../store/studio.js'
import { feedStore } from '../store/feed.js'
import { formatDateISO, subtractDays } from '../utils/time.js'

/** Load feed for a date range. */
async function fetchFeedRange(gymId, startDate, endDate) {
  const url = `${MOBILE_API}/feed/api/v1.0/gym-locations/${gymId}/feed?startDate=${startDate}&endDate=${endDate}&locale=de-DE`
  const data = await apiGet(url)
  // Full feed returns `{ items: [{ item, title, totalPerDay }] }` -> unwrap
  return (data?.items || []).map(w => {
    if (w?.item) {
      return {
        ...w.item,
        feedTitle: w.title,
        totalPerDay: w.totalPerDay
      }
    }
    return w
  })
}

/** Initial load: last 3 months (up to API cap ~506 items). */
export async function loadInitialFeed() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const gymId = studioStore.gymLocationId
  if (!gymId) throw new Error('no_gym_id')

  const endDate = formatDateISO(new Date())
  const startDate = formatDateISO(subtractDays(new Date(), 90))

  const items = await fetchFeedRange(gymId, startDate, endDate)
  feedStore.merge(items)
  return items.length
}

/** Incremental load: from last known entry minus 1 day. */
export async function updateFeed() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const gymId = studioStore.gymLocationId
  if (!gymId) throw new Error('no_gym_id')

  const endDate = formatDateISO(new Date())
  const lastDate = feedStore.getLastDate()
  const startDate = lastDate
    ? formatDateISO(subtractDays(lastDate, 1))
    : formatDateISO(subtractDays(new Date(), 14))

  const items = await fetchFeedRange(gymId, startDate, endDate)
  feedStore.merge(items)
  return items.length
}

/** Live query: people who trained in the last 10 minutes. */
export async function fetchLiveCount() {
  const ok = await ensureSession()
  if (!ok) return 0

  const gymId = studioStore.gymLocationId
  if (!gymId) return 0

  try {
    const today = formatDateISO(new Date())
    const items = await fetchFeedRange(gymId, today, today)
    feedStore.merge(items)

    const tenMinAgo = Date.now() - 10 * 60 * 1000
    const recent = items.filter(i =>
      new Date(i.createdAt).getTime() >= tenMinAgo
    )
    const unique = new Set(recent.map(i => i.userId))
    console.log(`[feed] live count: ${unique.size} (last 10 min), ${items.length} total today`)
    return unique.size
  } catch (e) {
    console.warn('[feed] live count failed:', e)
    return 0
  }
}
