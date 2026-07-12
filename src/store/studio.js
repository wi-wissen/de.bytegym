import { reactive } from 'vue'

const STORAGE_KEY = 'bytegym_studio'

export const studioStore = reactive({
  name: null,
  street: null,
  zip: null,
  city: null,
  phone: null,
  email: null,
  website: null,
  lat: null,
  lng: null,
  workingHours: {},  // { MONDAY: "7:30 AM-8:00 PM", ... }
  gymLocationId: null,
  lastUpdated: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      Object.assign(this, data)
    } catch (e) {
      console.error('[studio] Fehler beim Laden:', e)
    }
  },

  save() {
    try {
      const data = {
        name: this.name,
        street: this.street,
        zip: this.zip,
        city: this.city,
        phone: this.phone,
        email: this.email,
        website: this.website,
        lat: this.lat,
        lng: this.lng,
        workingHours: this.workingHours,
        gymLocationId: this.gymLocationId,
        lastUpdated: this.lastUpdated
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[studio] Fehler beim Speichern:', e)
    }
  },

  setFromApi(data) {
    this.name = data.name || null
    const addr = data.address || {}
    this.street = addr.addressLine1 || addr.street || null
    this.zip = addr.postalCode || addr.zip || null
    this.city = addr.city || null
    this.lat = addr.lat ?? addr.latitude ?? null
    this.lng = addr.lng ?? addr.longitude ?? null
    this.phone = data.phone || data.phoneNumber || null
    this.email = data.email || null
    this.website = data.url || data.website || data.websiteUrl || null
    // API-Keys normalisieren: Mon -> MONDAY etc.
    const DAY_MAP = { Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY', Thu: 'THURSDAY', Fri: 'FRIDAY', Sat: 'SATURDAY', Sun: 'SUNDAY' }
    const hours = data.workingHours || {}
    const normalized = {}
    for (const [k, v] of Object.entries(hours)) {
      normalized[DAY_MAP[k] || k] = v
    }
    this.workingHours = normalized
    this.gymLocationId = data.uuid || data.id || null
    this.lastUpdated = new Date().toISOString()
    this.save()
  },

  /** Einzeilige Adresse */
  get addressLine() {
    const parts = [this.street, this.zip && this.city ? `${this.zip} ${this.city}` : this.city]
    return parts.filter(Boolean).join(', ')
  },

  /** OSM-Link */
  get osmUrl() {
    if (!this.lat || !this.lng) return null
    return `https://www.openstreetmap.org/?mlat=${this.lat}&mlon=${this.lng}&zoom=19`
  }
})
