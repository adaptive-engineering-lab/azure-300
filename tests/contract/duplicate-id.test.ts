import { describe, it, expect } from 'vitest';
import { detectDuplicate, type QuestionItem } from '../../tools/seed/lib/load-content.js';

function makeItem(id: string, overrides: Partial<QuestionItem> = {}): QuestionItem {
  return {
    id,
    type: 'flashcard',
    domain: 'ml-lifecycle',
    topic: 'blob',
    difficulty: 1,
    source: 'bank',
    content: { front: 'q', back: 'a' },
    ...overrides,
  };
}

describe('Duplicate ID detection (T024 / FR-008 — exit code 11)', () => {
  it('returns null when no duplicates exist', () => {
    const result = detectDuplicate([
      { file: 'flashcards.json', item: makeItem('00000000-0000-4000-8000-000000000001') },
      { file: 'mcq.json', item: makeItem('00000000-0000-4000-8000-000000000002') },
    ]);
    expect(result).toBeNull();
  });

  it('finds a duplicate ID present across two different files', () => {
    const dup = '11111111-1111-4111-8111-111111111111';
    const result = detectDuplicate([
      { file: 'flashcards.json', item: makeItem(dup) },
      { file: 'mcq.json', item: makeItem(dup) },
    ]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(dup);
    expect(result!.firstFile).toBe('flashcards.json');
    expect(result!.secondFile).toBe('mcq.json');
  });

  it('finds a duplicate ID present twice within the same file', () => {
    const dup = '22222222-2222-4222-8222-222222222222';
    const result = detectDuplicate([
      { file: 'mcq.json', item: makeItem(dup) },
      { file: 'mcq.json', item: makeItem(dup) },
    ]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(dup);
  });
});
