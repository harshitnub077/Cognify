import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-[200px] rounded-3xl bg-white/5" />
        <Skeleton className="h-[400px] rounded-3xl bg-white/5" />
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20 max-w-6xl mx-auto"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={itemVariants}>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Focus</span></h1>
          <p className="text-slate-400">Tell the AI what you're working on right now.</p>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          {!editing ? (
            <button
              onClick={handleEditStart}
              className="glass-card hover:bg-white/10 px-6 py-3 rounded-full text-sm font-bold transition flex items-center gap-2 group shadow-lg"
            >
              <IconEdit size={16} className="group-hover:text-primary transition-colors" /> Edit Focus
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="glass-card hover:bg-white/5 px-6 py-3 rounded-full text-sm font-bold transition flex items-center gap-2"
              >
                <IconX size={16} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-6 py-3 rounded-full text-sm font-bold transition disabled:opacity-60 flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:scale-105 active:scale-95"
              >
                {saving ? <IconRefresh size={16} className="animate-spin" /> : <IconCheck size={16} />} 
                {saving ? 'Saving…' : 'Save Focus'}
              </button>
            </div>
          )}
        </motion.div>
      </header>

      {/* Edit Mode / View Mode Transition */}
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-8 rounded-3xl mb-8 relative overflow-hidden group shadow-[0_0_50px_rgba(124,58,237,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-50" />
            <div className="relative z-10">
              <div className="mb-6 flex flex-col gap-2">
                <h3 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                  <IconSparkles size={20} className="animate-pulse" /> AI Prompt Instruction
                </h3>
                <p className="text-slate-400 text-sm">Write anything. E.g. "I am a 3rd year CSE student preparing for the GATE exam and I want to master Data Structures."</p>
              </div>
              
              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="Describe your current life goals, exams, or skills you want to learn..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-base resize-none shadow-inner text-white placeholder-slate-600 transition-all"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            variants={itemVariants}
            className="glass-panel rounded-3xl p-8 relative overflow-hidden shadow-lg group"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-colors duration-1000"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px] group-hover:bg-accent/30 transition-colors duration-1000"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center py-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <IconTarget size={16} /> Current Neural Prompt
              </h3>
              <p className="font-display text-2xl md:text-3xl font-medium leading-relaxed max-w-4xl text-white">
                "{currentGoal}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendations */}
      <motion.div variants={itemVariants} className="space-y-10 mt-8">
        <WrappedGoalStrip goal={currentGoal} />
      </motion.div>
    </motion.div>
  );
};

const GoalStrip = ({ goal }: { goal: string }) => {
  const { data: recommendations, isLoading, refetch } = useRecommendations(goal, 12);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-bold flex items-center gap-3">
          <IconSparkles className="text-accent animate-pulse" size={28} />
          AI Curated Feed
        </h3>
        <button 
          onClick={() => refetch()} 
          className="text-xs font-bold text-slate-400 hover:text-white glass-card px-4 py-2 rounded-full flex items-center gap-2 transition hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <IconRefresh size={14} /> Refresh Matrix
        </button>
      </div>
      {isLoading ? (
        <div className="flex gap-6 overflow-x-hidden pt-4 pb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="w-[300px] h-[360px] rounded-3xl shrink-0 bg-white/5" />)}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pt-4 pb-8 custom-scrollbar snap-x snap-mandatory">
          {recommendations?.map((item: any) => (
            <motion.div 
              key={item.id} 
              className="snap-start shrink-0"
              whileHover={{ y: -10 }}
            >
              <RecommendationCard item={item} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const WrappedGoalStrip = ({ goal }: { goal: string }) => (
  <ErrorBoundary fallbackMessage={`Failed to load curated feed.`}>
    <GoalStrip goal={goal} />
  </ErrorBoundary>
);

export default Goals;
