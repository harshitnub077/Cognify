'use client';

interface Channel {
  name: string;
  trust: number;
  videos: number;
}

interface ChannelTrustListProps {
  channels?: Record<string, number> | Channel[];
}

const MOCK_CHANNELS: Channel[] = [
  { name: '3Blue1Brown',     trust: 97, videos: 12 },
  { name: 'Andrej Karpathy', trust: 95, videos: 5  },
  { name: 'Fireship',        trust: 88, videos: 9  },
  { name: 'Veritasium',      trust: 82, videos: 7  },
  { name: 'Kurzgesagt',      trust: 78, videos: 4  },
  { name: 'MrBeast',         trust: 15, videos: 2  },
];

function normalise(input?: Record<string, number> | Channel[]): Channel[] {
  if (!input) return MOCK_CHANNELS;
  if (Array.isArray(input)) return input;
  // Convert Record<string, number> (from Supabase) to Channel[]
  return Object.entries(input)
    .map(([name, trust]) => ({ name, trust: Math.round(Number(trust)), videos: 0 }))
    .sort((a, b) => b.trust - a.trust);
}

function trustColor(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-yellow-400';
  return 'text-danger';
}

function barColor(score: number): string {
  if (score >= 70) return 'primary-gradient';
  if (score >= 40) return 'bg-yellow-400/70';
  return 'bg-danger/60';
}

export function ChannelTrustList({ channels }: ChannelTrustListProps) {
  const list = normalise(channels).slice(0, 6);

  return (
    <div className="space-y-4">
      {list.map(ch => (
        <div key={ch.name} className="space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-slate-300 truncate max-w-[180px]">{ch.name}</span>
            <span className={`font-bold text-xs ${trustColor(ch.trust)}`}>
              {ch.trust}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${barColor(ch.trust)}`}
              style={{ width: `${ch.trust}%` }}
            />
          </div>
          {ch.videos > 0 && (
            <p className="text-[10px] text-slate-600 font-medium">{ch.videos} videos analysed</p>
          )}
        </div>
      ))}
    </div>
  );
}
