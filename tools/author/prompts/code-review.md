# AI-300 · Authoring Prompt Addendum — Code Review Items

Append this section to `ai300-question-authoring-prompt.md` (the base authoring prompt).

---

## Additional schema: code-review

```
### code-review
{
  "id": "<generate a new UUIDv4>",
  "type": "code-review",
  "domain": "<domain slug>",
  "topic": "<topic string from allowed list>",
  "difficulty": <1 | 2 | 3>,
  "tags": ["<domain slug>", "<topic-slug>", "level-<difficulty>", "<sub_mode>"],
  "source": "ai-generated",
  "content": {
    "sub_mode": "<find-the-bug | what-does-this-do | fill-the-blank>",
    "language": "<python | yaml | bash>",
    "snippet": "<the code or YAML block — 8 to 20 lines — escaped as a JSON string>",
    "prompt": "<one sentence — what the learner must do — ≤ 200 chars>",
    "options": {
      "A": "<option text — ≤ 240 chars>",
      "B": "<option text — ≤ 240 chars>",
      "C": "<option text — ≤ 240 chars>",
      "D": "<option text — ≤ 240 chars>"
    },
    "correct": "<A | B | C | D>",
    "explanation": "<why correct is right AND why top distractor is wrong — 2–4 sentences, no markdown>"
  }
}
```

---

## Code-review quality rules (in addition to the shared rules)

1. **One flaw only** (`find-the-bug`): introduce exactly one deliberate error.
   Do not hide two bugs — the learner should be able to reason to one
   correct answer unambiguously.

2. **One blank only** (`fill-the-blank`): use exactly one `___BLANK___`
   placeholder. Multi-blank snippets are out of scope for v1.

3. **Realistic snippets**: snippets must look like code a learner would
   actually write when using Azure ML SDK v2, the Azure AI Foundry SDK,
   or GitHub Actions YAML. Avoid toy examples.

4. **Plausible distractors**: all four options must be things a learner
   who partially understands the topic would consider. Avoid options that
   are obviously nonsensical.

5. **Snippet length**: 8–20 lines. Long enough to be realistic;
   short enough to read in under 30 seconds on mobile.

6. **No markdown in explanation**: plain sentences only. No code fences,
   no bold, no bullet points inside the explanation field.

7. **Escape correctly**: the `snippet` field is a JSON string. Use `\n`
   for newlines and `\"` for any double-quotes inside the snippet.

8. **Difficulty calibration for code-review**:
   - **Level 1**: obvious flaw or simple recall ("what does `mlflow.autolog()` do?")
   - **Level 2**: requires knowing which option is correct for a scenario
     (e.g. sampling algorithm constraints, trigger type differences)
   - **Level 3**: exam trap — the snippet looks correct but violates a
     non-obvious constraint (e.g. Bayesian + Normal expression, missing
     `disable()` before `delete()`, MLTable vs URI_FILE for AutoML)

---

## High-value code-review scenarios (ready to author)

Use these as starting points for `find-the-bug` and `fill-the-blank` items.
Every one of these maps to a real exam trap from the knowledge bank.

### Hyperparameter tuning (ml-lifecycle)

- Sweep job using `Normal()` with `sampling_algorithm="bayesian"` — invalid combination
- Sweep job using `sampling_algorithm="grid"` with a `Uniform()` param — grid requires discrete
- `BanditPolicy` with both `slack_amount` and `slack_factor` set — only one should be set
- Missing `delay_evaluation` on a `TruncationSelectionPolicy` — early trials get cut prematurely
- `evaluation_interval=0` — invalid; must be ≥ 1

### AutoML (ml-lifecycle)

- `Input(type=AssetTypes.URI_FILE, ...)` for AutoML training data — must be `MLTABLE`, not `URI_FILE`
- `enable_model_explainability` not set when RAI dashboard is expected — must be `True`
- `max_concurrent_trials` set higher than compute cluster max nodes — trials queue, not error

### MLflow (ml-lifecycle)

- `mlflow.set_tracking_uri` called on a compute instance — not needed; auto-configured
- `mlflow.log_metric("accuracy", accuracy)` called outside `with mlflow.start_run():` — no run context
- `mlflow.autolog()` called after `model.fit()` — must be called before training

### Pipelines (ml-lifecycle / mlops-infra)

- Pipeline submitted without `pipeline_job.settings.default_compute` set and no per-component compute — fails
- `ml_client.schedules.begin_delete(name=...)` called without `begin_disable()` first — must disable first
- Component YAML missing `outputs` section when downstream component references it — runtime error

### GitHub Actions (mlops-infra)

- Workflow trigger: `on: [pull_request]` expected to fire after PR merge — wrong; use `on: push: branches: [main]`
- `AZURE_CREDENTIALS` referenced in workflow YAML as plain text — must be `${{ secrets.AZURE_CREDENTIALS }}`
- Job targets `production` environment with no `needs:` referencing staging job — skips approval gate

### GenAIOps / Foundry (genaiops-infra)

- `fill-the-blank`: `sampling_algorithm="___BLANK___"` in a sweep job that uses only `Choice()` params
  → answer: `"grid"` (all discrete, so grid is valid)
- `fill-the-blank`: `sweep_job.early_termination = BanditPolicy(slack_amount=___BLANK___, delay_evaluation=5)`
  → answer: a float like `0.2` (not slack_factor)

### Evaluation (genai-quality)

- Code uses `groundedness_evaluator` without a judge model deployment and no Azure AI Content Safety config
  — should use `GroundednessProEvaluator` (no judge needed) or configure OpenAI connection
- Safety evaluator result compared to threshold of 5 — default pass threshold is 3, not 5
- ROUGE result accessed as a single float — ROUGE returns a dict with `precision`, `recall`, `F1` keys

---

## This authoring run (code-review)

```
Domain    : <domain slug>
Topic(s)  : <topic strings from allowed list>
Sub-mode  : <find-the-bug | what-does-this-do | fill-the-blank>
Language  : <python | yaml | bash>
Difficulty: <1 | 2 | 3>
Count     : <N items>

Existing item IDs to avoid:
< paste UUIDs >

Knowledge-bank files to use as source:
< paste relevant .md file contents >
```

---

## Maintainer checklist — code-review items

Before committing, verify:

- [ ] Snippet is realistic (looks like real Azure ML / Foundry / GitHub Actions code)
- [ ] `find-the-bug`: exactly one flaw, unambiguously identified by the correct option
- [ ] `fill-the-blank`: exactly one `___BLANK___`, correct option is the only valid completion
- [ ] All four options are plausible to a learner who partially knows the topic
- [ ] Explanation names the flaw, explains why it matters, and names the correct fix
- [ ] Snippet is 8–20 lines
- [ ] `\n` used for newlines in the JSON string (not literal newlines)
- [ ] No markdown in `explanation` field
- [ ] Difficulty level matches the calibration guide above
- [ ] `language` field matches the actual snippet content
- [ ] Tags include the `sub_mode` value (e.g. `"find-the-bug"`)
