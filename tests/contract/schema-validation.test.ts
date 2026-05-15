import { describe, it, expect } from 'vitest';
import { loadContent, type LoadedItem } from '../../tools/seed/lib/load-content.js';
import { validateItems } from '../../tools/seed/lib/validate-content.js';

describe('Schema validation (T022 / SC-001 / FR-005)', () => {
  it('every committed seed item validates against its type schema', async () => {
    const items = await loadContent();
    const errors = await validateItems(items);
    expect(errors, errors.map((e) => `${e.id} ${e.field}: ${e.reason}`).join('\n')).toEqual([]);
    expect(items.length).toBeGreaterThanOrEqual(50);
  });

  it('rejects an MCQ missing the explanation field', async () => {
    const items = await loadContent();
    const mcq = items.find((i) => i.type === 'mcq')!;
    const bad: LoadedItem = {
      ...mcq,
      id: '00000000-0000-4000-8000-000000000bad',
      content: {
        question: 'Q?',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        correct: 'A',
        // explanation intentionally missing
      },
    };
    const errors = await validateItems([bad]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.field.includes('content') && /explanation/.test(e.reason))).toBe(
      true,
    );
    expect(errors[0]?.id).toBe(bad.id);
  });

  it('rejects an item with an out-of-range domain', async () => {
    const items = await loadContent();
    const base = items[0]!;
    const bad: LoadedItem = { ...base, id: '00000000-0000-4000-8000-000000000bad', domain: 'not-a-domain' };
    const errors = await validateItems([bad]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.field === '/domain' || e.field.includes('domain'))).toBe(true);
  });

  it('rejects an ai-generated item missing reviewer audit fields', async () => {
    const items = await loadContent();
    const base = items.find((i) => i.type === 'flashcard')!;
    const bad: LoadedItem = {
      ...base,
      id: '00000000-0000-4000-8000-000000000bad',
      source: 'ai-generated',
      // reviewer_id and reviewed_at intentionally missing
      reviewer_id: undefined,
      reviewed_at: undefined,
    };
    const errors = await validateItems([bad]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => /reviewer_id|reviewed_at/.test(e.reason))).toBe(true);
  });
});
