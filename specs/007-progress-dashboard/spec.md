# Feature Specification: Progress Dashboard

**Feature Branch**: `007-progress-dashboard`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Progress dashboard: stats, streaks, weak areas" (Phase 2 of AI300-Game-Spec.md §13, expanded per §10.2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A Learner Sees Their Overall Progress at a Glance (Priority: P1)

A learner taps the Progress tab and lands on a single screen that summarizes their study state: current streak (days), current XP and level, total questions seen, overall accuracy percentage, and the most-recent session's outcome. Each number is current within five seconds of the last completed action.

**Why this priority**: The dashboard is the place where gamification actually motivates. Without it, the streak/XP counters elsewhere are decorative numbers with no narrative. P1 because returning to a fresh "you're on day 4 of a streak" view is the habit-forming hook.

**Independent Test**: Complete a flashcard or MCQ session. Open `/progress` immediately afterward. Verify the streak number, XP delta, and most-recent-session row all reflect the just-completed activity.

**Acceptance Scenarios**:

1. **Given** a returning learner with prior progress, **When** they open `/progress`, **Then** the screen renders streak days, XP total, level badge, total questions seen, overall accuracy %, and the most-recent session summary within two seconds.
2. **Given** the learner just completed a session, **When** they navigate to `/progress`, **Then** every counter reflects that session's contribution.
3. **Given** a brand-new learner with no activity, **When** they open `/progress`, **Then** an empty-state surface invites them to "Start a session" with no broken zero-value charts.

---

### User Story 2 — A Per-Domain Radar Chart Highlights Strengths and Weaknesses (Priority: P1)

The dashboard renders a five-axis radar chart, one axis per AI-300 domain, where each axis shows the learner's accuracy in that domain. Domains where the learner has answered fewer than five questions render as dotted/translucent axes ("not enough data"). Below the chart, a "weak areas" list names every domain at or below the configured threshold (default 60%) with a one-tap CTA to start a study session there.

**Why this priority**: The single biggest study-efficiency lever is "study what you suck at." The radar chart makes weakness visible at a glance and the weak-areas CTA closes the loop into action. P1 because it transforms the dashboard from a leaderboard into a study coach.

**Independent Test**: With at least five answered questions in two different domains where one is below 60% and one is above, open `/progress`. Verify the radar shows distinct values for those two axes, the weak axis is flagged in the weak-areas list, and tapping the CTA opens a session pre-filtered to that domain.

**Acceptance Scenarios**:

1. **Given** the learner has answered ≥5 questions in every domain, **When** the dashboard renders, **Then** all five axes are solid and the radar shape reflects the per-domain accuracy.
2. **Given** the learner has answered fewer than 5 in some domain, **When** the dashboard renders, **Then** that axis is dimmed and labeled "Not enough data yet."
3. **Given** at least one domain is below 60%, **When** the dashboard renders, **Then** a "Focus areas" list names those domains, each with a CTA that opens a pre-filtered session.

---

### User Story 3 — A Streak Calendar Visualizes Daily Activity (Priority: P2)

The dashboard includes a 12-week calendar of "active days" — every day on which the learner completed at least one session is filled in; gaps are visible as empty days. Tapping a filled day expands a tooltip with that day's session count and minutes-studied total.

**Why this priority**: The "don't break the chain" effect is one of the most-cited drivers of habit formation in study apps. P2 because the streak counter in US1 already conveys the current chain; the calendar is the longer-term motivator.

**Independent Test**: Verify that the calendar renders one cell per day for the past 12 weeks, that days with completed sessions are filled and days without are not, and that tapping a filled cell shows the session count for that day.

**Acceptance Scenarios**:

1. **Given** the learner has completed sessions on 4 of the past 7 days, **When** the calendar renders, **Then** exactly those 4 days are filled and the other 3 are empty.
2. **Given** the learner taps a filled day, **When** the tooltip appears, **Then** it shows the count of sessions completed that day and the total study minutes.
3. **Given** a day before the learner's first-ever session, **When** the cell renders, **Then** it appears as an inactive empty cell, not a "missed" cell.

---

### Edge Cases

