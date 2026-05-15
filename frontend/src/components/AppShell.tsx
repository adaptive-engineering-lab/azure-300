import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { PrivateModeWarning } from './PrivateModeWarning';
import { ProfileMenu } from './ProfileMenu';
import { MigrationPrompt } from './MigrationPrompt';
import { InstallPrompt } from './InstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';

const NAV = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.learn, label: 'Learn' },
  { to: ROUTES.progress, label: 'Progress' },
  { to: ROUTES.settings, label: 'Settings' },
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-bg-elevated focus:text-fg focus:px-3 focus:py-2 focus:rounded-md"
      >
        Skip to content
      </a>
      <PrivateModeWarning />
      <OfflineIndicator />
      <header className="mx-auto flex w-full max-w-screen-md xl:max-w-6xl items-center justify-end px-4 py-2">
        <ProfileMenu />
      </header>
      <main id="main" className="flex-1 mx-auto w-full max-w-screen-md xl:max-w-6xl px-4 pb-24">
        <Outlet />
      </main>
      <MigrationPrompt />
      <InstallPrompt />
      <nav
        aria-label="Primary"
        className="sticky bottom-0 border-t border-divider bg-bg-elevated"
      >
        <ul className="mx-auto max-w-screen-md xl:max-w-6xl grid grid-cols-4">
          {NAV.map((item) => (
            <li key={item.to} className="contents">
              <NavLink
                to={item.to}
                end={item.to === ROUTES.home}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center py-3 text-sm transition-colors',
                    isActive ? 'text-accent font-semibold' : 'text-fg-muted',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
