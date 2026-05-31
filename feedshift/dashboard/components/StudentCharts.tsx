'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, Tooltip as BarTooltip, ResponsiveContainer as BarContainer } from 'recharts';

export default function StudentCharts({ 
  type, 
  lineData = [], 
  barData = [] 
}: { 
  type: 'line' | 'bar',
  lineData?: Array<{ date: string; study: number; ent: number }>,
  barData?: Array<{ topic: string; hours: number }>
}) {
  if (type === 'line') {
    const data = lineData.length > 0 ? lineData : [
      { date: 'Oct 1', study: 30, ent: 70 },
      { date: 'Oct 5', study: 40, ent: 60 },
      { date: 'Oct 10', study: 45, ent: 55 },
      { date: 'Oct 15', study: 60, ent: 40 },
      { date: 'Oct 20', study: 75, ent: 25 },
      { date: 'Oct 25', study: 85, ent: 15 },
    ];

    return (
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" stroke="#737373" />
            <YAxis stroke="#737373" />
            <LineTooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
            <Line type="monotone" dataKey="study" name="Study %" stroke="#10b981" strokeWidth={3} />
            <Line type="monotone" dataKey="ent" name="Entertainment %" stroke="#ef4444" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    const data = barData.length > 0 ? barData : [
      { topic: 'Physics', hours: 4.2 },
      { topic: 'Machine Learning', hours: 2.1 },
      { topic: 'Math', hours: 1.5 },
      { topic: 'Computer Science', hours: 0.8 },
    ];

    return (
      <div className="w-full h-72">
        <BarContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
            <BarXAxis type="number" stroke="#737373" />
            <BarYAxis dataKey="topic" type="category" stroke="#737373" width={100} />
            <BarTooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} cursor={{ fill: '#262626' }} />
            <Bar dataKey="hours" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          </BarChart>
        </BarContainer>
      </div>
    );
  }

  return null;
}
