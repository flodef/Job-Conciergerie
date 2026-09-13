import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_MS = 5 * 60 * 1000;

// Signature Revolut : payload_to_sign = "v1.{timestamp}.{raw body}",
// expected = "v1=" + HMAC-SHA256(payload_to_sign, signing_secret).
// Le header peut contenir plusieurs signatures (rotation de secret).
function verifySignature(rawBody: string, timestamp: string, signatureHeader: string, secret: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) return false;

  const expected = 'v1=' + createHmac('sha256', secret).update(`v1.${timestamp}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  return signatureHeader.split(',').some(sig => {
    const sigBuf = Buffer.from(sig.trim(), 'utf8');
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (secret) {
    const timestamp = request.headers.get('revolut-request-timestamp') ?? '';
    const signature = request.headers.get('revolut-signature') ?? '';
    if (!verifySignature(rawBody, timestamp, signature, secret)) {
      console.error('Revolut webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('REVOLUT_WEBHOOK_SECRET not set — webhook signature not verified');
  }

  try {
    const event = JSON.parse(rawBody);

    console.log('Revolut webhook event:', event.event_type, event.order_id);

    switch (event.event_type) {
      case 'ORDER_COMPLETED':
        console.log(`Payment completed for order ${event.order_id}`);
        break;
      case 'ORDER_AUTHORISED':
        console.log(`Payment authorised for order ${event.order_id}`);
        break;
      case 'ORDER_CANCELLED':
        console.log(`Payment cancelled for order ${event.order_id}`);
        break;
      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
