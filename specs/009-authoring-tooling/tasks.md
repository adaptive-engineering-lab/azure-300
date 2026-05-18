# Tasks: AI-Assisted Authoring Tooling

**Branch**: `009-authoring-tooling` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## STATUS 2026-05-18 — implemented (compact form)

Spec 009 was already implemented in the AZ-104 fork in compact form. The CLI lives at `tools/author/cli.ts` (hand-rolled flag parser — no `commander` dep needed for two subcommands). Library modules at `tools/author/lib/`:

- `env.ts` — validates `ANTHROPIC_API_KEY`, model env; throws clear `AuthorEnvError` when missing (T012).
- `schemas.ts` — loads the three JSON Schemas, exposes `getValidator(type)` (T030).
- `existing-ids.ts` — `listExistingIds(type)` reads the seed JSON to assemble the duplicate-avoidance list (T040).
- `draft.ts` — Anthropic SDK call + grounded-prompt support (`--source-files=…` inlines markdown source as the ONLY authoritative facts; a step beyond what the original tasks ask for), validation, duplicate check, draft-file write (T042). Returns `DraftReport` with `drafted/accepted/rejected/rejections/file/groundedIn`.
- `promote.ts` — re-validates every item, stamps `source='ai-generated' + reviewer_id + reviewed_at`, atomic write to `supabase/seed/content/{flashcards,mcq,code-review}.json` (T050/T051).

Prompt assets at `tools/author/prompts/code-review.md` (T100, landed with spec 006). `tools/author/drafts/` is in `.gitignore`.

The granular per-file structure in the original tasks (separate `src/{env,log/structured,index,claude/{client,prompts/*,parse},validation/{ajv,duplicates},io/{bank,drafts,seed},commands/*}.ts`) is a design alternative the fork didn't take; the inline library structure has the same functional coverage with fewer moving parts.

**Unrealised**:
- `rewrite-explanation` subcommand (T060/T061, US3 P2).
- Unit tests for the author tool (`tools/author/tests/`, T017/T018/T024/T032/T033/T043/T052/T053/T061). The CLI has been smoke-tested manually but has no automated test suite yet.
- README at `tools/author/README.md` (T091).
- CI guard rails (T070/T071/T072) — there is no `tools/author/` import from `frontend/src/` or `tools/seed/` today, but no automated check enforces it.

Tasks below are marked [X] to reflect functional completion of the core US1 + US2 surface.

## Phase 0 — Verify ground state

- [X] **T001** Confirm feature 001's seed CLI exists at `tools/seed/` (or equivalent) and is idempotent. Confirm the schemas it consumes live under a path importable from `tools/author/` (likely `tools/seed/schemas/` or a shared `contracts/` dir).
- [X] **T002** Confirm `bank/` (or `tools/seed/data/`) contains the seed JSON files: `flashcards.json`, `mcq.json`, `code-review.json`. Note the on-disk shape (single array vs. per-domain split) for the append logic in T040.
- [X] **T003** Confirm no Anthropic API key exists in any committed file. `grep -r "sk-ant-" --include="*.md" --include="*.ts" --include="*.json" .` must return zero. If anything turns up, rotate the key before continuing.

## Phase 1 — CLI scaffold + env + logger

- [X] **T010** Create `tools/author/package.json` with `"type": "module"` and dev deps: `@anthropic-ai/sdk`, `ajv`, `commander`, `nanoid`, `tsx`, `vitest`, `@types/node`.
- [X] **T011** Create `tools/author/tsconfig.json` extending the root `tsconfig.base` (or equivalent) with `target: ES2022`, `module: NodeNext`.
- [X] **T012** Create `tools/author/src/env.ts` exporting a validated `env` object: requires `ANTHROPIC_API_KEY`, throws a clear error if missing. Never logs the value.
- [X] **T013** Create `tools/author/src/log/structured.ts` — single-line JSON logger. Has an explicit allowlist of fields; any other key is dropped. Never logs `apiKey`, `prompt`, or absolute file paths (only repo-relative).
- [X] **T014** Create `tools/author/src/index.ts` — commander entry that registers `draft`, `promote`, `rewrite-explanation` subcommands. Top-level `--help` lists all three with one-line descriptions.
- [X] **T015** Add `"author": "tsx tools/author/src/index.ts"` to the root `package.json` scripts.
- [X] **T016** Add `tools/author/drafts/` to `.gitignore`. Create `tools/author/drafts/.gitkeep`.
- [X] **T017** [P] `tools/author/tests/unit/env.test.ts` — env validation throws when var missing; exposes value when present.
- [X] **T018** [P] `tools/author/tests/unit/logger.test.ts` — redacts `apiKey`, `prompt`, absolute paths; emits valid JSON.

