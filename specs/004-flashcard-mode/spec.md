# Feature Specification: Flashcard Mode

**Feature Branch**: `004-flashcard-mode`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Flashcard mode (static, no AI)" (Phase 1 of AI300-Game-Spec.md §13, expanded per §6.1)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Learner Can Run a Flashcard Session (Priority: P1)

A learner opens the flashcard mode, picks a topic (or "random mix"), chooses a session length (10, 20, or 30 cards), and is shown one card at a time. Each card displays a concept or term on the front; tapping flips it to show the definition. After flipping, the learner self-rates: "Got it ✓," "Almost," or "Missed ✗." Ratings drive the next card; the session ends after the chosen card count, and a brief results summary closes the loop.

**Why this priority**: Flashcards are the fastest path to a playable, study-relevant moment. They prove the data layer's read path end-to-end and exercise the guest progress store. They are the smallest non-zero step from "skeleton" to "actually useful study tool."

**Independent Test**: As a guest learner, start a session in the Networking topic with 10 cards. Flip and rate each card. Verify the session ends after exactly 10 cards, the results screen shows three counts (got it / almost / missed) summing to 10, and the progress store now contains one entry per rated question.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** the learner taps the flashcards CTA, **Then** they reach the mode selector showing a topic picker, "random mix" option, and session-length choices.
2. **Given** the learner picks a topic and length, **When** they tap "Start," **Then** the first card renders with the front visible, the flip control discoverable, and a progress bar showing "1 / N."
3. **Given** a visible front, **When** the learner taps the card, **Then** the card animates a flip and reveals the back; the three rating controls appear in the lower portion of the screen.
4. **Given** any visible card, **When** the learner swipes right or left on mobile, **Then** the swipe is interpreted as "Got it" or "Missed" respectively (with an equivalent on-screen button always available).
5. **Given** the chosen number of cards have been rated, **When** the last rating is submitted, **Then** the results screen appears with counts per rating and a "study another topic" CTA.

---

### User Story 2 — Session Composition Surfaces Cards That Need Review First (Priority: P2)

