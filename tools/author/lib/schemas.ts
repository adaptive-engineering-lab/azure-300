import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = resolve(HERE, '..', '..', '..', 'specs', '001-supabase-schema-and-seed', 'contracts');

const SCHEMA_FILES = {
  flashcard: 'flashcard.schema.json',
  mcq: 'mcq.schema.json',
  'product-id': 'product-id.schema.json',
} as const;

export type ItemType = keyof typeof SCHEMA_FILES;

let cache: Partial<Record<ItemType, { schema: unknown; validate: ValidateFunction }>> = {};

export async function getValidator(type: ItemType): Promise<{ schema: unknown; validate: ValidateFunction }> {
  if (cache[type]) return cache[type]!;
  const raw = await readFile(resolve(CONTRACTS_DIR, SCHEMA_FILES[type]), 'utf8');
  const schema = JSON.parse(raw);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const validate = ajv.compile(schema);
  cache[type] = { schema, validate };
  return cache[type]!;
}
