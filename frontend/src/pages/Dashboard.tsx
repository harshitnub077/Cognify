import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { 
  IconTrendingUp, 
  IconTarget, 
  IconFlame, 
  IconActivity,
  IconBrandYoutube,
  IconBrandInstagram,
  IconWorld,
  IconSparkles,
  IconAlertTriangle,
  IconLink,
  IconLoader2
} from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardStats, useEmotionTimeline, useContentHistory, useRecommendations, useBlindSpot } from '../hooks/useDashboardData';
import { RecommendationCard } from '../components/RecommendationCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Skeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import api from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const emotionColors: Record<string, string> = {
  joy: 'bg-emerald-500',
  anger: 'bg-red-500',
  fear: 'bg-amber-500',
  sadness: 'bg-indigo-500',
  surprise: 'bg-cyan-500',
  disgust: 'bg-purple-500',
  neutral: 'bg-slate-400'
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
      className="space-y-6 pb-20 max-w-5xl mx-auto"
    >
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-[90px] w-full rounded-xl" />)}
          </>
        ) : (
          <>
            <KPICard 
              title="Today's content" 
              value={stats?.stats?.totalAnalyzed || 0} 
              icon={IconActivity}
              color="text-blue-500"
              bg="bg-blue-500/10"
            />
            <KPICard 
              title="Conscious %" 
              value={`${stats?.stats?.consciousPercentage || 0}%`} 
              icon={IconTrendingUp}
              color={stats?.stats?.consciousPercentage >= 50 ? "text-emerald-500" : "text-red-500"}
              bg={stats?.stats?.consciousPercentage >= 50 ? "bg-emerald-500/10" : "bg-red-500/10"}
            />
            <KPICard 
              title="Goal alignment" 
              value={`${stats?.stats?.avgScore || 0}%`} 
              icon={IconTarget}
              color="text-purple-500"
              bg="bg-purple-500/10"
            />
          </>
        )}
      </div>

      {/* Simplified Content Feed */}
      <ErrorBoundary fallbackMessage="Failed to load content feed.">
        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold">Content Log</h3>
            <form onSubmit={handleAnalyze} className="flex gap-2 sm:w-96 w-full">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconLink size={16} className="text-slate-400" />
                </div>
                <input
                  type="url"
                  placeholder="Paste URL..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4FF6] transition"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isAnalyzing}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isAnalyzing}
                className="px-4 py-2 bg-[#6C4FF6] text-white rounded-lg text-sm font-medium hover:bg-[#5b3fe0] transition disabled:opacity-70 flex items-center gap-2"
              >
                {isAnalyzing ? <IconLoader2 size={16} className="animate-spin" /> : 'Log'}
              </button>
            </form>
          </div>
          
          {historyLoading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[100px] w-full rounded-xl" />)}
            </div>
          ) : (!historyData?.data || historyData.data.length === 0) ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <IconBrandYoutube size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No content logged yet</p>
              <p className="text-sm">Watch YouTube videos with the extension enabled to see them here.</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
              {historyData.data.map((item: any) => (
                <motion.div variants={itemVariants} key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200/50 dark:border-[#333]/50 hover:bg-slate-50 dark:hover:bg-[#1A1A1A] transition group">
                  <img 
                    src={item.thumbnail || (item.url.includes('youtube.com/watch') ? `https://img.youtube.com/vi/${new URL(item.url).searchParams.get('v')}/maxresdefault.jpg` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")} 
                    alt={item.title} 
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                    }}
                    className="w-full sm:w-32 h-20 rounded-lg object-cover bg-slate-200 dark:bg-[#333]" 
                  />
                  <div className="flex-1">
                    <h4 className="text-base font-semibold mb-1 line-clamp-1">{item.title}</h4>
                    <p className="text-sm text-slate-500 mb-2 line-clamp-1">{item.summary || "No insights generated for this content."}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                      <span className={cn("px-2 py-1 rounded text-white", emotionColors[item.dominantEmotion] || emotionColors.neutral)}>
                        {item.dominantEmotion}
                      </span>
                      <span className={cn("px-2 py-1 rounded", item.score >= 50 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                        {item.score}% Goal Match
                      </span>
                      {item.isConscious && (
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 flex items-center gap-1">
                          <IconSparkles size={12} /> Conscious Choice
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

const KPICard = ({ title, value, icon: Icon, color, bg }: any) => (
  <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.02 }} className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all">
    <div className={cn("p-3 rounded-xl", bg)}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{title}</h3>
      <div className="text-2xl font-black">{value}</div>
    </div>
  </motion.div>
);

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={14} className="text-red-500" aria-label="YouTube" />;
  if (platform === 'instagram') return <IconBrandInstagram size={14} className="text-pink-500" aria-label="Instagram" />;
  return <IconWorld size={14} className="text-blue-500" aria-label="Web" />;
};

export default Dashboard;
