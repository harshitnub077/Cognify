import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconTarget, IconBrain, IconFlame, IconActivity,
  IconArrowRight, IconSparkles, IconInfoCircle, IconLoader2,
  IconScan, IconTrendingUp, IconTrendingDown, IconX
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardStats, useWeeklyReport, useContentHistory, useRecommendations } from '../hooks/useDashboardData';
import { Skeleton } from '../components/Skeleton';
import { RecommendationCard } from '../components/RecommendationCard';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { format, subDays, isSameDay } from 'date-fns';

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useDashboardStats();
  const { data: weeklyReport } = useWeeklyReport();
  const { data: historyData } = useContentHistory({ limit: 100 });
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const stats = dashboardData?.stats;
  
  // Use profile identities (goal) to fetch recommendations
  const primaryGoal = dashboardData?.profile?.identities?.length > 0
    ? dashboardData.profile.identities.join(' ')
    : "I want to improve my focus and learn new things.";
    
  // Fetch 12 to share the exact same React Query cache as Goals.tsx
  const { data: recData } = useRecommendations(primaryGoal, 12);
  const recommendations = (recData || []).slice(0, 4);
  
  const logs = historyData?.data || [];

  // --- Chart Data Processing ---
  // 1. Time Saved Trend (Cumulative over 7 days)
  const timeSavedData = React.useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    let cumulativeSaved = 0;
    
    return days.map(day => {
      // Find waste content (<50 score) on this day
      const wasteItems = logs.filter((log: any) => 
        log.score < 50 && isSameDay(new Date(log.createdAt), day)
      );
      // Assume 12 mins saved per waste content skipped
      const savedMinutes = wasteItems.length * 12;
      cumulativeSaved += savedMinutes;
      
      return {
        date: format(day, 'EEE'),
        saved: cumulativeSaved,
        daily: savedMinutes
      };
    });
  }, [logs]);

  // 2. Focus vs Distraction (Last 7 days)
  const focusData = React.useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    return days.map(day => {
      const dayLogs = logs.filter((log: any) => isSameDay(new Date(log.createdAt), day));
      const focus = dayLogs.filter((log: any) => log.score >= 50).length;
      const distraction = dayLogs.filter((log: any) => log.score < 50).length;
      return {
        date: format(day, 'EEE'),
        Focus: focus,
        Distraction: distraction
      };
    });
  }, [logs]);

  // 3. Daily AI Summary (Strict Mode)
  const dailySummary = React.useMemo(() => {
    const todayLogs = logs.filter((log: any) => isSameDay(new Date(log.createdAt), new Date()));
    const waste = todayLogs.filter((log: any) => log.score < 50);
    const focus = todayLogs.filter((log: any) => log.score >= 50);
    
    const minutesWasted = waste.length * 12;
    const learnedTitles = focus.map((l: any) => l.title).slice(0, 2).join(' and ');
    
    let strictMessage = "You haven't consumed any content today. Stay focused.";
    if (minutesWasted > 0 && focus.length === 0) {
      strictMessage = `You have wasted approximately ${minutesWasted} minutes today on content completely irrelevant to your goals. You learned nothing of value.`;
    } else if (minutesWasted > 0 && focus.length > 0) {
      strictMessage = `You wasted ${minutesWasted} minutes today seeking cheap dopamine, but you did manage to learn about ${learnedTitles}. You need to cut out the noise.`;
    } else if (waste.length === 0 && focus.length > 0) {
      strictMessage = `Perfect alignment today. You stayed entirely focused and learned about ${learnedTitles}. Keep this discipline.`;
    }

    return { minutesWasted, strictMessage };
  }, [logs]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await api.post('/content/analyze', { url });
      setAnalysisResult(res.data.data);
      if (res.data.data.score >= 50) toast.success('High alignment content!', { icon: '🎯' });
      else toast.error('Low alignment content.', { icon: '⚠️' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Analysis failed. Make sure URL is valid.');
    } finally {
      setAnalyzing(false);
      setUrl('');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      
      {/* Header & Command Bar */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#1a1a1a] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-[#111] text-white border border-[#222]">
              <IconActivity size={16} />
            </div>
            <h1 className="text-2xl font-sans font-semibold tracking-tight text-white">Overview</h1>
          </div>
          <p className="text-sm text-slate-500 max-w-xl font-medium">
            Your daily cognitive audit. Track your focus, analyze content, and stay strictly aligned with your goals.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="relative w-full max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <IconScan className="text-slate-500 group-focus-within:text-white transition-colors" size={16} />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Scan URL for alignment..."
            className="w-full bg-[#0a0a0a] border border-[#222] hover:border-[#333] focus:border-white rounded-md pl-10 pr-24 py-2.5 text-sm font-medium focus:outline-none focus:ring-0 transition-colors text-white placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="absolute right-1 top-1 bottom-1 bg-[#111] hover:bg-[#222] border border-[#333] text-white rounded px-4 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {analyzing ? <IconLoader2 size={14} className="animate-spin" /> : 'Scan'}
          </button>
        </form>
      </header>

      {/* Analysis Result Modal */}
      <AnimatePresence>
        {analysisResult && (
          <motion.section
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-8 bg-[#0a0a0a] border border-[#1a1a1a] flex flex-col md:flex-row gap-8 items-start">
              <img
                src={analysisResult.thumbnail}
                alt="Thumbnail"
                className="w-full md:w-48 rounded-md object-cover bg-[#111] border border-[#222] aspect-video"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge bg-[#111] text-white border border-[#333]">{analysisResult.score}% Aligned</span>
                  <span className="badge bg-[#111] text-slate-400 border border-[#222]">{analysisResult.dominantEmotion}</span>
                </div>
                <h3 className="text-lg font-medium mb-3 leading-snug text-white">{analysisResult.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">{analysisResult.summary}</p>
                
                {analysisResult.verdict === 'caution' && (
                  <div className="p-4 bg-[#111] rounded-md flex items-start gap-3 border border-red-500/20">
                    <IconInfoCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-red-400 font-medium">{analysisResult.reason}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setAnalysisResult(null)} className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#111] text-slate-500 hover:text-white transition-colors">
                <IconX size={16} />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 2. Daily Audit & Target Focus */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Target Goal Billboard */}
        <div className="card p-8 bg-[#0a0a0a] border border-[#1a1a1a] flex flex-col justify-between text-white relative overflow-hidden group">
          <div className="absolute top-1/2 -translate-y-1/2 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-[1.3] transition-transform duration-1000">
            <IconTarget size={200} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111] text-slate-300 text-xs font-medium border border-[#222] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Active Target Goal
            </div>
            <h2 className="font-sans text-3xl font-semibold leading-tight mb-4 tracking-tight">
              {primaryGoal.charAt(0).toUpperCase() + primaryGoal.slice(1)}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
              Cognify is actively analyzing and filtering your feed to enforce this specific identity.
            </p>
          </div>
        </div>

        {/* Right: The Daily AI Audit */}
        <div className="card p-8 lg:col-span-2 flex flex-col justify-between border border-[#1a1a1a] bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#111] border border-[#222] flex items-center justify-center text-white">
                <IconBrain size={16} />
              </div>
              <h3 className="font-sans font-medium text-sm text-white">Daily Audit</h3>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-[#111] px-3 py-1.5 rounded-md border border-[#222]">
              {format(new Date(), 'MMM do')}
            </span>
          </div>
          
          <div className="flex-1 flex items-center mb-6">
            <p className="text-lg font-medium text-slate-300 leading-relaxed">
              {dailySummary.strictMessage}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[#1a1a1a] pt-6">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Time Wasted</div>
              <div className="text-2xl font-sans font-semibold text-white tracking-tight">{dailySummary.minutesWasted}<span className="text-sm text-slate-500 ml-1 font-medium">mins</span></div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Alignment</div>
              <div className="text-2xl font-sans font-semibold text-white tracking-tight">{stats?.avgScore || 0}%</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Conscious</div>
              <div className="text-2xl font-sans font-semibold text-white tracking-tight">{stats?.consciousPercentage || 0}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Top KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={<IconTarget />}
          label="Goal Alignment"
          value={`${stats?.avgScore || 0}%`}
          subtext="Avg relevance score"
          trend={stats?.avgScore >= 50 ? 'up' : 'down'}
        />
        <KpiCard
          icon={<IconBrain />}
          label="Conscious Picks"
          value={`${stats?.consciousPercentage || 0}%`}
          subtext="Of total consumption"
          trend="up"
        />
        <KpiCard
          icon={<IconActivity />}
          label="Recent Drift"
          value={stats?.driftScore > 0 ? `+${stats?.driftScore}` : `${stats?.driftScore || 0}`}
          subtext="Identity alignment"
          trend={stats?.driftScore >= 0 ? 'up' : 'down'}
          color={stats?.driftScore >= 0 ? 'text-emerald-500' : 'text-red-500'}
        />
        <KpiCard
          icon={<IconFlame className="text-orange-500" />}
          label="Focus Streak"
          value={`${stats?.streakDays || 0}d`}
          subtext="Days above 60% align"
          trend="neutral"
        />
      </section>



      {/* 4. Professional Analytics Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-8 bg-[#0a0a0a] border border-[#1a1a1a]">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-medium text-slate-500 mb-1">Time Reclaimed</h3>
              <div className="text-3xl font-sans font-semibold text-white">
                {timeSavedData[6]?.saved || 0} <span className="text-sm text-slate-500 font-medium">mins</span>
              </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 bg-[#111] px-2 py-1 rounded border border-[#222]">
              Assuming 12m/video
            </div>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSavedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ fontWeight: 500, color: '#fff' }}
                />
                <Area type="monotone" dataKey="saved" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorSaved)" name="Total Mins Saved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-8 bg-[#0a0a0a] border border-[#1a1a1a]">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-medium text-slate-500 mb-1">Focus vs Distraction</h3>
              <div className="text-3xl font-sans font-semibold text-white">
                {stats?.consciousPercentage || 0}% <span className="text-sm text-slate-500 font-medium">Conscious</span>
              </div>
            </div>
          </div>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#111' }}
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#888' }} />
                <Bar dataKey="Focus" stackId="a" fill="#ffffff" radius={[0, 0, 4, 4]} barSize={30} />
                <Bar dataKey="Distraction" stackId="a" fill="#333333" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>



      {/* 5. Feed */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-medium text-slate-500">Curated for You</h3>
          <button className="text-xs font-medium text-slate-500 hover:text-white transition-colors flex items-center gap-1">
            View all <IconArrowRight size={14} />
          </button>
        </div>
        
        {recommendations.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 custom-scrollbar snap-x">
            {recommendations?.map((item: any) => (
              <div key={item.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
                <RecommendationCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center flex flex-col items-center justify-center bg-[#0a0a0a] border border-[#1a1a1a]">
            <IconTarget size={40} className="mb-4 text-[#333]" />
            <p className="font-medium mb-1 text-slate-300">Set your goals to get recommendations</p>
            <p className="text-xs text-slate-600">Cognify needs to know what you're working on.</p>
          </div>
        )}
      </section>
    </div>
  );
};

const KpiCard = ({ icon, label, value, subtext, trend }: any) => (
  <div className="card p-6 bg-[#0a0a0a] border border-[#1a1a1a] flex flex-col justify-between hover:border-[#333] transition-colors group">
    <div className="flex justify-between items-start mb-6">
      <div className="text-slate-400 group-hover:text-white transition-colors">{icon}</div>
      {trend !== 'neutral' && (
        <div className={cn('flex items-center text-xs font-medium', trend === 'up' ? 'text-white' : 'text-slate-500')}>
          {trend === 'up' ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
        </div>
      )}
    </div>
    <div className="mt-auto">
      <h4 className="text-xs font-medium text-slate-500 mb-2">{label}</h4>
      <div className="text-3xl font-sans font-semibold text-white tracking-tight mb-1">{value}</div>
      <p className="text-xs text-slate-600 font-medium">{subtext}</p>
    </div>
  </div>
);

export default Dashboard;
