import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const onChange = () => setOnline(navigator.onLine);
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="border-b border-divider bg-warning/10 px-4 py-1.5 text-center text-xs"
    >
      Offline — your changes will sync when you reconnect.
    </div>
  );
}
