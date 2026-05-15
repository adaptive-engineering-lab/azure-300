import { describe, it, expect } from 'vitest';
import { anonClient } from '../../tools/test-helpers/clients.js';

describe('Question queries — anonymous, filtered reads (T011 / FR-013, US1 acceptance)', () => {
  const client = anonClient();

  it('Scenario 1: Networking domain returns at least one item of each type with complete metadata', async () => {
    const { data, error } = await client
      .from('questions')
      .select('id, type, domain, topic, difficulty, source, content')
      .eq('domain', 'genai-quality');
    expect(error).toBeNull();
    const rows = data ?? [];
    expect(rows.length).toBeGreaterThan(0);
    const types = new Set(rows.map((r) => r.type));
    expect(types.has('flashcard')).toBe(true);
    expect(types.has('mcq')).toBe(true);
    expect(types.has('product-id')).toBe(true);
    for (const row of rows) {
      expect(row.id, 'id present').toBeTruthy();
      expect(row.topic, 'topic present').toBeTruthy();
      expect(row.difficulty, 'difficulty present').toBeGreaterThanOrEqual(1);
      expect(row.source, 'source present').toMatch(/^(bank|ai-generated)$/);
      expect(row.content, 'content payload present').toBeTruthy();
    }
  });

  it('Scenario 2: fetching by id returns a complete type-specific payload', async () => {
    const { data: anyRow } = await client.from('questions').select('id, type').limit(1).single();
    expect(anyRow).toBeTruthy();
    const { data: row, error } = await client
      .from('questions')
      .select('*')
      .eq('id', anyRow!.id)
      .single();
    expect(error).toBeNull();
    expect(row!.content).toBeTruthy();
    if (row!.type === 'mcq') {
      const c = row!.content as Record<string, unknown>;
      expect(c.question).toBeTruthy();
      expect(c.options).toBeTruthy();
      expect(c.correct).toMatch(/^[A-D]$/);
      expect(c.explanation).toBeTruthy();
    } else if (row!.type === 'flashcard') {
      const c = row!.content as Record<string, unknown>;
      expect(c.front).toBeTruthy();
      expect(c.back).toBeTruthy();
    } else if (row!.type === 'product-id') {
      const c = row!.content as Record<string, unknown>;
      expect(c.service_name).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.description).toBeTruthy();
    }
  });

  it('Scenario 3: every domain returns at least one item per type', async () => {
    const { data } = await client.from('questions').select('domain, type');
    const rows = (data ?? []) as Array<{ domain: string; type: string }>;
    const domains = ['mlops-infra', 'ml-lifecycle', 'genaiops-infra', 'genai-quality', 'genai-optimization'];
    const types = ['flashcard', 'mcq', 'product-id'];
    for (const d of domains) {
      for (const t of types) {
        expect(
          rows.some((r) => r.domain === d && r.type === t),
          `no ${t} in ${d}`,
        ).toBe(true);
      }
    }
  });

  it('filters by domain + type + difficulty', async () => {
    const { data, error } = await client
      .from('questions')
      .select('id, type, domain, difficulty')
      .eq('domain', 'mlops-infra')
      .eq('type', 'mcq')
      .eq('difficulty', 2);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    for (const row of data ?? []) {
      expect(row.domain).toBe('mlops-infra');
      expect(row.type).toBe('mcq');
      expect(row.difficulty).toBe(2);
    }
  });

  it('filters by topic', async () => {
    const { data, error } = await client.from('questions').select('id, topic').eq('topic', 'rbac');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
