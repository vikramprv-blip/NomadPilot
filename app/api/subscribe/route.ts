import { NextRequest, NextResponse } from 'next/server';

const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  navigator: { monthly: 'price_navigator_monthly', annual: 'price_navigator_annual' },
  business:  { monthly: 'price_business_monthly',  annual: 'price_business_annual' },
};

const PAYPAL_PLAN_IDS: Record<string, Record<string, string>> = {
  navigator: { monthly: 'P-navigator-monthly', annual: 'P-navigator-annual' },
  business:  { monthly: 'P-business-monthly',  annual: 'P-business-annual' },
};

export async function POST(req: NextRequest) {
  try {
    const { planId, billing, provider } = await req.json();
    if (planId === 'explorer') return NextResponse.json({ url: '/' });
    if (provider === 'stripe') return await createStripeSession(planId, billing);
    if (provider === 'paypal') return await createPayPalOrder(planId, billing);
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function createStripeSession(planId: string, billing: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

  const priceId = STRIPE_PRICE_IDS[planId]?.[billing];
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/pricing`,
      'subscription_data[trial_period_days]': '7',
    }),
  });

  const session = await res.json();
  if (!res.ok) throw new Error(session.error?.message || 'Stripe session failed');
  return NextResponse.json({ url: session.url });
}

async function createPayPalOrder(planId: string, billing: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured' }, { status: 503 });

  const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const { access_token } = await authRes.json();

  const planIdPP = PAYPAL_PLAN_IDS[planId]?.[billing];

  const subRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planIdPP,
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/pricing`,
        brand_name: 'NomadPilot',
        user_action: 'SUBSCRIBE_NOW',
      },
    }),
  });

  const sub = await subRes.json();
  const approvalUrl = sub.links?.find((l: any) => l.rel === 'approve')?.href;
  if (!approvalUrl) throw new Error('PayPal approval URL not found');
  return NextResponse.json({ url: approvalUrl });
}
