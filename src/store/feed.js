import { reactive } from 'vue'

const STORAGE_KEY = 'bytegym_feed'

export const feedStore = reactive({
  items: [],
  lastUpdated: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      this.items = data.items || []
      this.lastUpdated = data.lastUpdated || null
    } catch (e) {
      console.error('[feed] load failed:', e)
    }
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: this.items,
        lastUpdated: this.lastUpdated
      }))
    } catch (e) {
      console.error('[feed] save failed:', e)
    }
  },

  /** Merge new items into local cache (dedupe by id). */
  merge(newItems) {
    if (!newItems || !newItems.length) return
    const map = new Map()
    for (const item of this.items) {
      map.set(item.id, item)
    }
    for (const item of newItems) {
      map.set(item.id, item)
    }
    this.items = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    this.lastUpdated = new Date().toISOString()
    this.save()
  },

  /** Last known date (used for incremental loading). */
  getLastDate() {
    if (!this.items.length) return null
    const latest = this.items.reduce((latest, item) => {
      const d = new Date(item.createdAt)
      return !isNaN(d) && d > latest ? d : latest
    }, new Date(0))
    // Safety check: anything before year 2000 is invalid
    return latest.getFullYear() >= 2000 ? latest : null
  },

  /** All workout items (all data sources). */
  getEgymItems() {
    return this.items.filter(i => i.payload?.type === 'WORKOUT')
  },

  /** Only items containing at least one eGym machine exercise (for heatmap). */
  getEgymMachineItems() {
    return this.items.filter(i =>
      i.payload?.exercises?.some(e => e.dataSource === 'EGYM_MACHINE')
    )
  },

  /** eGym machine items for the logged-in user (latest workout). */
  getUserEgymItems(userId) {
    return this.items.filter(i =>
      i.userId === userId &&
      i.payload?.exercises?.some(e => e.dataSource === 'EGYM_MACHINE')
    )
  }
})
