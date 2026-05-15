# Feature Specification: Lighthouse ≥90 Gate and Performance Audit

**Feature Branch**: `012-lighthouse-gate`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Performance audit + Lighthouse score ≥ 90" (Phase 4 of AI300-Game-Spec.md §13, enforcing constitution Principle V)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every Merge Is Gated By a Lighthouse ≥ 90 Run (Priority: P1)

When any PR touches frontend-affecting code, a CI job runs Lighthouse against the deployed preview of the PR and blocks merge if any of the four core categories (Performance, Accessibility, Best Practices, SEO) drops below 90 on the primary user-flow URLs. The result is reported back to the PR as a check with score deltas vs. the main branch.

**Why this priority**: The constitution's Principle V mandates Lighthouse ≥ 90 as merge-blocking. Without this feature, the rule lives only in the document — easy to violate and never enforced. P1 because principle enforcement is a launch blocker.

**Independent Test**: Open a PR that intentionally regresses one of the audits (e.g., add an oversized image to the home screen). Verify the Lighthouse CI check fails, the PR is blocked from merging, and the check comment shows the regressed score with a delta from main. Revert the regression and verify the check passes.

**Acceptance Scenarios**:

1. **Given** a PR that does not touch frontend code (e.g., only `specs/` or `tools/seed/` changes), **When** the PR opens, **Then** the Lighthouse job is skipped via path filters.
2. **Given** a PR that touches frontend code, **When** the preview deploys, **Then** the Lighthouse job runs against the configured URL set and reports a check.
3. **Given** any of the four core audits scores below 90 on any of the URL set, **When** CI completes, **Then** the check fails, the PR is blocked from merge, and the failing audits are summarized in the check output.
4. **Given** all audits pass, **When** CI completes, **Then** the check passes and a delta vs. main is shown to make trends visible.

---

### User Story 2 — The Production Build Carries No Avoidable Performance Regressions (Priority: P2)

The Lighthouse gate is paired with a bundle-size check. The same CI job inspects the production build and asserts that the initial JS payload for the home route stays under 250 KB gzipped, the largest contentful paint asset is below a configured budget, and no single chunk exceeds 200 KB gzipped. Regressions trigger the same merge block.

**Why this priority**: A Lighthouse run can pass thanks to caching while still letting a slow first-paint creep in. Bundle-size budgets catch the regression class Lighthouse doesn't always reveal. P2 because Lighthouse alone covers the headline metric; budgets are the safety net.

**Independent Test**: Open a PR that bloats the main bundle past 250 KB (e.g., import a heavy library at the home route). Verify the bundle-size check fails with the offending route, the current size, and the budget.

**Acceptance Scenarios**:

1. **Given** a PR that pushes the home-route bundle above 250 KB gzipped, **When** the bundle-size check runs, **Then** it fails and names the offending chunk and size.
2. **Given** a PR that adds a chunk above 200 KB gzipped, **When** the check runs, **Then** it fails with the chunk name and size.
3. **Given** all budgets are met, **When** the check runs, **Then** it passes and outputs a sorted list of chunk sizes for visibility.

---

### User Story 3 — A Maintainer Can Run the Same Gate Locally Before Pushing (Priority: P2)

A maintainer can run `pnpm audit:perf` from the repo root to execute the same Lighthouse + bundle-size checks locally against a freshly-built preview, in roughly the same time as the CI run. The output mirrors the CI report so a developer can iterate without round-tripping CI.

**Why this priority**: The gate is most valuable when it's a fast inner-loop tool, not just a CI gate. P2 because the CI block in US1 catches everything eventually; the local script accelerates fix iteration.

**Independent Test**: Build the app locally. Run `pnpm audit:perf`. Verify the report shows the same audit categories and bundle budgets as CI in under 90 seconds end-to-end.

**Acceptance Scenarios**:

1. **Given** a clean local build, **When** the maintainer runs `pnpm audit:perf`, **Then** Lighthouse runs against each of the configured URLs and the report is printed to stdout.
2. **Given** any audit or bundle budget fails locally, **When** the script exits, **Then** the exit code is non-zero and the failing items are summarized at the bottom.

---

### Edge Cases

