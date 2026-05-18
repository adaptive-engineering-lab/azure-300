// Stripe webhook handler.
//
// Verifies Stripe-Signature, dedupes by event.id via the
// public.webhook_events table, and reflects subscription state
// into public.subscriptions. Service-role only.
//
// Required env (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY        sk_live_… or sk_test_…
//   STRIPE_WEBHOOK_SECRET    whsec_…
//   SUPABASE_URL             populated by the platform
//   SUPABASE_SERVICE_ROLE_KEY populated by the platform

import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

function periodEnd(sub: Stripe.Subscription): string | null {
  return sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
}

function mapStatus(s: Stripe.Subscription.Status): string {
  if (s === 'unpaid') return 'past_due';
  if (s === 'paused') return 'canceled';
  return s;
}

async function applyEvent(event: Stripe.Event): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    if (!userId || !session.subscription) return;
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan: 'pro',
      status: mapStatus(sub.status),
      current_period_end: periodEnd(sub),
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: sub.id,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase
      .from('subscriptions')
      .update({
        plan: sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free',
        status: mapStatus(sub.status),
        current_period_end: periodEnd(sub),
        stripe_subscription_id: sub.id,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', sub.id);
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        current_period_end: periodEnd(sub),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', sub.id);
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.subscription) return;
    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription as string);
    return;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return new Response('ignored', { status: 200 });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('webhook_events')
    .insert({ id: event.id, type: event.type, payload: event as unknown as object })
    .select('id')
    .maybeSingle();

  if (insertErr && insertErr.code !== '23505') {
    console.error('webhook_events insert error', insertErr);
    return new Response('store error', { status: 500 });
  }
  if (!inserted) {
    // Duplicate event.id — already processed.
    return new Response('duplicate', { status: 200 });
  }

  try {
    await applyEvent(event);
  } catch (err) {
    console.error('apply error', err);
    return new Response('apply error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
