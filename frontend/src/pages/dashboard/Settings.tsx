import React, { useState, useEffect } from 'react';
import { useAchievements, useUserProfile } from '../../hooks/useDashboardData';
import { IconTrophy, IconLock, IconCheck, IconUser, IconEdit, IconLoader2, IconBell, IconMoon, IconShield } from '@tabler/icons-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const ACHIEVEMENTS_LIST = [
  { id: 'first_watch',       title: 'First Step',          description: 'Analyze your first content', icon: '🌱' },
  { id: 'perfect_alignment', title: 'Perfect Match',       description: 'Find 100% aligned content', icon: '🎯' },
  { id: 'drift_positive_3',  title: 'Steady Mind',         description: 'Positive drift for 3 consecutive weeks', icon: '🧘' },
  { id: 'toxic_reducer',     title: 'Toxicity Cleanser',   description: 'Reduced toxicity by 30% over 2 weeks', icon: '🧼' },
  { id: 'goal_aligned_week', title: 'Hyper Focus',         description: '80%+ goal alignment for an entire week', icon: '🎯' },
  { id: 'coach_session_5',   title: 'Deep Thinker',        description: 'Completed 5 coaching sessions', icon: '🧠' },
  { id: 'echo_buster',       title: 'Echo Buster',         description: 'Added diverse content after a blind spot alert', icon: '🔨' },
];

const Settings = () => {
  const { user, signOut } = useAuthStore();
  const { data: achievementData } = useAchievements();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const unlockedIds = achievementData?.data?.map((a: any) => a.type) || [];

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
    else if (user?.user_metadata?.full_name) setDisplayName(user.user_metadata.full_name);
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/user/profile', { displayName: displayName.trim() });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6C4FF6', '#10B981', '#F59E0B'] });
  };

  const xp = achievementData?.totalXP || 0;
  const level = achievementData?.level || 1;
  const xpToNext = ((level) * (level)) * 100;
  const xpProgress = Math.min(100, ((xp % xpToNext) / xpToNext) * 100);

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><IconUser size={26} className="text-[#6C4FF6]" /> Profile & Settings</h1>
      </header>

      {/* Profile Card */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-5">Account Information</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#6C4FF6] flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
            {displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
          <div>
            <h4 className="font-bold text-lg">{displayName || user?.email || 'Explorer'}</h4>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex gap-3 max-w-md">
          <div className="flex-1 relative">
            <IconEdit size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4FF6]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#6C4FF6] text-white rounded-xl text-sm font-semibold hover:bg-[#5b3fd4] transition disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
            Save
          </button>
        </form>
      </section>

      {/* XP / Level */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2"><IconTrophy size={20} className="text-amber-500" /> Trophy Shelf</h3>
          <div className="text-right">
            <div className="text-sm font-bold text-[#6C4FF6]">Level {level}</div>
            <div className="text-xs text-slate-500">{xp} XP total</div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Level {level}</span>
            <span>{xp % xpToNext}/{xpToNext} XP → Level {level + 1}</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-[#222] rounded-full overflow-hidden">
            <div className="h-full bg-[#6C4FF6] rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>

        <button
          onClick={handleTestConfetti}
          className="mb-5 px-3 py-1 bg-slate-100 dark:bg-[#1A1A1A] text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] transition"
        >
          Celebrate 🎉
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ACHIEVEMENTS_LIST.map(ach => {
            const isUnlocked = unlockedIds.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border relative transition-all ${
                  isUnlocked
                    ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#1A1A1A] border-slate-200 dark:border-[#333] opacity-55 grayscale'
                }`}
              >
                {isUnlocked
                  ? <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"><IconCheck size={10} className="text-white" /></div>
                  : <IconLock size={14} className="absolute top-2 right-2 text-slate-400" />
                }
                <div className="text-4xl mb-3 text-center">{ach.icon}</div>
                <h4 className={`text-sm font-bold text-center mb-1 ${isUnlocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600'}`}>{ach.title}</h4>
                <p className="text-[10px] text-center text-slate-500 leading-tight">{ach.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-[#121212] border border-red-200 dark:border-red-900/30 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-red-500"><IconShield size={20} /> Danger Zone</h3>
        <button
          onClick={() => { if (confirm('Sign out?')) signOut(); }}
          className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition"
        >
          Sign Out
        </button>
      </section>
    </div>
  );
};

export default Settings;