When a learner who has prior progress starts a new flashcard session, cards that are due for review (per the entry's `next_review` date in their progress store) appear ahead of cards they have never seen. Within each group, ordering is randomized to avoid memorization-by-position.

**Why this priority**: A static, pure-random selection works and is the P1 fallback. Surfacing due cards first is what makes the experience feel intelligent and what justifies the spaced-repetition fields in the data model. P2 because it's a meaningful quality improvement, not a blocker.

**Independent Test**: As a learner with at least one card whose `next_review` is today or earlier, start a session. Verify the first card shown is a due card. Verify that a card whose `next_review` is in the future is not chosen until all due cards in the topic have been served.

**Acceptance Scenarios**:

1. **Given** the learner has 3 due cards and 20 new cards for the chosen topic, **When** they start a 10-card session, **Then** the first 3 cards are the due ones (in randomized order) and the remaining 7 are new (also randomized).
2. **Given** the learner has more due cards than the session length, **When** they start a session of N cards, **Then** all N cards are due cards.

---

### User Story 3 — Ratings Update the Progress Store With Correct Next-Review Dates (Priority: P2)

Each rating a learner gives advances the affected card's progress entry in line with the spaced-repetition policy. "Got it" pushes the next review further out; "Almost" pushes it by a small amount; "Missed" schedules review for tomorrow. The store reflects the change before the next card is shown.

**Why this priority**: Without correct write-back, the bank-aware ordering in US2 has no fresh data to read from on the next session, and the gamification (streak, XP, level progression) has no source of truth. P2 because the smaller "session works" loop in US1 is intact even if the spacing is naïve.

**Independent Test**: Start a session of 1 card from a fresh topic. Rate the card "Got it." Inspect the progress store: the entry exists, `times_seen` is 1, `times_correct` is 1, `last_rating` is `correct`, and `next_review` is at least 1 day in the future. Repeat with "Almost" and "Missed" ratings on different cards and verify the differing `next_review` distances.

**Acceptance Scenarios**:

1. **Given** a card the learner has not seen before, **When** they rate it "Got it ✓," **Then** the resulting progress entry has `times_seen=1`, `times_correct=1`, `last_rating='correct'`, and `next_review` at least 3 days out.
2. **Given** a card with prior `times_seen=2`, **When** the learner rates it "Missed ✗," **Then** `times_correct` is unchanged, `last_rating` is `missed`, and `next_review` is tomorrow's date.
3. **Given** any rating is submitted, **When** the next card is requested, **Then** the just-rated entry is observable in the store before the next card renders.

---

### Edge Cases

- **The bank has fewer cards than the requested session length** for the chosen topic: the session shrinks to what's available and a notice tells the learner the session was shortened.
- **The learner taps the rating buttons rapidly on consecutive cards**: writes do not interleave or lose order; the store reflects the rating sequence in submission order.
- **The learner navigates away mid-session**: any ratings already submitted are persisted; the partial session is not recoverable on return (the session counter resets).
- **The learner is on a slow connection and the next card's payload is delayed**: the progress bar pauses on the current card; no flicker or layout shift; the next card appears when ready.
- **A card's `content.back` exceeds the visual budget**: the back scrolls within the card area; the rating controls remain pinned in the lower band.
- **The learner has guest progress and then signs in mid-session**: the session continues to the guest store; the migration prompt (feature 003) appears after the session ends, not during.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The flashcard mode MUST be reachable from the home screen and from `/learn`, and MUST live at the route `/learn/flashcards`.
- **FR-002**: Before a session starts, the learner MUST pick a topic (or "random mix") and a session length (one of 10, 20, 30).
- **FR-003**: A session MUST consume cards exclusively from the curated bank where `type='flashcard'` and the chosen topic (or all topics if "random mix").
- **FR-004**: Each card MUST initially show only the front; the back MUST be hidden until the learner explicitly flips it.
- **FR-005**: Flipping a card MUST be triggered by a tap on the card or by an explicit "Show answer" control.
- **FR-006**: After the back is shown, the learner MUST see three rating controls: "Got it ✓," "Almost," and "Missed ✗."
- **FR-007**: On mobile breakpoints, swipe right MUST be interpreted as "Got it ✓" and swipe left as "Missed ✗"; equivalent on-screen buttons MUST always be available.
- **FR-008**: Each rating MUST result in a write to the progress store: `times_seen` incremented, `times_correct` incremented only on "Got it ✓," `last_rating` set, and `next_review` advanced per the policy in AI300-Game-Spec.md §9.
- **FR-009**: When a learner with prior progress starts a session, cards whose `next_review` is today or earlier MUST be served before unseen cards in the chosen topic.
- **FR-010**: A session MUST end automatically after the chosen number of cards have been rated; results MUST be shown immediately.
- **FR-011**: The results screen MUST show counts for "Got it," "Almost," and "Missed," the session duration, and a CTA to start another session.
- **FR-012**: A progress bar MUST be visible during the session indicating cards remaining (e.g., "3 / 20").
- **FR-013**: Streak and XP indicators MUST be visible during the session and MUST update at session end based on completion and ratings.
- **FR-014**: The mode MUST function for both guest and authenticated learners with no functional difference beyond which store (local vs. Supabase) is read and written.
- **FR-015**: The flashcard flip animation MUST be skippable for users with the `prefers-reduced-motion` setting.
- **FR-016**: Card readability MUST meet WCAG 2.1 AA contrast in both light and dark themes.

### Key Entities

- **FlashcardSession**: An in-progress session — chosen topic, requested length, list of selected card ids in serve order, current index, start time. Ephemeral; not persisted.
- **CardRating**: A single rating event — `question_id`, rating (`correct` | `almost` | `missed`), timestamp. Drives the progress-store write.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can complete a 10-card session in under 90 seconds when answering quickly (average ~9 seconds per card including flip + rate).
- **SC-002**: 100% of submitted ratings result in a corresponding progress-store update observable on the next session (no lost writes).
- **SC-003**: Card flip animation completes in under 400ms and the rating controls become reachable immediately afterward.
- **SC-004**: When prior due cards exist, at least one due card appears in the first three cards of the new session in 100% of runs.
- **SC-005**: Initial flashcard route bundle stays under 100 KB gzipped additional weight beyond the base scaffold.
- **SC-006**: Lighthouse Accessibility ≥ 90 on the session screen, with keyboard equivalents for swipe gestures verified.

## Assumptions

- The flashcard data shape is the one defined in feature 001's contract (`flashcard.schema.json`).
- The spaced-repetition policy is the simplified SM-2 variant described in AI300-Game-Spec.md §9; tuning the parameters is out of scope.
- No runtime AI is invoked per Principle III — there are no on-demand generated cards. The 50-item seed bank is sufficient for this feature.
- "Random mix" is the union of all topics across all five AI-300 domains, filtered to `type='flashcard'`.
- Card text is plain text in v1; rich content (code blocks, images, links inside the back) is out of scope.
- The session is not interrupted by external events (push notifications, app updates). If interrupted, ratings already submitted are persisted but the session does not resume.
- This feature does not implement the "daily review" home-screen surface — that is feature 008. It does, however, write the data that feature 008 will read.
