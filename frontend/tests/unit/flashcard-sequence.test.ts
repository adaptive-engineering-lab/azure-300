import { describe, it, expect } from 'vitest';
import { sequenceForSession } from '../../src/pages/FlashcardSessionPage';
import type { FlashcardQuestion } from '../../src/lib/questions/types';

function makeCard(id: string): FlashcardQuestion {
  return {
    id,
    type: 'flashcard',
    domain: 'ml-lifecycle',
    topic: 'blob',
    difficulty: 1,
    content: { front: `Q ${id}`, back: `A ${id}` },
  };
}

describe('Flashcard sequence ordering (FR-009, US2)', () => {
  it('places due cards before new ones', () => {
    const cards = ['a', 'b', 'c', 'd'].map(makeCard);
    const progress = {
      c: { nextReview: '2020-01-01' }, // overdue
      d: { nextReview: '2099-01-01' }, // not due
    };
    const seq = sequenceForSession(cards, progress, 4);
    expect(seq[0]!.id).toBe('c');
    expect(seq.slice(1).map((c) => c.id)).toEqual(expect.arrayContaining(['a', 'b', 'd']));
  });

  it('trims to the requested length', () => {
    const cards = Array.from({ length: 30 }, (_, i) => makeCard(`c${i}`));
    const seq = sequenceForSession(cards, {}, 10);
    expect(seq).toHaveLength(10);
  });

  it('when due cards exceed length, all session items are due', () => {
    const cards = ['a', 'b', 'c'].map(makeCard);
    const progress = {
      a: { nextReview: '2020-01-01' },
      b: { nextReview: '2020-01-01' },
      c: { nextReview: '2099-01-01' },
    };
    const seq = sequenceForSession(cards, progress, 2);
    expect(seq.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });
});
