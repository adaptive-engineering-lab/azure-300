# Implementation Plan: Lighthouse ≥ 90 Gate and Performance Audit

**Branch**: `012-lighthouse-gate` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)

## Summary

Enforce the constitution's Principle V at merge time. Two CI checks: (1) Lighthouse CI runs against the PR's preview-deploy URLs, three runs per URL, taking the median, blocking on any of the four core categories below 90; (2) a bundle-size audit asserts the home-route initial JS payload stays under 250 KB gzipped and no single chunk exceeds 200 KB gzipped. A local `pnpm audit:perf` mirrors the CI checks for a fast inner-loop. Branch protection on `main` makes both required.

## Technical Context

**Language**: TypeScript 5.5 (config + scripts)
**New deps**: `@lhci/cli@^0.14`, `size-limit@^11` (+ `@size-limit/preset-app` if available, otherwise hand-rolled), `playwright-core` (already used elsewhere if landed)
**Env vars**: `LHCI_GITHUB_APP_TOKEN` (for the GitHub Check) — stored in repo secrets
**Storage**: GitHub Actions artifacts for Lighthouse reports + bundle reports
**Testing**: the gate IS the test — meta-tests not in scope
**Project**: extends `.github/workflows/` + adds `audit/` config dir

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-First UX | Pass | Audits run with mobile emulation + 4G throttling (FR-010). |
| II. Domain-Aligned Content | N/A | No content. |
| III. AI as Authoring Tool | Pass | No runtime AI. |
| IV. Secrets Stay Server-Side | Pass | The GitHub App token is in repo secrets only. |
| V. Measurable Quality Gates | Pass | This is the implementation of Principle V. |

## Project Structure (additions)

```
.github/
└── workflows/
    └── perf-audit.yml                  # the merge-blocking job
audit/
├── lighthouserc.cjs                    # @lhci/cli config: URLs, runs, budgets
├── size-limit.cjs                      # bundle budgets
└── urls.json                           # versioned URL set (FR-002, FR-013)
scripts/
└── audit-perf.mjs                      # local runner: spins up preview, runs LHCI, runs size-limit
package.json                            # +"audit:perf" script
```

## Phases

1. **URL set + config** — `audit/urls.json` + `audit/lighthouserc.cjs` + `audit/size-limit.cjs`.
2. **CI workflow** — `.github/workflows/perf-audit.yml` with path filters, preview-URL wait, LHCI run, size-limit run, GitHub Check posting.
3. **Local runner** — `scripts/audit-perf.mjs` invoked by `pnpm audit:perf`.
4. **Branch protection** — manual setup: require the `perf-audit` check on `main`.
5. **Flakiness mitigation** — three Lighthouse runs per URL, median score (FR-004).
6. **Reduced-motion runs** — every URL audited twice, once with `prefers-reduced-motion` (FR-011).
7. **Documentation** — `audit/README.md` explaining how to raise a budget and the philosophy.

## Complexity Tracking

The gate must be both strict and not annoying. Flakiness is the main risk.

| Decision | Why |
|---|---|
| Three runs, median | FR-004 + SC-004 budget for false positives. |
| Path filters skip spec-only PRs | FR-009 — the gate is for frontend-affecting changes. |
| Two reduced-motion variants per URL | FR-011 — motion-aware Lighthouse scoring varies subtly. |
| Bundle audit alongside Lighthouse | FR-006/FR-007 — Lighthouse can pass while shipping a 500 KB chunk via caching. |
