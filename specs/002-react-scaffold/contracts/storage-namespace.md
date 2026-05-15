# Contract: localStorage Namespace and Schema Versioning

All guest-mode state in feature 002 lives under a single namespaced key. This contract pins the key, the value shape, the version policy, and the availability-detection rules.

## Key

```
ai300game.v1.state
```

- `ai300game` — the project's namespace prefix; reserves the entire `ai300game.*` keyspace.
- `v1` — schema version; bumps when the persisted shape changes incompatibly.
- `state` — the slice name. Only one key today; reserved for additional buckets if a future feature needs a separate persistence cadence.

## Value shape (current: `v1`)

```ts
interface PersistedState {
  __version: 1;
  preferences: SessionPreferences;
  profile: GuestProfile;
  progress: Record<string, GuestProgress>;
  sessions: GuestSession[];
}
```

Field shapes are defined in [data-model.md](../data-model.md). The persisted JSON object MUST include the `__version` integer; missing or non-integer values cause the namespace to be cleared.

## Versioning policy

| Change kind | Action |
|---|---|
| Add an optional field | No version bump; readers ignore unknown fields. |
| Add a required field with a safe default | Version bump; migrator fills the default. |
| Remove a field | Version bump; migrator drops the field. |
| Rename a field | Version bump; migrator copies old → new and deletes old. |
| Change a field's type / value range | Version bump; migrator coerces or clears. |

Each version bump adds a migrator to `frontend/src/lib/storage/migrate.ts`:

```ts
export const MIGRATORS: Record<number, (input: any) => any> = {
  2: (v1) => ({ ...v1, __version: 2, /* changes */ }),
};
```

On read, migrators run in ascending version order until the payload matches the current `CURRENT_VERSION` constant.

## Downgrade (newer-than-current data)

If the on-disk `__version` is greater than `CURRENT_VERSION`, the app:

1. Clears the entire `ai300game.*` namespace.
2. Reinitializes with defaults.
3. Surfaces a one-time, dismissible notice: "Your saved progress was created by a newer version of the app and has been reset."

This is a deliberate trade-off: silent loss is safer than crashing.

## Availability detection

At module load (synchronous), the storage adapter probes `window.localStorage` by writing and reading a sentinel:

```
ai300game.probe = "ok"
```

If the write throws (Safari private mode), the read returns a different value, or any step is unsupported, the adapter sets an `available = false` flag and switches to an in-memory `Map`-backed fallback that conforms to the Web Storage API. The probe key is deleted after the test, succeed or fail.

Consumers MUST NOT call `window.localStorage` directly — they go through the adapter.

## Quota handling

When `setItem` throws `QuotaExceededError`:

1. The adapter calls a registered "prune" callback that drops the oldest entries from `sessions` (which is the largest slice) until the write fits.
2. If pruning to 100 sessions still doesn't fit, the write fails silently and a one-time notice tells the user that progress will not persist this session.
3. `progress` entries are NEVER auto-pruned — they're the user's study record. If they alone exceed quota, the user is told to sign in to save further data.

## What's reserved but not used in this feature

- `ai300game.probe` — availability probe.
- `ai300game.v1.queue` — pending writes for offline-authenticated mode (feature 010).

Both are reserved here to prevent later features from accidentally colliding.

## What's NOT in this contract

- IndexedDB or any other storage technology — out of scope; localStorage is sufficient for the data volumes in scope and the simpler API matches the feature's needs.
- Cross-tab synchronization — handled by the future `storage` event listener that the implementation plan will wire up; details are an implementation choice, not a contract.
- Encryption — guest progress is not sensitive; signing in is what protects identity-bound data.
