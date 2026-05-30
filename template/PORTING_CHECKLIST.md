# Porting Checklist

Step-by-step list of what to change when forking this codebase for a new Microsoft exam. Order matters: do the type system and DB changes before you try to seed, or validation will fail.

Use this as a literal checklist — tick each item as you go.

---

## 1. Exam taxonomy

- [ ] Replace `exams.config.json` at the repo root with the new exam's config. Use `template/exams/_template.config.json` as a shell, or copy one of the filled-in examples (`az-900.config.example.json`, `ai-900.config.example.json`).
- [ ] Verify domain slugs are kebab-case and stable (you'll reuse them in DB, type system, and content).

---

## 2. Type system

File: [`frontend/src/lib/questions/types.ts`](../frontend/src/lib/questions/types.ts)

- [ ] Update the `Domain` string-literal union:

  ```ts
  // Before (AI-300):
  export type Domain =
    | 'mlops-infra'
    | 'ml-lifecycle'
    | 'genaiops-infra'
    | 'genai-quality'
    | 'genai-optimization';

  // After (AZ-900 example):
  export type Domain =
    | 'cloud-concepts'
    | 'azure-architecture'
    | 'azure-management';
  ```

- [ ] Update the `DOMAINS` array (same slugs in array form).
- [ ] Update `DOMAIN_LABELS` map with the human-readable labels.

---

## 3. Database

### Option A — fresh Supabase project (recommended)

Easiest. Edit the migration in place before first `supabase db push`:

- [ ] Open [`supabase/migrations/0001_questions.sql`](../supabase/migrations/0001_questions.sql) and update the `questions_domain_chk` CHECK clause with the new slug list. Same for `questions_content_shape_chk` only if you're changing the type set.
- [ ] Boot a fresh Supabase project: `supabase start` (local) or create a cloud project + `supabase link`.
- [ ] Apply: `supabase db reset` (local) or `supabase db push --linked` (cloud).

### Option B — already-deployed project, swapping in place

- [ ] Copy `template/migrations/swap_domain_constraint.example.sql` to the next migration slot: `supabase/migrations/00XX_swap_domain_chk.sql`.
- [ ] Replace the slug list in the new file.
- [ ] If existing question rows reference old slugs you can't preserve, truncate the bank first.
- [ ] Apply.

---

## 4. Seed content

- [ ] Empty the bank:

  ```bash
  cp template/seed-content/flashcards.json supabase/seed/content/flashcards.json
  cp template/seed-content/mcq.json supabase/seed/content/mcq.json
  cp template/seed-content/code-review.json supabase/seed/content/code-review.json
  ```

- [ ] Author the first 10-20 questions for the new exam. Either by hand (referring to `template/seed-content/README.md` for the schema) or via `tools/author` CLI.
- [ ] Validate: `pnpm -C tools seed:validate` (expect "Validation complete: N items OK.")
- [ ] Seed: `pnpm -C tools seed`

---

## 5. Branding

### `frontend/index.html`

- [ ] Update `<title>` and `<meta name="description">`:

  ```html
  <title>AZ-900 Study</title>
  <meta name="description" content="Mobile-first AZ-900 exam prep — flashcards, quizzes, and code-review drills across all exam domains." />
  ```

### `frontend/vite.config.ts`

- [ ] Update the PWA manifest fields:

  ```ts
  manifest: {
    name: 'AZ-900 Study',
    short_name: 'AZ-900',
    description: 'Mobile-first AZ-900 exam prep — flashcards, quizzes, and code-review drills.',
    theme_color: '#0078D4',          // optionally change per exam
    background_color: '#0f172a',
    // ...
  }
  ```

### `frontend/src/pages/HomePage.tsx`

- [ ] Update the hero copy:

  ```tsx
  <p className="text-sm font-medium text-accent">AZ-900 Study</p>
  <h1 className="...">
    Mobile-first prep for the Azure Fundamentals exam.
  </h1>
  <p className="mt-3 text-fg-muted">
    Flashcards, quizzes, and code-review drills across all three exam domains.
    Study in short sessions; come back tomorrow.
  </p>
  ```

  (Domain count + tagline depend on the exam.)

### `frontend/src/pages/LearnIndexPage.tsx`

- [ ] If you set `gameModes.codeReview: false` in `exams.config.json`, hide the Code Review mode card. The page already keys off the flag — verify by running the dev server and looking at `/learn`.

### Other copy mentions

- [ ] grep for `AI-300` across the codebase and replace where it's user-facing (not in archived spec files):

  ```bash
  grep -rn "AI-300" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.md" \
    frontend/ README.md netlify.toml | grep -v "specs/"
  ```

- [ ] grep for the old exam title strings too (`Operationalize Machine Learning`, `ML Operations Engineer`, etc.).

### `README.md`

- [ ] Rewrite the project-level README hero, sections that mention AI-300 specifically, and the architecture diagram captions. Most of the doc is exam-agnostic and can stay.

---

## 6. Icon and brand visuals

- [ ] (Optional) Replace `frontend/public/icon.svg` with a new SVG icon for the new exam. The PWA manifest references it with `purpose: 'any maskable'` so an SVG is fine; no PNG variants required.
- [ ] (Optional) Adjust `theme_color` + `background_color` in `frontend/vite.config.ts` if you want a different launcher tint.

---

## 7. Deployment

### Supabase

- [ ] Create a new Supabase project in your target region.
- [ ] Capture the project ref, anon key, and service-role key.
- [ ] `supabase link --project-ref <new-ref>`
- [ ] `supabase db push --linked`
- [ ] Temporarily swap `tools/.env.local` to the cloud creds; run `pnpm -C tools seed`; swap back.
- [ ] Project Settings → Authentication → URL Configuration:
  - Site URL: `https://<your-netlify-subdomain>.netlify.app/`
  - Redirect URL: `https://<your-netlify-subdomain>.netlify.app/auth/callback`
  - (Add `http://localhost:5173/auth/callback` for local dev.)

### Netlify

- [ ] Create a new Netlify site, point at the new GitHub repo, accept the build settings from `netlify.toml` (`frontend/` base, `pnpm build` command, `dist/` publish).
- [ ] Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] Trigger a deploy.
- [ ] Verify in browser: home page loads, console clean, "N questions across K domains" line reflects the new bank.

