import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ROUTES } from './lib/routes';
import { ThemeProvider } from './lib/theme/ThemeProvider';
import { AuthProvider } from './lib/auth/AuthProvider';
import { AppShell } from './components/AppShell';
import HomePage from './pages/HomePage';
import { useAppStore } from './lib/store';
import { STATE_KEY } from './lib/storage/namespace';

const LearnIndexPage = lazy(() => import('./pages/LearnIndexPage'));
const FlashcardSelectPage = lazy(() => import('./pages/FlashcardSelectPage'));
const FlashcardSessionPage = lazy(() => import('./pages/FlashcardSessionPage'));
const QuizSelectPage = lazy(() => import('./pages/QuizSelectPage'));
const QuizSessionPage = lazy(() => import('./pages/QuizSessionPage'));
const CodeReviewPage = lazy(() => import('./pages/CodeReviewPage'));
const CodeReviewSessionPage = lazy(() => import('./pages/CodeReviewSessionPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DailyReviewPage = lazy(() => import('./pages/DailyReviewPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const WhatsInProPage = lazy(() => import('./pages/WhatsInProPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function lazyPage(node: React.ReactNode) {
  return <Suspense fallback={<div className="p-4 text-fg-muted">Loading…</div>}>{node}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.learn, element: lazyPage(<LearnIndexPage />) },
      { path: ROUTES.flashcards, element: lazyPage(<FlashcardSelectPage />) },
      { path: `${ROUTES.flashcards}/session`, element: lazyPage(<FlashcardSessionPage />) },
      { path: ROUTES.quiz, element: lazyPage(<QuizSelectPage />) },
      { path: `${ROUTES.quiz}/session`, element: lazyPage(<QuizSessionPage />) },
      { path: ROUTES.codeReview, element: lazyPage(<CodeReviewPage />) },
      { path: `${ROUTES.codeReview}/session`, element: lazyPage(<CodeReviewSessionPage />) },
      { path: ROUTES.progress, element: lazyPage(<ProgressPage />) },
      { path: ROUTES.settings, element: lazyPage(<SettingsPage />) },
      { path: ROUTES.signIn, element: lazyPage(<SignInPage />) },
      { path: ROUTES.authCallback, element: lazyPage(<AuthCallbackPage />) },
      { path: ROUTES.dailyReview, element: lazyPage(<DailyReviewPage />) },
      { path: ROUTES.billing, element: lazyPage(<BillingPage />) },
      { path: ROUTES.whatsInPro, element: lazyPage(<WhatsInProPage />) },
      { path: ROUTES.admin, element: lazyPage(<AdminPage />) },
      {
        path: '*',
        element: (
          <div className="p-4">
            <h1 className="text-xl font-bold">Page not found</h1>
            <p className="mt-2 text-fg-muted">The path you visited doesn't exist.</p>
          </div>
        ),
      },
    ],
  },
]);

function useCrossTabStorageSync() {
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STATE_KEY) {
        useAppStore.persist.rehydrate();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

export function App() {
  useCrossTabStorageSync();
  return (
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  );
}
