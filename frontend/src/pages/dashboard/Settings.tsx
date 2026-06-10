import React, { useState, useEffect } from 'react';
import { useAchievements, useUserProfile } from '../../hooks/useDashboardData';
import { 
  IconCheck, IconLoader2, IconLock, 
  IconSettings, IconBrain, IconShieldCheck, 
  IconUserCircle, IconBell, IconServer, IconChevronRight, IconLogout
} from '@tabler/icons-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const ACHIEVEMENTS_LIST = [
  { id: 'first_watch',       title: 'First Step',          description: 'Analyze first content', icon: '🌱' },
  { id: 'perfect_alignment', title: 'Perfect Match',       description: '100% aligned content', icon: '🎯' },
  { id: 'drift_positive_3',  title: 'Steady Mind',         description: 'Positive drift x3 weeks', icon: '🧘' },
  { id: 'toxic_reducer',     title: 'Cleanser',            description: 'Reduced toxicity by 30%', icon: '🧼' },
  { id: 'goal_aligned_week', title: 'Hyper Focus',         description: '80%+ alignment for week', icon: '🎯' },
  { id: 'coach_session_5',   title: 'Deep Thinker',        description: '5 coaching sessions', icon: '🧠' },
];

const useLocalPref = <T,>(key: string, initial: T) => {
  const [val, setVal] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal] as const;
};

const Settings = () => {
  const { user, signOut } = useAuthStore();
  const { data: achievementData } = useAchievements();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useLocalPref('cognify_persona', 'harsh');
  const [dailySummary, setDailySummary] = useLocalPref('cognify_daily', true);
  const [strictMode, setStrictMode] = useLocalPref('cognify_strict', false);

  const unlockedIds = achievementData?.data?.map((a: any) => a.type) || [];

  const { data: nlpStatus } = useQuery({
    queryKey: ['nlp-status'],
    queryFn: async () => {
      try {
        const res = await fetch('http://localhost:8001/coach/status');
        return res.json();
      } catch (e) {
        return null;
      }
    },
    refetchInterval: 10000
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.displayName) setDisplayName(profile.displayName);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (user?.user_metadata?.full_name) setDisplayName(user.user_metadata.full_name);
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/user/profile', { displayName: displayName.trim() });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const xp = achievementData?.totalXP || 0;
  const level = achievementData?.level || 1;

  return (
    <div className="space-y-12 pb-20 w-full max-w-3xl mx-auto px-4 md:px-6 mt-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account settings and preferences.</p>
      </header>

      <div className="space-y-10">
        
        {/* PROFILE SECTION */}
        <section>
          <h2 className="text-sm font-medium text-white mb-4">Profile</h2>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-lg font-medium text-white">
                {displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-medium text-white">{displayName || 'Explorer'}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="border-t border-[#1a1a1a] pt-5 mt-2 flex gap-3">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="flex-1 bg-transparent border border-[#1a1a1a] text-sm text-white placeholder-slate-600 px-3 py-2 rounded-md focus:outline-none focus:border-[#444] transition-colors"
              />
              <button type="submit" disabled={saving} className="bg-white text-black text-sm px-4 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors min-w-[80px]">
                {saving ? <IconLoader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </form>
          </div>
        </section>

        {/* AI PERSONA SECTION */}
        <section>
          <h2 className="text-sm font-medium text-white mb-4">Coaching Persona</h2>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg divide-y divide-[#1a1a1a]">
            {[
              { id: 'harsh', name: 'Harsh Coach', desc: 'Direct, unfiltered feedback. Pulls no punches.' },
              { id: 'balanced', name: 'Balanced Guide', desc: 'Constructive criticism with positive reinforcement.' },
              { id: 'academic', name: 'Academic', desc: 'Focuses purely on data, alignment scores, and facts.' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#0a0a0a] transition-colors text-left"
              >
                <div>
                  <h4 className={cn('text-sm font-medium', persona === p.id ? 'text-white' : 'text-white')}>{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                </div>
                {persona === p.id && <IconCheck size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </section>

        {/* PREFERENCES SECTION */}
        <section>
          <h2 className="text-sm font-medium text-white mb-4">Preferences</h2>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg divide-y divide-[#1a1a1a]">
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <IconBell size={18} className="text-slate-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Daily Summary</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Receive a daily breakdown of your content diet.</p>
                </div>
              </div>
              <button 
                onClick={() => setDailySummary(!dailySummary)}
                className={cn("w-9 h-5 rounded-full transition-colors relative", dailySummary ? "bg-white" : "bg-[#222]")}
              >
                <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform", dailySummary ? "translate-x-4" : "")} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <IconShieldCheck size={18} className="text-slate-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Strict Mode</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Filter out low-alignment content automatically.</p>
                </div>
              </div>
              <button 
                onClick={() => setStrictMode(!strictMode)}
                className={cn("w-9 h-5 rounded-full transition-colors relative", strictMode ? "bg-white" : "bg-[#222]")}
              >
                <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform", strictMode ? "translate-x-4" : "")} />
              </button>
            </div>

          </div>
        </section>

        {/* SYSTEM STATUS */}
        <section>
          <h2 className="text-sm font-medium text-white mb-4">System Details</h2>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-slate-500">Router Protocol</div>
              <div className="text-right text-white font-mono text-xs">{nlpStatus?.status?.active_provider || 'Connecting...'}</div>
              
              <div className="text-slate-500">Groq Usage</div>
              <div className="text-right text-white font-mono text-xs">{nlpStatus?.status?.groq_usage || 0} reqs</div>
              
              <div className="text-slate-500">Gemini Usage</div>
              <div className="text-right text-white font-mono text-xs">{nlpStatus?.status?.gemini_usage || 0} reqs</div>

              <div className="text-slate-500">Account Level</div>
              <div className="text-right text-white font-mono text-xs">Level {level} ({xp} XP)</div>
            </div>
          </div>
        </section>

        {/* ACCOUNT ACTIONS */}
        <section>
          <h2 className="text-sm font-medium text-red-500 mb-4">Danger Zone</h2>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
            <button 
              onClick={() => { if (confirm('Are you sure you want to sign out?')) signOut(); }} 
              className="w-full flex items-center justify-between p-4 hover:bg-[#0a0a0a] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <IconLogout size={18} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Log out everywhere</span>
              </div>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
