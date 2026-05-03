'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface WeeklyData {
  day: string;
  blocked: number;
  allowed: number;
}

interface WeeklyReportProps {
  data: WeeklyData[];
}

export function WeeklyReport({ data }: WeeklyReportProps) {
  const totalBlocked = data.reduce((acc, curr) => acc + curr.blocked, 0);
  const totalAllowed = data.reduce((acc, curr) => acc + curr.allowed, 0);
  return (
    <div className="glass rounded-[2rem] p-8 glass-hover">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-primary" size={20} />
            Weekly Activity
          </h2>
          <p className="text-neutral-400 text-sm mt-1">Algorithm training progress</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Allowed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-danger mb-1">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">High Risk Avoided</span>
          </div>
          <p className="text-2xl font-bold">{totalBlocked}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Quality Focused</span>
          </div>
          <p className="text-2xl font-bold">{totalAllowed}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="35%">
          <defs>
            <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="barGradientSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={25}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              background: 'rgba(13, 13, 20, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '12px',
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
          />
          <Bar 
            dataKey="blocked" 
            name="Blocked" 
            fill="url(#barGradientPrimary)" 
            radius={[6, 6, 0, 0]} 
          />
          <Bar 
            dataKey="allowed" 
            name="Allowed" 
            fill="url(#barGradientSecondary)" 
            radius={[6, 6, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

