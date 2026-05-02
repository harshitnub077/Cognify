'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  studyPct: number;
  entPct: number;
  otherPct: number;
  period: string;
}

export default function ContentDietChart({ studyPct, entPct, otherPct, period }: Props) {
  const data = [
    { name: 'Study Content', value: studyPct, color: 'var(--primary)' },
    { name: 'Entertainment', value: entPct, color: 'var(--danger)' },
    { name: 'Other', value: otherPct, color: 'var(--secondary)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="glass p-3 rounded-2xl shadow-2xl border-white/10">
          <p className="font-bold text-white text-xs mb-1">{item.name}</p>
          <p className="text-primary font-extrabold text-lg">{item.value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{period}</span>
        <span className="text-2xl font-black text-white">{studyPct}%</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={95}
            paddingAngle={8}
            dataKey="value"
            stroke="none"
            animationBegin={0}
            animationDuration={1500}
            cornerRadius={10}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

