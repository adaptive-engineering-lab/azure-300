# Feature Specification: Spaced Repetition and Daily Review

**Feature Branch**: `008-spaced-repetition`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Spaced repetition ('Daily Review' mode) + SM-2 algorithm" (Phase 3 of AI300-Game-Spec.md §13, expanded per §9 and §10.2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Daily Review Surfaces Cards Due Today (Priority: P1)

When a learner opens the app and items are due for review today (per each progress entry's `next_review` date), the home screen prominently shows a "Daily Review" CTA with the count of items due. Tapping it starts a session that consumes due items across all modes (flashcards, MCQ, product-ID) in due-date order; the session ends when due items are exhausted or the learner stops.

**Why this priority**: Spaced repetition is the single biggest study-efficiency lever for fact-heavy exam prep. Without a "what to study today" surface that's always one tap away, the spacing data is invisible to the user and the apps becomes a generic quiz tool. P1 because this is the difference between "another quiz app" and "a study coach."

**Independent Test**: As a learner with at least 5 items whose `next_review` is today or earlier across multiple modes, open the home screen. Verify the "Daily Review" CTA shows the correct count. Tap it. Verify the first item is the one with the oldest `next_review`, and that the session draws from multiple modes if applicable.

**Acceptance Scenarios**:

1. **Given** the learner has items due today, **When** they open `/`, **Then** the "Daily Review" CTA is visible above the fold and shows the exact count of due items.
2. **Given** the learner has zero items due today, **When** they open `/`, **Then** the "Daily Review" CTA is replaced by a "no reviews due — start a new session" surface.
3. **Given** the learner taps the CTA, **When** the session starts, **Then** items appear in `next_review` order (oldest first), each using its mode's native UI (flashcard flip, MCQ options, product-id categories).
4. **Given** the session is mid-flight, **When** all due items have been reviewed, **Then** the session ends with a results screen and a "review more from your weakest domain" CTA.

---

### User Story 2 — The Spacing Algorithm Schedules Reviews Sensibly (Priority: P1)

Every rating in any mode updates the affected progress entry's `next_review` per a simplified SM-2 algorithm: "Got it / correct" pushes the next review further out (doubling each consecutive correct), "Almost" pushes by one day, "Missed / incorrect" schedules tomorrow. The schedule is observable and explainable — a learner inspecting their progress can predict when an item will reappear.

**Why this priority**: US1 is meaningless without correct scheduling. If `next_review` were always "tomorrow," every item would show up every day and the spacing benefit collapses. P1 because the scheduling math is foundational to the whole feature.

**Independent Test**: Take a fresh question and rate it correctly on day 0. Verify `next_review = day 3`. Re-rate correctly on day 3; verify `next_review = day 6`. Re-rate correctly on day 6; verify `next_review = day 12`. Rate it "Missed" on day 12; verify `next_review = day 13` (tomorrow).

**Acceptance Scenarios**:

1. **Given** a brand-new entry, **When** rated "correct" the first time, **Then** `next_review` is set to 3 days from today.
2. **Given** an entry rated "correct" the previous time with a 3-day interval, **When** rated "correct" again, **Then** the new interval is 6 days from today.
3. **Given** any entry, **When** rated "almost," **Then** `next_review` is set to 1 day from today.
4. **Given** any entry, **When** rated "missed" / "incorrect," **Then** `next_review` is set to 1 day from today and the interval streak resets.

---

### User Story 3 — Daily Review Has a Sensible Daily Cap (Priority: P2)

If the learner has more due items than a reasonable single sitting (default 30), Daily Review caps the session at the daily limit. Remaining due items roll over to tomorrow. The learner can tap "Review more" to extend past the cap explicitly; doing so is recorded but not gamified (no extra XP), so the default behavior gently discourages cramming.

**Why this priority**: Without a cap, a learner returning after two weeks gets buried under hundreds of overdue items and gives up. The cap protects the streak from "all-or-nothing" failure modes. P2 because the unguarded case in US1 still works for a healthy daily cadence.

**Independent Test**: Make the learner's due list have 60 items. Open Daily Review. Verify the session caps at 30 and the home screen shows "30 more due — review again later" on completion. Tap "Review more" and verify the next 30 appear.

**Acceptance Scenarios**:

1. **Given** the learner has 60 due items, **When** they start Daily Review, **Then** the session contains 30 items and ends after the 30th.
2. **Given** the session ends with more due items remaining, **When** the results screen renders, **Then** it shows the remaining count and a "Review more" CTA.
3. **Given** the learner taps "Review more," **When** the new session starts, **Then** it draws the next 30 due items in `next_review` order.

---

### Edge Cases

- **All due items belong to a single mode**: Daily Review uses that mode end-to-end; no surprises.
- **An item is due but its question was removed from the bank**: the entry is silently skipped; if zero items remain, the session ends cleanly with a notice.
- **The learner crosses a timezone**: due-today calculation uses local time at the moment of session start.
- **A mid-session rating bumps an item back to today**: that item does not re-appear in the same Daily Review session; it will reappear tomorrow at earliest.
- **Two tabs open Daily Review at the same time**: both run independently; the second tab observes the first tab's writes when it reads next.
- **Daylight-saving time transition**: a "1-day interval" remains 24 hours; no half-day or 25-hour anomalies due to clock changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home screen MUST display a "Daily Review" surface whenever the learner has at least one item whose `next_review` is today or earlier.
- **FR-002**: The surface MUST show the exact count of due items.
- **FR-003**: Tapping the surface MUST start a session that consumes due items across all modes in `next_review`-ascending order.
- **FR-004**: Each item MUST be displayed using its native mode's UI (flashcard flip for flashcards, four-option MCQ for MCQs, four-option category for product-IDs).
- **FR-005**: A rating in Daily Review MUST update the underlying progress entry exactly as it would in the mode's standalone session.
- **FR-006**: `next_review` MUST be computed per a simplified SM-2 policy: "correct" doubles the previous interval (initial = 3 days), "almost" sets 1 day, "missed/incorrect" sets 1 day and resets the interval streak.
- **FR-007**: Daily Review MUST cap each session at 30 items by default; remaining due items roll over and surface tomorrow.
- **FR-008**: A "Review more" CTA MUST allow the learner to extend past the cap; sessions started via this CTA MUST NOT award the daily-streak XP bonus.
- **FR-009**: Daily Review sessions MUST be recorded as a `sessions` row (guest or authenticated) with `mode='daily-review'`.
- **FR-010**: Streak counting MUST treat any session whose `mode='daily-review'` as an active day for the streak.
- **FR-011**: Daily Review MUST function for both guest and authenticated learners.
- **FR-012**: Scheduling MUST be deterministic and explainable — given an entry's history of ratings, the same `next_review` is computed every time.
- **FR-013**: When the daily cap is reached and more items remain, the learner MUST see the remaining count with a clear "Review more" CTA.
- **FR-014**: When no items are due today, the home screen MUST replace the Daily Review CTA with a "no reviews due" message and a CTA to start a fresh-content session.

### Key Entities

- **DueItem**: A view computed at session start — `(question_id, mode, next_review)` for every entry whose `next_review ≤ today`, ordered by `next_review` ascending.
- **DailyReviewSession**: The in-flight session — the due list snapshot, current index, the cap, and the "extended past cap" flag.
- **SpacingPolicy**: The deterministic mapping from prior interval + new rating to the new interval. Tested in isolation in feature 008's plan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Daily Review CTA appears within 500 ms of opening `/` for any learner with due items, in 100% of runs.
- **SC-002**: The next-review interval for any given (prior interval, rating) pair is computed identically across 100 runs (determinism property).
- **SC-003**: After completing Daily Review, the home screen reflects the updated due count within five seconds.
- **SC-004**: A learner with 60 due items can complete the capped 30-item session in under 12 minutes at a normal pace.
- **SC-005**: Cross-mode interleaving works in 100% of runs: a session with due items from multiple modes presents each item with its mode's native UI.
- **SC-006**: Lighthouse Accessibility ≥ 90 on the in-session screen and the results screen.

## Assumptions

- All three modes (features 004, 005, 006) write `next_review` correctly to their respective progress entries. This feature consumes that data; it does not duplicate the scheduling logic in each mode.
- The default daily cap of 30 items is fixed for v1; per-learner configuration is out of scope.
- The XP rules from feature 007 apply: Daily Review sessions earn XP per rating; the daily-streak bonus is awarded once per streak day for the first session of that day, including Daily Review.
- The SM-2 simplification (no per-card "ease factor," just interval doubling on correct) is the v1 algorithm; full SM-2 is post-launch.
- Items removed from the bank after the learner answered them are simply skipped during session composition; orphaned entries persist in the store until cleaned up by a future maintenance feature.
- The "review more from your weakest domain" CTA at session end uses the domain data from feature 007.
