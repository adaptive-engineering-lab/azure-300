import { describe, it, expect } from 'vitest';
import { validateItem } from '../../src/lib/admin/validators';

describe('Admin item validation (feature 013, FR-007)', () => {
  it('accepts a valid flashcard', () => {
    const result = validateItem('flashcard', {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'flashcard',
      domain: 'ml-lifecycle',
      topic: 'blob',
      difficulty: 1,
      source: 'bank',
      content: { front: 'q', back: 'a' },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an MCQ missing the explanation field', () => {
    const result = validateItem('mcq', {
      id: '00000000-0000-4000-8000-000000000002',
      type: 'mcq',
      domain: 'mlops-infra',
      topic: 'rbac',
      difficulty: 2,
      source: 'bank',
      content: {
        question: 'q',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'A',
        // explanation intentionally missing
      },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => /explanation/.test(e.reason))).toBe(true);
    }
  });

  it('rejects an item with an unknown domain', () => {
    const result = validateItem('product-id', {
      id: '00000000-0000-4000-8000-000000000003',
      type: 'product-id',
      domain: 'not-a-domain',
      topic: 't',
      difficulty: 1,
      source: 'bank',
      content: { service_name: 'x', category: 'Storage', description: 'd' },
    });
    expect(result.valid).toBe(false);
  });

  it('requires the correct letter for MCQ to be A/B/C/D', () => {
    const result = validateItem('mcq', {
      id: '00000000-0000-4000-8000-000000000004',
      type: 'mcq',
      domain: 'ml-lifecycle',
      topic: 't',
      difficulty: 1,
      source: 'bank',
      content: {
        question: 'q',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'E',
        explanation: 'x',
      },
    });
    expect(result.valid).toBe(false);
  });
});