- **Brand-new learner with zero activity**: charts render the empty state (empty radar with "Start a session" CTA, calendar with no fills, weak-areas list hidden). No broken zero-line charts.
- **Learner with activity entirely in one domain**: radar shows one filled axis; the other four are dimmed "not enough data" axes.
- **Streak calendar timezone transitions**: a session that crosses midnight in the learner's local time counts toward the day it started.
- **Per-domain percentage is exactly 60%**: that domain is not flagged as weak (the threshold is "below 60%", not "at or below").
- **The dashboard is opened mid-session in a second tab**: it shows pre-session counters and updates within five seconds of session-end events from the other tab.
- **A learner who deleted their account opens the dashboard route after sign-out**: they see the guest-mode dashboard reflecting the new browser state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST live at `/progress` and MUST be reachable from primary in-app navigation.
- **FR-002**: The dashboard MUST display the following metrics: current streak (days), current XP total, current level, total questions seen, overall accuracy percentage, most-recent session summary.
- **FR-003**: The dashboard MUST display a five-axis radar chart, one axis per AI-300 domain, with per-domain accuracy as the magnitude.
- **FR-004**: For domains with fewer than 5 answered questions, the axis MUST render as a dimmed "not enough data" axis with a tooltip explaining why.
- **FR-005**: Below the radar, the dashboard MUST list "Focus areas" — every domain strictly below 60% accuracy — with a one-tap CTA per entry that opens a pre-filtered session.
- **FR-006**: The dashboard MUST display a 12-week activity calendar with one cell per day, filled when at least one session completed that day.
- **FR-007**: Tapping a filled calendar cell MUST show a tooltip with the number of sessions and total minutes studied that day.
- **FR-008**: All counters MUST be current within five seconds of the last completed action across all open tabs / windows in the same browser.
- **FR-009**: An empty-state surface MUST be shown when the learner has no activity, with a primary CTA to start a session.
- **FR-010**: The dashboard MUST be read-only — it does not provide any write controls beyond navigation.
- **FR-011**: All dashboard data MUST be derived from existing tables (`profiles`, `user_progress`, `sessions`) — no new write-path is introduced.
- **FR-012**: The dashboard MUST function for both guest and authenticated learners, reading from local storage or Supabase respectively with no UI difference.
- **FR-013**: Streak is defined as the longest current run of consecutive local-time days in which the learner completed at least one session. Today counts only if today's session(s) exist.
- **FR-014**: XP increments per action are: +10 per correct answer (any mode), +5 per "Almost" rating, 0 per "Missed"; +50 bonus per complete session; +20 daily-streak bonus for the first session of each new day in a streak ≥ 2.
- **FR-015**: Level thresholds are: 1 = 0 XP, 2 = 500 XP, 3 = 2000 XP, 4 = 5000 XP.
- **FR-016**: Visual elements MUST meet WCAG 2.1 AA contrast in both themes; the radar chart MUST be legible to common color-blindness types (use shape + position cues, not color alone).

### Key Entities

- **DomainAccuracy**: Per-(learner, domain) rollup — answered count, correct count, percentage. Computed from `user_progress`.
- **StreakRecord**: Per-learner — current run length, longest run, list of active dates for the calendar.
- **LevelRule**: Static mapping from cumulative XP to level number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The dashboard renders fully in under two seconds on a typical mobile connection for a learner with up to 1000 progress rows.
- **SC-002**: Counters update within five seconds of a session-end event triggered in another tab in 100% of test runs.
- **SC-003**: The "Focus areas" list flags every domain strictly below 60% and only those, verified by automated comparison against the underlying data.
- **SC-004**: Tapping a "Focus areas" CTA opens a session pre-filtered to that domain in 100% of test runs.
- **SC-005**: The empty-state surface renders without errors for a brand-new learner (no broken charts, no NaN values).
- **SC-006**: Lighthouse Accessibility ≥ 90 on `/progress` with full keyboard navigation verified.

## Assumptions

- All required data already exists in `profiles`, `user_progress`, and `sessions` (feature 001), and is written to by features 004–006.
- The radar chart library used renders accessibly (data table fallback for screen readers, focusable axes).
- The XP and level rules are the v1 numbers; tuning is post-launch.
- The 60% weak threshold and the 5-answer minimum for "enough data" are fixed for v1.
- The 12-week calendar window is fixed for v1; longer history views are out of scope.
- Time zones are taken from the browser. Crossing time zones during a streak is tolerated by the "longest current run" definition.