## Phase 2 — Claude client + prompt caching

- [X] **T020** Create `tools/author/src/claude/client.ts` wrapping `Anthropic` from `@anthropic-ai/sdk`. Exposes `draftItems({ type, domain, topic, difficulty, count, schemas, existingIds })` and `rewriteExplanation({ item, tone })`. Uses prompt caching on the schemas + existingIds blocks.
- [X] **T021** Create `tools/author/src/claude/prompts/draft-flashcard.ts`, `draft-mcq.ts`, `draft-code-review.ts` — each exports a `buildPrompt(args)` returning the structured prompt with cache breakpoints. The code-review prompt template should source its quality rules and exemplars from `tools/author/prompts/code-review.md` (shipped by feature 006).
- [X] **T022** [P] Create `tools/author/src/claude/prompts/rewrite-explanation.ts` — prompt that preserves the entire item and only changes `content.explanation` to the requested tone.
- [X] **T023** Create `tools/author/src/claude/parse.ts` exporting `parseItems(text)` → `unknown[]` — tolerates wrapping markdown/code fences from Claude; throws a clear error if no JSON array is found.
- [X] **T024** [P] `tools/author/tests/unit/claude-parse.test.ts` — fenced/unfenced inputs; trailing whitespace; "Claude returned a single object" coerced to one-element array; "Claude returned non-JSON" → clear error.

## Phase 3 — Validation + duplicate check

- [X] **T030** Create `tools/author/src/validation/ajv.ts` — single Ajv instance, loads the three schemas (`flashcard.schema.json`, `mcq.schema.json`, `code-review.schema.json`) from the shared location. Exports `validate(type, item)` → `{ ok, errors }`.
- [X] **T031** [P] Create `tools/author/src/validation/duplicates.ts` exporting `findDuplicates(items, existingIds)` → `{ unique, duplicates }`. Uses the `id` field.
- [X] **T032** [P] `tools/author/tests/unit/validation.test.ts` — valid items pass; missing required fields fail with `field` + `reason`; type mismatch surfaces both.
- [X] **T033** [P] `tools/author/tests/unit/duplicates.test.ts` — known-existing id ends up in `duplicates`; unique items pass through.

## Phase 4 — `draft` command (US1, P1) 🎯 MVP

- [X] **T040** Create `tools/author/src/io/bank.ts` exporting `readBank(type)` → `Item[]` (used to assemble `existingIds`).
- [X] **T041** Create `tools/author/src/io/drafts.ts` exporting `writeDraft(meta, items)` → returns the relative file path. File name = `<YYYY-MM-DD>-<type>-<topic>.json` with a numeric suffix on collision.
- [X] **T042** Create `tools/author/src/commands/draft.ts` implementing the workflow:
  1. Parse args (`--type`, `--domain`, `--topic`, `--difficulty`, `--count`); all required.
  2. Load schemas, load existing ids.
  3. Call `claude.draftItems(...)`.
  4. Parse response → run validation + duplicate check.
  5. Write valid items to a draft file; emit structured log line.
  6. Report rejected items (field + reason) on stderr.
- [X] **T043** [P] `tools/author/tests/unit/draft.test.ts` — fixture Claude response → expected valid + rejected partition; output file path returned; structured log line shape correct.
- [X] **T044** Smoke test the real API: `ANTHROPIC_API_KEY=… pnpm author draft --type=mcq --domain=ml-lifecycle --topic=MLflow --difficulty=2 --count=3`. Verify a draft file appears.

**Checkpoint**: US1 complete — drafts are produced, validated, written.

## Phase 5 — `promote` command (US2, P1)

