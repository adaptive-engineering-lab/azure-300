import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __resetAdapterForTests, isLocalStorageAvailable, storageAdapter } from '../../src/lib/storage/adapter';

describe('Storage adapter (FR-011, FR-012)', () => {
  beforeEach(() => {
    __resetAdapterForTests();
    window.localStorage.clear();
  });

  it('detects localStorage as available in jsdom', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });

  it('round-trips a value through localStorage', () => {
    storageAdapter.setItem('ai300game.v1.state', '{"hello":"world"}');
    expect(storageAdapter.getItem('ai300game.v1.state')).toBe('{"hello":"world"}');
  });

  it('removeItem clears the value', () => {
    storageAdapter.setItem('ai300game.v1.state', '{}');
    storageAdapter.removeItem('ai300game.v1.state');
    expect(storageAdapter.getItem('ai300game.v1.state')).toBeNull();
  });

  it('falls back to in-memory store when localStorage throws on write', () => {
    const setSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    storageAdapter.setItem('ai300game.v1.state', '{"a":1}');
    expect(storageAdapter.getItem('ai300game.v1.state')).toBe('{"a":1}');
    setSpy.mockRestore();
  });

  it('falls back to in-memory store when localStorage is unavailable at probe time', () => {
    __resetAdapterForTests();
    const setSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    expect(isLocalStorageAvailable()).toBe(false);
    storageAdapter.setItem('ai300game.v1.state', '{"x":1}');
    expect(storageAdapter.getItem('ai300game.v1.state')).toBe('{"x":1}');
    setSpy.mockRestore();
  });
});
