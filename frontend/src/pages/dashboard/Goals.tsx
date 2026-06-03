import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IconTarget, IconBrain, IconLeaf, IconHeart, IconCode, IconBook,
  IconEdit, IconRefresh, IconCheck, IconX, IconSparkles
} from '@tabler/icons-react';
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

  // If there are identities from before, join them or take the first as the overarching goal
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
        identities: [goalText.trim()], // send as single string in array
        reduceGoals: profile?.reduceGoals || [],
        platforms: profile?.platforms || []
      });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
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
      <div className="space-y-6">
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Focus</h1>
          <p className="text-slate-500 text-sm">Tell the AI what you're working on right now.</p>
        </div>
        {!editing ? (
          <button
            onClick={handleEditStart}
            className="flex items-center gap-2 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#222] px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <IconEdit size={16} /> Edit Focus
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-[#333] transition hover:bg-slate-50 dark:hover:bg-[#1A1A1A]"
            >
              <IconX size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#6C4FF6] hover:bg-[#5b3fd4] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
            >
              <IconCheck size={16} /> {saving ? 'Saving…' : 'Save Focus'}
            </button>
          </div>
        )}
      </header>

      {/* Edit Mode — single text area */}
      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[#6C4FF6]/5 border border-[#6C4FF6]/20 rounded-2xl mb-8"
        >
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#6C4FF6] flex items-center gap-2">
              <IconSparkles size={16} /> AI Focus Prompt
            </h3>
            <p className="text-xs text-slate-500">Write anything. E.g. "I am a 3rd year CSE student preparing for the GATE exam and I want to master Data Structures."</p>
          </div>
          
          <textarea
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Describe your current life goals, exams, or skills you want to learn..."
            className="w-full h-32 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#6C4FF6] text-sm resize-none"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C4FF6] opacity-5 rounded-bl-full -z-0"></div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Current AI Focus</h3>
          <p className="text-lg font-medium leading-relaxed max-w-4xl">{currentGoal}</p>
        </motion.div>
      )}

      {/* Recommendations */}
      <div className="space-y-10 mt-4">
        <WrappedGoalStrip goal={currentGoal} />
      </div>
    </div>
  );
};

const GoalStrip = ({ goal }: { goal: string }) => {
  const { data: recommendations, isLoading, refetch } = useRecommendations(goal, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconSparkles className="text-[#6C4FF6]" size={20} />
          AI Curated Feed
        </h3>
        <button onClick={() => refetch()} className="text-xs font-semibold text-slate-500 hover:text-[#6C4FF6] flex items-center gap-1 transition">
          <IconRefresh size={14} /> Refresh Feed
        </button>
      </div>
      {isLoading ? (
        <div className="flex gap-4 overflow-x-hidden">
          {[1,2,3,4].map(i => <Skeleton key={i} className="w-[280px] h-[320px] rounded-xl shrink-0" />)}
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
};

const WrappedGoalStrip = ({ goal }: { goal: string }) => (
  <ErrorBoundary fallbackMessage={`Failed to load recommendations.`}>
    <GoalStrip goal={goal} />
  </ErrorBoundary>
);

export default Goals;
