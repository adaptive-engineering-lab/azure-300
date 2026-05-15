import { useEffect, useState } from 'react';
import {
  bumpEngagement,
  captureInstallPrompt,
  markInstallPromptDismissed,
  shouldShowInstallPrompt,
  triggerInstall,
} from '../lib/pwa/install';

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    captureInstallPrompt();
  }, []);

  // Bump engagement every 10 seconds while the tab is visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') bumpEngagement(10_000);
      if (shouldShowInstallPrompt() && !show) setShow(true);
    }, 10_000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  async function install() {
    const outcome = await triggerInstall();
    if (outcome === 'dismissed') markInstallPromptDismissed();
    setShow(false);
  }

  function dismiss() {
    markInstallPromptDismissed();
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-2 bottom-20 z-30 mx-auto max-w-screen-md rounded-lg bg-bg-elevated p-4 shadow-lg ring-1 ring-divider"
    >
      <h2 id="install-title" className="text-base font-bold">
        Install AI-300 Study?
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Add to your home screen for one-tap launch and offline study.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex-1 rounded-md bg-bg px-4 py-2 text-sm font-medium text-fg"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