### Optional: custom domain

- [ ] Buy / claim domain (e.g. `az-900.yourdomain.com`).
- [ ] Add as custom domain in Netlify; Netlify provisions a Let's Encrypt cert.
- [ ] Update Supabase Auth URLs to use the custom domain.

---

## 8. Privacy + Terms

- [ ] Open `frontend/src/pages/PrivacyPolicyPage.tsx` and `TermsOfServicePage.tsx`.
- [ ] Update the exam name from "AI-300 Study" to "AZ-900 Study" (or whatever).
- [ ] Confirm operator name, contact email, Supabase region, and governing jurisdiction are still correct (or update them).

---

## 9. Stripe (only if Pro tier is active for this exam)

If you're activating Pro on the new exam:

- [ ] Create a new Stripe product + recurring price for the new exam. (Stripe customers are per-account, so reuse your existing Stripe account.)
- [ ] Set Supabase secrets for the new project: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`.
- [ ] Deploy the three edge functions: `supabase functions deploy stripe-webhook --no-verify-jwt`, etc.
- [ ] Register the webhook URL in Stripe Dashboard.

If you're launching free-tier-only: do nothing. The billing surface gracefully shows "Free plan" for everyone.

---

## 10. Specs folder

- [ ] Decide what to keep. The 13 AI-300 specs document HOW each feature was built, which is useful reference material. But they're cluttered with AI-300-specific intent and STATUS notes.
- [ ] Options:
  - **Keep** as-is — historic reference, no harm.
  - **Archive** by moving `specs/` → `specs.ai-300/` and starting a fresh `specs/` for the new exam.
  - **Trim** to spec.md + plan.md only, dropping tasks.md (which is exam-specific and already executed).

For Option A (forking): archiving is usually right. For Option B (multi-exam in one repo): keep + reorganize.

---

## 11. CI workflows

- [ ] `.github/workflows/data-layer.yml` — exam-agnostic. No changes needed.
- [ ] `.github/workflows/lighthouse.yml` — exam-agnostic. No changes needed.
- [ ] `.lighthouserc.json` — the URL list includes route paths. If you set `gameModes.codeReview: false`, optionally remove `http://localhost/learn/code-review` from the list so Lighthouse doesn't try to audit a hidden route.

---

## 12. Final smoke test

- [ ] `pnpm -C frontend build` — succeeds with no type errors.
- [ ] `pnpm -C frontend test` — passes.
- [ ] `pnpm -C tools test` — passes (requires local Supabase running + bank seeded).
- [ ] Sign up with a real email on the production deployment.
- [ ] Verify `profiles` + `subscriptions` rows auto-create in the new Supabase project.
- [ ] Complete a session in each available mode; verify the row lands in `sessions`.
- [ ] Open `/progress`; verify the radar renders with the new domain labels.
- [ ] Open `/legal/privacy` and `/legal/terms`; verify exam name + operator details are updated.

---

## 13. Backlog (don't block launch on these)

- [ ] More content. Initial seed of 30-50 items is enough to play; 150-200 is needed for the spaced repetition system to feel rich.
- [ ] Custom domain.
- [ ] Stripe activation if you want Pro.
- [ ] Branch protection on `main` for the new repo.
- [ ] Spec-folder cleanup (option chosen in step 10).

---

## Rough effort

For someone who's done this once already and is forking AZ-900 / AI-900 from the AI-300 base:

- **Code changes**: 30 minutes (taxonomy + types + copy)
- **Initial content (30-50 items)**: 4-8 hours of authoring
- **Deployment + smoke test**: 30 minutes

So **half a day to a working public deploy** for a second exam, plus ongoing content authoring.
