import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

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
