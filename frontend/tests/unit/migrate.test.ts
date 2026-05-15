import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/lib/storage/migrate';
import { SCHEMA_VERSION } from '../../src/lib/storage/namespace';

describe('Schema migration (FR-013)', () => {
  it('returns the payload unchanged when version matches current', () => {
    const payload = { __version: SCHEMA_VERSION, preferences: { theme: 'dark' } };
    expect(migrate(payload, SCHEMA_VERSION)).toEqual(payload);
  });

  it('returns null when on-disk version is newer than current (downgrade)', () => {
    expect(migrate({ __version: SCHEMA_VERSION + 1 }, SCHEMA_VERSION + 1)).toBeNull();
  });
});
