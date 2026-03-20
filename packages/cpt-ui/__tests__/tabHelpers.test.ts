import type * as TabHelpersModule from "@/helpers/tabHelpers"

jest.mock("@/constants/environment", () => ({
  TAB_ID_SESSION_KEY: "tabId",
  OPEN_TABS_STORAGE_KEY: "openTabIds",
  TAB_HEARTBEATS_STORAGE_KEY: "tabHeartbeats",
  TAB_STALE_THRESHOLD_MS: 5 * 60 * 1000
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

describe("heartbeatTab", () => {
  it("records a timestamp for the given tab ID", () => {
    const {heartbeatTab} = importFreshTabHelpers()

    heartbeatTab("tab-1")

    const heartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    expect(heartbeats["tab-1"]).toBeDefined()
    expect(typeof heartbeats["tab-1"]).toBe("number")
  })

  it("updates the timestamp on subsequent calls", () => {
    const {heartbeatTab} = importFreshTabHelpers()

    const before = Date.now()
    heartbeatTab("tab-1")
    const heartbeats1 = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)

    expect(heartbeats1["tab-1"]).toBeGreaterThanOrEqual(before)
  })

  it("tracks multiple tabs independently", () => {
    const {heartbeatTab} = importFreshTabHelpers()

    heartbeatTab("tab-1")
    heartbeatTab("tab-2")

    const heartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    expect(heartbeats["tab-1"]).toBeDefined()
    expect(heartbeats["tab-2"]).toBeDefined()
  })
})

describe("pruneStaleTabIds", () => {
  it("removes tabs with no heartbeat from the open list", () => {
    const {setOpenTabIds, pruneStaleTabIds, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1", "tab-2"])
    // No heartbeats recorded — both should be pruned

    pruneStaleTabIds()

    expect(getOpenTabIds()).toEqual([])
  })

  it("removes tabs whose heartbeat is older than the threshold", () => {
    const {setOpenTabIds, heartbeatTab, pruneStaleTabIds, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["fresh-tab", "stale-tab"])

    heartbeatTab("fresh-tab")
    // Manually write a stale heartbeat
    const heartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    heartbeats["stale-tab"] = Date.now() - (6 * 60 * 1000) // 6 minutes ago
    window.localStorage.setItem("tabHeartbeats", JSON.stringify(heartbeats))

    pruneStaleTabIds()

    expect(getOpenTabIds()).toEqual(["fresh-tab"])
    const updatedHeartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    expect(updatedHeartbeats["stale-tab"]).toBeUndefined()
    expect(updatedHeartbeats["fresh-tab"]).toBeDefined()
  })

  it("does nothing when all tabs are fresh", () => {
    const {setOpenTabIds, heartbeatTab, pruneStaleTabIds, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1", "tab-2"])
    heartbeatTab("tab-1")
    heartbeatTab("tab-2")

    pruneStaleTabIds()

    expect(getOpenTabIds()).toEqual(["tab-1", "tab-2"])
  })

  it("accepts a custom threshold", () => {
    const {setOpenTabIds, pruneStaleTabIds, getOpenTabIds} = importFreshTabHelpers()
    setOpenTabIds(["tab-1"])

    // Write heartbeat 2 seconds ago
    const heartbeats = {"tab-1": Date.now() - 2000}
    window.localStorage.setItem("tabHeartbeats", JSON.stringify(heartbeats))

    // Prune with 1-second threshold
    pruneStaleTabIds(1000)

    expect(getOpenTabIds()).toEqual([])
  })
})

describe("updateOpenTabs heartbeat integration", () => {
  it("records a heartbeat when adding a tab", () => {
    const {updateOpenTabs} = importFreshTabHelpers()

    updateOpenTabs("tab-1", "add")

    const heartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    expect(heartbeats["tab-1"]).toBeDefined()
  })

  it("removes the heartbeat when removing a tab", () => {
    const {updateOpenTabs} = importFreshTabHelpers()

    updateOpenTabs("tab-1", "add")
    updateOpenTabs("tab-1", "remove")

    const heartbeats = JSON.parse(window.localStorage.getItem("tabHeartbeats")!)
    expect(heartbeats["tab-1"]).toBeUndefined()
  })
})
