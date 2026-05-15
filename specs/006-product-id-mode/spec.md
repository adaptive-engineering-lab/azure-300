# Feature Specification: Product Identification Mode

**Feature Branch**: `006-product-id-mode`
**Created**: 2026-05-11
**Status**: Draft (gated on icon licensing review — see Assumptions)
**Input**: User description: "Product Identification mode (Name → Category sub-mode for v1)" (Phase 2 of AI300-Game-Spec.md §13, expanded per §6.3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Learner Can Match Azure Service Names to Categories (Priority: P1)

A learner opens product-identification mode, picks a session length, and is shown one Azure service name at a time. They must pick the correct category (Networking, Security, Compute, Storage, Identity, Monitoring, Database, Integration) from four options. Correct picks highlight green; incorrect picks highlight red on the choice and green on the correct answer, and surface a one-line description of the service. The session ends after the chosen count and shows the score plus the "common confusions" list for any service the learner got wrong.

**Why this priority**: Naming things is half the AI-300 exam. This sub-mode is the highest-ROI piece of Product-ID and the one whose data is least dependent on still-unfinalized licensing (it does not require icons). It is a complete, demoable mode on its own.

**Independent Test**: As a learner, start a 5-item session. Verify each round shows one service name and four category options, the correct/incorrect feedback renders with the description, and the results screen lists each service that was missed alongside its "common confusions."

**Acceptance Scenarios**:

1. **Given** the mode selector, **When** the learner picks a length and taps "Start," **Then** the first item renders with one service name prominently displayed and four category options.
2. **Given** a visible item, **When** the learner taps the correct category, **Then** that option highlights green and the service's one-line description appears.
3. **Given** a visible item, **When** the learner taps an incorrect category, **Then** that option highlights red, the correct category highlights green, the description appears, and any registered "common confusions" for the service are shown.
4. **Given** the last item is answered, **When** the learner advances, **Then** the results screen shows the score and a "missed services" list, each with the correct category and its common-confusions hints.

---

### User Story 2 — Each Answer Updates the Per-Service Confusion Map (Priority: P2)

Each incorrect pick records both the service the learner saw and the wrong category they chose. The confusion map (per-learner) lets the progress dashboard (feature 007) surface "services you confuse with X" — answering the design promise of `common_confusions` becoming a personalized signal, not a static list.

**Why this priority**: Without this write-back, "common confusions" stays the bank's pre-authored list and never adapts to the learner. P2 because US1's loop is intact without it; this is the personalization layer.

**Independent Test**: Intentionally pick "Compute" when the correct answer is "Networking" on an item. Verify the confusion map for that service now records "Compute" as a confusion candidate, with a count of 1. Pick wrongly again and verify the count increments.

**Acceptance Scenarios**:

1. **Given** the learner answers an item incorrectly, **When** the next item loads, **Then** the per-service confusion map contains an entry pairing this service with the wrong category, with a count of 1.
2. **Given** the learner answers the same service incorrectly with the same wrong category again, **When** the entry is inspected, **Then** its count is 2.
3. **Given** the learner later answers the same service correctly, **When** the entry is inspected, **Then** its count is unchanged but the service's overall accuracy improves.

---

### User Story 3 — Memory Match Sub-Mode Adds Variety (Priority: P3)

A separate "Memory Match" sub-mode shows a grid of face-down cards. Tapping a card flips it to reveal either a service name or its one-line description. The learner must find matching pairs (name ↔ description). The mode ends when all pairs are matched; results show time taken, number of mistakes, and a streak bonus for runs of consecutive correct matches.

**Why this priority**: Variety inside a single mode keeps short study sessions fresh. P3 because the linear Name→Category flow in US1 is already a complete product-id experience; Memory Match is the secondary playable.

**Independent Test**: Open Memory Match with 6 pairs. Reveal cards in pairs until all are matched. Verify each correct pair stays revealed, each incorrect pair flips back after a brief pause, the mistake counter increments only on incorrect pairs, and the results screen shows time + mistake counts.

**Acceptance Scenarios**:

1. **Given** a 6-pair Memory Match board, **When** the learner taps two cards forming a correct pair, **Then** both stay revealed and the pair counter advances.
2. **Given** the learner taps two cards forming an incorrect pair, **When** about one second elapses, **Then** both cards flip back to face-down and the mistake counter increments.
3. **Given** all pairs are matched, **When** the final pair completes, **Then** the results screen appears with elapsed time and mistake count.

---

### Edge Cases

- **A service in the bank has an outdated category that conflicts with Microsoft's current taxonomy**: addressed by the authoring workflow (feature 009), not at runtime. The mode renders whatever is in the bank.
- **A learner's confusion map grows unbounded**: it is bounded per-learner by capping total entries at 200; least-recent confusions evict first.
- **The learner refuses to wait** on Memory Match's reveal animation: tapping a third card cancels the pending flip-back and treats the third tap as the start of a new pair.
- **The bank has fewer than the requested item count for the chosen sub-mode**: the session shrinks to what's available with a notice.
- **Display variant**: on very narrow viewports, the four category options stack vertically; on wider viewports they appear as a 2×2 grid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Product-ID mode MUST live at `/learn/product-id` and MUST be reachable from `/learn`.
- **FR-002**: For v1, the mode MUST offer the Name → Category sub-mode (US1) as the default and only enabled sub-mode at launch.
- **FR-003**: Memory Match MUST be implemented and tested but MAY be feature-flagged off at launch pending content authoring; toggling it on MUST not require a deploy.
- **FR-004**: Items MUST be drawn from the bank where `type='product-id'`, with each item carrying `service_name`, `category`, `description`, and optionally `common_confusions`.
- **FR-005**: In Name → Category, each round MUST display one `service_name` prominently and four category options, exactly one of which matches the item's `category`.
- **FR-006**: The three distractor categories MUST be chosen from a closed set of valid Azure category labels and SHOULD prefer categories listed in the item's `common_confusions` when available.
- **FR-007**: Correct picks MUST render in a success color; incorrect picks MUST render the chosen option in an error color, the correct option in a success color, and show the service's `description`.
- **FR-008**: Each answered item MUST result in a progress write: `times_seen` incremented, `times_correct` incremented only on correct, `last_rating` set, `next_review` advanced per policy.
- **FR-009**: Each incorrect pick MUST record an entry in the learner's per-service confusion map: `service_name`, the wrong category chosen, a count, and a last-seen timestamp.
- **FR-010**: A session MUST record a `sessions` row with `mode='product-id'` on completion.
- **FR-011**: At session end, the results screen MUST show overall score, list each missed service with its correct category, and surface any matching `common_confusions` hints.
- **FR-012**: Memory Match MUST present a grid (default 6 pairs, configurable to 4 / 6 / 8 pairs) of face-down cards where each pair is a `service_name` paired with its `description`.
- **FR-013**: Memory Match MUST detect a matched pair and keep both cards revealed; an unmatched pair MUST flip back after 800–1200 ms.
- **FR-014**: Memory Match MUST display elapsed time and mistake count throughout the session and MUST record both on completion.
- **FR-015**: The mode MUST function for both guest and authenticated learners with no behavior differences besides which store is read and written.
- **FR-016**: The mode MUST NOT depend on the Microsoft Azure icon set in any code path; if and when icon-based sub-modes ship (post-licensing review), they MUST be additive and gated by a flag.

### Key Entities

- **ProductIdRound**: One displayed item in Name → Category — the service, the four options, the correct option, and the learner's pick.
- **ConfusionEntry**: Per-(learner, service) record — service name, list of (wrong-category, count, last-seen).
- **MemoryMatchBoard**: A grid of pairs in the current Memory Match session — pairs, revealed state per card, elapsed time, mistake count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can complete a 10-item Name → Category session in under 3 minutes at a normal pace.
- **SC-002**: 100% of answered items produce a progress-store write observable on the next session.
- **SC-003**: 100% of incorrect picks produce a confusion-map entry within the same browser session.
- **SC-004**: Memory Match recognizes a matched pair within 200 ms of the second card flip.
- **SC-005**: The "missed services" list on the results screen lists every incorrectly-answered service from the session, with the correct category, in 100% of test runs.
- **SC-006**: Lighthouse Accessibility ≥ 90 on the session and results screens; the four category options are reachable in tab order in the same visual order.

## Assumptions

- The product-ID data shape is the one defined in feature 001's contract (`product-id.schema.json`).
- The official Microsoft Azure icon set is **out of scope for this feature**. The icon-based sub-modes ("Icon → Name") are deferred to a future feature gated on the licensing review (resolved decision #3 task).
- The default category set for distractors is fixed: Networking, Security, Compute, Storage, Identity, Monitoring, Database, Integration. Adding categories requires bank curation.
- Memory Match draws from the same bank items as Name → Category; no separate item type is introduced.
- The `common_confusions` array on each item is pre-authored in the seed bank; this feature does not generate new ones at runtime (Principle III).
- Per-learner confusion-map capacity is 200 entries with LRU eviction; this is a v1 cap and may grow later.
- For guests, the confusion map lives in local storage under the same namespace as other guest progress. For authenticated learners, it lives in Supabase under a table specified in this feature's implementation plan.
