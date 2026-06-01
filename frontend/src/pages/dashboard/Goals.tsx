import React from 'react';
import { IconTarget, IconBrain, IconLeaf, IconHeart, IconEdit, IconBrandYoutube, IconRefresh } from '@tabler/icons-react';
import { RecommendationCard } from '../../components/RecommendationCard';
import { Skeleton } from '../../components/Skeleton';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useRecommendations } from '../../hooks/useDashboardData';

const MOCK_GOALS = [
  { id: 1, title: 'Deep Thinker', icon: IconBrain, progress: 78, items: 12, color: '#6C4FF6' },
  { id: 2, title: 'Mindful Creator', icon: IconLeaf, progress: 65, items: 8, color: '#10B981' },
  { id: 3, title: 'Empathetic Leader', icon: IconHeart, progress: 42, items: 5, color: '#F43F5E' },
];

const Goals = () => {
  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Goals</h1>
          <p className="text-slate-500 text-sm">Identities you are actively aligning with.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#222] px-4 py-2 rounded-lg text-sm font-semibold transition">
          <IconEdit size={16} /> Edit Goals
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_GOALS.map(goal => (
          <div key={goal.id} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${goal.color}20`, color: goal.color }}>
              <goal.icon size={32} />
            </div>
            
            <h3 className="text-xl font-bold mb-1">{goal.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{goal.items} aligned items this week</p>

            <div className="relative w-32 h-32 mb-8">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-100 dark:text-[#222]" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={goal.color} strokeWidth="8" strokeDasharray={`${(goal.progress / 100) * 283} 283`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: goal.color }}>{goal.progress}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aligned</span>
              </div>
            </div>

            <div className="w-full text-left">
              <h4 className="text-xs uppercase font-bold text-slate-500 mb-3">Top Content Driving This</h4>
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-12 h-8 bg-slate-200 dark:bg-[#333] rounded overflow-hidden shrink-0 relative">
                      <img src={`https://images.unsplash.com/photo-1${Math.floor(Math.random()*99999)}?w=100&q=80`} alt="" className="w-full h-full object-cover opacity-80" />
                      <IconBrandYoutube size={12} className="absolute bottom-1 right-1 text-white drop-shadow-md" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">The Power of Focused Thinking in a Distracted World</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Goal Recommendation Strips */}
      <div className="space-y-10 mt-10">
        {MOCK_GOALS.map(goal => (
          <WrappedGoalStrip key={`strip-${goal.id}`} goal={goal.title} />
        ))}
      </div>
    </div>
  );
};

const GoalStrip = ({ goal }: { goal: string }) => {
  const { data: recommendations, isLoading, refetch } = useRecommendations(goal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Content for <span className="text-[#6C4FF6]">[{goal}]</span></h3>
        <button onClick={() => refetch()} className="text-xs font-semibold text-slate-500 hover:text-[#6C4FF6] flex items-center gap-1 transition">
          <IconRefresh size={14} /> Refresh suggestions
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex gap-4 overflow-x-hidden">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="w-[280px] h-[320px] rounded-xl shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {recommendations?.map((item: any) => (
            <div key={item.id} className="snap-start shrink-0">
              <RecommendationCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const WrappedGoalStrip = ({ goal }: { goal: string }) => (
  <ErrorBoundary fallbackMessage={`Failed to load recommendations for ${goal}.`}>
    <GoalStrip goal={goal} />
  </ErrorBoundary>
);

export default Goals;
