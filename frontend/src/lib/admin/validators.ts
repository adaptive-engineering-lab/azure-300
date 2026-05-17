import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import flashcardSchema from './schemas/flashcard.schema.json';
import mcqSchema from './schemas/mcq.schema.json';
import codeReviewSchema from './schemas/code-review.schema.json';

export type ItemType = 'flashcard' | 'mcq' | 'code-review';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);

const validators: Record<ItemType, ValidateFunction> = {
  flashcard: ajv.compile(flashcardSchema),
  mcq: ajv.compile(mcqSchema),
  'code-review': ajv.compile(codeReviewSchema),
};

export interface ValidationError {
  field: string;
  reason: string;
}

export function validateItem(type: ItemType, item: unknown): { valid: true } | { valid: false; errors: ValidationError[] } {
  const validate = validators[type];
  if (validate(item)) return { valid: true };
  return {
    valid: false,
    errors: (validate.errors ?? []).map((e) => ({
      field: e.instancePath || '/',
      reason: `${e.keyword}: ${e.message ?? 'invalid'}`,
    })),
  };
}
