/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { IconTarget, IconEdit, IconRefresh, IconCheck, IconX, IconSparkles } from '@tabler/icons-react';
import { RecommendationCard } from '../../components/RecommendationCard';
import { Skeleton } from '../../components/Skeleton';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useRecommendations, useUserProfile } from '../../hooks/useDashboardData';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const Goals = () => {
  const { data: profile, isLoading } = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const currentGoal: string = profile?.identities?.length > 0
    ? profile.identities.join(' ')
    : "I want to improve my focus and learn new things.";

  const handleEditStart = () => {
    setGoalText(currentGoal);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!goalText.trim()) { toast.error('Please describe your goal.'); return; }
    setSaving(true);
    try {
      await api.post('/user/onboarding', {
        identities: [goalText.trim()],
        reduceGoals: profile?.reduceGoals || [],
        platforms: profile?.platforms || []
      });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Goals updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Active Directive</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Your core cognitive objective. The AI filters your feed to align strictly with this directive.
          </p>
        </div>
        
        <div>
          {!editing ? (
            <button onClick={handleEditStart} className="btn-secondary flex items-center gap-2">
              <IconEdit size={16} /> Edit Directive
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <IconRefresh size={16} className="animate-spin" /> : <IconCheck size={16} />} 
                Initialize
              </button>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-10 lg:p-16 bg-[#0a0a0a] border border-[#1a1a1a]"
          >
            <div className="mb-6">
              <h3 className="text-xs font-medium flex items-center gap-2 text-white mb-2">
                <IconSparkles size={16} /> Reprogram Directive
              </h3>
              <p className="text-sm font-medium text-slate-500">Describe your current goals, upcoming exams, or exactly what you want to master.</p>
            </div>
            
            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="E.g. 'I am mastering advanced machine learning concepts for my upcoming interviews...'"
              className="w-full h-48 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#1a1a1a] focus:border-white focus:ring-0 rounded-md p-6 text-lg font-medium resize-none transition-colors text-white placeholder:text-slate-600 focus:outline-none"
            />
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 lg:p-12 relative overflow-hidden text-white group">
              <div className="absolute top-1/2 -translate-y-1/2 -right-20 opacity-[0.03] pointer-events-none group-hover:scale-[1.1] transition-transform duration-1000">
                <IconTarget size={400} stroke={2.5} />
              </div>
              <div className="relative z-10 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#111] border border-[#222] text-xs font-medium text-white shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2" /> Active
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#111] border border-[#222] text-xs font-medium text-white shadow-sm">
                    Neural Sync
                  </span>
                </div>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.2] text-white tracking-tight mb-8">
                  "{currentGoal.charAt(0).toUpperCase() + currentGoal.slice(1)}"
                </h2>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 border-t border-[#1a1a1a] pt-6">
                  <div className="flex items-center gap-2">
                    <IconSparkles size={14} className="text-slate-400" /> Web Curating
                  </div>
                  <div className="flex items-center gap-2">
                    <IconCheck size={14} className="text-slate-400" /> Distractions Blocked
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-8 border-t border-[#1a1a1a]">
        <WrappedGoalStrip goal={currentGoal} />
      </div>
    </div>
  );
};

const GoalStrip = ({ goal }: { goal: string }) => {
  const [seed, setSeed] = useState(0);
  const [excludeUrls, setExcludeUrls] = useState<string[]>([]);
  
  const { data: recommendations, isFetching } = useRecommendations(goal, 24, seed, excludeUrls.join(','));

  const handleRefresh = () => {
    if (recommendations) {
      setExcludeUrls(prev => {
        const newExcludes = [...prev, ...recommendations.map((r: any) => r.url)];
        return Array.from(new Set(newExcludes)).slice(-150); // keep last 150 to prevent huge payload
      });
    }
    setSeed(s => s + 1);
  };

  return (
    <div className="space-y-8 mt-4">
      <div className="flex items-end justify-between pb-4">
        <div>
          <h2 className="text-lg font-medium text-white mb-1">Curated Content</h2>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={isFetching}
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-2 transition-colors border border-[#1a1a1a] px-3 py-1.5 rounded-md hover:bg-[#0a0a0a] disabled:opacity-50"
        >
          <IconRefresh size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      
      {isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="w-full h-[320px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recommendations?.map((item: any) => (
            <div key={item.id} className="w-full flex justify-center">
              <RecommendationCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WrappedGoalStrip = ({ goal }: { goal: string }) => (
  <ErrorBoundary fallbackMessage="Failed to load curated feed.">
    <GoalStrip goal={goal} />
  </ErrorBoundary>
);

export default Goals;
