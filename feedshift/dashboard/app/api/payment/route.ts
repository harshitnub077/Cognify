// dashboard/app/api/payment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const { amount, receipt } = await req.json();

    if (!amount || !receipt) {
      return NextResponse.json({ error: 'amount and receipt required' }, { status: 400 });
    }

    const order = await createOrder(amount, receipt);
    return NextResponse.json(order);
  } catch (err: any) {
    console.error('[Payment route error]', err);
    return NextResponse.json({ error: err.message ?? 'Payment error' }, { status: 500 });
  }
}
