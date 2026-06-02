import React, { useMemo } from 'react';
import { useAchievements } from '../../hooks/useDashboardData';
import { IconTrophy, IconLock, IconCheck, IconUser } from '@tabler/icons-react';
import { useAuthStore } from '../../store/useAuthStore';
import confetti from 'canvas-confetti';

const ACHIEVEMENTS_LIST = [
  { id: 'first_analysis', title: 'First Steps', description: 'Analyzed your first piece of content', icon: '🌱' },
  { id: 'streak_7', title: 'Consistency', description: '7-day streak', icon: '🔥' },
  { id: 'drift_positive_3', title: 'Steady Mind', description: 'Positive drift for 3 consecutive weeks', icon: '🧘' },
  { id: 'toxic_reducer', title: 'Toxicity Cleanser', description: 'Reduced toxicity by 30% over 2 weeks', icon: '🧼' },
  { id: 'goal_aligned_week', title: 'Hyper Focus', description: '80%+ goal alignment for an entire week', icon: '🎯' },
  { id: 'coach_session_5', title: 'Deep Thinker', description: 'Completed 5 coaching sessions', icon: '🧠' },
  { id: 'echo_buster', title: 'Echo Buster', description: 'Added diverse content after a blind spot alert', icon: '🔨' },
];

const Settings = () => {
  const { user } = useAuthStore();
  const { data: achievementData } = useAchievements();
  
  const unlockedIds = achievementData?.data?.map((a: any) => a.type) || [];

  const [fakeProgress] = React.useState(() => {
    const progress: Record<string, number> = {};
    ACHIEVEMENTS_LIST.forEach(ach => {
      progress[ach.id] = Math.random() * 60;
    });
    return progress;
  });

  const handleTestConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6C4FF6', '#10B981', '#F59E0B']
    });
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconUser className="text-[#6C4FF6]" /> Profile & Settings
        </h1>
      </header>

      {/* Basic Info */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Account Information</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-[#1A1A1A] flex items-center justify-center text-xl font-bold text-slate-500 uppercase">
            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
          <div>
            <h4 className="font-bold text-lg">{user?.user_metadata?.full_name || 'Explorer'}</h4>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Gamification / Trophy Shelf */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <IconTrophy className="text-amber-500" /> Trophy Shelf
          </h3>
          <div className="text-right">
            <div className="text-sm font-bold text-[#6C4FF6]">Level {achievementData?.level || 1}</div>
            <div className="text-xs text-slate-500">{achievementData?.totalXP || 0} XP</div>
          </div>
        </div>

        <button 
          onClick={handleTestConfetti}
          className="mb-6 px-3 py-1 bg-slate-100 dark:bg-[#1A1A1A] text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-[#333] transition"
        >
          Test Confetti 🎉
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ACHIEVEMENTS_LIST.map(ach => {
            const isUnlocked = unlockedIds.includes(ach.id);
            return (
              <div 
                key={ach.id} 
                className={`p-4 rounded-xl border relative transition-all ${isUnlocked ? 'bg-amber-500/5 border-amber-500/20 shadow-sm' : 'bg-slate-50 dark:bg-[#1A1A1A] border-slate-200 dark:border-[#333] opacity-60 grayscale'}`}
              >
                {isUnlocked ? (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <IconCheck size={10} className="text-white" />
                  </div>
                ) : (
                  <IconLock size={14} className="absolute top-2 right-2 text-slate-400" />
                )}
                
                <div className="text-4xl mb-3 text-center">{ach.icon}</div>
                <h4 className={`text-sm font-bold text-center mb-1 ${isUnlocked ? 'text-amber-700 dark:text-amber-500' : 'text-slate-600'}`}>
                  {ach.title}
                </h4>
                <p className="text-[10px] text-center text-slate-500 leading-tight">
                  {ach.description}
                </p>

                {/* Fake progress bar if locked */}
                {!isUnlocked && (
                  <div className="mt-3 w-full h-1 bg-slate-200 dark:bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${fakeProgress[ach.id]}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};

export default Settings;
