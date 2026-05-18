import { supabase } from '../supabase';

/**
 * Starts a Stripe Checkout flow. Calls the `create-checkout-session`
 * edge function with the caller's JWT, then redirects the browser
 * to the returned URL. Throws if the user is not signed in or the
 * function returns a non-200 response.
 */
export async function startCheckout(): Promise<void> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error('Sign in required.');

  const { data, error } = await supabase().functions.invoke<{ url: string }>(
    'create-checkout-session',
    { body: {} },
  );
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('Checkout session URL missing.');
  window.location.href = data.url;
}

/**
 * Opens the Stripe Customer Portal for the signed-in user. Calls
 * the `create-portal-session` edge function, then redirects to the
 * returned URL.
 */
export async function openCustomerPortal(): Promise<void> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error('Sign in required.');

  const { data, error } = await supabase().functions.invoke<{ url: string }>(
    'create-portal-session',
    { body: {} },
  );
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('Portal session URL missing.');
  window.location.href = data.url;
}