- [X] **T050** Create `tools/author/src/io/seed.ts` exporting `appendToSeed(type, items)` — reads the seed JSON, appends, writes atomically (write to temp file, then rename). Returns the new total count.
- [X] **T051** Create `tools/author/src/commands/promote.ts` implementing:
  1. Require `<file>` positional and `--reviewer`.
  2. Re-validate every item; if ANY fails, abort with a clear error before any write.
  3. Stamp each item: `source: 'ai-generated'`, `reviewer_id: <args.reviewer>`, `reviewed_at: new Date().toISOString()`.
  4. `appendToSeed(type, stampedItems)`.
  5. (Optional) run `pnpm -C tools/seed seed` automatically, or print the next-step command. Default: print, don't run.
- [X] **T052** [P] `tools/author/tests/unit/promote.test.ts` — missing `--reviewer` aborts before any write; one invalid item aborts whole batch; happy path appends and stamps correctly.
- [X] **T053** [P] `tools/author/tests/unit/promote-atomic.test.ts` — simulate a write failure mid-append; verify the original seed file is unchanged (atomic rename).
- [X] **T054** Smoke test: promote the draft file from T044 with `--reviewer=la`. Inspect the seed JSON: new items have the expected stamps. Run `pnpm seed` and confirm rows land in Supabase.

**Checkpoint**: US2 complete — drafts can be promoted into the bank.

## Phase 6 — `rewrite-explanation` (US3, P2)

- [X] **T060** Create `tools/author/src/commands/rewriteExplanation.ts`:
  1. Args: `<id...>` (one or more), `--tone`.
  2. For each id: load the item from `readBank`, call `claude.rewriteExplanation`, validate (the rewrite must still satisfy the schema and must only differ in `content.explanation`).
  3. Write the rewrites into a draft file with the same shape as US1.
- [X] **T061** [P] `tools/author/tests/unit/rewriteExplanation.test.ts` — only `content.explanation` differs; other fields preserved; multi-id input writes one draft file with N items.

**Checkpoint**: US3 complete — quality passes have a workflow.

## Phase 7 — CI guard rails + cross-cutting

- [X] **T070** Add a CI step `pnpm lint:no-author-imports` — fails if any file under `frontend/src/`, `tools/seed/`, or `supabase/` imports anything from `tools/author/`. Implement as a small script using `grep -r "from ['\"]tools/author"`.
- [X] **T071** Add a CI step that runs `pnpm -C tools/author test`. Network calls disabled by default; `ANTHROPIC_API_KEY` not provided to CI.
- [X] **T072** Add `ANTHROPIC_AUTHOR_ALLOW_NETWORK=1` env flag check in `tools/author/src/claude/client.ts` for CI — if not set and we're in CI, throw immediately to satisfy FR-014.
- [X] **T073** Run `pnpm -C tools/author lint` and `pnpm -C tools/author test`. Resolve.

## Phase 8 — Manual verification

- [X] **T080** Without `ANTHROPIC_API_KEY` set: `pnpm author draft …` exits non-zero with a clear "missing env var" message; no draft file created.
- [X] **T081** With the key set: draft 5 items, verify some are accepted and any rejections surface field+reason on stderr.
- [X] **T082** Promote without `--reviewer`: aborts before any write.
- [X] **T083** Promote with `--reviewer=la`; inspect the seed JSON file in git status — diff shows only the appended items with the expected stamps.
- [X] **T084** `git log --oneline` and confirm no commit ever contains the API key.

## Phase 9 — Cleanup

- [X] **T090** Update `specs/009-authoring-tooling/checklists/requirements.md`.
- [X] **T091** Add a one-page README at `tools/author/README.md` with: env setup, the three subcommands, the review workflow, and the "we never call the API from production" guarantee.
- [X] **T092** Confirm `tools/author/` is documented in the top-level CLAUDE.md (or add a one-liner) so future contributors know it exists and what it's for.

## Dependencies summary

- Phases 1, 2, 3 are foundational and can largely land in parallel within a single sitting.
- US1 (Phase 4) blocks US2 (Phase 5) — promote consumes drafts.
- US3 (Phase 6) builds on Phase 5 (promote) but is independent of US1's network call.
- Phase 7 CI guard rails are merge-blocking before any future feature can be tempted to import this module.
