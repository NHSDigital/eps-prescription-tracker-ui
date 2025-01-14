import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/** Returns an object from localStorage or an empty object if not available */
function readItemGroupFromLocalStorage(group: string): any {
  // Only attempt localStorage access if `window` is defined
  if (typeof window === 'undefined') {
    return {}; // Return a fallback for server-side
  }
  
  const itemGroupString = window.localStorage.getItem(group);
  if (itemGroupString) {
    return JSON.parse(itemGroupString);
  }
  return {};
}

export function useLocalStorageState<T>(
  key: string,
  group: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // get initial value from localStorage, or use provided default
  const [state, setState] = useState<T>(() => {
    // We can’t call localStorage on the server, so skip it if `window` is undefined
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    const itemGroup = readItemGroupFromLocalStorage(group);
    if (itemGroup[key] !== undefined) {
      return itemGroup[key];
    }
    return defaultValue;
  });

  useEffect(() => {
    // Run only in the browser
    if (typeof window !== 'undefined') {
      const itemGroup = readItemGroupFromLocalStorage(group);
      itemGroup[key] = state;
      window.localStorage.setItem(group, JSON.stringify(itemGroup));
    }
  }, [state, key, group]);

  return [state, setState];
}
