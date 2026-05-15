import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import { useIsAdmin } from '../lib/admin/useIsAdmin';
import { ROUTES } from '../lib/routes';

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const adminStatus = useIsAdmin();

  if (!user) {
    return (
      <Link
        to={ROUTES.signIn}
        className="rounded-md bg-bg-elevated px-3 py-1.5 text-sm font-medium"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-fg-muted">{user.email}</span>
      {adminStatus === 'yes' && (
        <Link
          to={ROUTES.admin}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
        >
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={signOut}
        className="rounded-md bg-bg-elevated px-3 py-1.5 text-sm font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
