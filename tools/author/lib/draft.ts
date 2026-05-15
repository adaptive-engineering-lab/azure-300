import Anthropic from '@anthropic-ai/sdk';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { getAnthropicKey, getAnthropicModel } from './env.js';
import { getValidator, type ItemType } from './schemas.js';
import { listExistingIds } from './existing-ids.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = resolve(HERE, '..', 'drafts');

export interface DraftArgs {
  type: ItemType;
  domain: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  count: number;
  /**
   * One or more markdown source files (e.g., from bank/knowledge/ai300/) whose
   * contents are inlined into the prompt. When present, Claude is
   * instructed to use ONLY these files as the source of facts.
   */
  sourceFiles?: string[];
}

export interface DraftReport {
  drafted: number;
  accepted: number;
  rejected: number;
  rejections: Array<{ id: string; field: string; reason: string }>;
  file: string;
  groundedIn: string[];
}

const SYSTEM_PROMPT_BASE = `You author AI-300 exam-prep study items as JSON. You receive a JSON Schema, a topic context, and a list of UUIDs that already exist in the bank. Return ONLY a JSON array of items that conform to the schema, never include UUIDs from the existing list, and never wrap your response in markdown.`;

const SYSTEM_PROMPT_GROUNDED = `${SYSTEM_PROMPT_BASE}

When source files are provided in the user message, you MUST treat them as the ONLY authoritative source for facts. Every claim in every item — every Azure feature, every default value, every behavior — must trace back to those files. If a fact is not in the provided files, do not invent it. If you cannot generate the requested item from the files, return fewer items rather than fabricated ones.`;

export async function draftItems(args: DraftArgs): Promise<DraftReport> {
  const { schema, validate } = await getValidator(args.type);
  const existingIds = await listExistingIds();
  const sourceContents = await loadSources(args.sourceFiles ?? []);
  const grounded = sourceContents.length > 0;

  const userPrompt = buildPrompt(args, schema, existingIds, sourceContents);

  const client = new Anthropic({ apiKey: getAnthropicKey() });
  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: grounded ? SYSTEM_PROMPT_GROUNDED : SYSTEM_PROMPT_BASE,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Claude returned non-JSON content: ${(err as Error).message}\n---\n${text.slice(0, 400)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Claude returned a non-array payload.');
  }

  const accepted: unknown[] = [];
  const rejections: DraftReport['rejections'] = [];
  const existingSet = new Set(existingIds);
  const seenIdsInDraft = new Set<string>();

  for (const item of parsed as Array<Record<string, unknown>>) {
    const id = (item.id as string) ?? randomUUID();
    item.id = id;
    if (existingSet.has(id)) {
      rejections.push({ id, field: '/id', reason: 'id collides with an item in the seed bank' });
      continue;
    }
    if (seenIdsInDraft.has(id)) {
      rejections.push({ id, field: '/id', reason: 'duplicate id within this draft' });
      continue;
    }
    if (!validate(item)) {
      for (const err of validate.errors ?? []) {
        rejections.push({
          id,
          field: err.instancePath || '/',
          reason: `${err.keyword}: ${err.message ?? 'invalid'}`,
        });
      }
      continue;
    }
    seenIdsInDraft.add(id);
    accepted.push(item);
  }

  await mkdir(DRAFTS_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `${today}-${args.type}-${args.topic}.json`;
  const filePath = resolve(DRAFTS_DIR, fileName);
  await writeFile(filePath, JSON.stringify(accepted, null, 2) + '\n', 'utf8');

  return {
    drafted: parsed.length,
    accepted: accepted.length,
    rejected: rejections.length,
    rejections,
    file: filePath,
    groundedIn: sourceContents.map((s) => s.filename),
  };
}

async function loadSources(paths: string[]): Promise<Array<{ filename: string; contents: string }>> {
  const out: Array<{ filename: string; contents: string }> = [];
  for (const p of paths) {
    const abs = resolve(process.cwd(), p);
    const raw = await readFile(abs, 'utf8');
    out.push({ filename: basename(abs), contents: raw });
  }
  return out;
}

export function buildPrompt(
  args: DraftArgs,
  schema: unknown,
  existingIds: string[],
  sources: Array<{ filename: string; contents: string }>,
): string {
  const idSample = existingIds.slice(0, 50).join(', ');
  const sourceBlock =
    sources.length === 0
      ? '- Anchor the content in Microsoft\'s current Azure documentation; reflect real exam-relevant scenarios.'
      : '- Use ONLY the source files provided below as the basis for facts. Do not draw on training data to fill gaps.';
  const filesSection =
    sources.length === 0
      ? ''
      : '\n\nSOURCE FILES (authoritative; every fact must trace to these):\n\n' +
        sources.map((s) => `=== ${s.filename} ===\n${s.contents}`).join('\n\n');
  return `Create ${args.count} AI-300 ${args.type} items.

Domain: ${args.domain}
Topic: ${args.topic}
Difficulty: ${args.difficulty}

Each item MUST validate against this JSON Schema:
${JSON.stringify(schema, null, 2)}

Constraints:
- Generate a new uuid v4 for each item's "id" field.
- Do NOT reuse any of these existing ids: ${idSample}${existingIds.length > 50 ? ` (+${existingIds.length - 50} more)` : ''}.
- Set "source" to "ai-generated".
- Leave "reviewer_id" and "reviewed_at" unset — those are filled at promote time.
${sourceBlock}

Return ONLY a JSON array of items, no prose, no markdown fence.${filesSection}`;
}
