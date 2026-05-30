# Exam Template

Use this folder to **fork the codebase for a new Microsoft certification** — AZ-900, AI-900, AZ-104, DP-203, etc.

The original codebase ships with AI-300 (ML Operations Engineer). Every exam-specific identifier — domain slugs, exam codes, branding copy, question bank — is concentrated in a small number of files that you swap when starting a new exam.

This template gives you:

- **`exams/`** — pre-filled config examples for AZ-900 and AI-900, plus a blank shell to copy.
- **`seed-content/`** — empty JSON stubs for the three question types with header comments documenting the schema.
- **`knowledge/`** — folder structure for raw module material you draft from.
- **`migrations/`** — a template migration that swaps the domain CHECK constraint when domain slugs change.
- **`PORTING_CHECKLIST.md`** — file-by-file list of everything that changes per exam.
- **`MIGRATION_STRATEGY.md`** — the tricky bit: how to change domain slugs cleanly without breaking existing data.

---

## Two ways to use the template

### Option A — Fork the repo per exam (recommended)

One repo, one deployment, one Supabase project per exam. Cleanest. Most exams' content + branding are too different to share a UI.

```
ai-300 repo  →  ai-300.netlify.app, az-103 Supabase project
az-900 repo  →  az-900.netlify.app, az-900 Supabase project
ai-900 repo  →  ai-900.netlify.app, ai-900 Supabase project
```

**Workflow:**

1. `git clone <this repo> az-900` (or fork on GitHub then clone)
2. Walk through [`PORTING_CHECKLIST.md`](./PORTING_CHECKLIST.md)
3. Create a new Supabase project, apply migrations, seed the new bank
4. Create a new Netlify site, point at the new GitHub repo, set env vars
5. Update the public domain (optional)

Each fork keeps its own commit history. PRs against the original AI-300 repo (e.g., shared bug fixes) merge cleanly via cherry-pick if the shared files haven't drifted.

### Option B — Multi-exam single repo (heavier refactor; not yet built)

Same repo serves multiple exams. The user picks an exam at sign-up. The DB has an `exam_id` column on every user-scoped table.

This is doable but it's a real refactor: every page needs exam-aware filtering, every RLS policy needs `(user_id = auth.uid() AND exam_id = ?)`, the question bank needs an `exam_id` column. Roughly 1-2 weeks of work.

If you're going to do multi-exam, do it after the second exam ships (you'll know the shape better).

---

## Quick start (Option A — forking for AZ-900)

```bash
# 1. Clone the repo into a new directory
git clone https://github.com/adaptive-engineering-lab/azure-300 az-900
cd az-900

# 2. Reset the git history (optional but clean)
rm -rf .git
git init
git add .
git commit -m "fork: start AZ-900 from ai-300 base"

# 3. Replace the exam config
cp template/exams/az-900.config.example.json exams.config.json

# 4. Open PORTING_CHECKLIST.md and walk through the file changes

# 5. Empty the existing bank (or keep the AI-300 items if you want a hybrid)
cp template/seed-content/flashcards.json supabase/seed/content/flashcards.json
cp template/seed-content/mcq.json supabase/seed/content/mcq.json
cp template/seed-content/code-review.json supabase/seed/content/code-review.json

# 6. Author the first 5-10 questions for the new exam
#    (either by hand or via the tools/author CLI with an Anthropic key)

# 7. Boot local Supabase, apply migrations, seed
supabase start
supabase db reset
pnpm -C tools seed

# 8. Run the frontend and verify
pnpm -C frontend dev
```

Then deploy:

```bash
# 9. Create a Supabase cloud project (West EU or your region)
# 10. supabase link --project-ref <new-ref>
# 11. supabase db push --linked
# 12. Swap tools/.env.local to the cloud creds, pnpm -C tools seed
# 13. Create Netlify site, set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

---

## What changes per exam

The exam-specific surface is small. In rough order of "must change" → "nice to change":

| Layer | File(s) | What changes |
|---|---|---|
| Taxonomy | `exams.config.json` | Exam code, domains, topics, weights, targets |
| Type union | `frontend/src/lib/questions/types.ts` | `Domain` string-literal union + `DOMAIN_LABELS` |
| DB constraint | `supabase/migrations/00XX_domain_chk.sql` (new) | `questions_domain_chk` CHECK clause |
| Bank content | `supabase/seed/content/*.json` | All questions (this is the biggest task) |
| Branding | `frontend/index.html`, `frontend/vite.config.ts`, `frontend/src/pages/HomePage.tsx`, `README.md` | Exam name, description, hero copy |
| Optional | `frontend/public/icon.svg` | New icon |
| Optional | `netlify.toml` | (No exam-specific content today, but you may add domain config) |

Full list with line-level changes in [`PORTING_CHECKLIST.md`](./PORTING_CHECKLIST.md).

---

## What stays the same

Everything else is exam-agnostic:

- Auth flow (magic link)
- All three study modes (flashcards, MCQ, code-review) — the UIs don't know about specific domains; they take `Domain` from the type system
- Spaced repetition policy
- Progress dashboard math (computeDomainStats reads from whatever domains exist)
- Pro tier (themes, advanced stats, exam countdown) — the countdown widget already takes a configurable date
- PWA + offline shell
- Stripe integration (foundation)
- Authoring tool (works with any exam's content)
- Spec-Kit conventions
- CI / Lighthouse / bundle-budget gates

**The radar chart, focus areas, daily review, and quiz mode** all adapt automatically — they iterate over `DOMAINS` from the type file.

---

## What if my exam doesn't have code snippets?

Some exams (AZ-900 fundamentals, AI-900 fundamentals) have very little code. You have two options:

1. **Skip Code Review mode entirely** — set `gameModes.codeReview: false` in `exams.config.json`. The Learn index hides the mode card; the route still resolves (the placeholder page handles it).
2. **Keep Code Review for the rare YAML/config snippets** — author 5-10 items that are still on-topic (e.g., reading an Azure Policy JSON for AZ-900) and let the mode be a low-volume drill.

For most fundamentals exams, option 1 is right.

---

## What if my exam has different question types?

E.g., AZ-104 has drag-and-drop ordering questions; some exams have hot-area image questions. The shipped types are **flashcard / mcq / code-review**. To add a new type:

1. Create a new schema in `supabase/seed/content/<type>.schema.json` (or the spec dir).
2. Add the JSONB shape branch to `questions_content_shape_chk` in a new migration.
3. Add the type to the `Question` discriminated union in `frontend/src/lib/questions/types.ts`.
4. Create a new mode page + session page in `frontend/src/pages/`.
5. Add a route in `App.tsx`.
6. Add a mode entry in `LearnIndexPage.tsx`.
7. Add the type to `tools/seed/lib/schemas.ts`.

Roughly the same shape as how Code Review was added in spec 006.

---

## A note on shared content

If you ever want to share content across forks (e.g., "Azure fundamentals" topics that overlap AZ-900 and AI-900), the cleanest pattern is:

- Each fork's `supabase/seed/content/` is the **authoritative** content.
- A `template/shared-content/` directory in this repo (you'd add it) holds reusable items by domain.
- A pre-seed step in each fork's `tools/seed/lib/load-content.ts` merges the shared items into the per-fork content.

Not implemented; sketch only.
