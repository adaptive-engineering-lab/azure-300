# AI-300 Study

A mobile-first study app for the **Microsoft Certified: Machine Learning Operations Engineer Associate** exam (Exam AI-300). Flashcards, multiple-choice quizzes, and code-review drills across all five exam domains, with spaced repetition, a daily review queue, progress dashboards, and a cosmetic Pro tier — built as a Progressive Web App that works offline once installed.

Live: [tranquil-eclair-165309.netlify.app](https://tranquil-eclair-165309.netlify.app/)

---

## Contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Repository layout](#repository-layout)
5. [Data model](#data-model)
6. [Frontend](#frontend)
7. [User flows](#user-flows)
8. [Study modes](#study-modes)
9. [Spaced repetition](#spaced-repetition)
10. [Question bank](#question-bank)
11. [Progress dashboard](#progress-dashboard)
12. [Pro tier (cosmetic)](#pro-tier-cosmetic)
13. [PWA + offline](#pwa--offline)
14. [Theme system](#theme-system)
15. [Auth](#auth)
16. [Stripe integration](#stripe-integration)
17. [Authoring tool](#authoring-tool)
18. [Spec-Kit conventions](#spec-kit-conventions)
19. [Development workflow](#development-workflow)
20. [Deployment](#deployment)
21. [Environment variables](#environment-variables)
22. [Roadmap & known gaps](#roadmap--known-gaps)
23. [License](#license)

---

## What it does

A learner opens the site, picks a study mode, and starts answering questions. Their answers feed into a spaced-repetition system that decides when to surface each question again. A streak rewards daily play; a progress dashboard shows accuracy by domain, time per session, and which areas to focus on. They can play entirely as a guest (data stays in browser storage) or sign in to sync across devices.

Three study modes share one question bank:

- **Flashcards** — self-rated recall (got it / almost / missed).
- **Quiz** — four-option multiple choice with optional 45-second exam timer.
- **Code Review** — short Python / YAML snippets (8–20 lines) with three sub-modes: find-the-bug, what-does-this-do, fill-the-blank.

A fourth surface, **Daily Review**, pulls items that spaced repetition has scheduled for today and dispatches each one to the matching study UI. One session, multiple modes, one click from the home screen.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Standard, hireable, type safety |
| Build tool | Vite 5 | Fast HMR, small bundle defaults |
| Router | React Router v6 | Lazy-loaded routes, splat fallback for SPA on Netlify |
| State | Zustand + `persist` middleware | Tiny, lazy localStorage hydration, cross-tab sync via `storage` event |
| Styling | Tailwind CSS + CSS custom properties | Dark/light/Pro themes via `:root` token swap |
| Code highlighting | Shiki (fine-grained bundle) | Syntax highlighting on Code Review snippets; ~85KB gzip for python + yaml + bash + two themes |
| PWA | `vite-plugin-pwa` + Workbox | Service worker, install prompt, offline shell cache |
| Backend | Supabase (Postgres + Auth + Edge Functions) | Schema, RLS, magic-link auth, future Stripe webhooks |
| Hosting | Netlify | SPA redirects via `netlify.toml`, env-var injection at build, PR previews |
| Billing | Stripe (Checkout + Customer Portal) | Foundation merged; not yet activated |
| Authoring (maintainer-side) | Anthropic Claude SDK + Ajv | Draft → validate → promote into seed JSON |

---

## Architecture

```
┌───────────────────────────────────────┐
│                Browser                │
│  ┌────────────────────────────────┐   │
│  │  React app (Vite bundle, PWA)  │   │
│  │  ├─ Zustand store (persist)    │   │
│  │  ├─ Supabase JS client (anon)  │   │
│  │  └─ Service Worker (Workbox)   │   │
│  └────────────────────────────────┘   │
└─────────────┬─────────────────────────┘
              │  HTTPS (REST/Realtime)
              ▼
┌───────────────────────────────────────┐
│           Supabase project            │
│  ┌────────────────────────────────┐   │
│  │  Postgres + RLS                │   │
│  │  ├─ questions    (anon read)   │   │
│  │  ├─ profiles     (self read)   │   │
│  │  ├─ user_progress (self CRUD)  │   │
│  │  ├─ sessions     (self CRUD)   │   │
│  │  ├─ subscriptions (self read)  │   │
│  │  ├─ admins       (gate writes) │   │
│  │  └─ webhook_events (svc only)  │   │
│  ├─ Triggers                      │   │
│  │  ├─ handle_new_user → profile  │   │
│  │  └─ profile_inserted → sub     │   │
│  ├─ RPCs                          │   │
│  │  ├─ seed_upsert_questions      │   │
│  │  └─ delete_self_account        │   │
│  └─ Edge Functions (Deno)         │   │
│     ├─ stripe-webhook             │   │
│     ├─ create-checkout-session    │   │
│     └─ create-portal-session      │   │
└───────────────────────────────────────┘
              ▲
              │  Webhooks
              │
       ┌──────┴───────┐
       │    Stripe    │
       │ (foundation  │
       │  merged, not │
       │  deployed)   │
       └──────────────┘

Hosting:
  Frontend → Netlify (SPA fallback in netlify.toml,
                      cache-immutable on /assets/*,
                      no-cache on index.html + sw.js)
  Backend  → Supabase project az-103 (West EU, Ireland)
```

**Key principle: no proprietary middleware.** The frontend talks to Supabase directly via the anon key and RLS. The service-role key never leaves the maintainer's machine (or the Edge Function runtime). There is no Node API server.

---

## Repository layout

```
.
├── frontend/                   # The React app
│   ├── public/                 # Static assets (icon.svg, PWA manifest extras)
│   ├── src/
│   │   ├── App.tsx             # Router + provider tree + cross-tab sync
│   │   ├── main.tsx            # ReactDOM entry
│   │   ├── components/         # Reusable UI (RadarChart, ProBadge, etc.)
│   │   ├── pages/              # One per route (HomePage, FlashcardSessionPage…)
│   │   ├── lib/
│   │   │   ├── auth/           # Supabase Auth provider + migration helper
│   │   │   ├── billing/        # Stripe checkout/portal helpers
│   │   │   ├── dashboard/      # Stat aggregation (computeDomainStats, etc.)
│   │   │   ├── questions/      # Bank fetch + difficulty-aware picker + types
│   │   │   ├── store/          # Zustand store (preferences, progress, sessions, profile)
│   │   │   ├── storage/        # Namespace, adapter, schema-version migration
│   │   │   ├── theme/          # ThemeProvider (dark/light/solar/forest)
│   │   │   ├── entitlement.ts  # useEntitlement hook (Pro / Free)
│   │   │   ├── routes.ts       # ROUTES enum (single source of paths)
│   │   │   ├── spacing.ts      # computeNextReview (SM-2-lite)
│   │   │   └── supabase.ts     # Singleton supabase JS client
│   │   ├── styles/             # globals.css + Tailwind config
│   │   └── index.css           # Token CSS variables for the 4 themes
│   ├── tests/                  # Vitest unit + component tests
│   ├── index.html              # No-FOUC inline script + Vite mount point
│   ├── package.json
│   └── vite.config.ts          # VitePWA + manualChunks + preview port
│
├── supabase/
│   ├── migrations/             # Numbered SQL migrations 0001 → 0014
│   ├── seed/content/           # The question bank (flashcards.json, mcq.json, code-review.json)
│   ├── functions/              # Deno Edge Functions (stripe-webhook + 2 more)
│   └── config.toml             # supabase init config
│
├── tools/                      # Maintainer-side Node tooling
│   ├── seed/                   # Seed CLI (validate + upsert into questions)
│   ├── author/                 # Claude-assisted authoring CLI (draft + promote)
│   └── test-helpers/           # Shared Supabase clients + test-user factory
│
├── tests/                      # Data-layer integration + contract tests (Vitest)
│   ├── contract/               # Schema validation, idempotency, partial-failure rollback
│   └── integration/            # RLS isolation, profile trigger, admin RLS
│
├── specs/                      # Spec-Kit feature specs (0XX-name/)
│   └── 001-supabase-schema-and-seed/  # plan.md, spec.md, tasks.md, contracts/
│
├── exams.config.json           # AI-300 domain/topic taxonomy + question targets
├── netlify.toml                # Production deploy config + SPA fallback
├── .lighthouserc.json          # PR-gated Lighthouse audit config
├── .github/workflows/          # data-layer.yml + lighthouse.yml
└── package.json                # Root pnpm workspace
```

---

## Data model

Seven tables, all RLS-enforced. The service role bypasses RLS for maintainer operations (seeding, webhook writes).

### `public.questions`

The shared bank. Public read-only via the anon key.

```sql
id            uuid     primary key
type          text     check in ('flashcard', 'mcq', 'code-review')
domain        text     check in (5 AI-300 domain slugs)
topic         text
difficulty    smallint check in (1, 2, 3)
source        text     check in ('bank', 'ai-generated')
reviewer_id   text     -- required when source = 'ai-generated'
reviewed_at   timestamptz
content       jsonb    -- shape depends on type (see below)
content_hash  text     -- sha256 of canonicalized content; powers idempotent seed
tags          text[]
```

CHECK constraint `questions_content_shape_chk` validates JSONB shape per type:
- `flashcard.content` → `{ front, back }`
- `mcq.content` → `{ question, options: {A,B,C,D}, correct, explanation }`
- `code-review.content` → `{ sub_mode, language, snippet, prompt, options: {A,B,C,D}, correct, explanation }`

RLS policy: `questions_public_read` grants `SELECT` to `anon, authenticated`. No `INSERT/UPDATE/DELETE` policies — writes are gated to admins via [migration 0011](supabase/migrations/0011_questions_admin_rls.sql).

### `public.profiles`

One row per authenticated user. Auto-created by trigger.

```sql
id             uuid     primary key references auth.users(id) ON DELETE CASCADE
display_name   text     default ''
streak_days    int      default 0
last_active    date
level          smallint default 1 check in (1..4)
```

RLS: self-read + self-update. No insert (trigger handles it). No delete (cascade from `auth.users`).

### `public.user_progress`

Per-question rating state. One row per (user, question).

```sql
user_id       uuid       references profiles(id) ON DELETE CASCADE
question_id   uuid       references questions(id) ON DELETE CASCADE
times_seen    int
times_correct int
last_rating   text       check in ('correct', 'almost', 'missed')
next_review   date       -- SM-2-lite output
updated_at    timestamptz
PRIMARY KEY (user_id, question_id)
```

RLS: self CRUD. Partial index on `(user_id, next_review)` for the daily-review query.

### `public.sessions`

One row per completed study session.

```sql
id               uuid PK default gen_random_uuid()
user_id          uuid references profiles(id) ON DELETE CASCADE
mode             text check in ('flashcard', 'mcq', 'code-review', 'daily-review')
topic            text                  -- optional, may be domain slug
score_pct        smallint check 0..100
duration_seconds int
completed_at     timestamptz default now()
```

RLS: self CRUD. Index on `(user_id, completed_at DESC)` for the recent-sessions query.

### `public.subscriptions`

Stripe entitlement mirror. One row per authenticated user, auto-created at `plan='free'`.

```sql
user_id                uuid PK references profiles(id) ON DELETE CASCADE
plan                   enum ('free', 'pro') default 'free'
status                 enum (...)            default 'active'
current_period_end     timestamptz
stripe_customer_id     text
stripe_subscription_id text
updated_at             timestamptz default now()
```

RLS: self-read only. Writes are service-role only (the stripe-webhook function writes; users never write directly).

### `public.admins`

Single column: `user_id uuid PK references auth.users(id)`. Admins can write to `public.questions` (via [migration 0011](supabase/migrations/0011_questions_admin_rls.sql)). Promoting a user happens manually via service-role SQL.

### `public.webhook_events`

Stripe event idempotency log. `(id text PK, type, payload jsonb, received_at)`. No RLS policies → service-role only.

### Triggers

- **`handle_new_user`** ([0008](supabase/migrations/0008_profile_trigger.sql)) — on `INSERT` to `auth.users`, creates the matching `profiles` row. SECURITY DEFINER.
- **`handle_new_user_subscription`** ([0009](supabase/migrations/0009_subscriptions.sql)) — on `INSERT` to `profiles`, creates the matching `subscriptions` row with `plan='free'`.

### RPCs

- **`seed_upsert_questions(items jsonb)`** ([0003](supabase/migrations/0003_seed_function.sql)) — service-role only; idempotent upsert with content-hash short-circuit. Returns `{inserted, updated, unchanged}` counts.
- **`delete_self_account()`** ([0013](supabase/migrations/0013_delete_self_account.sql)) — authenticated only; deletes `auth.users` where `id = auth.uid()`. Cascade FKs remove every row in `profiles`, `user_progress`, `sessions`, `subscriptions`, `admins`.

### Migrations

All migrations are forward-only and applied via `supabase db push --linked`. Numbered chronologically:

| File | Purpose |
|---|---|
| `0001_questions.sql` | Questions table + CHECK constraints + indexes |
| `0002_questions_rls.sql` | Anon-read policy |
| `0003_seed_function.sql` | seed_upsert_questions RPC |
| `0004_profiles.sql` | Profiles table |
| `0005_user_progress.sql` | Progress table + partial index |
| `0006_sessions.sql` | Sessions table + index |
| `0007_user_tables_rls.sql` | Self-CRUD policies on profiles/progress/sessions |
| `0008_profile_trigger.sql` | Auto-create profile on auth user insert |
| `0009_subscriptions.sql` | Subscriptions table + auto-create trigger |
| `0010_admins.sql` | Admins gate table |
| `0011_questions_admin_rls.sql` | Admin write policies on questions |
| `0012_revoke_trigger_rpc_execute.sql` | Lock down trigger functions |
| `0013_delete_self_account.sql` | Self-deletion RPC |
| `0014_webhook_events.sql` | Stripe idempotency log |

---

## Frontend

### State management

A single Zustand store ([`lib/store/index.ts`](frontend/src/lib/store/index.ts)) holds:

- **`preferences`** — theme, default session length, default starting mode, reduced motion preference, exam date.
- **`profile`** — streak_days, xp, level, lastActive. Bumped by `bumpStreakIfDue` and `addXp`.
- **`progress`** — `Record<questionId, { timesSeen, timesCorrect, lastRating, nextReview, updatedAt }>`.
- **`sessions`** — array of recent session summaries (capped at 500).

The store uses `zustand/middleware`'s `persist` adapter to write to `localStorage` under the key `ai300game.v1.state`. A schema-version migration runs on hydration ([`lib/storage/migrate.ts`](frontend/src/lib/storage/migrate.ts)) so old shapes never crash a returning user.

Cross-tab sync: [`App.tsx`](frontend/src/App.tsx) attaches a `window.addEventListener('storage', ...)` listener that calls `useAppStore.persist.rehydrate()` when another tab writes the same state key. Effect: complete a session in tab A, see the streak / XP update in tab B within one event loop.

### Routing

[`App.tsx`](frontend/src/App.tsx) defines a `createBrowserRouter` tree with lazy-loaded pages. Every route lives behind `<Suspense fallback={...}>`. Route paths live in [`lib/routes.ts`](frontend/src/lib/routes.ts) so there is one source of truth.

| Path | Page |
|---|---|
| `/` | Home (streak/XP badges + Daily Review hero + CTAs) |
| `/learn` | Mode selector |
| `/learn/flashcards` + `/session` | Flashcard mode |
| `/learn/quiz` + `/session` | MCQ mode |
| `/learn/code-review` + `/session` | Code Review mode |
| `/learn/daily-review` | Daily Review (dispatcher across all three modes) |
| `/progress` | Dashboard (streak, accuracy, radar, focus areas, activity calendar) |
| `/settings` | Theme, session length, motion, exam date, account, billing link |
| `/settings/billing` | Plan view + Upgrade/Manage buttons |
| `/whats-in-pro` | Pro discovery |
| `/legal/privacy` | Privacy Policy |
| `/legal/terms` | Terms of Service |
| `/sign-in` | Magic-link email entry |
| `/auth/callback` | Token exchange after email click |
| `/admin` | Admin question editor (gated on `admins` membership) |

### Bundle splitting

`vite.config.ts` extracts `react-vendor` into its own chunk. Pages lazy-load via dynamic `import()`. The shiki highlighter uses the **fine-grained bundle** (`shiki/core` + JS regex engine + explicit language/theme imports) so only python + yaml + bash + github-dark/light are pulled, ~85KB gzip total instead of shiki's default 600KB.

---

## User flows

### Guest play

1. Visit `/`, see the home page, tap **Start studying**.
2. Pick a mode and start a session — no sign-up required.
3. Every answer writes to the Zustand store (localStorage).
4. The progress dashboard at `/progress` renders entirely from localStorage.

No network calls beyond the initial bank fetch from Supabase. The anon key permits reading `public.questions`; nothing user-specific is persisted server-side.

### Sign up

1. Visit `/sign-in`, enter email, submit.
2. `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ... }})` sends a magic link.
3. Click the link → land on `/auth/callback` → token exchange + redirect home.
4. Supabase Auth creates `auth.users` row → trigger creates `profiles` row → trigger creates `subscriptions` row at `plan='free'`.

The whole sign-up is one round trip. No password, no email confirmation step beyond the magic link itself.

### Guest → authed migration

When a guest signs in, [`AuthProvider`](frontend/src/lib/auth/AuthProvider.tsx) detects the transition and calls [`migrateGuestToAuth`](frontend/src/lib/auth/migrateGuestToAuth.ts). The migration:

1. Reads the local `progress` and `sessions` from Zustand.
2. Uploads them in bulk via the user JWT (RLS scopes them to the new `user_id`).
3. Calls `hydrateFromServer` to merge any pre-existing rows from a previous session.
4. **Does not run mid-session** — the migration is queued and runs at the next session boundary so a sign-in mid-flashcard doesn't lose the current run.

### Study session lifecycle

The pattern is consistent across all three modes:

1. **Select page** (`/learn/<mode>`) gathers topic/difficulty/count/timer/etc. from the user.
2. On Start, navigate to `/learn/<mode>/session?<params>`.
3. **Session page** mounts:
   - Fetch matching questions via [`fetchQuestions`](frontend/src/lib/questions/fetch.ts).
   - Filter + sample via [`pickWithDifficultyPreference`](frontend/src/lib/questions/pick.ts) (soft difficulty preference; spills to adjacent levels if a cell is thin).
   - Drive a reducer through `idle → answering → revealed → finished`.
4. **On each answer**:
   - Update local state (chosen, correct/wrong, elapsed).
   - Call `useAppStore.recordRating({ questionId, rating, nextReview })`.
   - `nextReview` is computed by [`computeNextReview`](frontend/src/lib/spacing.ts) (SM-2-lite).
5. **On session end**:
   - Compute score % + duration.
   - `useAppStore.recordSession({ mode, topic, scorePct, durationSeconds })`.
   - `addXp(...)` + `bumpStreakIfDue()`.
   - Render the results screen.

Authenticated users see the same flow; the Zustand store + `AuthProvider` push the new rows to Supabase asynchronously.

### Pro upgrade

(Foundation merged, not yet activated — see [Stripe integration](#stripe-integration).)

1. `/settings/billing` shows current plan. Free user sees an **Upgrade to Pro** button.
2. [`startCheckout()`](frontend/src/lib/billing/checkout.ts) calls the `create-checkout-session` Edge Function with the user's JWT.
3. The Edge Function resolves (or creates) a Stripe Customer, opens a Checkout Session for the configured price, returns `{ url }`.
4. Browser redirects to Stripe Checkout.
5. After payment, Stripe webhooks the `stripe-webhook` Edge Function (`checkout.session.completed`), which upserts `subscriptions.plan='pro'`.
6. Stripe redirects the user back to `/settings/billing?status=success` — the page reads the entitlement and unlocks the Pro UI.

### Pro cancel

1. Pro user clicks **Manage subscription** → [`openCustomerPortal()`](frontend/src/lib/billing/checkout.ts) → `create-portal-session` Edge Function → redirect to Stripe Customer Portal.
2. Cancel → Stripe sends `customer.subscription.updated` with `cancel_at_period_end=true`.
3. The webhook updates `current_period_end`; the UI shows "Expires on YYYY-MM-DD" but Pro features stay on until that date.
4. After the period ends, `customer.subscription.deleted` flips `plan` back to `'free'`.

---

## Study modes

### Flashcards

- Front of card shown, tap to flip.
- Three rating buttons: **Got it** / **Almost** / **Missed**.
- Optional Framer Motion flip animation (auto-disabled if `prefers-reduced-motion: reduce`).
- Score % at end = `correct / total`.

Implementation: [`FlashcardSessionPage.tsx`](frontend/src/pages/FlashcardSessionPage.tsx). Card order comes from `sequenceForSession` which interleaves due cards (from spaced repetition) ahead of fresh ones.

### Quiz (MCQ)

- Question + four options (A/B/C/D).
- Optional 45-second timer per question (off by default). On expiry → marked incorrect + reveal explanation + advance.
- Reveal shows correct option in green, chosen-wrong option in red, plus the per-question explanation.
- Keyboard: A/B/C/D selects, Space/Enter advances.
- Results screen renders a domain breakdown table + a **Review missed** CTA when any domain scored below 60%.

Implementation: [`QuizSessionPage.tsx`](frontend/src/pages/QuizSessionPage.tsx). `computeDomainBreakdown(answers)` aggregates per-domain accuracy and flags weak domains.

### Code Review

- Renders a Python / YAML / Bash snippet (8–20 lines) with syntax highlighting via shiki.
- One of three sub-modes:
  - **Find the bug** — snippet has exactly one deliberate flaw; pick which option describes it.
  - **What does this do?** — snippet is correct; pick what it does.
  - **Fill the blank** — snippet contains `___BLANK___`; pick the correct value. On reveal, the placeholder swaps to the correct option's text rendered inline with the rest of the snippet.
- Same feedback + explanation pattern as Quiz.
- Results screen surfaces the missed snippets with chosen-wrong vs correct comparison.

Implementation: [`CodeReviewSessionPage.tsx`](frontend/src/pages/CodeReviewSessionPage.tsx) + [`SnippetView.tsx`](frontend/src/components/SnippetView.tsx). The session page also persists a 24-hour resume snapshot to localStorage so a reload mid-session restores the same item.

### Daily Review

The home page shows a "Daily review" CTA when any due items exist. Tapping it opens [`DailyReviewPage.tsx`](frontend/src/pages/DailyReviewPage.tsx) which:

1. Reads due items via `findDueQuestionIds(progress)`.
2. Caps at `DAILY_REVIEW_CAP = 30` per session.
3. Fetches the matching question rows.
4. Dispatches each item to the right inline component (`FlashcardCard`, `McqCard`, or `CodeReviewCard`) based on `type`.
5. Records a `sessions` row with `mode='daily-review'` on completion.

If there are more than 30 due, an opt-in **Review more** button on the results screen runs another batch — but with the "no streak XP bonus" flag so the cap can't be gamed for streak bumps.

---

## Spaced repetition

A simplified SM-2 ("SM-2-lite") implemented in [`lib/spacing.ts`](frontend/src/lib/spacing.ts):

```
correct → next = today + 3 * 2^(priorTimesCorrect)   days   // 3, 6, 12, 24, ...
almost  → next = today + 1 day
missed  → next = today + 1 day                           // streak resets
```

The function returns an ISO date (YYYY-MM-DD), local-day-bucketed so an answer at 23:55 UTC doesn't get scheduled differently from one at 00:05 the next day.

Due-list query: [`findDueQuestionIds`](frontend/src/lib/dashboard/due.ts) returns items whose `nextReview <= today`, ordered by date.

All three study modes call `computeNextReview` after every answer — there's one canonical scheduling policy, not per-mode variants.

---

## Question bank

### Schemas

Three JSON Schemas in [`specs/001-supabase-schema-and-seed/contracts/`](specs/001-supabase-schema-and-seed/contracts/):

- `flashcard.schema.json` — `{ front (≤280 chars), back (≤800 chars) }`
- `mcq.schema.json` — `{ question, options: {A,B,C,D}, correct: A|B|C|D, explanation }`
- `code-review.schema.json` — `{ sub_mode, language, snippet (≤2000 chars), prompt (≤200), options, correct, explanation }`

The seed CLI validates every item against its schema with Ajv before any write. Any single failure aborts the batch — no partial writes.

### Source of truth

The bank lives as three JSON files under [`supabase/seed/content/`](supabase/seed/content/):

```
supabase/seed/content/
├── flashcards.json   (45 items)
├── mcq.json          (75 items)
└── code-review.json  (30 items)
```

150 items total. Target per AI-300 exam weight is 200 (see `exams.config.json`); the remaining 50 will land as the bank matures.

Every item declares:

```json
{
  "id": "<uuid>",
  "type": "flashcard|mcq|code-review",
  "domain": "<one of 5 AI-300 domain slugs>",
  "topic": "<topic from exams.config.json>",
  "difficulty": 1|2|3,
  "source": "bank" | "ai-generated",
  "tags": [...],
  "content": { ... }
}
```

`source: "ai-generated"` items must also carry `reviewer_id` and `reviewed_at` — a CHECK constraint enforces this at the database.

### Domains

```
mlops-infra        — Workspace, IAM, Compute, Datastores, IaC, GitHub Integration, ...
ml-lifecycle       — MLflow, AutoML, Pipelines, Endpoints, Monitoring, ...
genaiops-infra     — Foundry Setup, RBAC, Network Security, Prompt Flow, ...
genai-quality      — Evaluators, Tracing, Safety, Continuous Monitoring, ...
genai-optimization — RAG, Embeddings, Fine-tuning, A/B Testing, ...
```

Full taxonomy in [`exams.config.json`](exams.config.json).

### Seeding workflow

```bash
# 1. Validate every item against its schema
pnpm -C tools seed:validate
# → "Validation complete: 150 items OK."

# 2. Upsert into Postgres via the seed_upsert_questions RPC
pnpm -C tools seed
# → "Seed complete: 50 inserted, 0 updated, 100 unchanged. Elapsed: 805ms."
```

The RPC is idempotent: items whose `content_hash` matches what's already in the DB are reported as `unchanged` and not touched, so `updated_at` doesn't drift on no-op re-runs.

### Content lifecycle

```
authoring (humans + Claude) → JSON files (PR review) → seed CLI → public.questions
                                                                      ↓
                                                            anon read by frontend
```

`source='bank'` items are curated by humans; `source='ai-generated'` items are drafted by Claude via the authoring tool and then reviewed by a human (the `reviewer_id` field) before promotion.

---

## Progress dashboard

[`ProgressPage.tsx`](frontend/src/pages/ProgressPage.tsx) aggregates the local Zustand state and renders:

- **Headline tiles** — Streak (days), XP, Level, overall Accuracy %.
- **Most recent session** — mode + score + relative time ("3 min ago", "yesterday", date).
- **Domain radar** — hand-rolled SVG five-axis radar from [`RadarChart.tsx`](frontend/src/components/RadarChart.tsx). Domains with fewer than `MIN_ANSWERS = 5` answers render dimmed with a dashed axis (the "not enough data yet" state, per FR-016).
- **Focus areas** — list of domains scoring strictly below 60% with a **Practice** CTA → `/learn/quiz?domain=<slug>` pre-populated.
- **Advanced Stats panel** (Pro) — per-difficulty accuracy + average session length. Locked preview for free users.
- **Activity calendar** — 12-week grid of session counts ([`StreakCalendar.tsx`](frontend/src/components/StreakCalendar.tsx)).

The dashboard is fully reactive: any session completion in any tab updates the radar within one storage event.

---

## Pro tier (cosmetic)

Pro is **never about study content**. Every question, every domain, every mode is free for guests too. Pro pays for quality-of-life polish:

1. **Two extra themes** — Solar (warm amber on navy) and Forest (greens on moss). Free users see them as locked buttons in `/settings`.
2. **Advanced Stats panel** on `/progress` — per-difficulty accuracy + avg session length.
3. **Exam countdown widget** on the home aside — set a date in `/settings`, see "23 days until exam" pinned everywhere. Switches to warning tone in the final two weeks.

Entitlement flows through [`useEntitlement`](frontend/src/lib/entitlement.ts) — reads the user's `subscriptions` row, polls every 5 minutes as a safety net, exposes `{ isPro, status, currentPeriodEnd }`.

When `isPro=false`, every Pro surface either hides or shows a locked preview with a `<ProBadge>` linking to `/whats-in-pro`. There are exactly two ways to trigger an upgrade: the Billing page and the discovery page. No dark patterns, no banners on study screens.

---

## PWA + offline

Powered by `vite-plugin-pwa` (configured in [`vite.config.ts`](frontend/vite.config.ts)):

- **Manifest** — name, short_name, description, theme_color, background_color, single SVG icon (`purpose: any maskable`).
- **Service worker** — generated on every build with workbox; `registerType: 'autoUpdate'` (the SW updates itself on the next route change).
- **Runtime caching** — `StaleWhileRevalidate` on the Supabase `/rest/v1/questions*` path; the bank is browseable offline once the user has loaded it once.
- **Offline indicator** — [`OfflineIndicator.tsx`](frontend/src/components/OfflineIndicator.tsx) listens to `online`/`offline` window events and renders a small banner when offline.

The cached shell + the bank cache mean a user can complete a flashcard session entirely offline. Authenticated writes (sessions, ratings) accumulate in the persisted store and re-sync when the connection returns.

---

## Theme system

Four themes, declared as `:root` blocks in [`index.css`](frontend/src/index.css) using HSL custom properties:

```css
:root { /* light defaults */ ... }
html.dark   { ... }
html.solar  { ... }
html.forest { ... }
```

[`ThemeProvider.tsx`](frontend/src/lib/theme/ThemeProvider.tsx) reads the user's `preferences.theme` from the store and applies the matching class on `<html>`. A no-FOUC inline script in [`index.html`](frontend/index.html) reads the persisted preference and applies the class before React mounts.

If a Pro user's entitlement lapses while Solar or Forest is active, the provider transparently downgrades to `dark` on the next render.

---

## Auth

Supabase Auth, magic-link email only (no password).

- Sign-in page at `/sign-in` calls `signInWithOtp({ email, options: { emailRedirectTo: '<origin>/auth/callback' } })`.
- The redirect URL `https://tranquil-eclair-165309.netlify.app/auth/callback` is on Supabase's allow list (Project Settings → Authentication → URL Configuration).
- After clicking the link, the user lands on `/auth/callback`, which calls `supabase.auth.exchangeCodeForSession(...)`, persists the session in localStorage, and redirects home.
- [`AuthProvider`](frontend/src/lib/auth/AuthProvider.tsx) wraps the app, exposes `{ user, status, signOut }`, and triggers the guest→authed migration on transitions.

The session is refreshed automatically by the Supabase JS client. Sign-out clears both the auth session and the local store (via `reset()`).

Account deletion goes through [`delete_self_account()`](supabase/migrations/0013_delete_self_account.sql), a SECURITY DEFINER RPC that removes the row from `auth.users`. Cascade FKs handle the rest.

---

## Stripe integration

The foundation is merged and verified locally; **going live requires operator steps** documented in [`supabase/functions/README.md`](supabase/functions/README.md).

### What's in the code

- **`supabase/migrations/0009_subscriptions.sql`** — entitlement mirror table + auto-create trigger.
- **`supabase/migrations/0014_webhook_events.sql`** — webhook idempotency log.
- **`supabase/functions/stripe-webhook/`** — verifies Stripe signature, dedupes by `event.id`, maps `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` into `subscriptions` updates.
- **`supabase/functions/create-checkout-session/`** — authenticated; resolves or creates the Stripe Customer, opens a Subscription Checkout Session, returns `{ url }`.
- **`supabase/functions/create-portal-session/`** — authenticated; opens a Customer Portal session.
- **`frontend/src/lib/billing/checkout.ts`** — `startCheckout()` + `openCustomerPortal()` browser-side helpers that invoke the Edge Functions.

### What's left for the operator

1. Create a Stripe account; create a Product with a recurring Price.
2. Set Supabase project secrets:
   ```
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_test_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     STRIPE_PRICE_ID=price_... \
     APP_URL=https://tranquil-eclair-165309.netlify.app
   ```
3. Deploy the Edge Functions:
   ```
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   ```
4. Register the webhook in Stripe Dashboard at `https://<project>.supabase.co/functions/v1/stripe-webhook` for the four events above.

Until those four steps happen, the **Upgrade to Pro** button on `/settings/billing` will return an error from the Edge Function. The rest of the app (free tier) works regardless.

---

## Authoring tool

[`tools/author/`](tools/author/) is a maintainer-only CLI that drafts new bank items using Claude.

```bash
ANTHROPIC_API_KEY=sk-ant-... \
pnpm -C tools/author cli draft \
  --type=mcq --domain=ml-lifecycle --topic=MLflow \
  --difficulty=2 --count=10
# → writes tools/author/drafts/2026-05-19-mcq-mlflow.json

# Review the file by hand, delete items you don't like, then:
pnpm -C tools/author cli promote tools/author/drafts/<file>.json --reviewer=la
# → appends the items to supabase/seed/content/<type>.json
# → stamps each with source='ai-generated', reviewer_id='la', reviewed_at=now()
```

The CLI:
- Loads the JSON Schema for the requested type.
- Loads the existing item IDs so Claude can avoid duplicates.
- Optionally inlines markdown source files (`--source-files=docs/foo.md,docs/bar.md`) as the only authoritative facts.
- Validates every drafted item against the schema; rejects on any failure.
- Writes the survivors to `tools/author/drafts/<date>-<type>-<topic>.json` (gitignored).

The frontend never imports anything from `tools/author/` — the CLI's only output is the JSON files. There is no live API call from the browser to Claude.

---

## Spec-Kit conventions

Features are specified before they're written. Every numbered feature has a directory under [`specs/`](specs/):

```
specs/00X-<feature-name>/
├── spec.md       # user-facing spec (what + why)
├── plan.md       # implementation plan (how)
├── tasks.md      # checklist of executable tasks (T001, T002, ...)
├── contracts/    # JSON Schemas, API contracts (when applicable)
└── checklists/   # requirements traceability
```

13 specs landed for the AI-300 fork (001 through 013, plus 011-pro-surfaces). Most `tasks.md` files end with a `STATUS YYYY-MM-DD` section documenting which tasks landed in compact form versus the original per-file breakdown — useful for understanding intent vs reality.

The `/speckit-*` slash commands (`/speckit-tasks`, `/speckit-implement`, `/speckit-analyze`) are how this codebase was driven from specs to code.

---

## Development workflow

### Prerequisites

- Node 22 (the `package.json` `engines` field pins it).
- pnpm 10 (`corepack enable` is enough).
- Supabase CLI (`brew install supabase/tap/supabase` or equivalent).
- Docker (Supabase CLI needs it for the local stack).

### One-time setup

```bash
git clone <this repo>
cd ai-300

# Frontend deps
pnpm -C frontend install

# Tools deps (seed, author, test-helpers)
pnpm -C tools install

# Boot local Supabase stack (Postgres + Auth + REST + Studio)
supabase start
# → prints local URLs + anon + service-role keys

# Copy the printed keys into the env files:
cp tools/.env.example tools/.env.local
cp frontend/.env.example frontend/.env.local
# Then paste SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY

# Apply migrations + seed the bank
supabase db reset    # runs every migration from scratch
pnpm -C tools seed   # seeds the 150-item bank
```

### Running the app locally

```bash
pnpm -C frontend dev
# → http://localhost:5173
```

### Running tests

```bash
# Frontend unit + component tests
pnpm -C frontend test
# → ~74 tests across 17 files

# Data-layer integration + contract tests
# (requires local Supabase stack + seeded bank)
pnpm -C tools test
# → ~68 tests across 13 files

# Type check
pnpm -C frontend exec tsc --noEmit
```

### Re-seeding after content edits

```bash
# 1. Validate the JSON files against the schemas
pnpm -C tools seed:validate

# 2. Upsert into the local DB (idempotent)
pnpm -C tools seed
```

### Working with the cloud (az-103)

```bash
supabase link --project-ref shyyxwcbigqkbzkpcrrf
supabase db push --linked --include-all    # apply migrations to cloud
# For seeding the cloud, temporarily swap tools/.env.local to point at
# the cloud URL + secret, run pnpm -C tools seed, then swap back.
```

---

## Deployment

### Netlify (frontend)

Production site lives at the Netlify default URL. Build config in [`netlify.toml`](netlify.toml):

```toml
[build]
  base    = "frontend"
  command = "corepack enable && pnpm install --frozen-lockfile && pnpm build"
  publish = "dist"
```

SPA fallback redirect (`/*` → `/index.html`, 200) so direct visits to `/learn/flashcards` don't 404. Cache headers: immutable on `/assets/*` (hashed), no-cache on `index.html` and `sw.js` (so the service worker can refresh).

Set these env vars in Netlify (Site Settings → Environment variables):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://shyyxwcbigqkbzkpcrrf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |

Vite bakes `VITE_*` vars into the bundle at **build time**. After changing them, trigger a rebuild (push a commit or click "Trigger deploy").

### Supabase (backend)

az-103 in West EU (Ireland) is the production project. Hosting on the free tier today; migrations applied via the CLI; bank seeded via `pnpm -C tools seed` with the service-role key temporarily swapped into `tools/.env.local`.

Auth provider config (Project Settings → Authentication):

- **Site URL**: `https://tranquil-eclair-165309.netlify.app/`
- **Redirect URLs**: `https://tranquil-eclair-165309.netlify.app/auth/callback` (add `http://localhost:5173/auth/callback` to test the magic-link flow locally).
- **Email provider**: Default (Supabase-hosted). Customize the magic-link email template under Authentication → Email Templates if you want branding.

### CI

Two GitHub Actions workflows in [`.github/workflows/`](.github/workflows/):

- **`data-layer.yml`** — runs `pnpm -C tools test` on PRs touching `supabase/`, `tools/`, or `tests/`.
- **`lighthouse.yml`** — runs Lighthouse + a bundle-size gate ([`scripts/check-bundle-budget.mjs`](scripts/check-bundle-budget.mjs)) on PRs touching `frontend/`. Score floors: Performance ≥ 0.8 (softened from 0.9 to absorb radar-chart LCP flakiness), Accessibility/Best Practices/SEO ≥ 0.9.

Branch protection on `main` should require both checks before merging. (One-time setup in GitHub repo Settings → Branches.)

---

## Environment variables

### Frontend (`frontend/.env.local`)

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...      # or eyJ... for legacy keys
```

(Both keys are public — they ship in the JS bundle. Security comes from RLS, not from hiding the anon key.)

### Tools (`tools/.env.local`)

```
SUPABASE_URL=http://127.0.0.1:54321            # local stack default
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The service-role key bypasses RLS — keep it secret and never commit it. The seed CLI uses it; nothing else should.

### Authoring (`tools/author/.env` — optional)

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6              # or any current model
```

Only needed if you're drafting new bank items with the CLI.

### Edge Functions (Supabase secrets, set with `supabase secrets set`)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
APP_URL=https://tranquil-eclair-165309.netlify.app
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-populated.
```

---

## Roadmap & known gaps

### Functional (could ship today, not yet built)

- **Stripe activation** — see [Stripe integration](#stripe-integration).
- **More content** — bank is at 150 of 200 target items. Author the rest via [tools/author](#authoring-tool).
- **OAuth providers** — Google / GitHub sign-in alongside magic link. Supabase Auth supports it; just needs provider config in the dashboard.
- **Custom domain** — Netlify supports it; haven't pointed one yet.

### Polish (unrealised per the spec tasks.md STATUS sections)

- **Engagement clock + 3-minute install prompt threshold** (spec 010) — currently the install prompt shows whenever `beforeinstallprompt` fires.
- **iOS install instructions card** — Safari has no `beforeinstallprompt`, so iOS users have to know "Add to Home Screen" from the share sheet.
- **IndexedDB pending-writes queue** for true offline writes (spec 010) — currently offline writes accumulate in the zustand persist store and re-sync via `migrateGuestToAuth` on next session.
- **Reduced-motion Lighthouse runs** — the gate runs each URL once; spec 012 called for a `Sec-CH-Prefers-Reduced-Motion: reduce` second pass.
- **`rewrite-explanation` author subcommand** (spec 009 US3) — for cleaning up explanations after promotion.
- **Author tool unit tests** — only smoke-tested.

### Test backfill

Several specs document unit and Playwright tasks that didn't land. The shipped code is verified by:

- 74 frontend unit/component tests
- 68 data-layer integration tests
- Manual end-to-end smoke on the live site

Specs with unrealised test tasks: 004 (flashcard component tests), 005 (Playwright + a11y manual), 006 (Playwright + Lighthouse), 007 (math unit tests), 008 (policy/due-list/reducer unit tests), 011 (entitlements + billing-states tests + Stripe E2E).

---

## License

TBD. Not yet under any open-source license — code is the author's. The question bank explanations may quote phrasing from Microsoft Learn documentation; those quotations are fair-use educational excerpts.

If you want to use this codebase, contact `ladetola0@gmail.com`.

---

## Acknowledgements

- Forked from an earlier AZ-104 study app and adapted to AI-300.
- Spec-Kit methodology + the `/speckit-*` slash commands drove the implementation.
- Question content references public Microsoft Learn documentation for Azure ML and Azure AI Foundry.
- Built with Claude assisting on every spec, draft, and review.
