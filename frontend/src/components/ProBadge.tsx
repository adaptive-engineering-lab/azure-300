import { Link } from 'react-router-dom';

interface Props {
  /** Optional contextual hint shown beneath the "Pro" label. */
  hint?: string;
}

/**
 * Compact "Pro" badge shown on locked cosmetic features for free
 * users. Pro users never see this — gate the parent surface on
 * `useEntitlement().isPro` and skip rendering the lock when true.
 */
export default function ProBadge({ hint }: Props) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent ring-1 ring-accent/40">
        Pro
      </span>
      {hint && <span className="text-xs text-fg-muted">{hint}</span>}
      <Link
        to="/whats-in-pro"
        className="ml-1 text-xs text-accent underline decoration-dotted underline-offset-2"
        aria-label="What's in Pro?"
      >
        What's in Pro?
      </Link>
    </span>
  );
}
