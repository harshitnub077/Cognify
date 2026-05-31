'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BrainCircuit,
  ArrowLeft,
  Save,
  Zap,
  Target,
  Clock,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck,
  Crown,
  Loader2,
} from 'lucide-react';

const INTEREST_SUGGESTIONS = [
  'Machine Learning', 'Mathematics', 'Computer Science',
  'Philosophy', 'History', 'Physics', 'Productivity',
  'Entrepreneurship', 'Design', 'Software Engineering',
  'Economics', 'Chemistry', 'Biology', 'Psychology',
];

const PLANS = [
  { id: 'free',   label: 'Free',    icon: Zap,        color: 'text-slate-400' },
  { id: 'pro',    label: 'Pro',     icon: Crown,      color: 'text-primary' },
  { id: 'family', label: 'Family',  icon: ShieldCheck, color: 'text-secondary' },
];

type Interest = { topic: string; depth: 'beginner' | 'intermediate' | 'advanced' };

interface ProfileState {
  interests: Interest[];
  tolerance: number;
  studyModeActive: boolean;
  goal: string;
  plan: string;
}

export default function SettingsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileState>({
    interests: [],
    tolerance: 30,
    studyModeActive: true,
    goal: '',
    plan: 'free',
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileState | null>(null);
  const [customInterest, setCustomInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load profile ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }

        const { data: p } = await supabase
          .from('profiles')
          .select('interests, tolerance, study_mode_active, goal, plan')
          .eq('user_id', session.user.id)
          .single();

        if (p) {
          const loaded: ProfileState = {
            interests: (p.interests || []).map((i: any) =>
              typeof i === 'string' ? { topic: i, depth: 'intermediate' } : i
            ),
            tolerance: typeof p.tolerance === 'number' ? p.tolerance : 30,
            studyModeActive: !!p.study_mode_active,
            goal: p.goal || '',
            plan: p.plan || 'free',
          };
          setProfile(loaded);
          setOriginalProfile(loaded);
        }
      } catch {
        // Fallback mock
        const mock: ProfileState = {
          interests: [
            { topic: 'Machine Learning', depth: 'intermediate' },
            { topic: 'Mathematics', depth: 'advanced' },
          ],
          tolerance: 30,
          studyModeActive: true,
          goal: 'Master ML by end of year',
          plan: 'free',
        };
        setProfile(mock);
        setOriginalProfile(mock);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, router]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const toggleInterest = (topic: string) => {
    setProfile(prev => {
      const exists = prev.interests.find(i => i.topic === topic);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i.topic !== topic) };
      }
      if (prev.interests.length >= 7) return prev;
      return { ...prev, interests: [...prev.interests, { topic, depth: 'intermediate' }] };
    });
  };

  const setDepth = (topic: string, depth: Interest['depth']) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.map(i => i.topic === topic ? { ...i, depth } : i),
    }));
  };

  const addCustom = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const trimmed = customInterest.trim();
    if (!trimmed || profile.interests.find(i => i.topic === trimmed) || profile.interests.length >= 7) return;
    setProfile(prev => ({
      ...prev,
      interests: [...prev.interests, { topic: trimmed, depth: 'intermediate' }],
    }));
    setCustomInterest('');
  };

  const isDirty = JSON.stringify(profile) !== JSON.stringify(originalProfile);

  // ── Save ──────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          interests: profile.interests,
          tolerance: profile.tolerance,
          study_mode_active: profile.studyModeActive,
          goal: profile.goal,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);

      if (dbErr) throw dbErr;

      setOriginalProfile(profile);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 selection:bg-primary/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/dashboard"
            className="glass p-2.5 rounded-xl glass-hover text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center glow">
              <BrainCircuit className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight font-display">Profile Settings</h1>
              <p className="text-slate-400 text-sm">Changes sync to your extension automatically.</p>
            </div>
          </div>

          {/* Sticky Save */}
          <div className="ml-auto">
            {savedOk ? (
              <div className="flex items-center gap-2 text-success text-sm font-bold px-4 py-2 bg-success/10 border border-success/20 rounded-xl">
                <CheckCircle2 size={16} /> Saved!
              </div>
            ) : (
              <button
                onClick={save}
                disabled={saving || !isDirty}
                id="settings-save-btn"
                className="flex items-center gap-2 primary-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 glass border-danger/30 bg-danger/5 text-danger p-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">

          {/* ── Neural Shield Toggle ── */}
          <div className="glass rounded-[2rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl -translate-y-10 translate-x-10" />
            <div className="flex items-center justify-between relative">
              <div>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <ShieldCheck size={18} className={profile.studyModeActive ? 'text-success' : 'text-slate-500'} />
                  Neural Shield
                </h2>
                <p className="text-slate-400 text-sm">Activate real-time feed interception on YouTube.</p>
              </div>
              <button
                id="study-mode-toggle"
                onClick={() => setProfile(p => ({ ...p, studyModeActive: !p.studyModeActive }))}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${profile.studyModeActive ? 'bg-success' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${profile.studyModeActive ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
            <div className={`mt-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${profile.studyModeActive ? 'text-success' : 'text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full ${profile.studyModeActive ? 'bg-success animate-pulse' : 'bg-slate-600'}`} />
              {profile.studyModeActive ? 'Shield is ON — feed is being intercepted' : 'Shield is OFF — all content visible'}
            </div>
          </div>

          {/* ── Interests ── */}
          <div className="glass rounded-[2rem] p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Target size={18} className="text-secondary" /> Learning Interests
                </h2>
                <p className="text-slate-400 text-sm mt-1">Select up to 7 topics. Set your depth per topic.</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">
                {profile.interests.length} / 7
              </span>
            </div>

            {/* Suggestion Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {INTEREST_SUGGESTIONS.map(topic => {
                const selected = !!profile.interests.find(i => i.topic === topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleInterest(topic)}
                    disabled={!selected && profile.interests.length >= 7}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      selected
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-transparent border-white/15 text-slate-400 hover:border-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>

            {/* Custom Interest Input */}
            <div className="flex items-center gap-3 mb-6">
              <input
                type="text"
                value={customInterest}
                onChange={e => setCustomInterest(e.target.value)}
                onKeyDown={addCustom}
                placeholder="Add custom topic (press Enter)…"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
              />
              <button
                onClick={() => {
                  const e = { key: 'Enter' } as React.KeyboardEvent;
                  addCustom(e);
                }}
                className="glass p-3 rounded-xl glass-hover text-primary"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Selected Interests with Depth Selector */}
            {profile.interests.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Set Depth Level</p>
                {profile.interests.map(interest => (
                  <div key={interest.topic} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="flex-1 text-sm font-semibold text-white">{interest.topic}</span>
                    <div className="flex gap-1">
                      {(['beginner', 'intermediate', 'advanced'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDepth(interest.topic, d)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${
                            interest.depth === d
                              ? 'bg-primary text-white shadow-md shadow-primary/30'
                              : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => toggleInterest(interest.topic)}
                      className="text-slate-600 hover:text-danger transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Entertainment Tolerance ── */}
          <div className="glass rounded-[2rem] p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock size={18} className="text-primary" /> Entertainment Tolerance
                </h2>
                <p className="text-slate-400 text-sm mt-1">Daily allowance before the shield fully engages.</p>
              </div>
              <span className="text-3xl font-black text-primary">{profile.tolerance}<span className="text-base text-slate-400 font-normal ml-1">min</span></span>
            </div>

            <input
              type="range"
              min={0}
              max={120}
              step={5}
              value={profile.tolerance}
              onChange={e => setProfile(p => ({ ...p, tolerance: +e.target.value }))}
              className="w-full h-2 accent-primary bg-white/10 rounded-lg appearance-none cursor-pointer mb-4"
            />

            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>0m — Monk Mode 🧘</span>
              <span>60m — Balanced</span>
              <span>120m — Relaxed 🎯</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[0, 30, 60].map(preset => (
                <button
                  key={preset}
                  onClick={() => setProfile(p => ({ ...p, tolerance: preset }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    profile.tolerance === preset
                      ? 'primary-gradient text-white shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {preset === 0 ? 'Monk' : preset === 30 ? 'Balanced' : 'Relaxed'}<br />
                  <span className="text-xs font-normal opacity-70">{preset}min</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Active Goal ── */}
          <div className="glass rounded-[2rem] p-8">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Zap size={18} className="text-primary" /> Active Mission
            </h2>
            <textarea
              rows={3}
              value={profile.goal}
              onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
              placeholder="e.g. Master Machine Learning by June 2026 for my internship…"
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors resize-none leading-relaxed"
            />
            <p className="text-slate-500 text-xs mt-2">This goal shapes your AI classifier's relevance weights.</p>
          </div>

          {/* ── Plan Info ── */}
          <div className="glass rounded-[2rem] p-8">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Crown size={18} className="text-primary" /> Current Plan
            </h2>
            <div className="flex gap-4">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const active = profile.plan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`flex-1 p-5 rounded-2xl border transition-all ${
                      active
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Icon size={20} className={`${plan.color} mb-3`} />
                    <p className="font-bold text-white capitalize">{plan.label}</p>
                    {active && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1 block">Active</span>
                    )}
                  </div>
                );
              })}
            </div>
            <Link
              href="/pricing"
              className="mt-6 w-full py-3 rounded-2xl border border-primary/30 text-primary font-bold text-sm text-center hover:bg-primary/10 transition-colors block"
            >
              View Pricing Plans →
            </Link>
          </div>

          {/* ── Danger Zone ── */}
          <div className="glass rounded-[2rem] p-8 border-danger/20">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 text-danger">
              <Trash2 size={18} /> Danger Zone
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              These actions are irreversible. Proceed with caution.
            </p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  if (!confirm('Reset all your learning data? This cannot be undone.')) return;
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  await supabase.from('profiles').update({
                    interests: [],
                    channel_trust: {},
                    confirmed_topics: [],
                    blocked_topics: [],
                    trust_score: 50,
                  }).eq('user_id', session.user.id);
                  router.push('/onboarding');
                }}
                className="flex-1 py-3 rounded-2xl border border-danger/30 text-danger font-bold text-sm hover:bg-danger/10 transition-colors"
              >
                Reset Learning Data
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Sign out of FeedShift?')) return;
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold text-sm hover:text-white hover:border-white/20 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
