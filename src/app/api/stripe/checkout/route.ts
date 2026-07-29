import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20' as any,
});

export async function POST(req: Request) {
  try {
    const { bookingId, shopId, type } = await req.json();
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (type === 'subscription') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'MhaMaw Grooming SaaS Partner Subscription',
                description: 'Full shop management, queue system & marketplace listing',
              },
              unit_amount: 4900, // $49.00 / month
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${origin}/dashboard/owner?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/owner`,
        metadata: { shopId, type: 'subscription' },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // Booking payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Pet Grooming Appointment Queue',
              },
              unit_amount: 3500, // $35.00 default / sample
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/dashboard/customer?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/customer`,
        metadata: { bookingId, type: 'booking' },
      });

      return NextResponse.json({ url: session.url });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
