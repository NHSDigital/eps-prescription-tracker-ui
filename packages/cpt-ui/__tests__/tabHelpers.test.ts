import type * as TabHelpersModule from "@/helpers/tabHelpers"

jest.mock("@/constants/environment", () => ({
  TAB_ID_SESSION_KEY: "tabId",
  OPEN_TABS_STORAGE_KEY: "openTabIds"
}))

const mockUUID = "mock-uuid-1234"
const mockUUID2 = "mock-uuid-5678"

let uuidCallCount = 0

/**
 * Import tabHelpers inside jest.isolateModules so each call gets a fresh module
 * with its own `resolvedTabId` cache, avoiding test cross-contamination.
 */
const importFreshTabHelpers = (): typeof TabHelpersModule => {
  let mod!: typeof TabHelpersModule
  jest.isolateModules(() => {
    // Use eval to allow dynamic import in CommonJS context for test isolation
    mod = eval('require("@/helpers/tabHelpers")') as typeof TabHelpersModule
  })
  return mod
}

beforeEach(() => {
  jest.resetModules()

  uuidCallCount = 0
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: jest.fn(() => {
        uuidCallCount++
        return uuidCallCount === 1 ? mockUUID : mockUUID2
      })
    },
    writable: true,
    configurable: true
  })

  window.sessionStorage.clear()
  window.localStorage.clear()
})

describe("getOrCreateTabId", () => {
  it("creates a new tab ID when sessionStorage is empty", () => {
    const {getOrCreateTabId} = importFreshTabHelpers()

    const tabId = getOrCreateTabId()

    expect(tabId).toBe(mockUUID)
    expect(window.sessionStorage.getItem("tabId")).toBe(mockUUID)
  })

  it("reuses existing tab ID from sessionStorage when not in open tabs list (reload scenario)", () => {
    // Simulate: tab reloaded — beforeunload already removed it from open tabs
    window.sessionStorage.setItem("tabId", "existing-tab-id")
    // open tabs list does NOT contain "existing-tab-id"
    const {getOrCreateTabId} = importFreshTabHelpers()

    const tabId = getOrCreateTabId()

    expect(tabId).toBe("existing-tab-id")
    expect(crypto.randomUUID).not.toHaveBeenCalled()
  })

  it("generates a new tab ID when sessionStorage ID is already in open tabs list (duplicate tab scenario)", () => {
    // Simulate: tab duplicated — original tab still has its ID in open tabs
    window.sessionStorage.setItem("tabId", "original-tab-id")
    window.localStorage.setItem("openTabIds", JSON.stringify(["original-tab-id"]))
    const {getOrCreateTabId} = importFreshTabHelpers()

    const tabId = getOrCreateTabId()

    expect(tabId).toBe(mockUUID)
    expect(tabId).not.toBe("original-tab-id")
    expect(window.sessionStorage.getItem("tabId")).toBe(mockUUID)
  })

  it("caches the resolved tab ID for subsequent calls", () => {
    const {getOrCreateTabId} = importFreshTabHelpers()

    const firstCall = getOrCreateTabId()
    const secondCall = getOrCreateTabId()

    expect(firstCall).toBe(secondCall)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it("uses module cache even if sessionStorage changes between calls", () => {
    const {getOrCreateTabId} = importFreshTabHelpers()

    const firstCall = getOrCreateTabId()
    window.sessionStorage.setItem("tabId", "something-else")

    const secondCall = getOrCreateTabId()

    expect(secondCall).toBe(firstCall)
  })
})

describe("getOpenTabIds", () => {
  it("returns empty array when localStorage is empty", () => {
    const {getOpenTabIds} = importFreshTabHelpers()
    expect(getOpenTabIds()).toEqual([])
  })

  it("returns empty array when localStorage value is not valid JSON", () => {
    window.localStorage.setItem("openTabIds", "not-json")
    const {getOpenTabIds} = importFreshTabHelpers()

    expect(getOpenTabIds()).toEqual([])
  })

  it("returns empty array when localStorage value is not an array", () => {
    window.localStorage.setItem("openTabIds", JSON.stringify({foo: "bar"}))
    const {getOpenTabIds} = importFreshTabHelpers()

    expect(getOpenTabIds()).toEqual([])
  })

  it("filters out non-string values", () => {
    window.localStorage.setItem("openTabIds", JSON.stringify(["valid", 123, null, "also-valid"]))
    const {getOpenTabIds} = importFreshTabHelpers()

    expect(getOpenTabIds()).toEqual(["valid", "also-valid"])
  })

  it("returns all string tab IDs", () => {
    window.localStorage.setItem("openTabIds", JSON.stringify(["tab-1", "tab-2"]))
    const {getOpenTabIds} = importFreshTabHelpers()

    expect(getOpenTabIds()).toEqual(["tab-1", "tab-2"])
  })
})

describe("setOpenTabIds", () => {
  it("stores tab IDs as JSON in localStorage", () => {
    const {setOpenTabIds} = importFreshTabHelpers()

    setOpenTabIds(["tab-1", "tab-2"])

    expect(window.localStorage.getItem("openTabIds")).toBe(JSON.stringify(["tab-1", "tab-2"]))
  })
})

describe("updateOpenTabs", () => {
  it("adds a tab ID that is not already present", () => {
    const {setOpenTabIds, updateOpenTabs, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1"])

    updateOpenTabs("tab-2", "add")

    expect(getOpenTabIds()).toEqual(["tab-1", "tab-2"])
  })

  it("does not duplicate a tab ID that is already present", () => {
    const {setOpenTabIds, updateOpenTabs, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1"])

    updateOpenTabs("tab-1", "add")

    expect(getOpenTabIds()).toEqual(["tab-1"])
  })

  it("removes a tab ID", () => {
    const {setOpenTabIds, updateOpenTabs, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1", "tab-2"])

    updateOpenTabs("tab-1", "remove")

    expect(getOpenTabIds()).toEqual(["tab-2"])
  })

  it("does nothing when removing a tab ID that is not present", () => {
    const {setOpenTabIds, updateOpenTabs, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1"])

    updateOpenTabs("tab-2", "remove")

    expect(getOpenTabIds()).toEqual(["tab-1"])
  })
})

describe("getOpenTabCount", () => {
  it("returns 1 when no tabs are open", () => {
    const {getOpenTabCount} = importFreshTabHelpers()
    expect(getOpenTabCount()).toBe(1)
  })

  it("returns the actual count when tabs are open", () => {
    const {setOpenTabIds, getOpenTabCount} = importFreshTabHelpers()
    setOpenTabIds(["tab-1", "tab-2", "tab-3"])

    expect(getOpenTabCount()).toBe(3)
  })
})
