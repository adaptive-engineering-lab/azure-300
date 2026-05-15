import { loadContent, DuplicateIdError } from './lib/load-content.js';
import { validateItems, formatErrorsForCli } from './lib/validate-content.js';

async function main(): Promise<void> {
  const items = await loadContent();
  const errors = await validateItems(items);
  if (errors.length > 0) {
    console.error(formatErrorsForCli(errors));
    console.error(
      `\nValidation failed: ${errors.length} error(s) across ${items.length} items. No database changes were made.`,
    );
    process.exit(10);
  }
  console.log(`Validation complete: ${items.length} items OK.`);
}

main().catch((err: unknown) => {
  if (err instanceof DuplicateIdError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(20);
});
