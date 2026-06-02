import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useDriftScore, useEmotionTimeline } from '../../hooks/useDashboardData';
import { cn } from '../../lib/utils';
import { format, subDays } from 'date-fns';

const Mirror = () => {
  const { data: driftData, isLoading: driftLoading } = useDriftScore();
  const { data: timelineData } = useEmotionTimeline();

  const [heatmapData] = React.useState(() => {
    return Array.from({ length: 365 }).map((_, i) => {
      const d = subDays(new Date(), 364 - i);
      const hasData = Math.random() > 0.3;
      return {
        date: d,
        score: hasData ? Math.floor(Math.random() * 100) : null,
        count: hasData ? Math.floor(Math.random() * 5) + 1 : 0
      };
    });
  });

  const [barHeights] = React.useState(() => {
    return [...Array(12)].map(() => 20 + Math.random() * 80);
  });

  if (driftLoading) {
    return <div className="flex h-[60vh] items-center justify-center text-slate-500">Gazing into the mirror...</div>;
  }

  // Mock Radar Data
  const radarData = [
    { subject: 'Focus', A: 80, B: 60, fullMark: 100 },
    { subject: 'Calmness', A: 65, B: 85, fullMark: 100 },
    { subject: 'Creativity', A: 90, B: 70, fullMark: 100 },
    { subject: 'Growth', A: 85, B: 90, fullMark: 100 },
    { subject: 'Logic', A: 75, B: 65, fullMark: 100 },
  ];



  const getHeatmapColor = (score: number | null) => {
    if (score === null) return 'bg-slate-100 dark:bg-[#1A1A1A]';
    if (score < 30) return 'bg-[#6C4FF6]/20';
    if (score < 60) return 'bg-[#6C4FF6]/50';
    if (score < 80) return 'bg-[#6C4FF6]/80';
    return 'bg-[#6C4FF6]';
  };

  const driftScore = driftData?.score || 12;
  const driftTrendData = [
    { week: 'W1', score: 5 }, { week: 'W2', score: -2 }, { week: 'W3', score: 8 },
    { week: 'W4', score: 15 }, { week: 'W5', score: 10 }, { week: 'W6', score: 12 },
  ];

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My Mirror</h1>
        <p className="text-slate-500 text-sm">A reflection of your digital consumption and its impact on your identity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Cognitive Timeline & Heatmap */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Cognitive Timeline</h3>
            
            {/* Heatmap Grid */}
            <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
              <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max">
                {heatmapData.map((day, i) => (
                  <div 
                    key={i} 
                    className={cn("w-3 h-3 rounded-[2px]", getHeatmapColor(day.score))}
                    title={`${format(day.date, 'MMM do')}: ${day.score !== null ? `${day.score}% Match (${day.count} items)` : 'No data'}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Monthly Averages</h4>
              <div className="flex items-end gap-2 h-20">
                {barHeights.map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-100 dark:bg-[#1A1A1A] rounded-t-sm relative group">
                    <div className="absolute bottom-0 w-full bg-[#6C4FF6]/50 rounded-t-sm transition-all group-hover:bg-[#6C4FF6]" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Personality Radar</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Current State" dataKey="A" stroke="#6C4FF6" fill="#6C4FF6" fillOpacity={0.4} />
                  <Radar name="Goal State" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#6C4FF6]/40 border border-[#6C4FF6]" /> Current State</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#10b981]/20 border border-[#10b981]" /> Goal State</div>
            </div>
          </div>
        </div>

        {/* Right Column: Identity Drift */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
            <h3 className="text-lg font-bold self-start w-full text-left mb-6">Identity Drift Score</h3>
            
            <div className="relative w-48 h-24 mb-4">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" 
                  stroke={driftScore >= 30 ? "#10b981" : driftScore >= 0 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="8" strokeLinecap="round" 
                  strokeDasharray={`${((driftScore + 100) / 200) * 125.6}, 126`} 
                />
              </svg>
              <div className="absolute bottom-0 left-0 w-full text-4xl font-bold">
                {driftScore > 0 ? '+' : ''}{driftScore}
              </div>
            </div>

            <div className="h-24 w-full mt-6 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={driftTrendData}>
                  <Line type="monotone" dataKey="score" stroke="#A7A9BE" strokeWidth={2} dot={{ r: 3, fill: '#A7A9BE' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full text-left bg-slate-50 dark:bg-[#1A1A1A] p-5 rounded-xl border border-slate-100 dark:border-[#222]">
              <h4 className="font-bold text-sm mb-3">Your Drift Story</h4>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-[#A7A9BE]">
                <li className="flex items-start gap-2">
                  <span className="text-[#6C4FF6] mt-0.5">•</span>
                  You consumed 68% goal-aligned content this week (+12% vs last week).
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6C4FF6] mt-0.5">•</span>
                  Spikes in anxiety-inducing content observed late evening on Tuesday.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#6C4FF6] mt-0.5">•</span>
                  Strong momentum in educational content related to 'Deep Work'.
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Mirror;
