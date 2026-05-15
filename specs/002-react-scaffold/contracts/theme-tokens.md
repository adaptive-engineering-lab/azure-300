# Contract: Theme Tokens

CSS custom properties applied to `<html>` and consumed by Tailwind via the `dark:` class strategy. Locking these tokens means feature 010's design refinement and feature 011's Pro themes have a stable substrate to build on.

## Surface

Tokens live in `frontend/src/index.css` under two scopes:

```css
:root {
  /* Light theme values */
  --color-bg:           hsl(0 0% 100%);
  --color-bg-elevated:  hsl(220 10% 96%);
  --color-fg:           hsl(220 12% 12%);
  --color-fg-muted:     hsl(220 8% 40%);
  --color-accent:       hsl(210 100% 45%);   /* Azure-blue */
  --color-accent-fg:    hsl(0 0% 100%);
  --color-success:      hsl(140 60% 35%);
  --color-warning:      hsl(35 90% 50%);
  --color-error:        hsl(0 70% 45%);
  --color-divider:      hsl(220 10% 88%);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

html.dark {
  --color-bg:           hsl(220 14% 8%);
  --color-bg-elevated:  hsl(220 14% 12%);
  --color-fg:           hsl(220 10% 95%);
  --color-fg-muted:     hsl(220 8% 65%);
  --color-accent:       hsl(210 100% 60%);
  --color-accent-fg:    hsl(220 14% 8%);
  --color-success:      hsl(140 50% 55%);
  --color-warning:      hsl(40 90% 60%);
  --color-error:        hsl(0 75% 60%);
  --color-divider:      hsl(220 10% 18%);
}
```

Tailwind config consumes them via `colors.bg = 'hsl(var(--color-bg) / <alpha-value>)'` etc., so utility classes like `bg-bg` and `text-fg` resolve to whichever theme is active.

## Contrast guarantees

| Pair | Light contrast | Dark contrast | Required |
|---|---|---|---|
| `fg` on `bg` | ≥ 13:1 | ≥ 14:1 | 4.5:1 (AA) |
| `fg-muted` on `bg` | ≥ 5:1 | ≥ 5.5:1 | 4.5:1 (AA) |
| `accent-fg` on `accent` | ≥ 5:1 | ≥ 4.6:1 | 4.5:1 (AA) |
| `error` on `bg` | ≥ 5:1 | ≥ 4.6:1 | 4.5:1 (AA) |

The shell-accessibility test runs an axe-core pass on the home and shell components in both themes and fails the build if any pair drops below 4.5:1.

## Application timing

1. Inline script in `index.html` reads `localStorage["ai300game.v1.state"]`, parses, extracts `preferences.theme`, and applies `document.documentElement.classList.add('dark' | 'light')` **before the React bundle parses**.
2. If localStorage is unavailable or the parse fails, the script defaults to `dark`.
3. After mount, the React `ThemeProvider` keeps the class in sync with subsequent toggles in `/settings`.

This is the FOUC-prevention requirement (SC-004).

## Future Pro themes (feature 011)

Pro adds named themes layered on top of the base contract. Each Pro theme is a `html[data-theme="<name>"]` block that overrides individual tokens — never the structural ones (`--radius-*`). Pro can change colors; it cannot change layout.

Example structure when feature 011 ships:

```css
html[data-theme="sunrise"] {
  --color-accent: hsl(28 90% 55%);
  --color-bg-elevated: hsl(28 10% 95%);
  /* etc. */
}
```

A Pro theme MUST keep every contrast pair above ≥ 4.5:1.

## What's NOT in this contract

- Typography scale — handled by feature 010's design refinement pass; this contract intentionally leaves font tokens unspecified to avoid premature commitment.
- Motion / transition tokens — feature 010 again.
- Per-component tokens (button radius, card padding) — composed from these primitives at component level.
