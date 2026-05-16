# Implementation Plan: AI-Assisted Authoring Tooling

**Branch**: `009-authoring-tooling` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Build maintainer-side CLI tooling under `tools/author/` that uses Claude to draft new bank items, with a human-review-then-promote workflow that lands items in the seed JSON files with proper provenance. Three subcommands: `draft` (Claude → drafts/), `promote` (drafts/ → seed JSON + `pnpm seed`), and `rewrite-explanation` (targeted clarity passes on existing items). Strictly offline / maintainer-local — no runtime AI in the deployed app (constitution Principle III).

## Technical Context

**Language**: TypeScript 5.5 + Node 20 (CLI runtime); not bundled into the frontend
**New deps**: `@anthropic-ai/sdk@^0.30`, `ajv@^8` (schema validation; may already be present), `commander@^12` (CLI parsing), `nanoid@^5` (id generation)
**Env vars**: `ANTHROPIC_API_KEY` (maintainer-local only; never committed; never logged)
**Storage**: `tools/author/drafts/*.json` (gitignored), seed JSON files under `bank/`
**Testing**: vitest for validators, draft writers, promote atomicity; manual integration tests against the real Claude API
**Project**: new entry in `tools/` namespace

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | N/A | Tooling has no UI. |
| II. Domain-Aligned Content | Pass | Every drafted item is tagged with one of the five AI-300 domains from `exams.config.json`. |
| III. AI as Authoring Tool | Pass | This is *the* implementation of Principle III. No production code imports anything from `tools/author/` (SC-005, verified by static analysis). |
| IV. Secrets Stay Server-Side | Pass | API key sourced from a maintainer-local env var; never appears in repo, CI logs, or draft contents (SC-006). |
| V. Measurable Quality Gates | Pass | Output is JSON validated against the same schemas the seed CLI consumes; SC-004 verifies idempotency after promote + seed. |

## Project Structure (additions)

```
tools/
└── author/
    ├── package.json                   # private; "type": "module"
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts                   # commander entry
    │   ├── commands/
    │   │   ├── draft.ts               # `pnpm author draft …`
    │   │   ├── promote.ts             # `pnpm author promote <file>`
    │   │   └── rewriteExplanation.ts  # `pnpm author rewrite-explanation <id>`
    │   ├── claude/
    │   │   ├── client.ts              # Anthropic SDK wrapper w/ prompt caching
    │   │   ├── prompts/
    │   │   │   ├── draft-flashcard.ts
    │   │   │   ├── draft-mcq.ts
    │   │   │   ├── draft-code-review.ts
    │   │   │   └── rewrite-explanation.ts
    │   │   └── parse.ts               # tolerant JSON-array parser
    │   ├── validation/
    │   │   ├── ajv.ts                 # ajv instance + schemas/ loader
    │   │   └── duplicates.ts          # collides-with-existing checker
    │   ├── io/
    │   │   ├── bank.ts                # read seed JSON
    │   │   ├── drafts.ts              # write timestamped drafts/<file>
    │   │   └── seed.ts                # append + atomic write to bank/
    │   ├── log/
    │   │   └── structured.ts          # one-line-JSON logger; redacts key + paths
    │   └── env.ts                     # ANTHROPIC_API_KEY validation
    └── drafts/                        # gitignored
        └── .gitkeep
```

Root `package.json` gets a script: `"author": "tsx tools/author/src/index.ts"`.

## Phases

1. **CLI scaffold + env validation** — commander entry, env-var guard, structured logger that redacts secrets.
2. **Claude client + prompt caching** — wrap the SDK; cache the schema + existing-ids blocks per the claude-api skill guidance.
3. **`draft` command** — prompt assembly, response parse, ajv validation, duplicate check, drafts/ write.
4. **`promote` command** — re-validate, atomic append, reviewer stamping; integrate with feature 001's seed CLI.
5. **`rewrite-explanation` command** — same draft → promote path but only mutates `content.explanation`.
6. **Tests** — unit on validation + parse + duplicate detection + atomic-write rollback; one gated integration test that hits the real API (skipped when `ANTHROPIC_API_KEY` absent).

## Complexity Tracking

This is the lone code path that touches the Anthropic API. It must not leak into production code (SC-005). A repo-wide static check at CI time enforces this.

| Decision | Why |
|---|---|
| Tooling lives in its own workspace under `tools/author/` | Keeps `frontend/` clean and lets the API SDK never reach a browser bundle. |
| Prompt caching for the schema + existing-ids blocks | Per claude-api skill; meaningful cost reduction on iterative draft runs. |
| Drafts gitignored; only seed files committed | Drafts are review artifacts, not source-of-truth. |
