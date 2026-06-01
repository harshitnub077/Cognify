import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: timelineData, isLoading: timelineLoading } = useEmotionTimeline();
  const { data: historyData, isLoading: historyLoading } = useContentHistory({ limit: 10 });
  const { data: picks } = useRecommendations('Mindful Creator', 1);
  const { data: blindSpot } = useBlindSpot();

  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  
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
      // Invalidate queries to trigger an immediate refetch
      queryClient.invalidateQueries({ queryKey: ['content-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['emotion-timeline'] });
    } catch (error) {
      console.error('Failed to analyze URL:', error);
      alert('Failed to analyze URL. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!timelineData) return [];
    return timelineData.map((item: any) => ({
      date: format(new Date(item.date), 'MMM dd'),
      alignment: Math.round((item.averageScore || 0) * 100),
      positive: Math.round(((item.emotions?.joy || 0) + (item.emotions?.surprise || 0)) * 100),
      negative: Math.round(((item.emotions?.anger || 0) + (item.emotions?.sadness || 0) + (item.emotions?.fear || 0)) * 100),
    }));
  }, [timelineData]);

  if (statsLoading || timelineLoading || historyLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Today's content" 
          value={stats?.stats?.totalAnalyzed || 0} 
          trend={`${stats?.stats?.totalAnalyzed || 0} total analyzed`}
          icon={IconActivity}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <KPICard 
          title="Conscious %" 
          value={`${stats?.stats?.consciousPercentage || 0}%`} 
          trend={stats?.stats?.consciousPercentage >= 50 ? "Positive shift" : "Needs attention"}
          icon={IconTrendingUp}
          color={stats?.stats?.consciousPercentage >= 50 ? "text-emerald-500" : "text-red-500"}
          bg={stats?.stats?.consciousPercentage >= 50 ? "bg-emerald-500/10" : "bg-red-500/10"}
        />
        <KPICard 
          title="Goal alignment" 
          value={`${stats?.stats?.avgScore || 0}%`} 
          trend="Based on your goals"
          icon={IconTarget}
          color="text-purple-500"
          bg="bg-purple-500/10"
        />
        <KPICard 
          title="Streak" 
          value={`${stats?.stats?.streak || 0} Days`} 
          trend={stats?.stats?.streak > 0 ? "Keep it up!" : "Start your streak!"}
          icon={IconFlame}
          color="text-orange-500"
          bg="bg-orange-500/10"
        />
      </div>

      {/* Blind Spot Warning */}
      {blindSpot?.detected && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shrink-0">
            <IconAlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-700 dark:text-amber-500 mb-1">Perspective Alert: Echo Chamber Detected</h4>
            <p className="text-sm text-amber-600/80 dark:text-amber-500/80 max-w-3xl leading-relaxed">
              {blindSpot.suggestion}
            </p>
            <button className="mt-3 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition shadow-sm">
              Show me diverse content
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Emotion Timeline */}
        <ErrorBoundary fallbackMessage="Failed to load emotion timeline.">
          <div className="lg:col-span-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Emotion Timeline</h3>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-lg text-xs font-medium">
                {(['7D', '30D', '90D'] as const).map(range => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    aria-pressed={timeRange === range}
                    className={cn("px-3 py-1 rounded-md transition focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none", timeRange === range ? "bg-white dark:bg-[#333] shadow-sm text-[#6C4FF6]" : "text-slate-500")}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            
            {chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                No emotion data yet. Start analyzing content to see trends here.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAlign" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '14px' }}
                    />
                    <Area type="monotone" dataKey="alignment" name="Goal Alignment" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAlign)" />
                    <Area type="monotone" dataKey="positive" name="Positive Emotions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" />
                    <Area type="monotone" dataKey="negative" name="Negative Emotions" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Content Feed */}
        <ErrorBoundary fallbackMessage="Failed to load content feed.">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm flex flex-col h-[450px]">
            <h3 className="text-lg font-bold mb-4">Recent Content</h3>
            
            {/* Manual URL Analysis Input */}
            <form onSubmit={handleAnalyze} className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconLink size={16} className="text-slate-400" />
                </div>
                <input
                  type="url"
                  placeholder="Paste YouTube or article URL..."
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
                {isAnalyzing ? <><IconLoader2 size={16} className="animate-spin" /> Analyzing</> : 'Analyze'}
              </button>
            </form>

            {(!historyData?.data || historyData.data.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-slate-500 gap-3">
                <div className="w-16 h-16 bg-slate-100 dark:bg-[#222] rounded-full flex items-center justify-center mb-2">
                  <IconWorld size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No content analyzed yet</p>
                  <p className="text-xs">Paste a YouTube link above or use our extension to get started.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {historyData.data.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedContent(item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.title}`}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedContent(item)}
                    className="flex gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-[#333] hover:bg-slate-50 dark:hover:bg-[#1A1A1A] transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none"
                  >
                    <img 
                      src={item.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"} 
                      alt={item.title || 'Content thumbnail'} 
                      width={64} height={48}
                      loading="lazy"
                      className="w-16 h-12 rounded object-cover bg-slate-200 dark:bg-[#333]" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate mb-1">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide">
                        <PlatformIcon platform={item.platform} />
                        <span className={cn("px-1.5 py-0.5 rounded text-white", emotionColors[item.dominantEmotion] || emotionColors.neutral)}>
                          {item.dominantEmotion}
                        </span>
                        <span className={cn("px-1.5 py-0.5 rounded", item.score >= 50 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                          {item.score}% Match
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ErrorBoundary>

      </div>

      {/* Cognify Pick of the Day */}
      {picks && picks[0] && (
        <ErrorBoundary fallbackMessage="Failed to load recommendations.">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <IconSparkles className="text-[#6C4FF6]" size={20} /> Pick of the Day
            </h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0">
                <RecommendationCard item={picks[0]} />
              </div>
              <div className="bg-[#6C4FF6]/10 p-4 rounded-xl border border-[#6C4FF6]/20 flex-1">
                <h4 className="text-xs font-bold text-[#6C4FF6] uppercase mb-1">Why this for you?</h4>
                <p className="text-sm text-slate-700 dark:text-[#A7A9BE] leading-relaxed">
                  {picks[0].reason || 'This content aligns closely with your active goals and current positive emotion trajectory.'}
                </p>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Detail Modal */}
      {selectedContent && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" 
          onClick={() => setSelectedContent(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Content details"
        >
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#333] rounded-t-2xl sm:rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={selectedContent.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"} alt={selectedContent.title} width={672} height={192} className="w-full h-48 object-cover bg-slate-200 dark:bg-[#222]" />
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">{selectedContent.title}</h2>
              <p className="text-sm text-slate-500 mb-6">{selectedContent.platform} • {format(new Date(selectedContent.createdAt), 'PPpp')}</p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-xs uppercase text-slate-500 font-bold mb-3">Emotion Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedContent.emotions || {}).filter(([k]) => k!=='neutral').sort((a:any, b:any) => b[1] - a[1]).map(([key, val]: any) => (
                      <div key={key} className="flex items-center text-xs">
                        <span className="w-16 capitalize">{key}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-[#222] rounded-full mx-2 overflow-hidden">
                          <div className={cn("h-full", emotionColors[key])} style={{ width: `${Math.round(val * 100)}%` }} />
                        </div>
                        <span className="w-8 text-right font-medium">{Math.round(val * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs uppercase text-slate-500 font-bold mb-3">Goal Alignment</h4>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-[#6C4FF6]">{selectedContent.score}%</span>
                    <span className="text-sm font-medium mb-1 text-slate-500">Match</span>
                  </div>
                  <p className="text-sm leading-relaxed">{selectedContent.summary || "This content subtly influences your identity vectors."}</p>
                </div>
              </div>
              
              <div className="bg-[#6C4FF6]/10 p-4 rounded-xl mb-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6C4FF6] text-white flex items-center justify-center font-bold text-xs shrink-0">C</div>
                  <p className="text-sm text-[#6C4FF6] font-medium leading-relaxed">
                    AI Insight: Consuming this triggers high {selectedContent.dominantEmotion}, pulling you slightly away from your calmness goals.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedContent(null)} 
                className="w-full py-2.5 text-sm font-bold border border-slate-200 dark:border-[#333] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1A1A1A] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, trend, icon: Icon, color, bg }: any) => (
  <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
      <div className={cn("p-2 rounded-lg", bg)}>
        <Icon size={20} className={color} aria-hidden="true" />
      </div>
    </div>
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className="text-xs font-semibold text-slate-500">{trend}</div>
  </div>
);

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={14} className="text-red-500" aria-label="YouTube" />;
  if (platform === 'instagram') return <IconBrandInstagram size={14} className="text-pink-500" aria-label="Instagram" />;
  return <IconWorld size={14} className="text-blue-500" aria-label="Web" />;
};

export default Dashboard;
