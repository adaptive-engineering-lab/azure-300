import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../tools/author/lib/draft.js';

const SCHEMA_STUB = { title: 'stub' };

describe('Author prompt builder — grounded vs. ungrounded', () => {
  it('falls back to "Microsoft documentation" when no source files are provided', () => {
    const prompt = buildPrompt(
      { type: 'mcq', domain: 'ml-lifecycle', topic: 'blob-tiers', difficulty: 2, count: 5 },
      SCHEMA_STUB,
      [],
      [],
    );
    expect(prompt).toMatch(/Microsoft's current Azure documentation/);
    expect(prompt).not.toMatch(/SOURCE FILES/);
  });

  it('inlines source-file contents and tells Claude they are authoritative', () => {
    const prompt = buildPrompt(
      { type: 'flashcard', domain: 'mlops-infra', topic: 'rbac', difficulty: 1, count: 3 },
      SCHEMA_STUB,
      [],
      [
        { filename: 'lp2-module5-azure-rbac.md', contents: '## RBAC\nContributor can manage all resources but cannot assign roles.' },
        { filename: 'lp2-module2-manage-identities.md', contents: '## Owner\nOwner has full access and can delegate to others.' },
      ],
    );
    expect(prompt).toMatch(/SOURCE FILES/);
    expect(prompt).toMatch(/Use ONLY the source files provided below/);
    expect(prompt).toMatch(/=== lp2-module5-azure-rbac.md ===/);
    expect(prompt).toMatch(/Contributor can manage all resources/);
    expect(prompt).toMatch(/=== lp2-module2-manage-identities.md ===/);
    expect(prompt).not.toMatch(/Microsoft's current Azure documentation/);
  });

  it('still injects schema, domain, topic, and difficulty regardless of source mode', () => {
    const prompt = buildPrompt(
      { type: 'code-review', domain: 'genai-quality', topic: 'evaluation-metrics', difficulty: 3, count: 7 },
      SCHEMA_STUB,
      ['00000000-0000-4000-8000-000000000001'],
      [],
    );
    expect(prompt).toMatch(/Create 7 AI-300 code-review items/);
    expect(prompt).toMatch(/Domain: genai-quality/);
    expect(prompt).toMatch(/Topic: evaluation-metrics/);
    expect(prompt).toMatch(/Difficulty: 3/);
    expect(prompt).toMatch(/00000000-0000-4000-8000-000000000001/);
  });
});
