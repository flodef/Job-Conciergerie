import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getClientIp, isIpBlocked, isRateLimited } from '@/app/(site)/_actions/antiSpam';

const REVOLUT_MODE = process.env.REVOLUT_MODE === 'prod' ? 'prod' : 'sandbox';
const REVOLUT_API_URL =
  REVOLUT_MODE === 'prod'
    ? 'https://merchant.revolut.com/api/orders'
    : 'https://sandbox-merchant.revolut.com/api/orders';

// Prix définis côté serveur — le client envoie le plan, jamais le montant.
const PLANS: Record<string, { name: string; monthly: number; annual: number }> = {
  decouverte: { name: 'Découverte', monthly: 30, annual: 300 },
  pro: { name: 'Pro', monthly: 50, annual: 500 },
  privilege: { name: 'Privilège', monthly: 100, annual: 1000 },
};

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

    const planData = PLANS[plan];
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
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/checkout?status=success`,
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
