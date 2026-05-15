import type { StateStorage } from 'zustand/middleware';
import { detectLocalStorageAvailable } from './available';

const memoryStore = new Map<string, string>();

let cachedAvailable: boolean | null = null;

export function isLocalStorageAvailable(): boolean {
  if (cachedAvailable === null) cachedAvailable = detectLocalStorageAvailable();
  return cachedAvailable;
}

export const storageAdapter: StateStorage = {
  getItem: (name) => {
    if (isLocalStorageAvailable()) {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return memoryStore.get(name) ?? null;
      }
    }
    return memoryStore.get(name) ?? null;
  },
  setItem: (name, value) => {
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(name, value);
        return;
      } catch {
        // fall through to memory fallback
      }
    }
    memoryStore.set(name, value);
  },
  removeItem: (name) => {
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // ignore
      }
    }
    memoryStore.delete(name);
  },
};

/** Test-only helper to reset cached availability between tests. */
export function __resetAdapterForTests(): void {
  cachedAvailable = null;
  memoryStore.clear();
}
