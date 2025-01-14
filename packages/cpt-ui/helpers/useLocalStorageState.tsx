import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// This approach is based on the SO post here: https://stackoverflow.com/a/78695684/24360732

export function readItemGroupFromLocalStorage(group: string): any {
  const itemGroupString = localStorage.getItem(group);
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
    const itemGroup = readItemGroupFromLocalStorage(group);
    if (itemGroup[key] !== undefined) {
      return itemGroup[key];
    }
    return defaultValue;
  });

  useEffect(() => {
    const itemGroup = readItemGroupFromLocalStorage(group);
    itemGroup[key] = state;
    localStorage.setItem(group, JSON.stringify(itemGroup));
  }, [state, key, group]);

  return [state, setState];
}
