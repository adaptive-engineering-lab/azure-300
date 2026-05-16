import { describe, it, expect } from 'vitest';
import { buildOptions } from '../../src/pages/ProductIdPage';
import type { ProductIdQuestion } from '../../src/lib/questions/types';

function make(category: string, common_confusions: string[] = []): ProductIdQuestion {
  return {
    id: 'x',
    type: 'product-id',
    domain: 'genai-quality',
    topic: 't',
    difficulty: 1,
    content: { service_name: 'X', category, description: 'd', common_confusions },
  };
}

describe('Product-ID option builder (FR-005, FR-006)', () => {
  it('always returns exactly 4 unique options', () => {
    const options = buildOptions(make('Networking'));
    expect(new Set(options).size).toBe(4);
  });

  it('includes the correct category', () => {
    const options = buildOptions(make('Storage'));
    expect(options).toContain('Storage');
  });

  it('prefers categories named in common_confusions when matchable', () => {
    const options = buildOptions(make('Networking', ['VPN Gateway is Networking', 'Azure Firewall is Security']));
    expect(options).toContain('Networking');
    expect(options).toContain('Security');
  });
});
