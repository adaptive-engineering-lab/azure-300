# Knowledge Sources

Mirror of the `bank/knowledge/<exam-slug>/` layout. Holds raw module material drafted from Microsoft Learn that you (or the `tools/author` CLI with `--source-files=...`) use as the authoritative ground truth for question content.

## Suggested layout (per exam)

```
bank/knowledge/<exam-slug>/
├── lp1-module1-<short-name>.md
├── lp1-module2-<short-name>.md
├── lp2-module1-<short-name>.md
├── ...
└── README.md       # index of modules + which domain each covers
```

Each module file contains the key concepts, definitions, gotchas, and exam-relevant facts in your own words. **Do not paste copyrighted material verbatim from Microsoft Learn.** Paraphrase + cite the source URL.

## Why bother

When you ask the `tools/author` CLI to draft questions, you can pass `--source-files=bank/knowledge/<exam>/lp2-module2.md` and the CLI inlines that content as the **only authoritative source of facts**. This produces questions tightly grounded to your own digest of the module rather than the model's general knowledge.

The voice tutor agent (spec 014, when built) will use the same files as a curriculum knowledge base.

## Filename conventions

- `lp<N>-module<M>-<short-name>.md` so the natural sort matches the learning-path order.
- `short-name` is kebab-case, ≤ 30 chars (e.g. `evaluating-genai`).

## Bootstrap script (optional)

```bash
# When forking for a new exam, copy this folder structure:
mkdir -p bank/knowledge/<exam-slug>

# Author the per-module files by hand or stub them out:
for lp in lp1 lp2 lp3; do
  for m in 1 2 3; do
    touch "bank/knowledge/<exam-slug>/${lp}-module${m}.md"
  done
done
```

## License note

Knowledge files in this folder are your own writing. They may quote short passages from Microsoft Learn under fair-use educational excerpt, but should not reproduce whole pages. Cite the source URL at the top of each file.
