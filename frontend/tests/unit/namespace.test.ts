import { describe, it, expect } from 'vitest';
import { NAMESPACE, SCHEMA_VERSION, STATE_KEY, PROBE_KEY } from '../../src/lib/storage/namespace';

describe('Storage namespace contract', () => {
  it('uses the ai300game prefix', () => {
    expect(NAMESPACE).toBe('ai300game');
    expect(STATE_KEY.startsWith(NAMESPACE + '.')).toBe(true);
    expect(PROBE_KEY.startsWith(NAMESPACE + '.')).toBe(true);
  });

  it('pins SCHEMA_VERSION to 1 in the current release', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('uses a versioned state key', () => {
    expect(STATE_KEY).toBe('ai300game.v1.state');
  });
});
