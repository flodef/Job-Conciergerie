import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getClientIp, isIpBlocked, isRateLimited } from '@/app/(site)/_actions/antiSpam';
import { PLANS } from '@/app/data/plans';
import type { ConciergeriePlan } from '@/app/types/dataTypes';

const REVOLUT_MODE = process.env.REVOLUT_MODE === 'prod' ? 'prod' : 'sandbox';
const REVOLUT_API_URL =
  REVOLUT_MODE === 'prod'
    ? 'https://merchant.revolut.com/api/orders'
    : 'https://sandbox-merchant.revolut.com/api/orders';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REVOLUT_SECRET_KEY) {
      return NextResponse.json({ error: 'payment_unavailable' }, { status: 503 });
    }

    const ip = await getClientIp();
    if (isIpBlocked(ip) || isRateLimited(ip, 'order')) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { plan, billing, customerEmail } = await request.json();

    // Prix définis côté serveur — le client envoie le plan, jamais le montant.
    const planData = typeof plan === 'string' && plan in PLANS ? PLANS[plan as ConciergeriePlan] : undefined;
    if (!planData || (billing !== 'monthly' && billing !== 'annual')) {
      return NextResponse.json({ error: 'Invalid plan or billing' }, { status: 400 });
    }
    const amount = billing === 'annual' ? planData.annual : planData.monthly;
    const planName = planData.name;

    const response = await fetch(REVOLUT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'EUR',
        description: `Abonnement Job Conciergerie — ${planName}`,
        // The checkout lives on the site host — the order was created from it,
        // so send the customer back to the same host (not NEXT_PUBLIC_APP_URL,
        // which now points at app.<domain> for magic links).
        redirect_url: `https://${request.headers.get('host')}/checkout?status=success`,
        customer: customerEmail ? { email: customerEmail } : undefined,
        merchant_order_data: {
          reference: `JC-${planName}-${Date.now()}`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Revolut API error:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const order = await response.json();
    return NextResponse.json({
      token: order.token,
      orderId: order.id,
      checkoutUrl: order.checkout_url,
      mode: REVOLUT_MODE,
    });
  } catch (error) {
    console.error('Error creating Revolut order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
