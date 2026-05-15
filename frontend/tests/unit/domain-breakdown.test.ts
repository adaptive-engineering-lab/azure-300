import { describe, it, expect } from 'vitest';
import { computeDomainBreakdown } from '../../src/pages/QuizSessionPage';

describe('Quiz domain breakdown (FR-010, US3)', () => {
  it('aggregates correct counts per domain', () => {
    const rows = computeDomainBreakdown([
      { questionId: 'a', domain: 'networking', chosen: 'A', correct: 'A', elapsedSeconds: 5 },
      { questionId: 'b', domain: 'networking', chosen: 'B', correct: 'C', elapsedSeconds: 5 },
      { questionId: 'c', domain: 'storage', chosen: 'D', correct: 'D', elapsedSeconds: 5 },
    ]);
    const net = rows.find((r) => r.domain === 'networking')!;
    expect(net.total).toBe(2);
    expect(net.correct).toBe(1);
    expect(net.pct).toBe(50);
    expect(net.weak).toBe(true);
    const sto = rows.find((r) => r.domain === 'storage')!;
    expect(sto.pct).toBe(100);
    expect(sto.weak).toBe(false);
  });

  it('flags a domain below 60% as weak', () => {
    const rows = computeDomainBreakdown([
      { questionId: 'a', domain: 'compute', chosen: 'A', correct: 'B', elapsedSeconds: 5 },
      { questionId: 'b', domain: 'compute', chosen: 'A', correct: 'B', elapsedSeconds: 5 },
      { questionId: 'c', domain: 'compute', chosen: 'A', correct: 'A', elapsedSeconds: 5 },
    ]);
    expect(rows[0]!.pct).toBeLessThan(60);
    expect(rows[0]!.weak).toBe(true);
  });

  it('does not flag exactly 60%', () => {
    const rows = computeDomainBreakdown([
      { questionId: '1', domain: 'monitoring', chosen: 'A', correct: 'A', elapsedSeconds: 5 },
      { questionId: '2', domain: 'monitoring', chosen: 'A', correct: 'A', elapsedSeconds: 5 },
      { questionId: '3', domain: 'monitoring', chosen: 'A', correct: 'A', elapsedSeconds: 5 },
      { questionId: '4', domain: 'monitoring', chosen: 'A', correct: 'B', elapsedSeconds: 5 },
      { questionId: '5', domain: 'monitoring', chosen: 'A', correct: 'B', elapsedSeconds: 5 },
    ]);
    expect(rows[0]!.pct).toBe(60);
    expect(rows[0]!.weak).toBe(false);
  });
});
