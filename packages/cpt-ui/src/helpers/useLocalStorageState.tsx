import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction
} from "react"

/** Returns an object from localStorage or an empty object if not available */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readItemGroupFromLocalStorage(group: string): any {
  // Only attempt localStorage access if `window` is defined
  if (typeof window === "undefined") {
    return {} // Return a fallback for server-side
  }

  const itemGroupString = window.localStorage.getItem(group)
  if (itemGroupString) {
    return JSON.parse(itemGroupString)
  }
  return {}
}

export function useLocalStorageState<T>(
  key: string,
  group: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue

    const itemGroup = readItemGroupFromLocalStorage(group)
    return itemGroup[key] !== undefined ? itemGroup[key] : defaultValue
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const itemGroup = readItemGroupFromLocalStorage(group)
      itemGroup[key] = state
      window.localStorage.setItem(group, JSON.stringify(itemGroup))
    }
  }, [state, key, group])

  // Sync state when another tab updates the same group in localStorage
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === group && event.storageArea === localStorage) {
        const newGroup = event.newValue ? JSON.parse(event.newValue) : {}
        if (newGroup[key] !== undefined) {
          setState(newGroup[key])
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [key, group])

  return [state, setState]
}
