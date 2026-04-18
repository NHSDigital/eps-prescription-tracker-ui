import {
  TAB_ID_SESSION_KEY,
  OPEN_TABS_STORAGE_KEY,
  TAB_HEARTBEATS_STORAGE_KEY,
  TAB_STALE_THRESHOLD_MS
} from "@/constants/environment"

// Module-level cache so we only resolve once per page lifecycle
let resolvedTabId: string | null = null

export const getOrCreateTabId = () => {
  if (typeof window === "undefined") {
    return "server"
  }

  if (resolvedTabId) {
    return resolvedTabId
  }

  const existingTabId = window.sessionStorage.getItem(TAB_ID_SESSION_KEY)
  if (existingTabId) {
    // Check if another tab is already using this ID (i.e. this tab was duplicated).
    // On a normal reload, pagehide removes the ID from the open tabs list first,
    // so it won't appear here. On a duplicate, the original tab is still open and
    // its ID remains in the list, so we detect the collision and create a new one.
    const openTabIds = getOpenTabIds()
    if (!openTabIds.includes(existingTabId)) {
      resolvedTabId = existingTabId
      return existingTabId
    }
  }

  const createdTabId = crypto.randomUUID()
  window.sessionStorage.setItem(TAB_ID_SESSION_KEY, createdTabId)
  resolvedTabId = createdTabId
  return createdTabId
}

export const getOpenTabIds = () => {
  if (typeof window === "undefined") {
    return [] as Array<string>
  }

  try {
    const raw = window.localStorage.getItem(OPEN_TABS_STORAGE_KEY)
    if (!raw) {
      return [] as Array<string>
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((tabId): tabId is string => typeof tabId === "string") : []
  } catch {
    return [] as Array<string>
  }
}

export const setOpenTabIds = (tabIds: Array<string>) => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify(tabIds))
}

export const updateOpenTabs = (tabId: string, action: "add" | "remove") => {
  const existingTabIds = getOpenTabIds()

  if (action === "add") {
    const updatedTabIds = existingTabIds.includes(tabId) ? existingTabIds : [...existingTabIds, tabId]
    setOpenTabIds(updatedTabIds)
    heartbeatTab(tabId)
    return
  }

  setOpenTabIds(existingTabIds.filter((existingTabId) => existingTabId !== tabId))
  removeTabHeartbeat(tabId)
}

export const getOpenTabCount = () => {
  const count = getOpenTabIds().length
  return count === 0 ? 1 : count
}

/* Heartbeat tracking — each tab periodically records a timestamp so stale entries can be detected */

const getHeartbeats = (): Record<string, number> => {
  if (typeof window === "undefined") {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(TAB_HEARTBEATS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, number>
      : {}
  } catch {
    return {}
  }
}

const setHeartbeats = (heartbeats: Record<string, number>) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TAB_HEARTBEATS_STORAGE_KEY, JSON.stringify(heartbeats))
}

export const heartbeatTab = (tabId: string) => {
  const heartbeats = getHeartbeats()
  heartbeats[tabId] = Date.now()
  setHeartbeats(heartbeats)
}

const removeTabHeartbeat = (tabId: string) => {
  const heartbeats = getHeartbeats()
  delete heartbeats[tabId]
  setHeartbeats(heartbeats)
}

/**
 * Remove tab IDs that have not sent a heartbeat within the threshold.
 * Should be called periodically (e.g. every minute in AccessProvider).
 */
export const pruneStaleTabIds = (thresholdMs: number = TAB_STALE_THRESHOLD_MS) => {
  const now = Date.now()
  const heartbeats = getHeartbeats()
  const openTabIds = getOpenTabIds()

  const staleTabIds = openTabIds.filter((tabId) => {
    const lastSeen = heartbeats[tabId]
    // If no heartbeat recorded, consider it stale
    return lastSeen === undefined || (now - lastSeen) > thresholdMs
  })

  if (staleTabIds.length === 0) return

  // Remove stale tabs from the open list and heartbeat map
  const freshTabIds = openTabIds.filter((tabId) => !staleTabIds.includes(tabId))
  setOpenTabIds(freshTabIds)

  const freshHeartbeats = {...heartbeats}
  for (const tabId of staleTabIds) {
    delete freshHeartbeats[tabId]
  }
  setHeartbeats(freshHeartbeats)
}
