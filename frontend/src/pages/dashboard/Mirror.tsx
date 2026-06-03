import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useDriftScore, useEmotionTimeline, useWeeklyReport, useDashboardStats } from '../../hooks/useDashboardData';
import { Skeleton } from '../../components/Skeleton';
import { cn } from '../../lib/utils';
import { format, subDays } from 'date-fns';
import { IconSparkles, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

const Mirror = () => {
  const { data: driftData, isLoading: driftLoading } = useDriftScore();
  const { data: timelineData } = useEmotionTimeline();
  const { data: weeklyReport, isLoading: reportLoading } = useWeeklyReport();
  const { data: stats } = useDashboardStats();

  // Build a real heatmap from timeline data
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

  // Build drift trend from timeline
  const driftTrendData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return [{ week: 'W1', score: 0 }];
    }
    return timelineData.slice(-6).map((item: any, i: number) => ({
      week: `W${i + 1}`,
      score: Math.round((item.averageScore || 0) * 100)
    }));
  }, [timelineData]);

  // Build radar from emotion averages
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
    if (score === null) return 'bg-slate-100 dark:bg-[#1A1A1A]';
    if (score < 30) return 'bg-[#6C4FF6]/20';
    if (score < 60) return 'bg-[#6C4FF6]/50';
    if (score < 80) return 'bg-[#6C4FF6]/80';
    return 'bg-[#6C4FF6]';
  };

  const driftScore = driftData?.score ?? 0;
  const driftTrend = driftData?.trend || 'stable';

  if (driftLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[300px] rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">My Mirror</h1>
        <p className="text-slate-500 text-sm">A reflection of your digital consumption and its impact on your identity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — Heatmap + Radar */}
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-bold mb-4">Cognitive Heatmap</h3>
            <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
              <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max">
                {heatmapData.map((day, i) => (
                  <div
                    key={i}
                    className={cn('w-3 h-3 rounded-[2px]', getHeatmapColor(day.score))}
                    title={`${format(day.date, 'MMM do')}: ${day.score !== null ? `${day.score}% Alignment` : 'No data'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
              <span>Less</span>
              <div className="flex gap-1">
                {['bg-[#6C4FF6]/20', 'bg-[#6C4FF6]/50', 'bg-[#6C4FF6]/80', 'bg-[#6C4FF6]'].map((c, i) => (
                  <div key={i} className={cn('w-3 h-3 rounded-[2px]', c)} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-bold mb-4">Personality Radar</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Your State" dataKey="A" stroke="#6C4FF6" fill="#6C4FF6" fillOpacity={0.4} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right — Drift Score + Weekly Report */}
        <div className="space-y-6">

          <div className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-bold mb-4">Identity Drift Score</h3>
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-36 h-20">
                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none"
                    stroke={driftScore >= 30 ? '#10b981' : driftScore >= 0 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${((Math.abs(driftScore) + 0.01) / 100) * 125.6} 126`}
                  />
                </svg>
                <div className="absolute bottom-0 left-0 w-full text-3xl font-bold text-center">
                  {driftScore > 0 ? '+' : ''}{Math.round(driftScore)}
                </div>
              </div>
              <div>
                <div className={cn('flex items-center gap-1 font-bold text-sm mb-1',
                  driftTrend === 'improving' ? 'text-emerald-500' :
                  driftTrend === 'declining' ? 'text-red-500' : 'text-amber-500'
                )}>
                  {driftTrend === 'improving' ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
                  {driftTrend}
                </div>
                <p className="text-xs text-slate-500">How aligned your content diet is with your stated goals</p>
              </div>
            </div>

            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={driftTrendData}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="score" stroke="#6C4FF6" strokeWidth={2} dot={{ r: 3, fill: '#6C4FF6' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly AI Report */}
          <div className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-5">
              <IconSparkles size={20} className="text-[#6C4FF6]" /> Weekly Mind Report
            </h3>
            {reportLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            ) : weeklyReport ? (
              <div className="space-y-4 text-sm">
                <div className="text-xl font-bold text-[#6C4FF6]">{weeklyReport.headline}</div>

                <div className="space-y-2 text-slate-600 dark:text-[#A7A9BE]">
                  {(weeklyReport.drift_story || []).map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#6C4FF6] mt-0.5">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                {weeklyReport.pattern_detected && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pattern: {weeklyReport.pattern_detected}</span>
                    <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-1">{weeklyReport.pattern_explanation}</p>
                  </div>
                )}

                {weeklyReport.next_week_focus && (
                  <div className="p-3 bg-[#6C4FF6]/10 border border-[#6C4FF6]/20 rounded-lg">
                    <span className="text-xs font-bold text-[#6C4FF6] uppercase tracking-wider">Focus Next Week</span>
                    <p className="text-xs text-slate-600 dark:text-[#A7A9BE] mt-1">{weeklyReport.next_week_focus}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">
                Analyze more content to unlock your weekly mind report.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mirror;
