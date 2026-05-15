import 'dotenv/config';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_LOCAL = resolve(TOOLS_DIR, '.env.local');
if (existsSync(ENV_LOCAL)) loadDotenv({ path: ENV_LOCAL, override: true });

export class EnvError extends Error {
  readonly exitCode = 20;
}

function require(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new EnvError(
      `Missing required environment variable ${name}. Copy tools/.env.example to tools/.env.local and fill it in.`,
    );
  }
  return v;
}

export interface SeedEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  dryRun: boolean;
}

export function loadSeedEnv(): SeedEnv {
  return {
    supabaseUrl: require('SUPABASE_URL'),
    serviceRoleKey: require('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: require('SUPABASE_ANON_KEY'),
    dryRun: process.env.DRY_RUN === '1',
  };
}
