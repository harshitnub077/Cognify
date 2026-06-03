import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { 
  IconTrendingUp, 
  IconTarget, 
  IconActivity,
  IconBrandYoutube,
  IconSparkles,
  IconLink,
  IconLoader2,
  IconPlayerPlay
} from '@tabler/icons-react';
import { useDashboardStats, useContentHistory } from '../hooks/useDashboardData';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Skeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const emotionColors: Record<string, string> = {
  joy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  anger: 'bg-red-500/20 text-red-400 border-red-500/30',
  fear: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sadness: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  surprise: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  disgust: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: historyData, isLoading: historyLoading } = useContentHistory({ limit: 15 });
  
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    setIsAnalyzing(true);
    try {
      await api.post('/content/analyze', { url: urlInput, title: 'Manual Entry', platform: 'youtube' });
      setUrlInput('');
      queryClient.invalidateQueries({ queryKey: ['content-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (error) {
      console.error('Failed to analyze URL:', error);
      alert('Failed to analyze URL.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-8 pb-20 max-w-6xl mx-auto"
    >
      <div className="flex flex-col gap-2 mb-8">
        <motion.h1 variants={itemVariants} className="font-display text-4xl font-bold tracking-tight">
          Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Cognify</span>
        </motion.h1>
        <motion.p variants={itemVariants} className="text-slate-400">Here's your neural sync overview for today.</motion.p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {statsLoading ? (
          <>
            {[1,2,3].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-2xl bg-white/5" />)}
          </>
        ) : (
          <>
            <KPICard 
              title="Today's Intake" 
              value={stats?.stats?.totalAnalyzed || 0} 
              icon={IconActivity}
              color="text-[#38BDF8]"
              bg="bg-[#38BDF8]/10"
              glow="shadow-[0_0_30px_rgba(56,189,248,0.15)]"
            />
            <KPICard 
              title="Conscious %" 
              value={`${stats?.stats?.consciousPercentage || 0}%`} 
              icon={IconTrendingUp}
              color={stats?.stats?.consciousPercentage >= 50 ? "text-emerald-400" : "text-red-400"}
              bg={stats?.stats?.consciousPercentage >= 50 ? "bg-emerald-500/10" : "bg-red-500/10"}
              glow={stats?.stats?.consciousPercentage >= 50 ? "shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "shadow-[0_0_30px_rgba(239,68,68,0.15)]"}
            />
            <KPICard 
              title="Goal Alignment" 
              value={`${stats?.stats?.avgScore || 0}%`} 
              icon={IconTarget}
              color="text-[#7C3AED]"
              bg="bg-[#7C3AED]/10"
              glow="shadow-[0_0_30px_rgba(124,58,237,0.15)]"
            />
          </>
        )}
      </div>

      {/* Manual Ingestion */}
      <motion.form variants={itemVariants} onSubmit={handleAnalyze} className="glass-panel p-2 pl-4 rounded-full flex gap-2 w-full max-w-2xl items-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <IconLink size={20} className="text-slate-400 relative z-10" />
        <input
          type="url"
          placeholder="Paste a YouTube URL to manually analyze..."
          className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder-slate-500 text-sm relative z-10"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={isAnalyzing}
          required
        />
        <button 
          type="submit" 
          disabled={isAnalyzing}
          className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full text-sm font-bold shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-70 flex items-center gap-2 relative z-10 hover:scale-105 active:scale-95"
        >
          {isAnalyzing ? <IconLoader2 size={16} className="animate-spin" /> : 'Analyze Feed'}
        </button>
      </motion.form>

      {/* Simplified Content Feed */}
      <ErrorBoundary fallbackMessage="Failed to load content feed.">
        <motion.div variants={itemVariants} className="glass-panel rounded-3xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="font-display text-2xl font-bold flex items-center gap-3">
              <IconPlayerPlay className="text-accent" /> Recent Activity Log
            </h3>
          </div>
          
          {historyLoading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-2xl bg-white/5" />)}
            </div>
          ) : (!historyData?.data || historyData.data.length === 0) ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 glass-card rounded-2xl border-dashed">
              <IconBrandYoutube size={64} className="text-slate-700 mb-4" />
              <p className="font-display text-xl font-bold text-slate-300">No content logged yet</p>
              <p className="text-sm mt-2 max-w-md">Watch YouTube videos with the extension enabled or manually paste a link above to start tracking your digital diet.</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
              {historyData.data.map((item: any) => (
                <motion.div 
                  variants={itemVariants} 
                  key={item.id} 
                  whileHover={{ scale: 1.01, x: 10 }}
                  className="flex flex-col sm:flex-row gap-6 p-4 rounded-2xl glass-card group"
                >
                  <div className="relative overflow-hidden rounded-xl w-full sm:w-48 h-28 shrink-0">
                    <img 
                      src={item.thumbnail || (item.url.includes('youtube.com/watch') ? `https://img.youtube.com/vi/${new URL(item.url).searchParams.get('v')}/maxresdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")} 
                      alt={item.title} 
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="font-display text-lg font-bold mb-2 line-clamp-1 group-hover:text-accent transition-colors">{item.title}</h4>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">{item.summary || "No insights generated for this content."}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <span className={cn("px-3 py-1 rounded-full border", emotionColors[item.dominantEmotion] || emotionColors.neutral)}>
                        {item.dominantEmotion}
                      </span>
                      <span className={cn("px-3 py-1 rounded-full border", item.score >= 50 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30")}>
                        {item.score}% Alignment
                      </span>
                      {item.isConscious && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                          <IconSparkles size={14} className="animate-pulse" /> Conscious Choice
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </ErrorBoundary>
    </motion.div>
  );
};

const KPICard = ({ title, value, icon: Icon, color, bg, glow }: any) => (
  <motion.div 
    variants={itemVariants} 
    whileHover={{ y: -5, scale: 1.02 }} 
    className={cn("glass-card p-6 flex flex-col gap-4 transition-all relative overflow-hidden group", glow)}
  >
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
    <div className="flex justify-between items-start">
      <div className={cn("p-4 rounded-2xl inline-block", bg)}>
        <Icon size={28} className={color} />
      </div>
    </div>
    <div>
      <div className="font-display text-4xl font-black mb-1">{value}</div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
  </motion.div>
);

export default Dashboard;
