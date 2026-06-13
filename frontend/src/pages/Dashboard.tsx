/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconTarget, IconBrain, IconFlame, IconActivity,
  IconArrowRight, IconSparkles, IconInfoCircle, IconLoader2,
  IconScan, IconTrendingUp, IconTrendingDown, IconX, IconDownload
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardStats, useWeeklyReport, useContentHistory, useRecommendations, useDriftScore, useUserProfile } from '../hooks/useDashboardData';
import { Skeleton } from '../components/Skeleton';
import { RecommendationCard } from '../components/RecommendationCard';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { format, subDays, isSameDay } from 'date-fns';

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useDashboardStats();
  const { data: userProfile } = useUserProfile();
  const { data: weeklyReport } = useWeeklyReport();
  const { data: historyData } = useContentHistory({ limit: 100 });
  const logs = Array.isArray(historyData?.data) ? historyData.data : [];
  const { data: driftData } = useDriftScore();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Extension auto-detection
  const [extensionInstalled, setExtensionInstalled] = useState(true); // Assume true initially to avoid flicker
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let checkCount = 0;
    const interval = setInterval(() => {
      const isInstalled = !!document.getElementById('cognify-extension-installed');
      setExtensionInstalled(isInstalled);
      
      if (isInstalled) {
        setIsModalOpen(false); // Close modal automatically if they install it while open
        clearInterval(interval);
      }
      
      checkCount++;
      // Stop aggressive polling after 10 seconds if not found, but keep a slow fallback just in case
      if (checkCount > 20 && !isInstalled) {
        clearInterval(interval);
        setInterval(() => {
          setExtensionInstalled(!!document.getElementById('cognify-extension-installed'));
        }, 5000);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const stats = dashboardData?.stats;
  const driftScore = driftData?.score || 0;
  
  // Use profile identities (goal) to fetch recommendations - merge from both hooks to guarantee freshness
  const profileToUse = userProfile || dashboardData?.profile;
  
  const primaryGoal = profileToUse?.identities?.length > 0
    ? (Array.isArray(profileToUse.identities) ? profileToUse.identities.join(' ') : String(profileToUse.identities))
    : "I want to improve my focus and learn new things.";
    
  // Fetch 24 to share the exact same React Query cache as Goals.tsx
  const { data: recData, isLoading: recLoading } = useRecommendations(primaryGoal, 24);
  const recommendations = Array.isArray(recData) ? recData.slice(0, 8) : [];


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
      // Assume 15 mins average length. Saved = 15 - actual time spent
      const savedMinutes = wasteItems.reduce((acc: number, log: any) => {
        const spentMins = (log.timeSpentSecs || 0) / 60;
        return acc + Math.max(0, 15 - spentMins);
      }, 0);
      cumulativeSaved += savedMinutes;
      
      return {
        date: format(day, 'EEE'),
        saved: Math.round(cumulativeSaved),
        daily: Math.round(savedMinutes)
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
    
    const totalSecsWasted = waste.reduce((acc: number, log: any) => acc + (log.timeSpentSecs || 0), 0);
    const minutesWasted = waste.length > 0 ? Math.max(1, Math.round(totalSecsWasted / 60)) : 0;
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

      {/* Premium Extension Alert Banner */}
      <AnimatePresence>
        {!extensionInstalled && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 overflow-hidden"
          >
            <div className="flex items-center gap-3 text-red-400">
              <IconInfoCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">
                <strong className="text-red-300">Action Required:</strong> Cognify Extension is not detected. Your analytics will not update.
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Fix Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header & Command Bar */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#1a1a1a] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white text-black shadow-lg shadow-white/10">
              <IconActivity size={20} />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-white">Overview</h1>
          </div>
          <p className="text-sm text-surface-muted max-w-xl font-medium">
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
            className="w-full bg-[#111] border border-[#222] hover:border-[#333] focus:border-white focus:bg-[#151515] rounded-xl pl-10 pr-24 py-2.5 text-[15px] font-medium outline-none transition-all text-white placeholder:text-slate-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-white text-black hover:bg-slate-200 border-none rounded-lg px-4 text-[13px] font-bold transition-all disabled:opacity-50 disabled:bg-[#222] disabled:text-slate-500 flex items-center gap-1.5 shadow-sm"
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
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 flex flex-col md:flex-row gap-8 items-start">
              <img
                src={analysisResult.thumbnail}
                alt="Thumbnail"
                className="w-full md:w-48 rounded-md object-cover bg-[#0a0a0a] border border-[#1a1a1a] aspect-video"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge bg-[#0a0a0a] text-white border border-[#1a1a1a]">{analysisResult.score}% Aligned</span>
                  <span className="badge bg-[#0a0a0a] text-slate-400 border border-[#1a1a1a]">{analysisResult.dominantEmotion}</span>
                </div>
                <h3 className="text-lg font-medium mb-3 leading-snug text-white">{analysisResult.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">{analysisResult.summary}</p>
                
                {analysisResult.verdict === 'caution' && (
                  <div className="p-4 bg-[#0a0a0a] rounded-md flex items-start gap-3 border border-red-500/20">
                    <IconInfoCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-red-400 font-medium">{analysisResult.reason}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setAnalysisResult(null)} className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#0a0a0a] text-slate-500 hover:text-white transition-colors">
                <IconX size={16} />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* BENTO GRID LAYOUT */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Left: Active Target Goal Billboard */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 lg:col-span-2 flex flex-col justify-between text-white relative overflow-hidden group">
          <div className="absolute top-1/2 -translate-y-1/2 -right-20 opacity-[0.03] pointer-events-none group-hover:scale-[1.1] transition-transform duration-1000">
            <IconTarget size={400} stroke={2.5} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111] text-white text-xs font-medium border border-[#222] shadow-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Active Target Goal
            </div>
            <h2 className="font-display text-4xl font-bold leading-tight mb-4 tracking-tight drop-shadow-sm capitalize">
              {primaryGoal}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
              Cognify is actively analyzing and filtering your feed to enforce your goals: <span className="text-slate-300 font-medium">{primaryGoal}</span>.
            </p>
          </div>
        </div>

        {/* Right: The Daily AI Audit */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-white">
                <IconBrain size={16} />
              </div>
              <h3 className="font-sans font-medium text-sm text-white">Daily Audit</h3>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-[#0a0a0a] px-3 py-1.5 rounded-md border border-[#1a1a1a]">
              {format(new Date(), 'MMM do')}
            </span>
          </div>
          
          <div className="flex-1 flex items-center mb-6">
            <p className="text-lg font-medium text-white leading-relaxed">
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

        {/* Top KPIs */}
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
          value={driftScore > 0 ? `+${driftScore}` : `${driftScore}`}
          subtext="Identity alignment"
          trend={driftScore >= 0 ? 'up' : 'down'}
          color={driftScore >= 0 ? 'text-emerald-500' : 'text-red-500'}
        />
        <KpiCard
          icon={<IconFlame className="text-orange-500" />}
          label="Focus Streak"
          value={`${stats?.streak || 0}d`}
          subtext="Days above 60% align"
          trend="neutral"
        />



        {/* Professional Analytics Charts */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-medium text-slate-500 mb-1">Time Reclaimed</h3>
              <div className="text-3xl font-sans font-semibold text-white">
                {timeSavedData[6]?.saved || 0} <span className="text-sm text-slate-500 font-medium">mins</span>
              </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 bg-[#0a0a0a] px-2 py-1 rounded border border-[#1a1a1a]">
              Assuming 15m/video
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

        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xs font-medium text-slate-500 mb-1">Focus vs Distraction</h3>
              <div className="text-4xl font-display font-bold text-white tracking-tight">
                {stats?.consciousPercentage || 0}% <span className="text-sm text-surface-muted font-medium ml-1">Conscious</span>
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
        
        {recLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 custom-scrollbar snap-x">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="snap-start shrink-0 w-[280px] md:w-[320px]">
                <Skeleton className="h-[280px] w-full" />
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 custom-scrollbar snap-x">
            {recommendations?.map((item: any) => (
              <div key={item.id} className="snap-start shrink-0 w-[280px] md:w-[320px]">
                <RecommendationCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-12 text-center flex flex-col items-center justify-center">
            <IconTarget size={40} className="mb-4 text-[#333]" />
            <p className="font-medium mb-1 text-white">Set your goals to get recommendations</p>
            <p className="text-xs text-slate-600">Cognify needs to know what you're working on.</p>
          </div>
        )}
      </section>
      {/* Installation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <IconTarget className="text-primary" /> Install Extension
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <IconX size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-slate-300 text-sm">
                  Cognify requires a browser extension to intercept distractions on YouTube and Instagram in real-time. Without it, the dashboard cannot analyze your content diet.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Download the Package</h4>
                      <a href="/cognify-extension.zip" download className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
                        <IconDownload size={16} /> Download .zip
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Extract & Load</h4>
                      <p className="text-sm text-slate-400">Extract the zip. Go to <code className="bg-[#222] px-1 rounded text-primary">chrome://extensions</code>, enable "Developer mode", and click "Load unpacked". Select the extracted folder.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-primary/10 rounded-xl flex items-center gap-3 border border-primary/20">
                  <IconLoader2 className="animate-spin text-primary" size={20} />
                  <p className="text-sm text-primary font-medium">Waiting for extension to connect...</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const KpiCard = ({ icon, label, value, subtext, trend }: any) => (
  <motion.div whileHover={{ scale: 0.98 }} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg-hover p-6 flex flex-col justify-between group">
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
      <div className="text-4xl font-display font-bold text-white tracking-tight mb-1">{value}</div>
      <p className="text-xs text-surface-muted font-medium">{subtext}</p>
    </div>
  </motion.div>
);

export default Dashboard;
