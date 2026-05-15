import { SCHEMA_VERSION } from './namespace';

export type Migrator = (input: unknown) => unknown;

export const MIGRATORS: Record<number, Migrator> = {
  // future: 2: (v1) => ({ ...(v1 as object), __version: 2 }),
};

export function migrate(persisted: unknown, fromVersion: number): unknown {
  if (fromVersion > SCHEMA_VERSION) {
    // Downgrade — clear and start fresh.
    return null;
  }
  let current = persisted;
  for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v += 1) {
    const m = MIGRATORS[v];
    if (m) current = m(current);
  }
  return current;
}
