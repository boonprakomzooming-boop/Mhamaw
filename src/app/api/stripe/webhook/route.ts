import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata?.type === 'booking' && metadata.bookingId) {
      await supabaseAdmin
        .from('bookings')
        .update({ payment_status: 'paid', status: 'confirmed' })
        .eq('id', metadata.bookingId);
    } else if (metadata?.type === 'subscription' && metadata.shopId) {
      await supabaseAdmin
        .from('shops')
        .update({ subscription_status: 'active' })
        .eq('id', metadata.shopId);

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          shop_id: metadata.shopId,
          plan_name: 'Monthly SaaS Partner Plan',
          stripe_subscription_id: session.subscription as string,
          status: 'active',
        });
    }
  }

  return NextResponse.json({ received: true });
}
