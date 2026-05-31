'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Check, Zap, Shield, Crown, Building2 } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for getting started with content mindfulness.',
    features: ['Study mode ON/OFF', '50 AI classifications/day', '1 device', 'Community support'],
    planId: 'free',
    icon: Zap,
    color: 'var(--text-muted)'
  },
  {
    name: 'Pro',
    price: '99',
    description: 'The complete experience for power users.',
    features: ['Unlimited classifications', 'Basic parent dashboard', '3 devices', 'Weekly email report', 'Priority support'],
    planId: 'pro',
    popular: true,
    icon: Crown,
    color: 'var(--primary)'
  },
  {
    name: 'Family',
    price: '199',
    description: 'Best for households with multiple students.',
    features: ['Pro features', 'Full parent controls', 'PIN lock', 'Exam scheduler', 'Support for 3 children', 'Usage analytics'],
    planId: 'family',
    icon: Shield,
    color: 'var(--secondary)'
  },
  {
    name: 'School',
    price: '4999',
    description: 'Enterprise solution for institutions.',
    features: ['Unlimited children', 'Admin dashboard', 'Bulk CSV reports', 'White-labeling', 'API access'],
    planId: 'school',
    icon: Building2,
    color: '#fff'
  }
];

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async (plan: string) => {
    if (plan === 'free') return;
    
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'FeedShift',
        description: `Upgrade to ${plan} plan`,
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan: plan
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              window.location.reload();
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            setError('An error occurred during verification.');
          }
        },
        theme: {
          color: '#8b5cf6'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="w-full max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-gradient">Choose Your Level</h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Upgrade your algorithm-training power and reclaim your time with our premium features.
          </p>
        </div>

        {error && (
          <div className="glass border-red-500/20 bg-red-500/5 text-red-400 p-4 rounded-xl mb-12 text-center animate-pulse">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((p) => {
            const Icon = p.icon;
            return (
              <div 
                key={p.name} 
                className={`glass glass-hover rounded-3xl p-8 flex flex-col relative overflow-hidden group ${p.popular ? 'border-primary/50 glow' : ''}`}
              >
                {p.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest py-1 px-8 rotate-45 translate-x-6 translate-y-3">
                      Popular
                    </div>
                  </div>
                )}
                
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon size={24} style={{ color: p.color }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{p.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">₹{p.price}</span>
                    <span className="text-neutral-500 text-sm">{p.price !== '0' ? '/mo' : ''}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                      <div className="mt-0.5 w-4 h-4 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <Check size={10} className="text-success" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <button 
                  disabled={loading === p.planId || p.planId === 'free'}
                  onClick={() => handlePayment(p.planId)}
                  className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${
                    p.planId === 'free' 
                      ? 'bg-white/5 text-neutral-500 cursor-not-allowed' 
                      : p.popular 
                        ? 'primary-gradient text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                        : 'bg-white text-black hover:bg-neutral-200'
                  } disabled:opacity-50 active:scale-95`}
                >
                  {loading === p.planId ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    p.planId === 'free' ? 'Current Plan' : `Get Started`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-12 text-neutral-500 text-sm">
          All plans include a 7-day money-back guarantee. No hidden fees.
        </p>
      </div>
    </>
  );
}

