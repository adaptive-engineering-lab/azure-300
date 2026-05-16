# Feature Specification: Code Review Mode

**Feature Branch**: `006-code-review-mode`
**Created**: 2026-05-16
**Status**: Draft
**Replaces**: `006-product-id-mode` (not applicable for AI-300 — insufficient product breadth)

---

## Context

AI-300 tests a learner's ability to *operate* a small set of tools deeply —
Azure Machine Learning, Microsoft Foundry, GitHub Actions, MLflow. The exam
regularly surfaces YAML configuration, Python API calls, and CLI snippets as
the basis for scenario questions. Code Review mode mirrors this: a learner
sees a real-looking snippet and must identify what is wrong, missing, or
correct — the same cognitive skill the exam tests.

This mode replaces Product-ID for the AI-300 app. It is not being
backported to AZ-104.

---

## User Scenarios & Testing

### User Story 1 — Learner Spots the Bug in a Snippet (Priority: P1)

A learner is shown a short code or YAML snippet (8–20 lines) with a single
deliberate flaw. Four labelled options describe what is wrong. The learner
picks one, sees immediate feedback — correct/incorrect, the right answer
highlighted, and a plain-English explanation of why the flaw matters and
what the correct version looks like.

**Why this priority**: This is the core loop. Everything else in this mode
is additive. A working single-bug-find session is a shippable P1.

**Independent Test**: Load a session with 5 snippet items. Answer each.
Verify correct picks show success state, incorrect picks show error state
with correct option highlighted, explanation renders after every pick,
and progress writes (`times_seen`, `times_correct`, `last_rating`) fire
on each answer.

**Acceptance Scenarios**:

1. **Given** a learner starts a Code Review session, **When** the first
   snippet loads, **Then** the snippet is displayed with syntax highlighting,
   four options are visible, and no option is pre-selected.
2. **Given** the learner picks the correct option, **When** the pick is
   submitted, **Then** the chosen option renders in success color, the
   explanation appears, and a progress write fires.
3. **Given** the learner picks an incorrect option, **When** the pick is
   submitted, **Then** the chosen option renders in error color, the correct
   option renders in success color, the explanation appears, and a progress
   write fires with `last_rating: "missed"`.
4. **Given** the learner completes all items in the session, **When** the
   last item is answered, **Then** the results screen shows score %, time
   taken, and a list of any missed snippets with their correct answers.

---

### User Story 2 — Learner Identifies What a Correct Snippet Does (Priority: P2)

A variant sub-mode: the snippet is correct and the learner must identify
what it will do or what it configures. Four options describe possible
behaviours or outcomes. This tests comprehension rather than bug-finding
and maps to exam questions of the form "Given this configuration, what
happens?"

**Why this priority**: Deepens the mode without new infrastructure — same
schema, same component, different `sub_mode` field. P2 because P1's
bug-find loop is complete without it.

**Independent Test**: Load a `what-does-this-do` session. Answer 5 items.
Verify the header correctly labels the sub-mode as "What does this do?"
rather than "Find the bug", and that the same feedback/progress mechanics
from US1 apply.

**Acceptance Scenarios**:

1. **Given** a `what-does-this-do` item loads, **When** the learner reads
   the prompt, **Then** the prompt text asks what the snippet does (not
   what is wrong).
2. **Given** the learner picks the correct behaviour, **When** the pick
   is submitted, **Then** feedback and progress writes behave identically
   to US1.

---

### User Story 3 — Learner Completes a Blank (Priority: P3)

