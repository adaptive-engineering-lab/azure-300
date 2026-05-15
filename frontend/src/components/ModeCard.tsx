import { Link } from 'react-router-dom';

export function ModeCard({
  to,
  title,
  description,
  comingSoon = false,
}: {
  to: string;
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <Link
      to={to}
      className="block rounded-lg bg-bg-elevated p-5 transition-colors hover:bg-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {comingSoon && (
          <span className="rounded-full bg-divider px-2 py-0.5 text-xs font-medium text-fg-muted">
            Coming soon
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-fg-muted">{description}</p>
    </Link>
  );
}
