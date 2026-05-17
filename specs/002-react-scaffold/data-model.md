# Phase 1 Data Model: React Scaffold

The "data model" for this feature is the in-browser state managed by Zustand and persisted to `localStorage`. There are four slices. Three of them (`profile`, `progress`, `sessions`) are deliberately shape-compatible with feature 001's authenticated tables so feature 003's migration can copy them row-for-row.

---

## Slice 1 — `preferences` (SessionPreferences)

```ts
interface SessionPreferences {
  theme: 'dark' | 'light';
  defaultSessionLength: 10 | 20 | 30;
  defaultStartingMode: 'flashcards' | 'mcq' | 'code-review' | null;
  reducedMotion: boolean | 'system'; // 'system' defers to OS setting
}
```

Defaults on first load:

```ts
{
  theme: 'dark',
  defaultSessionLength: 20,
  defaultStartingMode: null,
  reducedMotion: 'system',
}
```

**Validation rules**:

- `theme` must be one of the two literal values; any other value is replaced by `'dark'` on read.
- `defaultSessionLength` must be one of `10 | 20 | 30`; out-of-range numbers are replaced by `20`.
- `defaultStartingMode` may be `null` (no default chosen).

---

## Slice 2 — `profile` (GuestProfile)

Mirrors the authenticated `profiles` row from feature 001, minus `id` and `display_name` (a guest has no identity).

```ts
interface GuestProfile {
  streakDays: number;
  xp: number;
  level: 1 | 2 | 3 | 4;
  lastActive: string | null;   // ISO date 'YYYY-MM-DD'
  createdAt: string;            // ISO timestamp
}
```

Defaults:

```ts
{
  streakDays: 0,
  xp: 0,
  level: 1,
  lastActive: null,
  createdAt: <now>,
}
```

**Validation rules**:

- `streakDays` and `xp` are non-negative integers; negatives clamped to 0 on read.
- `level` is derived (read-only at the slice API surface) from `xp` per the rules in feature 007's spec:
  - 0–499 XP → 1
  - 500–1999 XP → 2
  - 2000–4999 XP → 3
  - 5000+ XP → 4
- `lastActive` and `createdAt` are local-time dates produced by the browser.

**State transitions**:

- `streakDays` increments by 1 the first time a session completes on a new local-time date that is exactly one day after `lastActive`. If the gap is two or more days, `streakDays` resets to 1 on the next completion. If `lastActive` equals today, the streak does not increment again that day.
- This logic is implemented in feature 004 onward; this feature defines the field but does not write to it.

---

## Slice 3 — `progress` (Record<questionId, GuestProgress>)

Mirrors feature 001's `user_progress` row, minus `id` (use the question UUID as the map key) and `user_id` (no identity in guest mode).

```ts
interface GuestProgress {
  questionId: string;          // uuid v4
  timesSeen: number;
  timesCorrect: number;
  lastRating: 'correct' | 'almost' | 'missed' | null;
  nextReview: string | null;   // ISO date 'YYYY-MM-DD'
  updatedAt: string;           // ISO timestamp
}
```

Stored as `Record<questionId, GuestProgress>` to enable O(1) lookups.

**Validation rules** (match feature 001's CHECK constraints):

- `timesCorrect <= timesSeen` (mirrors `user_progress_counts_chk`)
- `lastRating` is one of the three literals or `null` (mirrors `user_progress_rating_chk`)
- `nextReview` is a valid ISO date or `null`

**State transitions**:

- A rating event in any future game-mode feature creates or updates the entry: `timesSeen += 1`, `timesCorrect += (rating === 'correct' ? 1 : 0)`, `lastRating = rating`, `updatedAt = now`, and `nextReview` advanced per feature 008's SM-2 simplification.
- This feature does not fire any of those updates — it only defines the shape.

---

## Slice 4 — `sessions` (GuestSession[])

Mirrors feature 001's `sessions` row, minus `id` (locally a numeric or uuid v4 key) and `user_id`.

```ts
interface GuestSession {
  id: string;                                                    // uuid v4 generated locally
  mode: 'flashcards' | 'mcq' | 'code-review' | 'daily-review';
  topic: string | null;
  scorePct: number | null;        // 0..100
  durationSeconds: number | null;
  completedAt: string;            // ISO timestamp
}
```

Stored as a chronological array (newest first), capped at 500 entries with FIFO eviction.

**Validation rules**:

- `mode` is one of the four literals (mirrors `sessions_mode_chk`).
- `scorePct` is `null` or a number in 0–100 (mirrors `sessions_score_chk`).
- `durationSeconds` is a non-negative integer or `null`.

---

## Persistence contract

All four slices are persisted together under a single localStorage key:

```
ai300game.v1.state
```

The value is a JSON object:

```ts
interface PersistedState {
  __version: 1;                       // schema version
  preferences: SessionPreferences;
  profile: GuestProfile;
  progress: Record<string, GuestProgress>;
  sessions: GuestSession[];
}
```

**Why one key, not four**: a single key gives a single atomic snapshot per write, eliminating intra-write inconsistency. The 5 MB localStorage budget comfortably fits 500 sessions × ~200 bytes + 10000 progress entries × ~150 bytes + ~1 KB profile/prefs ≈ 1.6 MB.

**Schema versioning**: a bump (e.g., `__version: 1` → `2`) requires a migrator added to `lib/storage/migrate.ts`. The migrator receives the parsed v1 payload and returns a v2 payload. The Zustand persist middleware calls all registered migrators in order. If the version on disk is higher than the current code expects, the namespace is cleared and the user sees a one-time non-blocking notice.

---

## Relationships and migration path

```
GuestProfile ──1──N── GuestProgress ──N──1── (questions in feature 001)
                  └── GuestSession  ──N──1── (questions in feature 001)
```

When feature 003 ships the guest→account migration:

| Guest slice field | Authenticated table column | Translation |
|---|---|---|
| `GuestProfile.streakDays` | `profiles.streak_days` | direct |
| `GuestProfile.xp` | (not stored in `profiles` — derived in feature 007 from accumulated session XP) | drop |
| `GuestProfile.level` | `profiles.level` | direct |
| `GuestProfile.lastActive` | `profiles.last_active` | direct |
| `GuestProgress.*` | `user_progress.*` | direct; `user_id` populated by the migration |
| `GuestSession.*` | `sessions.*` | direct; `user_id` populated by the migration |

The shape-compat test asserts every authenticated-table field other than `user_id` and `id` has a corresponding guest field of the same name and type.
