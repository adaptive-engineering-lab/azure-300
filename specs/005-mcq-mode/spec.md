# Feature Specification: Multiple-Choice Quiz Mode

**Feature Branch**: `005-mcq-mode`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "MCQ mode (timer optional) + results screen with domain breakdown" (Phase 1–2 of AI300-Game-Spec.md §13, expanded per §6.2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Learner Can Run a Multiple-Choice Quiz Session (Priority: P1)

A learner picks a topic, difficulty, and question count, optionally enables a 45-second-per-question timer, and is shown one MCQ at a time. Each question displays four options (A/B/C/D). Tapping an option submits an answer; correct picks render green with a one-line explanation, incorrect picks render red on the chosen option, green on the correct one, with the full explanation. The session ends after the chosen question count and shows a results screen with the score percentage, time taken, and a per-domain breakdown.

**Why this priority**: MCQs are the closest format to the AI-300 exam itself. They are the most exam-relevant practice mode and the most-asked-for in similar prep tools. This story delivers a complete exam-style loop.

**Independent Test**: As a learner, start a 5-question MCQ session in Identity & Governance at difficulty 2 with the timer off. Answer each question. Verify per-answer feedback renders the correct color, the explanation appears, and the results screen at the end shows score percentage and a chart with at least the Identity domain represented.

**Acceptance Scenarios**:

1. **Given** the mode selector, **When** the learner picks topic, difficulty, count, and tap "Start," **Then** the first question renders with four tappable options and a progress indicator showing "1 / N."
2. **Given** a visible question, **When** the learner taps a correct option, **Then** that option highlights green, a brief explanation appears, and a "Next" control becomes available.
3. **Given** a visible question, **When** the learner taps an incorrect option, **Then** that option highlights red, the correct option highlights green, the full explanation appears, and "Next" becomes available.
4. **Given** the last question is answered, **When** the learner taps "Next," **Then** the results screen appears showing the score percentage, total time taken, and a per-domain breakdown chart.

---

### User Story 2 — Optional Per-Question Timer Adds Exam-Like Pacing (Priority: P2)

The learner can enable a per-question timer in the mode selector. When enabled, each question shows a 45-second countdown ring around the question number. If the countdown reaches zero before the learner answers, the question is marked incorrect, the correct answer is revealed with the explanation, and the session continues.

**Why this priority**: The real AI-300 exam pace is roughly 90 seconds per question; pacing practice is widely requested. P2 because the un-timed mode in US1 delivers the core value; the timer is the pressure-mode add-on.

**Independent Test**: Start an MCQ session with the timer enabled. On one question, allow the timer to expire without answering. Verify the question is recorded as incorrect, the correct answer is revealed with the explanation, and the session advances to the next question.

**Acceptance Scenarios**:

1. **Given** the timer is enabled and a question is visible, **When** 45 seconds elapse without an answer, **Then** the question is auto-marked incorrect, the correct option highlights green, the explanation appears, and "Next" becomes available.
2. **Given** the learner is mid-question with the timer running, **When** they tap an option, **Then** the timer stops at the current value and the feedback flow proceeds as if the timer were off.
3. **Given** an answered question with the timer disabled, **When** the next question loads, **Then** no countdown ring is visible.

---

### User Story 3 — The Results Screen Surfaces Weak Domains (Priority: P2)

At session end, the learner sees a results screen with the overall score, the time taken, and a per-domain accuracy breakdown — a chart showing percentage correct in each domain that appeared in the session. Domains where the learner scored below 60% are flagged as "weak," with a CTA to "Review missed" that starts a flashcard session limited to those weak domains.

**Why this priority**: This is the bridge from "I took a quiz" to "I know what to study next" and is the data signal that justifies multi-mode learning. P2 because the results screen in US1 already shows score + time; the domain breakdown and the weak-area CTA are the upgrade.

**Independent Test**: Take a quiz that draws from multiple domains and intentionally answer some questions in one domain wrong to drop it below 60%. Verify that domain is flagged on the results screen and the "Review missed" CTA opens a flashcard session pre-filtered to that domain.

**Acceptance Scenarios**:

1. **Given** a completed session covering at least two domains, **When** the results screen renders, **Then** a per-domain accuracy chart shows the percentage correct in each domain that appeared.
2. **Given** the learner scored below 60% in any domain, **When** the results screen renders, **Then** that domain is visually flagged "weak" and a "Review missed" CTA is prominent.
3. **Given** the learner taps "Review missed," **When** the flashcard mode opens, **Then** its topic filter is pre-populated to include only the flagged weak domains.

---

### Edge Cases

- **The learner taps an option, the network drops, and the write to the progress store fails**: the UI shows the correct/incorrect feedback regardless; the write is retried in the background; if it ultimately fails, the user is told at session end that their results are local-only until they reconnect.
- **The timer is enabled and the device clock changes mid-session** (timezone or daylight saving): the timer uses monotonic time, not wall clock, so it is unaffected.
- **The learner closes the app mid-session**: answers already submitted are persisted; the partial session is not resumable. The session counter resets on next start.
- **All questions in the chosen topic are at a different difficulty than requested**: the session shrinks to what's available and a notice tells the learner the session was shortened.
- **A question's explanation is unusually long**: the explanation panel scrolls within its container; "Next" remains reachable.
- **The bank has zero questions matching the chosen topic + difficulty**: a friendly empty-state surface tells the learner and offers to broaden the filter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The MCQ mode MUST live at `/learn/quiz` and MUST be reachable from `/learn`.
- **FR-002**: Before a session starts, the learner MUST pick a topic, a difficulty level (1, 2, or 3), and a question count (one of 5, 10, 20). The timer choice is optional and disabled by default.
- **FR-003**: A session MUST draw questions exclusively from the bank where `type='mcq'`, matching the chosen topic and difficulty.
- **FR-004**: Each question MUST display the question text and exactly four options labeled A, B, C, D.
- **FR-005**: Tapping an option MUST immediately reveal feedback: correct picks render in a success color with the short explanation; incorrect picks render in an error color on the chosen option, success color on the correct option, and show the full explanation.
- **FR-006**: After feedback is shown, a "Next" control MUST be available to advance.
- **FR-007**: Each answered question MUST result in a `user_progress` (or guest-store equivalent) write: `times_seen` incremented, `times_correct` incremented only on correct, `last_rating` set to `correct` if right or `missed` if wrong, and `next_review` advanced per the policy.
- **FR-008**: If the timer is enabled, each question MUST display a visible countdown of 45 seconds from question load.
- **FR-009**: If the countdown reaches zero, the question MUST be auto-marked incorrect and the correct answer revealed.
- **FR-010**: At session end, a results screen MUST show: overall score percentage, total time taken, per-domain accuracy chart, and a "weak domains" flag for any domain below 60%.
- **FR-011**: The results screen MUST offer a "Review missed" CTA that starts a flashcard session pre-filtered to the flagged weak domains (or to all missed questions if zero domains hit the threshold).
- **FR-012**: A session MUST record a `sessions` row (or guest-store equivalent) on completion with `mode='mcq'`, the topic filter, `score_pct`, `duration_seconds`, and `completed_at`.
- **FR-013**: Streak and XP indicators MUST update at session end based on completion and accuracy.
- **FR-014**: On desktop viewports, A/B/C/D keys MUST select the matching option, and Space or Enter MUST advance to the next question.
- **FR-015**: The mode MUST function for both guest and authenticated learners with no behavior differences besides which store is read and written.
- **FR-016**: Visual elements MUST meet WCAG 2.1 AA contrast in both themes; success/error colors MUST be distinguishable for the most common forms of color blindness.

### Key Entities

- **QuizSession**: An in-progress session — topic, difficulty, requested count, timer flag, list of selected `question_id`s, current index, per-question start timestamps. Ephemeral.
- **QuizAnswer**: A single answer event — `question_id`, chosen option, correct flag, elapsed seconds.
- **DomainBreakdown**: Per-domain rollup computed at session end — domain, count answered, count correct, percentage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can complete a 10-question untimed session in under 5 minutes when answering at a normal pace.
- **SC-002**: 100% of answered questions result in a corresponding progress-store update observable on the next session.
- **SC-003**: Per-question feedback appears within 250 ms of an option tap (perceived-instant).
- **SC-004**: When at least one domain falls below 60% in a session, the weak-domain flag and the "Review missed" CTA appear on the results screen in 100% of runs.
- **SC-005**: The timer's reported elapsed time agrees with a stopwatch on a fresh device to within ±2 seconds over a full 45-second countdown.
- **SC-006**: Lighthouse Accessibility ≥ 90 on the session and results screens, with keyboard-driven option selection verified.

## Assumptions

- The MCQ data shape is the one defined in feature 001's contract (`mcq.schema.json`).
- Explanations live with the questions in the bank — no runtime AI generation per Principle III. Every seed MCQ already ships with an `explanation`.
- "Random mix" is not offered for MCQ in v1; topic must be chosen explicitly to keep the per-domain breakdown meaningful.
- 45 seconds is the per-question timer for v1; configurable timers are out of scope.
- "Review missed" opens a flashcard session limited to the missed questions in the flagged domains. It does not generate new flashcards for those questions.
- Streak/XP increments are visible in this feature but the specific algorithm (XP per correct, streak rules) is owned by feature 008.
- Per-question images, code blocks, and rich content are out of scope; questions are plain text plus four plain-text options.
- The flagging threshold of 60% is fixed for v1.
