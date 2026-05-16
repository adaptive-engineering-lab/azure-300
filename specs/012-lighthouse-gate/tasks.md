# Tasks: Lighthouse ≥ 90 Gate and Performance Audit

**Branch**: `012-lighthouse-gate` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Order is dependency-aware. `[P]` = can run in parallel with the previous task.

## Phase 0 — Verify ground state

- **T001** Confirm preview deploys exist for PRs (Vercel, Netlify, or similar). If not, this feature blocks on configuring previews — flag and pause.
- **T002** Confirm the current `frontend/` production build artifact path (`frontend/dist/` for Vite). Note for the bundle-size audit in T030.
- **T003** Inventory all currently-live routes from features 002–011. The URL set in T010 needs to be honest, not aspirational.

## Phase 1 — URL set + config

- **T010** Create `audit/urls.json`:
  ```json
  {
    "urls": [
      { "path": "/", "name": "home" },
      { "path": "/learn", "name": "learn-index" },
      { "path": "/learn/flashcards", "name": "flashcards-select" },
      { "path": "/learn/quiz", "name": "quiz-select" },
      { "path": "/progress", "name": "progress-dashboard" },
      { "path": "/settings", "name": "settings" }
    ]
  }
  ```
  Document in `audit/README.md` (T080) that adding a route requires editing this file in the same PR.
- **T011** Create `audit/lighthouserc.cjs` configuring `@lhci/cli`:
  - `collect`: 3 runs per URL, `staticDistDir` OR `url` array (use `url` since we audit the preview, not a static dist).
  - `assert`: `performance ≥ 0.9`, `accessibility ≥ 0.9`, `best-practices ≥ 0.9`, `seo ≥ 0.9`.
  - `settings`: `formFactor: 'mobile'`, throttling: `'simulated3GFast'` (note: per FR-010 we want 4G; pick the closest preset and document).
- **T012** Create `audit/size-limit.cjs`:
  ```js
  module.exports = [
    { name: 'home initial JS', path: 'frontend/dist/assets/index-*.js', limit: '250 KB' },
    { name: 'no chunk > 200 KB', path: 'frontend/dist/assets/*.js', limit: '200 KB' },
  ];
  ```
  The second rule needs `size-limit`'s per-file check; if the plugin doesn't natively support per-file caps, implement a thin wrapper in T030.

## Phase 2 — CI workflow

- **T020** Create `.github/workflows/perf-audit.yml`:
  - Trigger: `pull_request` with `paths:` filter that includes `frontend/**`, `package.json`, `pnpm-lock.yaml`, `audit/**` but EXCLUDES `specs/**`, `tools/**`, `supabase/migrations/**` (FR-009).
  - Job `audit`:
    1. Checkout, set up pnpm + Node 20.
    2. `pnpm install --frozen-lockfile`.
    3. Wait for the preview URL: poll the deployment provider's API until ready (Vercel: comment-watch, or use `vercel-preview-url` action).
    4. `pnpm -C frontend build` (also produces the artifact the bundle audit needs).
    5. `pnpm exec lhci autorun --config=audit/lighthouserc.cjs --collect.url=<preview-url> --upload.target=temporary-public-storage`.
    6. `pnpm exec size-limit --json > size-limit-report.json` then a small script asserts the per-chunk cap.
    7. Use `actions/github-script` to post a check summary with per-URL scores + the delta vs. main.
- **T021** [P] Configure `LHCI_GITHUB_APP_TOKEN` secret in repo settings. (Manual step; document in T080.)
- **T022** Test the workflow on a sacrificial PR that intentionally regresses (add an oversized image to `/`). Confirm the check fails and shows the regressed audit.

## Phase 3 — Local runner

- **T030** Create `scripts/audit-perf.mjs`:
  1. Build the frontend (`pnpm -C frontend build`).
  2. Start a preview server (`pnpm -C frontend preview --port 4173`) as a child process.
  3. Run LHCI against `http://localhost:4173` using `audit/lighthouserc.cjs`.
  4. Run `size-limit`.
  5. Print a combined report; exit non-zero on any failure; kill the preview server.
- **T031** Add `"audit:perf": "node scripts/audit-perf.mjs"` to root `package.json`.
- **T032** Run `pnpm audit:perf` locally on a clean build. Capture timing — target < 90 s end-to-end per SC-003. Optimize if over (parallelize URLs, skip throttling re-init).

## Phase 4 — Reduced-motion variants

- **T040** Update `audit/lighthouserc.cjs` to run each URL TWICE — once with `extraHeaders: { 'Sec-CH-Prefers-Reduced-Motion': 'reduce' }` and once without. (Lighthouse Settings supports `extraHeaders`.) The asserts apply to both runs; failure in either fails the gate.
- **T041** Verify locally that the reduced-motion run gets the right behavior: motion-heavy components (flashcard flip, framer-motion transitions) should disable animations under the header.

## Phase 5 — Branch protection

- **T050** Document the one-time setup in `audit/README.md`:
  1. GitHub repo → Settings → Branches → Branch protection rule for `main`.
  2. Require status check: `perf-audit / audit`.
  3. Require branches to be up-to-date before merging.
- **T051** Add a one-time checklist item to `specs/012-lighthouse-gate/checklists/requirements.md`: confirm branch protection is enforced.

## Phase 6 — Delta reporting

- **T060** In the workflow, before running LHCI, fetch the latest scores for `main` from a JSON file checked into the repo (`audit/main-scores.json`) OR from LHCI's "compare against base" feature. Render the delta in the check summary.
- **T061** Add a small post-merge step (separate workflow `.github/workflows/perf-record-main.yml`) that runs on `push: main` to update `audit/main-scores.json` after each merge. This keeps the delta meaningful.

## Phase 7 — Verification

- **T070** Open a sacrificial PR that imports a heavy library at the home route (e.g., add `import moment from 'moment'` somewhere reached by `/`). Verify the bundle-size check fails, names the offending chunk, and blocks merge.
- **T071** Open a second sacrificial PR that regresses an accessibility category (drop alt text on a key image). Verify the Lighthouse check fails on a11y.
- **T072** Revert both PRs. Confirm the checks return to green.
- **T073** Verify a `specs/`-only PR is SKIPPED by the path filter (FR-009).
- **T074** [P] Verify median-of-three behavior: simulate two passing + one failing run via a feature flag in LHCI config; the gate should pass.

## Phase 8 — Documentation + cleanup

- **T080** Create `audit/README.md` explaining:
  - What the gate enforces (per FR-001..FR-014).
  - How to add a new URL.
  - How to raise a budget (separate PR per FR-014; reviewer must justify).
  - Where to read the report (CI artifact link + LHCI's temporary public storage link).
- **T081** Update `specs/012-lighthouse-gate/checklists/requirements.md`.
- **T082** Add a one-line note in the project README + CLAUDE.md: "Frontend PRs must pass `perf-audit`. Run `pnpm audit:perf` locally before pushing."

## Dependencies summary

- Phase 1 (config) blocks Phase 2 (CI) and Phase 3 (local).
- Phase 2 and Phase 3 can land in parallel.
- Phase 4 (reduced-motion) layers on top of Phase 1/2 once they pass.
- Phase 5 (branch protection) is a one-time setup; queue alongside merging the workflow.
- Phase 6 (deltas) is optional polish; can land in a follow-up.
