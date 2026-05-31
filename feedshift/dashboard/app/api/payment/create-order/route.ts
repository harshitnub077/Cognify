import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createOrder, planAmounts } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await request.json();
    const userId = session.user.id;

    if (!planAmounts[plan.toLowerCase()]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Call Razorpay API
    const order = await createOrder(plan, userId);

    // Get user's profile ID based on auth.uid()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Store pending order in Supabase
    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: profile.id,
        plan: plan.toLowerCase(),
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: 'pending'
      });

    if (dbError) {
      console.error('Failed to store subscription:', dbError);
      return NextResponse.json({ error: 'Failed to create subscription record' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'dummy_key'
    });

  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