A variant sub-mode: the snippet has one value replaced with `___BLANK___`.
The learner picks the correct replacement from four options. Maps directly
to fill-in-the-blank exam scenarios (e.g. "What value completes this
sweep job config?").

**Why this priority**: The most exam-authentic sub-mode but requires the
frontend to render a blank placeholder distinctly. P3 — standalone value
only after P1 and P2 ship.

**Independent Test**: Load a `fill-the-blank` session. Verify `___BLANK___`
renders as a visually distinct inline placeholder (e.g. highlighted box).
Pick correct and incorrect options; verify same feedback behaviour as US1.

**Acceptance Scenarios**:

1. **Given** a `fill-the-blank` item, **When** the snippet renders,
   **Then** `___BLANK___` appears as a visually distinct placeholder
   in the code block (not raw underscore text).
2. **Given** the learner picks the correct completion, **When** submitted,
   **Then** the blank in the snippet is replaced with the correct value
   in the success state rendering.

---

### Edge Cases

- Snippet longer than the viewport on mobile: must be scrollable within
  its container; options stay visible below the code block without the
  learner needing to scroll past them.
- Learner navigates away mid-session: in-progress session state is
  preserved in local storage; returning to the route resumes from the
  same item.
- All four options are very similar (e.g. four numeric values): the
  options list must not truncate or collapse; full option text always
  visible.
- Session bank has fewer items than the requested session length: session
  runs with however many items are available; no error state.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST display code and YAML snippets with syntax
  highlighting appropriate to the language (`python`, `yaml`, `bash`).
- **FR-002**: The system MUST present exactly four labelled options (A–D)
  per item, with no pre-selection on load.
- **FR-003**: The system MUST render the correct option in success color
  and any incorrect pick in error color after the learner submits.
- **FR-004**: The system MUST display the item's `explanation` field
  immediately after the learner submits, regardless of correctness.
- **FR-005**: The system MUST write a progress record (`times_seen`,
  `times_correct`, `last_rating`, `next_review`) on every answered item.
- **FR-006**: The system MUST write a `sessions` row with
  `mode='code-review'` on session completion.
- **FR-007**: The system MUST support three sub-modes controlled by the
  item's `sub_mode` field: `find-the-bug`, `what-does-this-do`,
  `fill-the-blank`.
- **FR-008**: The system MUST render `___BLANK___` in `fill-the-blank`
  items as a visually distinct placeholder, not as literal underscores.
- **FR-009**: The system MUST display the language label (`Python`,
  `YAML`, `Bash`) above or within the code block.
- **FR-010**: The system MUST show a results screen on session completion
  with: score %, time taken, list of missed items with correct answers.
- **FR-011**: The system MUST preserve in-progress session state across
  page reloads for both guest and authenticated learners.
- **FR-012**: The system MUST function for both guest and authenticated
  learners with no behavioural differences beyond which store is written.
- **FR-013**: Items MUST be filterable by `domain`, `topic`, `sub_mode`,
  and `difficulty` when building a session.
- **FR-014**: The code block MUST be horizontally scrollable on mobile
  for snippets wider than the viewport; options MUST remain below and
  always visible without horizontal scroll.

### Key Entities

- **CodeReviewItem**: One displayed item — the snippet, language, sub_mode,
  four options, correct option, and explanation. Stored as a `questions`
  row with `type='code-review'`.
- **CodeReviewSession**: The in-progress session state — current item
  index, answers so far, elapsed time. Lives in Zustand / local storage
  until completion.
- **CodeReviewResult**: The post-session summary — score, time, per-item
  breakdown of correct/incorrect with correct answers for misses.

---

## Schema

### questions row — `type: "code-review"`

The `content` JSONB column carries the code-review payload.

```json
{
  "id": "<uuid>",
  "type": "code-review",
  "domain": "ml-lifecycle",
  "topic": "Hyperparameter Tuning",
  "difficulty": 2,
  "source": "ai-generated",
  "reviewer_id": "XY",
  "reviewed_at": "2026-05-16T00:00:00Z",
  "tags": ["ml-lifecycle", "hyperparameter-tuning", "level-2"],
  "content": {
    "sub_mode": "find-the-bug",
    "language": "python",
    "snippet": "from azure.ai.ml.sweep import Choice, Normal\n\ncommand_job_for_sweep = job(\n    batch_size=Choice(values=[16, 32, 64]),\n    learning_rate=Normal(mu=10, sigma=3),\n)\n\nsweep_job = command_job_for_sweep.sweep(\n    sampling_algorithm=\"bayesian\",\n    primary_metric=\"accuracy\",\n    goal=\"maximize\"\n)",
    "prompt": "This sweep job will fail at runtime. What is wrong?",
    "options": {
      "A": "Normal() is not supported with Bayesian sampling",
      "B": "Choice() requires a range() instead of a list",
      "C": "The goal should be set to 'minimize' for accuracy",
      "D": "sweep() must be called before defining the search space"
    },
    "correct": "A",
    "explanation": "Bayesian sampling only supports Choice, Uniform, and QUniform expressions. Normal and LogNormal are continuous distributions that Bayesian cannot handle — the job raises a validation error at submission. The fix is to replace Normal(mu=10, sigma=3) with Uniform(min=1, max=20) or a Choice of discrete values."
  }
}
```

### Sub-mode values and prompts

| `sub_mode` | Prompt pattern | Correct answer is |
|------------|---------------|-------------------|
| `find-the-bug` | "What is wrong with this snippet?" | The flaw description |
| `what-does-this-do` | "What will this snippet do?" | The correct behaviour |
| `fill-the-blank` | "Which value completes this snippet?" | The correct replacement for `___BLANK___` |

### Language values

`python` · `yaml` · `bash`

---

## JSON Schema Contract (`code-review.schema.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai300game.local/contracts/code-review.schema.json",
  "title": "Code Review Item",
  "type": "object",
  "required": ["id", "type", "domain", "topic", "difficulty", "source", "content"],
  "additionalProperties": false,
  "properties": {
    "id":          { "type": "string", "format": "uuid" },
    "type":        { "const": "code-review" },
    "domain":      { "$ref": "#/$defs/domain" },
    "topic":       { "type": "string", "minLength": 1 },
    "difficulty":  { "type": "integer", "minimum": 1, "maximum": 3 },
    "source":      { "$ref": "#/$defs/source" },
    "reviewer_id": { "type": "string", "minLength": 1 },
    "reviewed_at": { "type": "string", "format": "date-time" },
    "tags":        { "type": "array", "items": { "type": "string" } },
    "content": {
      "type": "object",
      "required": ["sub_mode", "language", "snippet", "prompt", "options", "correct", "explanation"],
      "additionalProperties": false,
      "properties": {
        "sub_mode":    { "enum": ["find-the-bug", "what-does-this-do", "fill-the-blank"] },
        "language":    { "enum": ["python", "yaml", "bash"] },
        "snippet":     { "type": "string", "minLength": 1, "maxLength": 2000 },
        "prompt":      { "type": "string", "minLength": 1, "maxLength": 200 },
        "options": {
          "type": "object",
          "required": ["A", "B", "C", "D"],
          "additionalProperties": false,
          "properties": {
            "A": { "type": "string", "minLength": 1, "maxLength": 240 },
            "B": { "type": "string", "minLength": 1, "maxLength": 240 },
            "C": { "type": "string", "minLength": 1, "maxLength": 240 },
            "D": { "type": "string", "minLength": 1, "maxLength": 240 }
          }
        },
        "correct":     { "enum": ["A", "B", "C", "D"] },
        "explanation": { "type": "string", "minLength": 1, "maxLength": 1200 }
      }
    }
  },
  "allOf": [
    {
      "if":   { "properties": { "source": { "const": "ai-generated" } } },
      "then": { "required": ["reviewer_id", "reviewed_at"] }
    }
  ],
  "$defs": {
    "domain": {
      "enum": [
        "mlops-infra",
        "ml-lifecycle",
        "genaiops-infra",
        "genai-quality",
        "genai-optimization"
      ]
    },
    "source": { "enum": ["bank", "ai-generated"] }
  }
}
```

---

## Supabase migration change

The only schema change needed is adding `'code-review'` to the
`questions_type_chk` constraint. Replace the AZ-104 constraint:

```sql
-- Before (AZ-104)
CONSTRAINT questions_type_chk
  CHECK (type IN ('flashcard', 'mcq', 'product-id')),

