import { describe, it, expect, beforeAll } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

const DOMAINS = [
  'mlops-infra',
  'ml-lifecycle',
  'genaiops-infra',
  'genai-quality',
  'genai-optimization',
] as const;

const TYPES = ['flashcard', 'mcq', 'product-id'] as const;

describe('Domain coverage (T010 / SC-002 / FR-006)', () => {
  let rows: Array<{ domain: string; type: string }>;

  beforeAll(async () => {
    const { data, error } = await anonClient().from('questions').select('domain, type');
    expect(error).toBeNull();
    rows = (data ?? []) as Array<{ domain: string; type: string }>;
  });

  it('seeds at least 50 questions', () => {
    expect(rows.length).toBeGreaterThanOrEqual(50);
  });

  for (const domain of DOMAINS) {
    for (const type of TYPES) {
      it(`covers (${domain}, ${type}) with at least one item`, () => {
        const matches = rows.filter((r) => r.domain === domain && r.type === type);
        expect(matches.length, `no ${type} found for domain ${domain}`).toBeGreaterThanOrEqual(1);
      });
    }
  }
});