- **Flaky Lighthouse score within a ±2 band**: the job runs three times and averages; a single bad run does not block.
- **Preview deployment fails**: the Lighthouse job is marked as "blocked by preview" rather than failing on its own merits.
- **The PR adds a new high-priority route**: the URL set is configured in a file in the repo; a contributor adding the route adds the URL in the same PR.
- **`prefers-reduced-motion` impacts a score**: audits run with reduced-motion disabled and enabled; both runs must pass.
- **Third-party scripts cause variance**: the app does not load third-party scripts in the production build (or only Stripe + Supabase, which are budgeted-for); a new third-party script must come with a budget update PR.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A CI job MUST run Lighthouse against a configured set of URLs on the PR's preview deploy whenever frontend code changes.
- **FR-002**: The URL set MUST include at minimum: `/`, `/learn`, `/learn/flashcards`, `/learn/quiz`, `/progress`, `/settings`. The set lives in a versioned config file.
- **FR-003**: Each of the four core Lighthouse categories — Performance, Accessibility, Best Practices, SEO — MUST score at least 90 on every URL in the set; any failure blocks the PR from merging.
- **FR-004**: To dampen flakiness, each URL MUST be audited at least three times and the median score MUST be used for the gate.
- **FR-005**: The CI job MUST report a check on the PR with each URL's per-category score and the delta from the main branch.
- **FR-006**: A bundle-size audit MUST run alongside Lighthouse: the home-route initial JS payload MUST stay below 250 KB gzipped; no single chunk MUST exceed 200 KB gzipped.
- **FR-007**: Bundle-size failures MUST block merge with the same severity as a Lighthouse failure.
- **FR-008**: A `pnpm audit:perf` script MUST run the same gates locally against a freshly-built preview in under 90 seconds.
- **FR-009**: The CI job MUST be skipped via path filters for PRs that touch only `specs/`, `tools/seed/`, `tools/author/`, or other non-frontend paths.
- **FR-010**: Lighthouse audits MUST be run with simulated 4G throttling and a mid-range mobile emulation profile.
- **FR-011**: Audits MUST run twice per URL — with `prefers-reduced-motion` set and unset — and both runs MUST pass the gate.
- **FR-012**: The gate MUST be enforced as a required GitHub check on the `main` branch via branch protection.
- **FR-013**: The configuration (URL set, budgets, throttling profile) MUST live in a single committed file so changes are reviewable.
- **FR-014**: When a budget is intentionally raised, the change MUST be a separate, reviewable commit; it cannot be silently merged with a feature PR.

### Key Entities

- **AuditConfig**: The committed config — URL set, per-category budgets, bundle budgets, throttling profile.
- **AuditRun**: A single CI execution — its URL, the three Lighthouse runs, the median score, the report URL.
- **BundleReport**: The output of the bundle-size analyzer — per-chunk sizes, the home-route payload, the offending chunks (if any).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature merges, no PR can merge into main that drops any Lighthouse core category below 90 on any configured URL.
- **SC-002**: After this feature merges, no PR can merge into main that pushes the home-route bundle above 250 KB gzipped or any single chunk above 200 KB gzipped.
- **SC-003**: The local `pnpm audit:perf` script completes in under 90 seconds on a typical developer machine in 100% of runs.
- **SC-004**: The flakiness mitigation (three runs, median) reduces false-positive failures to under one per 50 PRs.
- **SC-005**: The CI job is skipped on spec-only PRs in 100% of test runs, verified by path filter coverage.
- **SC-006**: The branch-protection rule is configured to require the Lighthouse check on `main`, verified by a one-time setup checklist.

## Assumptions

- A preview-deploy URL is available per PR (Vercel preview deploys or equivalent). Without it, US1 is not feasible and this feature blocks on that integration.
- Lighthouse CI is the tool of record — community-standard, free, GitHub-native. Switching tools is a separate feature.
- The four core audit categories are Performance, Accessibility, Best Practices, and SEO. Lighthouse's PWA audit is informational (already covered by feature 010); it is not part of the gate.
- The ≥ 90 threshold is the v1 floor. Raising it requires a constitution amendment.
- Third-party scripts beyond Supabase JS and Stripe JS are not in scope; adding more requires budget review.
- Bundle-size analysis uses the production-build output (Vite or equivalent). Source maps stay in the build artifact for debugging but are not counted toward the gzipped size budget.
- The audit emulation profile (mid-range mobile, 4G throttling) is the v1 choice; tuning is post-launch.
