import { describe, it, expect } from 'vitest';
import { isProActive, FREE_ENTITLEMENT } from '../../src/lib/entitlement';

describe('Entitlement helpers (feature 011)', () => {
  it('isProActive: free is never pro', () => {
    expect(isProActive('free', 'active')).toBe(false);
    expect(isProActive('free', 'trialing')).toBe(false);
  });

  it('isProActive: pro is pro on active or trialing', () => {
    expect(isProActive('pro', 'active')).toBe(true);
    expect(isProActive('pro', 'trialing')).toBe(true);
  });

  it('isProActive: pro is NOT pro on canceled, expired, past_due, incomplete', () => {
    expect(isProActive('pro', 'canceled')).toBe(false);
    expect(isProActive('pro', 'expired')).toBe(false);
    expect(isProActive('pro', 'past_due')).toBe(false);
    expect(isProActive('pro', 'incomplete')).toBe(false);
  });

  it('FREE_ENTITLEMENT is non-pro by default', () => {
    expect(FREE_ENTITLEMENT.isPro).toBe(false);
    expect(FREE_ENTITLEMENT.plan).toBe('free');
  });
});
