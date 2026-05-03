import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { verifyPayment } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, paymentId, signature, plan } = await request.json();

    if (!verifyPayment(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // If verified, update subscription record
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .update({
        razorpay_payment_id: paymentId,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .eq('razorpay_order_id', orderId)
      .select()
      .single();

    if (subError || !subData) {
      console.error('Failed to update subscription:', subError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Update profile plan
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: plan.toLowerCase() })
      .eq('id', subData.user_id);

    if (profileError) {
      console.error('Failed to update profile plan:', profileError);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
