import { PROBE_KEY } from './namespace';

export function detectLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return false;
    window.localStorage.setItem(PROBE_KEY, 'ok');
    const read = window.localStorage.getItem(PROBE_KEY);
    window.localStorage.removeItem(PROBE_KEY);
    return read === 'ok';
  } catch {
    return false;
  }
}
