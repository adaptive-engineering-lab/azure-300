# Feature Specification: Maintainer-Only Admin Editor

**Feature Branch**: `013-admin-editor`
**Created**: 2026-05-11
**Status**: Superseded by live-edit pivot (2026-05-14) — see [plan.md](./plan.md)
**Input**: User description: "Optional in-app editor for the question bank. Routes through the existing git/seed workflow — no service-role key in the client, no live DB writes from the browser."

> **2026-05-14 Pivot**: The export-to-JSON workflow described below is replaced by **live RLS-aware edits** that write directly to Supabase using the admin user's JWT. The functional requirements that follow (FR-005, FR-010, FR-012, etc.) are kept for historical reference but no longer drive implementation. See [plan.md](./plan.md) for the active design and [tasks.md](./tasks.md) for the build steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Maintainer Can Edit Existing Bank Items in the Browser and Export a Patched Seed File (Priority: P1)

A signed-in maintainer (a user explicitly listed in an `admins` table) reaches `/admin`, sees a searchable, filterable view of every item in the bank, opens an item's edit panel, changes the content, validates against the schema, and exports a patched copy of the relevant seed JSON file. They drop that file into the repo, run `pnpm seed`, review the diff, and commit. Source control remains the audit trail.

**Why this priority**: This is the entire point of the feature. The seed-file workflow is fine for occasional small fixes by an engineer, but a typo in a 25-MCQ batch is a 10-line JSON-hunt that beg for a UI. P1 because without item-edit the route is empty.

**Independent Test**: As an admin, open `/admin`, search for an MCQ, fix a typo in its explanation, validate, export. Open the downloaded file in a diff tool against the current `supabase/seed/content/mcq.json` — only the targeted item should differ, with `reviewed_at` bumped to now and `reviewer_id` set to the admin's identifier.

**Acceptance Scenarios**:

1. **Given** a signed-in admin, **When** they visit `/admin`, **Then** the page lists every item in the bank with type, domain, topic, and difficulty visible.
2. **Given** an item is selected, **When** the maintainer changes its `front`/`back` or `question`/`options`/`correct`/`explanation` or `service_name`/`category`/`description`, **Then** the change is staged in browser state with a visible "edited" indicator and the original content remains viewable.
3. **Given** staged edits, **When** the maintainer taps "Export," **Then** a JSON file matching the shape of the corresponding `supabase/seed/content/*.json` downloads, containing the entire bank with the edits applied. The file passes the same JSON Schema validation the seed CLI uses.
4. **Given** a staged edit, **When** the maintainer reverts it, **Then** the item returns to its server state and the "edited" indicator disappears.

---

### User Story 2 — A Maintainer Can Add a New Item from Scratch and Have It Appear in the Exported File (Priority: P2)

The maintainer taps "New item," picks a type (flashcard / MCQ / product-ID), fills in the fields with a form whose validation matches the JSON Schema, and saves to staged state. On export, the new item is appended to the matching seed file with a generated UUID, `source: "ai-generated"` (if generated via the existing authoring tooling) or `source: "bank"` (if hand-authored here), and current `reviewer_id` + `reviewed_at` stamps.

**Why this priority**: Adding items is currently a JSON-edit-by-hand or a Claude-assisted draft + promote (feature 009). The admin form is faster for one-off hand-authored items where Claude isn't useful. P2 because feature 009 still covers the common bulk case.

**Independent Test**: Add a hand-authored MCQ. Save. Export. Open the file and verify the new item appears with a fresh UUID, the chosen content, `source: "bank"`, the admin's `reviewer_id`, and a current timestamp.

**Acceptance Scenarios**:

1. **Given** an admin on `/admin`, **When** they tap "New item" and pick MCQ, **Then** a form opens with required fields (`question`, four options, `correct`, `explanation`, `domain`, `topic`, `difficulty`).
2. **Given** they fill the form with valid content and save, **When** the staged set is inspected, **Then** the new item has a fresh UUID, the chosen content, `source: "bank"`, and audit fields set.
3. **Given** they save with an invalid form (e.g., empty `correct` letter, three options instead of four), **When** validation runs, **Then** the save is blocked and the offending fields are highlighted with their schema-error reasons.

---

### User Story 3 — A Maintainer Can Soft-Delete an Item, and Export Drops It From the Seed File (Priority: P3)

The maintainer marks an existing item "remove on next export." It is visually marked but not destroyed in browser state. On export, the item is omitted from the JSON file, so the next `pnpm seed` will not re-insert it. The maintainer must still manually delete the row from the live DB (via Supabase Studio) if it's already there — the export only changes the seed file. The CLI logs that the item was removed for the next reviewer.

**Why this priority**: Item removal is rare — usually items get *updated* not deleted. P3 because the typo-fix and new-item paths in US1/US2 cover the dominant 90% of use cases.

**Independent Test**: Mark one item for removal. Export. Verify the item is absent from the downloaded file and present in the current seed file.

**Acceptance Scenarios**:

1. **Given** an admin viewing an item, **When** they tap "Remove on export," **Then** the item is visually struck through with an "removing" badge and can still be un-removed.
2. **Given** items are marked for removal, **When** export runs, **Then** the downloaded JSON contains the bank minus those items.
3. **Given** a removed item is still in the live DB, **When** the maintainer runs `pnpm seed`, **Then** the seed reports the missing item but does NOT delete the live row (seed is upsert-only). The maintainer must delete manually via Supabase Studio or a future "purge" subcommand.

---

### Edge Cases

