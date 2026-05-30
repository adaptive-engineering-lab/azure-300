# Seed Content Stubs

These three empty files are starter copies of the question bank. When you fork the repo for a new exam, replace `supabase/seed/content/*.json` with these and start authoring fresh.

```bash
cp template/seed-content/flashcards.json supabase/seed/content/flashcards.json
cp template/seed-content/mcq.json supabase/seed/content/mcq.json
cp template/seed-content/code-review.json supabase/seed/content/code-review.json
```

## Schemas

Each file is a JSON array of items. Every item has the same top-level shape; the `content` object's shape depends on `type`.

### Shared top-level fields

```json
{
  "id": "<uuidv4>",
  "type": "flashcard | mcq | code-review",
  "domain": "<one of the slugs from your exams.config.json>",
  "topic": "<topic string — should appear in domain.topics from exams.config.json>",
  "difficulty": 1,
  "source": "bank",
  "tags": ["<domain>", "<topic-slug>", "level-<difficulty>"],
  "content": { ... }
}
```

- `id` — random UUIDv4. The seed CLI rejects duplicates across the whole bank.
- `difficulty` — 1 (easy), 2 (medium), 3 (hard).
- `source` — `"bank"` for human-authored items. Use `"ai-generated"` for items drafted by the `tools/author` CLI; those additionally require `reviewer_id` (string) and `reviewed_at` (ISO timestamp).

### Type-specific `content` shapes

#### `flashcard`

```json
{
  "front": "Question text (≤ 280 chars)",
  "back":  "Answer text (≤ 800 chars)"
}
```

#### `mcq`

```json
{
  "question": "Question text (≤ 600 chars)",
  "options": {
    "A": "Option text (≤ 240 chars)",
    "B": "Option text",
    "C": "Option text",
    "D": "Option text"
  },
  "correct": "A",
  "explanation": "Why the correct option is right + why the strongest distractor is wrong (≤ 1200 chars, plain text, no markdown)."
}
```

#### `code-review`

```json
{
  "sub_mode": "find-the-bug | what-does-this-do | fill-the-blank",
  "language": "python | yaml | bash",
  "snippet":  "Multi-line code snippet (8-20 lines, JSON-escaped \\n for newlines, ≤ 2000 chars). For fill-the-blank, use the literal token ___BLANK___ exactly once.",
  "prompt":   "What the learner must do — one sentence, ≤ 200 chars",
  "options":  { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct":  "A",
  "explanation": "Names the flaw / mechanism + why distractors are wrong."
}
```

## Validation

Run the seed CLI's validate step before any commit:

```bash
pnpm -C tools seed:validate
# → "Validation complete: N items OK."
# or
# → "Validation failed: K error(s)" with [INVALID] lines naming the field
```

The CLI uses Ajv with the JSON Schemas at `specs/001-supabase-schema-and-seed/contracts/`. Any single failure aborts the batch.

## Example item

A minimal valid flashcard:

```json
[
  {
    "id": "11111111-1111-4111-8111-000000000001",
    "type": "flashcard",
    "domain": "cloud-concepts",
    "topic": "Cloud computing",
    "difficulty": 1,
    "source": "bank",
    "tags": ["cloud-concepts", "cloud-computing", "level-1"],
    "content": {
      "front": "What is cloud computing?",
      "back": "Delivery of computing services — servers, storage, databases, networking, software, analytics — over the internet, billed by consumption. Three primary service models: IaaS, PaaS, SaaS."
    }
  }
]
```

## Authoring with the tools/author CLI

If you have an Anthropic API key, draft items in batches:

```bash
ANTHROPIC_API_KEY=sk-ant-... \
pnpm -C tools/author cli draft \
  --type=mcq --domain=cloud-concepts --topic="Cloud computing" \
  --difficulty=1 --count=10

# Review the file at tools/author/drafts/<date>-<type>-<topic>.json
# Delete items you don't like, then promote:

pnpm -C tools/author cli promote tools/author/drafts/<file>.json --reviewer=<initials>
```

Promoted items land in the seed-content JSON with `source='ai-generated'`, `reviewer_id`, and `reviewed_at` stamped.
