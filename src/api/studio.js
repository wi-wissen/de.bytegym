import { apiGet } from './client.js'
import { ensureSession } from './auth.js'
import { sessionStore } from '../store/session.js'
import { studioStore } from '../store/studio.js'

/** Load brand studio list and store first matching location. */
export async function loadStudioInfo() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const brandApiUrl = sessionStore.brandApiUrl
  const data = await apiGet(`${brandApiUrl}/np/company/children?responseType=detail`)

  // API returns an array of locations
  const locations = Array.isArray(data) ? data : data?.children || data?.locations || []

  if (!locations.length) {
    throw new Error('no_locations')
  }

  // Pick first (or only) location
  const loc = locations[0]
  studioStore.setFromApi(loc)
  return loc
}

/** Load brand description (logo, colors, features). */
export async function loadBrandDescription() {
  const ok = await ensureSession()
  if (!ok) throw new Error('session_invalid')

  const brandApiUrl = sessionStore.brandApiUrl
  try {
    return await apiGet(`${brandApiUrl}/np/brand/description?appVersion=32400`)
  } catch (e) {
    console.warn('[studio] brand description load failed:', e)
    return null
  }
}
