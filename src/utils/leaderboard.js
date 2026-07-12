import { subtractDays, formatDate } from './time.js'

/**
 * Build leaderboard for the last N weeks.
 * @param {Array} feedItems - all feed items
 * @param {number} weeks - sliding window in weeks
 * @returns { entries: Array, fromDate: Date, toDate: Date }
 */
export function buildLeaderboard(feedItems, weeks = 4) {
  const toDate = new Date()
  toDate.setHours(23, 59, 59, 999)
  const fromDate = subtractDays(new Date(), weeks * 7)
  fromDate.setHours(0, 0, 0, 0)

  // All workout items in the time window (EGYM_MACHINE only)
  const relevant = feedItems.filter(item =>
    item.payload?.type === 'WORKOUT' &&
    item.payload?.exercises?.some(ex => ex?.dataSource === 'EGYM_MACHINE') &&
    new Date(item.createdAt) >= fromDate &&
    new Date(item.createdAt) <= toDate
  )

  // Aggregate per user
  const userMap = new Map() // userId -> { userId, displayName, trainingDays: Set<ISO-date>, totalPoints }

  for (const item of relevant) {
    const uid = item.userId
    if (!userMap.has(uid)) {
      const firstName = item.user?.firstName || item.exerciserFirstName || '?'
      const lastName = item.user?.lastName || item.exerciserLastName || ''
      const lastInitial = lastName ? lastName.charAt(0) + '.' : ''
      userMap.set(uid, {
        userId: uid,
        displayName: `${firstName}${lastInitial ? ' ' + lastInitial : ''}`,
        trainingDays: new Set(),
        totalPoints: 0
      })
    }

    const entry = userMap.get(uid)

    // Register training day (one day = one training session)
    const dayKey = new Date(item.createdAt).toISOString().split('T')[0]
    entry.trainingDays.add(dayKey)

    // Points/score: sum `totalPerDay` (fallback: number of exercises)
    const fallbackExercises = (item.payload?.exercises || []).length
    entry.totalPoints += Number(item.totalPerDay || fallbackExercises || 0)
  }

  // Convert to sorted array (primary: points, secondary: training days)
  const entries = Array.from(userMap.values())
    .map(e => ({
      userId: e.userId,
      displayName: e.displayName,
      sessionCount: e.trainingDays.size,
      totalPoints: e.totalPoints
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.sessionCount - a.sessionCount)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  return { entries, fromDate, toDate }
}

/** Rank emoji for top 3. */
export function rankDisplay(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}.`
}

/** Compute progress-bar percentage relative to first place. */
export function progressPercent(points, maxPoints) {
  if (!maxPoints || maxPoints === 0) return 0
  return Math.round((points / maxPoints) * 100)
}
