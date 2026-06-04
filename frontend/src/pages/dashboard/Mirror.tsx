import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import { useDriftScore, useEmotionTimeline, useWeeklyReport, useDashboardStats, useContentHistory } from '../../hooks/useDashboardData';
import { Skeleton } from '../../components/Skeleton';
import { cn } from '../../lib/utils';
import { format, subDays } from 'date-fns';
import { IconSparkles, IconTrendingUp, IconTrendingDown, IconUserScan, IconBrain } from '@tabler/icons-react';

const Mirror = () => {
  const { data: driftData, isLoading: driftLoading } = useDriftScore();
  const { data: timelineData } = useEmotionTimeline();
  const { data: weeklyReport, isLoading: reportLoading } = useWeeklyReport();
  const { data: stats } = useDashboardStats();
  const { data: historyData } = useContentHistory({ limit: 100 });
  const logs = historyData?.data || [];

  const heatmapData = useMemo(() => {
    const byDate: Record<string, number> = {};
    (timelineData || []).forEach((item: any) => {
      byDate[item.date] = Math.round((item.averageScore || 0) * 100);
    });

    return Array.from({ length: 365 }).map((_, i) => {
      const d = subDays(new Date(), 364 - i);
      const key = format(d, 'yyyy-MM-dd');
      const score = byDate[key] ?? null;
      return { date: d, score, count: score !== null ? 1 : 0 };
    });
  }, [timelineData]);

  const driftTrendData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return [{ week: 'W1', score: 0 }];
    return timelineData.slice(-6).map((item: any, i: number) => ({
      week: `W${i + 1}`,
      score: Math.round((item.averageScore || 0) * 100)
    }));
  }, [timelineData]);

  const radarData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return [
      { subject: 'Focus', A: 0, fullMark: 100 },
      { subject: 'Calmness', A: 0, fullMark: 100 },
      { subject: 'Creativity', A: 0, fullMark: 100 },
      { subject: 'Growth', A: 0, fullMark: 100 },
      { subject: 'Logic', A: 0, fullMark: 100 },
    ];
    const avg = (key: string) => {
      const vals = timelineData.map((d: any) => (d.emotions?.[key] || 0) * 100);
      return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
    };
    return [
      { subject: 'Focus',      A: Math.max(10, 100 - avg('anger') - avg('fear')), fullMark: 100 },
      { subject: 'Calmness',   A: Math.max(10, 100 - avg('anger') - avg('sadness')), fullMark: 100 },
      { subject: 'Creativity', A: Math.max(10, avg('joy') + avg('surprise')), fullMark: 100 },
      { subject: 'Growth',     A: stats?.stats?.consciousPercentage || 0, fullMark: 100 },
      { subject: 'Logic',      A: stats?.stats?.avgScore || 0, fullMark: 100 },
    ];
  }, [timelineData, stats]);

  const getHeatmapColor = (score: number | null) => {
    if (score === null) return 'bg-[#111]';
    if (score < 30) return 'bg-[#222]';
    if (score < 60) return 'bg-[#444]';
    if (score < 80) return 'bg-[#888]';
    return 'bg-white';
  };

  const driftScore = driftData?.score ?? 0;
  const driftTrend = driftData?.trend || 'stable';

  // Cognitive Vitals Logic based on synced logs
  const vitals = useMemo(() => {
    const recent = logs.slice(0, 30);
    const waste = recent.filter((l: any) => l.score < 50);
    const captureRate = recent.length ? Math.round((waste.length / recent.length) * 100) : 0;
    
    const emotions: Record<string, number> = {};
    recent.forEach((l: any) => {
      if (l.dominantEmotion) {
        emotions[l.dominantEmotion] = (emotions[l.dominantEmotion] || 0) + 1;
      }
    });
    let dom = 'Neutral';
    let max = 0;
    Object.entries(emotions).forEach(([e, count]) => {
      if (count > max) { max = count; dom = e; }
    });

    return { captureRate, dominantEmotion: dom };
  }, [logs]);

  const dietData = useMemo(() => {
    const counts = { high: 0, med: 0, low: 0 };
    logs.forEach((l: any) => {
      if (l.score >= 70) counts.high++;
      else if (l.score >= 40) counts.med++;
      else counts.low++;
    });
    return [
      { name: 'Aligned', value: counts.high, color: '#ffffff' },
      { name: 'Neutral', value: counts.med, color: '#555555' },
      { name: 'Waste', value: counts.low, color: '#222222' }
    ];
  }, [logs]);

  if (driftLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[300px]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      <header className="pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Digital Mirror</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          A real-time reflection of your digital identity, constructed from your consumption patterns.
        </p>
      </header>

      {/* Cognitive Vitals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">Overall Alignment</div>
          <div className="text-2xl font-semibold text-white">{stats?.stats?.avgScore || 0}%</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">Algorithmic Capture</div>
          <div className="text-2xl font-semibold text-white">{vitals.captureRate}%</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">Dominant State</div>
          <div className="text-2xl font-semibold text-white capitalize truncate">{vitals.dominantEmotion}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500 mb-2">Conscious Streak</div>
          <div className="text-2xl font-semibold text-white">{stats?.stats?.streakDays || 0} <span className="text-sm font-normal text-slate-500 ml-1">days</span></div>
        </div>
      </div>

      {/* Top Grid: Drift & Diet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Identity Drift Trajectory (Takes 2 columns) */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-6">Trajectory</h3>
            <div className="flex items-center gap-6 mb-2">
              <div className="text-4xl font-semibold tabular-nums text-white">
                {driftScore > 0 ? '+' : ''}{Math.round(driftScore)}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-300 mb-0.5 capitalize">
                  {driftTrend}
                </div>
                <p className="text-xs text-slate-500">Current trajectory.</p>
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={driftTrendData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '4px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="score" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Diet Breakdown (Takes 1 column) */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 flex flex-col">
          <h3 className="text-sm font-medium text-white mb-6">Diet Breakdown</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[200px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dietData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dietData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '4px', fontSize: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3">
              {dietData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-white font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Radar & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Personality Radar */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Cognitive Profile</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#222" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="State" dataKey="A" stroke="#ffffff" strokeWidth={1} fill="#ffffff" fillOpacity={0.05} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '4px', color: '#fff', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cognitive Heatmap */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 flex flex-col justify-between">
          <h3 className="text-sm font-medium text-white mb-6">Alignment Heatmap</h3>
          <div className="flex-1 flex items-center overflow-hidden">
            <div className="flex gap-1 overflow-x-auto pb-4 pt-2 custom-scrollbar w-full">
              <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max mx-auto">
                {heatmapData.map((day, i) => (
                  <div
                    key={i}
                    className={cn('w-3.5 h-3.5 rounded-sm transition-colors hover:ring-2 hover:ring-white/50', getHeatmapColor(day.score))}
                    title={`${format(day.date, 'MMM do')}: ${day.score !== null ? `${day.score}% Alignment` : 'No data'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 text-xs text-slate-500">
            <span>Fragmented</span>
            <div className="flex gap-1">
              {['bg-[#222]', 'bg-[#444]', 'bg-[#888]', 'bg-white'].map((c, i) => (
                <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
              ))}
            </div>
            <span>Aligned</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Mirror;
