# `tools/` — Seed and Test Tooling

Node 20 + TypeScript scripts that operate on the AI-300 game's Supabase data layer.

This directory holds the **maintainer-side** code. It is never bundled into the frontend, never deployed, and never invoked by end users.

## Layout

```
tools/
├── seed/
│   ├── seed.ts                  # `pnpm seed` — validate + idempotent upsert
│   ├── validate.ts              # `pnpm seed:validate` — validate only
│   ├── demo.ts                  # quick sample-data dump (handy for demos)
│   └── lib/
│       ├── env.ts               # typed env-var loader (exit 20 on missing)
│       ├── canonicalize.ts      # deterministic content_hash
│       ├── load-content.ts      # JSON loader + duplicate-id detection (exit 11)
│       └── validate-content.ts  # AJV 2020-12 validator (exit 10 on failure)
├── test-helpers/
│   ├── clients.ts               # anon / service-role / signed-in user clients
│   ├── users.ts                 # createTestUser / cleanupTestUsers
│   └── global-setup.ts          # vitest pre-flight; fail-fast if DB unreachable
└── README.md                    # (this file)
```

Tests under `../tests/` import from here directly via relative paths.

## Authoritative contract

The **`seed` CLI contract** — flags, env vars, exit codes, output format — lives at:

[`specs/001-supabase-schema-and-seed/contracts/seed-cli.md`](../specs/001-supabase-schema-and-seed/contracts/seed-cli.md)

That document is the spec. The code in this directory implements it. If the two ever disagree, the contract wins and the code is the bug.

## Setup

```bash
cd tools
pnpm install
cp .env.example .env.local
# Fill .env.local with SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
```

For a remote project use keys from `https://supabase.com/dashboard/project/<ref>/settings/api`. For a local stack use the values printed by `supabase start`. `tools/.env.local` is gitignored.

## Common commands

| Command | What it does |
|---|---|
| `pnpm seed:validate` | Validate all seed JSON against the JSON Schemas. Exits 0 or 10. No DB writes. |
| `pnpm seed` | Validate, then call the `seed_upsert_questions` RPC. Idempotent. |
| `DRY_RUN=1 pnpm seed` | Load + validate + show what *would* be written. No DB writes. |
| `pnpm test` | Run the full vitest suite (contract + integration tests). |
| `pnpm test:watch` | Watch mode. |
| `pnpm lint` | ESLint over `seed/`, `test-helpers/`, and the tests. |
| `pnpm exec tsx seed/demo.ts` | Print the bank distribution and a sample item per type. |

## Exit codes

Per the contract:

| Code | Meaning |
|---|---|
| 0 | Success |
| 10 | Validation failure — one or more items rejected. No DB writes. |
| 11 | Duplicate `id` across input files. No DB writes. |
| 12 | Database connection or transaction error. Run was rolled back. |
| 20 | Environment misconfiguration. |

## What this directory deliberately does NOT do

- Run migrations (those go through `supabase db push` or `supabase db reset`).
- Generate IDs (every seed item must already carry a UUID).
- Write to `profiles`, `user_progress`, or `sessions` (only `questions`).
- Call any AI API (per constitution Principle III; AI is offline-only).
- Ship in the frontend bundle.
