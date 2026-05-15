import { describe, it, expect, beforeAll } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

/**
 * T046 / SC-003: an anonymous client filtering questions by domain must
 * return under 1000 ms (perceived-instant) on a typical connection. We
 * sample 20 runs per domain and assert p95 < 1000 ms.
 *
 * This is a *gate*, not a benchmark — it protects against an index being
 * dropped or a payload bloating to multiple MB. Run from a developer
 * machine on the same continent as the project region.
 */

const DOMAINS = [
  'mlops-infra',
  'ml-lifecycle',
  'genaiops-infra',
  'genai-quality',
  'genai-optimization',
] as const;

const SAMPLES = 20;
const P95_BUDGET_MS = 1000;

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[idx]!;
}

describe('Query latency gate (T046 / SC-003)', () => {
  const client = anonClient();

  beforeAll(async () => {
    // Warm up the client / connection pool so the first sample of each
    // domain doesn't include cold-start cost.
    for (const d of DOMAINS) {
      await client.from('questions').select('id').eq('domain', d).limit(1);
    }
  });

  for (const domain of DOMAINS) {
    it(`p95 < ${P95_BUDGET_MS}ms for ${domain}`, async () => {
      const samples: number[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const start = performance.now();
        const { error } = await client.from('questions').select('*').eq('domain', domain);
        const elapsed = performance.now() - start;
        expect(error).toBeNull();
        samples.push(elapsed);
      }
      const tail = p95(samples);
      const median = samples.sort((a, b) => a - b)[Math.floor(SAMPLES / 2)];
      console.log(`${domain}: median ${median!.toFixed(0)}ms, p95 ${tail.toFixed(0)}ms`);
      expect(tail, `${domain} p95 ${tail.toFixed(0)}ms exceeds ${P95_BUDGET_MS}ms`).toBeLessThan(
        P95_BUDGET_MS,
      );
    });
  }
});
