export const TAB_ID_SESSION_KEY = "tabId"
export const OPEN_TABS_STORAGE_KEY = "openTabIds"

export const getOrCreateTabId = () => {
  if (typeof window === "undefined") {
    return "server"
  }

  const existingTabId = window.sessionStorage.getItem(TAB_ID_SESSION_KEY)
  if (existingTabId) {
    return existingTabId
  }

  const createdTabId = crypto.randomUUID()
  window.sessionStorage.setItem(TAB_ID_SESSION_KEY, createdTabId)
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
    return
  }

  setOpenTabIds(existingTabIds.filter((existingTabId) => existingTabId !== tabId))
}

export const getOpenTabCount = () => {
  const count = getOpenTabIds().length
  return count === 0 ? 1 : count
}
