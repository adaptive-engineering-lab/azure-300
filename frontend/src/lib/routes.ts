export const ROUTES = {
  home: '/',
  learn: '/learn',
  flashcards: '/learn/flashcards',
  quiz: '/learn/quiz',
  codeReview: '/learn/code-review',
  progress: '/progress',
  settings: '/settings',
  signIn: '/sign-in',
  authCallback: '/auth/callback',
  dailyReview: '/learn/daily-review',
  billing: '/settings/billing',
  admin: '/admin',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
