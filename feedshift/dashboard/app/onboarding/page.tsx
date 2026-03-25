'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Brain, Shield, Target, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

const INTEREST_SUGGESTIONS = [
  "Machine Learning", "Mathematics", "Computer Science", 
  "Philosophy", "History", "Physics", "Productivity", 
  "Entrepreneurship", "Design", "Software Engineering"
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [tolerance, setTolerance] = useState(30); // minutes per day

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      }
    };
    checkUser();
  }, [supabase, router]);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      }
    }
  };

  const addCustomInterest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customInterest.trim() !== '') {
      e.preventDefault();
      if (interests.length < 5 && !interests.includes(customInterest.trim())) {
        setInterests([...interests, customInterest.trim()]);
        setCustomInterest('');
      }
    }
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Format interests as objects if expected by schema, or strings
      const formattedInterests = interests.map(topic => ({ topic, depth: 'intermediate' }));

      const { error } = await supabase
        .from('profiles')
        .update({
          role: role,
          interests: formattedInterests,
          tolerance: tolerance,
          study_mode_active: true // Auto-activate
        })
        .eq('user_id', session.user.id);

      if (error) throw error;

      // Trigger backend to pre-generate AI keywords based on interests
      fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: formattedInterests })
      }).catch(e => console.error("Keyword generation triggered in background", e));

      router.push(role === 'parent' ? '/parent' : '/dashboard');
    } catch (err) {
      console.error("Setup failed:", err);
      alert("Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* STEP 1: ROLE */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <h1 className="text-4xl font-display font-black mb-4">Who is using FeedShift?</h1>
              <p className="text-slate-400">Select your role to customize the dashboard experience.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setRole('student')}
                className={`glass p-8 rounded-3xl border-2 transition-all text-left group ${role === 'student' ? 'border-primary bg-primary/10' : 'border-white/5 hover:border-white/20'}`}
              >
                <Target size={32} className={`mb-4 ${role === 'student' ? 'text-primary' : 'text-slate-500'}`} />
                <h3 className="text-xl font-bold mb-2">Student / Professional</h3>
                <p className="text-sm text-slate-400">I want to filter my own feed to stay focused and learn.</p>
              </button>
              
              <button 
                onClick={() => setRole('parent')}
                className={`glass p-8 rounded-3xl border-2 transition-all text-left group ${role === 'parent' ? 'border-secondary bg-secondary/10' : 'border-white/5 hover:border-white/20'}`}
              >
                <Shield size={32} className={`mb-4 ${role === 'parent' ? 'text-secondary' : 'text-slate-500'}`} />
                <h3 className="text-xl font-bold mb-2">Parent / Guardian</h3>
                <p className="text-sm text-slate-400">I want to manage content filters for my family's devices.</p>
              </button>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors">
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INTERESTS */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <h1 className="text-4xl font-display font-black mb-4">Define Your Mission</h1>
              <p className="text-slate-400">What topics should the Neural Shield prioritize? (Select up to 5)</p>
            </div>

            <div className="glass p-8 rounded-3xl border-white/10 space-y-6">
              <div className="flex flex-wrap gap-3">
                {INTEREST_SUGGESTIONS.map(interest => {
                  const isSelected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${isSelected ? 'bg-primary border-primary text-white' : 'bg-transparent border-white/20 text-slate-300 hover:border-white/50'}`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-slate-400 mb-2">Or add your own (Press Enter):</p>
                <input 
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={addCustomInterest}
                  placeholder="e.g. Neuroscience, Unreal Engine..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white font-medium px-4">
                Back
              </button>
              <button 
                onClick={() => setStep(3)} 
                disabled={interests.length === 0}
                className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: STRICTNESS */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
              <h1 className="text-4xl font-display font-black mb-4">Set Your Limits</h1>
              <p className="text-slate-400">How strict should the filter be regarding entertainment?</p>
            </div>

            <div className="glass p-8 rounded-3xl border-white/10 space-y-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-300">Daily Entertainment Allowance</span>
                <span className="text-2xl font-black text-primary">{tolerance} mins</span>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="120" 
                step="15"
                value={tolerance}
                onChange={(e) => setTolerance(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>0m (Monk Mode)</span>
                <span>60m (Balanced)</span>
                <span>120m (Relaxed)</span>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-4 items-start">
                <Brain className="text-primary mt-1" size={20} shrink-0 />
                <p className="text-sm text-primary/80 leading-relaxed">
                  The AI will automatically block entertainment content. If you allow some minutes, it will unlock a "Break Mode" button on YouTube when you need a rest.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white font-medium px-4">
                Back
              </button>
              <button 
                onClick={completeSetup} 
                disabled={loading}
                className="bg-primary hover:bg-primary/80 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-70"
              >
                {loading ? 'Initializing Shield...' : 'Activate Neural Shield'}
                {!loading && <Zap size={18} fill="currentColor" />}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
