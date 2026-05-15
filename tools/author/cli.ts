import { draftItems } from './lib/draft.js';
import { promoteDraft } from './lib/promote.js';
import { AuthorEnvError } from './lib/env.js';
import type { ItemType } from './lib/schemas.js';

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[2] ?? '';
  const rest = argv.slice(3);
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (const arg of rest) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      flags[k!] = v ?? 'true';
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function require(flags: Record<string, string>, name: string): string {
  const v = flags[name];
  if (!v) throw new Error(`--${name} is required`);
  return v;
}

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv);
  if (command === 'draft') {
    const type = require(flags, 'type') as ItemType;
    const domain = require(flags, 'domain');
    const topic = require(flags, 'topic');
    const difficulty = Number(require(flags, 'difficulty')) as 1 | 2 | 3;
    const count = Number(require(flags, 'count'));
    const sourceFiles = flags['source-files']
      ? flags['source-files'].split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const report = await draftItems({ type, domain, topic, difficulty, count, sourceFiles });
    for (const r of report.rejections) {
      console.error(`[INVALID] id=${r.id} field=${r.field} reason=${r.reason}`);
    }
    console.log(
      JSON.stringify({
        type,
        domain,
        topic,
        drafted: report.drafted,
        accepted: report.accepted,
        rejected: report.rejected,
        file: report.file,
        groundedIn: report.groundedIn,
      }),
    );
    return;
  }
  if (command === 'promote') {
    const draftPath = positional[0];
    if (!draftPath) throw new Error('Usage: author promote <draft-file> --reviewer=<initials>');
    const reviewer = require(flags, 'reviewer');
    const report = await promoteDraft({ draftPath, reviewer });
    console.log(JSON.stringify({ appended: report.appended, total: report.total }));
    return;
  }
  console.error('Usage:');
  console.error('  author draft --type=<flashcard|mcq|product-id> --domain=<d> --topic=<t> --difficulty=<1|2|3> --count=<n> [--source-files=a.md,b.md,…]');
  console.error('  author promote <draft-file> --reviewer=<initials>');
  process.exit(2);
}

main().catch((err: unknown) => {
  if (err instanceof AuthorEnvError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
