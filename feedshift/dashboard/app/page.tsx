import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import { BrainCircuit, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react'

export default async function LandingPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  let session = null;
  
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session;

    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, interests')
        .eq('user_id', session.user.id)
        .single()
        
      if (!profile?.role || !profile?.interests || profile.interests.length === 0) {
        redirect('/onboarding')
      } else if (profile.role === 'parent') {
        redirect('/parent')
      } else {
        redirect('/dashboard')
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed. Loading unauthenticated UI.');
  }

  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 selection:bg-primary/30 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-screen">
        
        {/* Badge */}
        <div className="glass px-4 py-2 rounded-full border-primary/20 bg-primary/5 flex items-center gap-2 mb-8 animate-float">
          <Sparkles className="text-primary" size={14} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Now Powered by GPT-4o Mini</span>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mb-20">
          <h1 className="text-7xl md:text-8xl font-black tracking-tight font-display leading-[0.9]">
            Reclaim Your <br />
            <span className="text-gradient">Attention.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Stop fighting the algorithm. FeedShift uses advanced AI to intercept your YouTube feed, 
            blocking distractions and surfacing high-value learning content in real-time.
          </p>
        </div>
        
        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl mb-20">
          {[
            {
              title: "1. Define Your Mission",
              desc: "Set your interests, target depth levels, and time tolerances for entertainment.",
              icon: BrainCircuit,
              color: "text-primary"
            },
            {
              title: "2. Neural Interception",
              desc: "Our 5-layer classifier scans every video thumbnail and title before you can click.",
              icon: ShieldCheck,
              color: "text-secondary"
            },
            {
              title: "3. Algorithm Evolution",
              desc: "Programmatically retrain YouTube's recommendations through automated signals.",
              icon: TrendingUp,
              color: "text-success"
            }
          ].map((feature, i) => (
            <div key={i} className="glass rounded-3xl p-8 glass-hover border-white/5 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon size={24} className={feature.color} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <LoginForm />
        </div>

        <p className="mt-12 text-slate-500 text-sm font-medium">
          Join 50,000+ students reclaiming their focus.
        </p>
      </div>
    </div>
  )
}

