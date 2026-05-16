import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { LoadedItem } from './load-content.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = resolve(
  HERE,
  '..',
  '..',
  '..',
  'specs',
  '001-supabase-schema-and-seed',
  'contracts',
);

const SCHEMA_FILES: Record<LoadedItem['type'], string> = {
  flashcard: 'flashcard.schema.json',
  mcq: 'mcq.schema.json',
  'code-review': 'code-review.schema.json',
};

export interface ValidationError {
  id: string;
  file: string;
  field: string;
  reason: string;
}

let validators: Record<LoadedItem['type'], ValidateFunction> | null = null;

async function getValidators(): Promise<Record<LoadedItem['type'], ValidateFunction>> {
  if (validators) return validators;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const entries = await Promise.all(
    (Object.entries(SCHEMA_FILES) as [LoadedItem['type'], string][]).map(async ([type, file]) => {
      const schema = JSON.parse(await readFile(resolve(CONTRACTS_DIR, file), 'utf8'));
      return [type, ajv.compile(schema)] as const;
    }),
  );
  validators = Object.fromEntries(entries) as Record<LoadedItem['type'], ValidateFunction>;
  return validators;
}

export async function validateItems(items: LoadedItem[]): Promise<ValidationError[]> {
  const vs = await getValidators();
  const errors: ValidationError[] = [];
  for (const item of items) {
    const validator = vs[item.type];
    if (!validator) {
      errors.push({
        id: item.id,
        file: item.sourceFile,
        field: '/type',
        reason: `Unknown type ${item.type}`,
      });
      continue;
    }
    // Strip internal-only fields before validation (validators use schema's additionalProperties:false).
    const { sourceFile: _f, content_hash: _h, ...payload } = item;
    void _f;
    void _h;
    if (!validator(payload)) {
      for (const err of validator.errors ?? []) {
        errors.push({
          id: item.id,
          file: item.sourceFile,
          field: err.instancePath || '/',
          reason: `${err.keyword}: ${err.message ?? 'invalid'}`,
        });
      }
    }
  }
  return errors;
}

export function formatErrorsForCli(errors: ValidationError[]): string {
  return errors
    .map((e) => `[INVALID] id=${e.id} file=${e.file} field=${e.field} reason=${e.reason}`)
    .join('\n');
}
