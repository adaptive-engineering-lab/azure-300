import 'dotenv/config';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_LOCAL = resolve(TOOLS_DIR, '.env.local');
if (existsSync(ENV_LOCAL)) loadDotenv({ path: ENV_LOCAL, override: true });

export class AuthorEnvError extends Error {
  readonly exitCode = 20;
}

export function getAnthropicKey(): string {
  const v = process.env.ANTHROPIC_API_KEY;
  if (!v) throw new AuthorEnvError('Missing ANTHROPIC_API_KEY. Set it in tools/.env.local or your shell.');
  return v;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
}
