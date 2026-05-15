import { useEffect, useState } from 'react';
import { isLocalStorageAvailable } from '../lib/storage/adapter';

const DISMISS_KEY = '__ai300game.warning.dismissed';

export function PrivateModeWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLocalStorageAvailable()) return;
    // Use sessionStorage if available; otherwise just show once per mount.
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore
    }
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }

  return (
    <div className="border-b border-divider bg-warning/10 px-4 py-2 text-sm">
      <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
        <p>
          Storage is unavailable — your progress will not be saved across reloads. Sign in (coming soon)
          to keep your work.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md bg-bg-elevated px-2 py-1 text-xs text-fg"
          aria-label="Dismiss notice"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
