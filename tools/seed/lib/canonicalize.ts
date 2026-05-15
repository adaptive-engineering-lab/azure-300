import { createHash } from 'node:crypto';

/**
 * Produce a deterministic JSON serialization of `value` with keys sorted
 * recursively. Used as the input to `contentHash` so two semantically
 * identical payloads always hash to the same value.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * sha256 hex digest of the canonical form of `value`.
 */
export function contentHash(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}
