import { createClient } from '@supabase/supabase-js';
import { loadSeedEnv } from './lib/env.js';

const { supabaseUrl, anonKey } = loadSeedEnv();
const client = createClient(supabaseUrl, anonKey);

const { data: counts } = await client.from('questions').select('domain, type');
const byDomain: Record<string, Record<string, number>> = {};
for (const row of counts ?? []) {
  byDomain[row.domain] = byDomain[row.domain] ?? {};
  byDomain[row.domain][row.type] = (byDomain[row.domain][row.type] ?? 0) + 1;
}
console.log('\n=== Bank by domain × type ===');
console.table(byDomain);

const { data: fc } = await client
  .from('questions')
  .select('topic, content')
  .eq('type', 'flashcard')
  .eq('domain', 'genai-quality')
  .limit(1)
  .single();
console.log('\n=== Sample flashcard (networking) ===');
console.log('Topic:', fc!.topic);
console.log('Front:', (fc!.content as { front: string }).front);
console.log('Back: ', (fc!.content as { back: string }).back);

const { data: mcq } = await client
  .from('questions')
  .select('topic, content')
  .eq('type', 'mcq')
  .eq('domain', 'mlops-infra')
  .limit(1)
  .single();
console.log('\n=== Sample MCQ (identity-governance) ===');
const mc = mcq!.content as {
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
};
console.log('Q:', mc.question);
for (const [letter, text] of Object.entries(mc.options)) console.log(`  ${letter}. ${text}`);
console.log('Correct:', mc.correct);
console.log('Why:', mc.explanation);

const { data: pid } = await client
  .from('questions')
  .select('topic, content')
  .eq('type', 'product-id')
  .eq('domain', 'ml-lifecycle')
  .limit(1)
  .single();
console.log('\n=== Sample product-ID (storage) ===');
const p = pid!.content as { service_name: string; category: string; description: string };
console.log('Service:', p.service_name, '/', 'Category:', p.category);
console.log('Description:', p.description);
