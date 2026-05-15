import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import flashcardSchema from './schemas/flashcard.schema.json';
import mcqSchema from './schemas/mcq.schema.json';
import productIdSchema from './schemas/product-id.schema.json';

export type ItemType = 'flashcard' | 'mcq' | 'product-id';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);

const validators: Record<ItemType, ValidateFunction> = {
  flashcard: ajv.compile(flashcardSchema),
  mcq: ajv.compile(mcqSchema),
  'product-id': ajv.compile(productIdSchema),
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
