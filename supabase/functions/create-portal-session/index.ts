// Creates a Stripe Customer Portal Session for the calling user.
//
// Resolves the user's stripe_customer_id from public.subscriptions
// and returns a portal session URL. Used by the "Manage
// subscription" button on /settings/billing.
//
// Required env (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY        sk_live_… or sk_test_…
//   APP_URL                  https://ai-300.example.com
//   SUPABASE_URL             populated by the platform
//   SUPABASE_SERVICE_ROLE_KEY populated by the platform

import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const appUrl = Deno.env.get('APP_URL')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Missing Authorization', { status: 401, headers: corsHeaders });

  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const service = createClient(supabaseUrl, supabaseServiceKey);
  const { data: sub } = await service
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return new Response('No Stripe customer for this user', { status: 404, headers: corsHeaders });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return new Response(JSON.stringify({ url: portal.url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