-- After (AI-300)
CONSTRAINT questions_type_chk
  CHECK (type IN ('flashcard', 'mcq', 'code-review')),
```

---

## Success Criteria

- **SC-001**: A learner can complete a 10-item Code Review session in under
  4 minutes at a normal reading pace.
- **SC-002**: 100% of answered items produce a progress-store write
  observable on the next session load.
- **SC-003**: Syntax highlighting renders within 300 ms of snippet display
  on a mid-range mobile device.
- **SC-004**: `___BLANK___` placeholder is visually distinct from
  surrounding code in 100% of `fill-the-blank` items across light and
  dark themes.
- **SC-005**: The results screen correctly lists every missed item with
  its correct answer in 100% of completed sessions.
- **SC-006**: Lighthouse Accessibility ≥ 90 on the session and results
  screens; the four options are reachable in tab order matching visual order.
- **SC-007**: The code block scrolls horizontally on a 375px viewport for
  snippets wider than the screen, with no horizontal page scroll triggered.

---

## Assumptions

- Syntax highlighting uses a client-side library (e.g. Prism.js or
  Shiki) bundled with the app — no server-side rendering of code blocks.
- Snippets are pre-authored; there is no runtime code generation path
  (Constitution Principle III).
- The three sub-modes share one React component; `sub_mode` controls
  prompt text and blank-rendering behaviour only.
- Session length defaults to 10 items; configurable to 5 or 15 via
  settings, same as flashcard and MCQ modes.
- Items are drawn from the bank filtered by domain/topic/difficulty;
  random selection within the filtered set.
- Dark theme is the default; syntax highlighting theme must be readable
  on dark backgrounds (e.g. One Dark, Dracula, or equivalent).
- The `fill-the-blank` sub-mode supports exactly one blank per snippet
  in v1. Multiple blanks are out of scope.
- `common_confusions` (from product-id) has no equivalent in this mode;
  the `explanation` field carries the full learning value.