- **A non-admin user navigates to `/admin`**: they see a "not authorized" screen and are redirected to `/`.
- **A guest navigates to `/admin`**: they're routed through sign-in first; on auth, the admin check decides whether they pass.
- **Multiple maintainers open `/admin` concurrently**: each session is independent. Conflicts are resolved at git commit time — whichever PR merges first wins; the second maintainer rebases against the new seed file.
- **A maintainer makes edits and closes the tab without exporting**: edits are lost. The browser shows a non-blocking warning when navigating away with unsaved staged edits.
- **A staged edit makes the item invalid (e.g., MCQ with three options)**: the item is flagged at edit time and export is blocked until either fixed or reverted.
- **A maintainer's admin row is revoked while they're editing**: on next refresh, they're locked out; the in-flight edits are preserved in localStorage under a sub-namespace until they export them, but the UI shows a "no longer authorized" warning.
- **A new item's UUID collides with an existing one**: the form generator regenerates until a unique value is produced; the maintainer cannot type a UUID by hand.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin route MUST live at `/admin` and MUST be reachable only by authenticated users whose row is present in a new `admins` table.
- **FR-002**: A new `admins` table MUST exist with one column (`user_id` referencing `auth.users`) and an RLS policy that lets each user read only their own row (a maintainer learns they're an admin by reading and seeing a row).
- **FR-003**: Population of the `admins` table MUST happen out-of-band (via Supabase Studio or a migration) — there is no in-app surface to grant admin.
- **FR-004**: The `/admin` page MUST display the entire question bank with at-a-glance metadata (id, type, domain, topic, difficulty, source, reviewer_id) and a search/filter bar.
- **FR-005**: The admin route MUST NOT write to any Supabase table from the browser. The frontend's only mutating exit is the "Export" download.
- **FR-006**: For each item, the maintainer MUST be able to edit every spec-defined field except `id`, `type`, and `created_at`.
- **FR-007**: For each staged edit, the resulting item MUST be re-validated against its type's JSON Schema before being marked exportable. Invalid items MUST block export and highlight the offending fields.
- **FR-008**: Adding a new item MUST present a typed form with the same field validators as the schema, generate a UUID v4 automatically, and stamp `source: "bank"`, `reviewer_id: <admin email or initials>`, `reviewed_at: <now>`.
- **FR-009**: Soft-delete MUST be reversible until export. Exported files MUST omit soft-deleted items.
- **FR-010**: The export action MUST produce one JSON file per affected seed file (`flashcards.json`, `mcq.json`, `product-id.json`). Each downloaded file MUST be a complete, replacement-shaped copy of the seed file with edits applied — drop-in compatible with `supabase/seed/content/`.
- **FR-011**: Exported items that were edited or newly added MUST have their `reviewer_id` and `reviewed_at` fields updated to reflect the admin and the export moment, regardless of `source`.
- **FR-012**: Staged edits MUST persist across page reloads in a separate localStorage namespace (`ai300game.v1.admin-staged`) so a closed-tab event does not lose work.
- **FR-013**: A "Discard staged edits" button MUST be visible when staged edits exist; tapping it (after a confirmation) MUST clear the staged set.
- **FR-014**: The admin route MUST display, beneath its header, a callout reminding maintainers that the workflow is: edit → export → drop files into repo → `pnpm seed` → commit. There MUST NOT be any "publish directly" or "save to DB" button.
- **FR-015**: All admin UI MUST meet WCAG 2.1 AA contrast and keyboard navigation per resolved decision #5; forms MUST be tab-navigable in visual order.

### Key Entities

- **AdminMembership**: A `user_id` row in `admins`. Existence implies admin; absence (or absence of a readable row) implies not admin.
- **StagedEdit**: An in-browser change to an existing item — original snapshot, current values, validation state, removal flag. Keyed by `id`.
- **NewItemDraft**: An in-browser draft of a new item not yet in the bank — type, current values, validation state. Keyed by client-generated UUID.
- **ExportBundle**: The three JSON files produced by an export action, each a complete copy of the corresponding seed file with all staged edits applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can fix a typo in one MCQ — open the route, search, edit, validate, export, drop the file in the repo, run `pnpm seed`, commit — in under 5 minutes end-to-end.
- **SC-002**: Exported files pass `pnpm seed:validate` in 100% of test runs.
- **SC-003**: A non-admin user is denied access to `/admin` within one second of route mount in 100% of runs.
- **SC-004**: Zero items in the bank can be mutated, deleted, or inserted via any Supabase request originating from the browser when running the admin UI — verified by network-log inspection.
- **SC-005**: Schema-invalid staged edits block export in 100% of test cases.
- **SC-006**: Staged edits survive a page reload in 100% of runs (the localStorage namespace persists).
- **SC-007**: An admin who is removed from the `admins` table loses route access within one refresh — verified by an end-to-end test.

## Assumptions

- The constitution's Principle II ("content lives in source control") is non-negotiable: every change still routes through git.
- The constitution's Principle IV ("secrets stay server-side") forbids the service-role key in the frontend. The admin UI therefore cannot mutate the bank directly; export-to-JSON is the only output path.
- Admin membership is a static list (small handful of people). A future "team admin tools" surface might add invitations, but is out of scope.
- The export format is the same JSON shape as `supabase/seed/content/*.json` so the existing seed CLI (feature 001) consumes it without changes.
- No in-app delete of live DB rows. A maintainer who removes an item from the seed file must also run a manual DELETE in Supabase Studio (a future "purge" subcommand could automate this).
- The admin form for new items intentionally does NOT integrate with the Claude authoring tooling (feature 009). The two paths are distinct: 009 is bulk + AI-drafted; 013 is single + hand-authored.
- One admin edits at a time per session. Multi-admin merge conflicts are resolved by `git`, not by the UI.
- Edit-tracking does NOT include a per-field change log inside the app. The git commit message and diff serve that role.
