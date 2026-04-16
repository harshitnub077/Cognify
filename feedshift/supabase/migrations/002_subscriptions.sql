CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INT,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions" ON subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Backend service role skips RLS for inserts/updates
