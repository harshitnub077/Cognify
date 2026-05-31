import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ContentDietChart from '@/components/ContentDietChart';
import StudentCharts from '@/components/StudentCharts';
import { WeeklyReport } from '@/components/WeeklyReport';
import { ChannelTrustList } from '@/components/ChannelTrustList';
import { 
  BrainCircuit, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Settings, 
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';

export default async function StudentDashboard() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  let session = null;
  let profile = null;
  let events: Array<{ verdict: string; ni_signal_sent: boolean; topic_match?: string; watched_at?: string }> = [];
  
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;

    if (session) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      profile = p;
      
      if (profile?.role === 'parent') {
        redirect('/parent');
      }
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: e } = await supabase
        .from('diet_events')
        .select('*')
        .eq('user_id', profile?.id)
        .gte('watched_at', oneWeekAgo.toISOString());
        
      if (e) events = e;
    }

    if (!session) {
      throw new Error('No session');
    }
  } catch (err) {
    // FALLBACK TO MOCK DATA FOR DEMO
    session = { user: { user_metadata: { full_name: 'Alex Rivera' } }, user_id: 'mock-123' };
    profile = { 
      role: 'student', 
      study_mode_active: true,
      channel_trust: { 
        'Veritasium': 98, 
        '3Blue1Brown': 100, 
        'Kurzgesagt': 92, 
        'Comedy Central': 12,
        'Gaming Pro': 5
      }
    };
    events = new Array(184).fill({}).map((_, i) => ({
      verdict: i % 5 === 0 ? 'BLOCK' : 'ALLOW',
      ni_signal_sent: i % 12 === 0
    }));
  }

  const totalVideos = events?.length || 0;
  const totalBlocked = events?.filter(e => e.verdict === 'BLOCK').length || 0;
  const niSignals = events?.filter(e => e.ni_signal_sent).length || 0;
  const isStudyMode = profile?.study_mode_active || false;
  
  // Calculate content diet
  const studyVids = events?.filter(e => e.verdict === 'ALLOW' && e.topic_match && e.topic_match !== 'None').length || 0;
  const otherVids = events?.filter(e => e.verdict === 'ALLOW' && (!e.topic_match || e.topic_match === 'None')).length || 0;
  
  const totalEvaluated = studyVids + otherVids + totalBlocked;
  const studyPct = totalEvaluated ? Math.round((studyVids / totalEvaluated) * 100) : 0;
  const entPct = totalEvaluated ? Math.round((totalBlocked / totalEvaluated) * 100) : 0;
  const otherPct = totalEvaluated ? 100 - studyPct - entPct : 0;

  // Process Weekly Report data (Mon-Sun)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyDataMap = new Map();
  days.forEach(d => weeklyDataMap.set(d, { day: d, blocked: 0, allowed: 0 }));

  events.forEach(e => {
    const d = new Date(e.watched_at || new Date());
    const dayStr = days[d.getDay()];
    const current = weeklyDataMap.get(dayStr);
    if (e.verdict === 'BLOCK') current.blocked++;
    else current.allowed++;
  });

  // Reorder map to start from Monday
  const weeklyReportData = [
    weeklyDataMap.get('Mon'), weeklyDataMap.get('Tue'), weeklyDataMap.get('Wed'),
    weeklyDataMap.get('Thu'), weeklyDataMap.get('Fri'), weeklyDataMap.get('Sat'),
    weeklyDataMap.get('Sun')
  ];

  // Process line chart data (by date)
  const lineChartMap = new Map();
  events.forEach(e => {
    const d = new Date(e.watched_at || new Date());
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!lineChartMap.has(dateStr)) {
      lineChartMap.set(dateStr, { date: dateStr, study: 0, ent: 0, total: 0 });
    }
    const current = lineChartMap.get(dateStr);
    current.total++;
    if (e.verdict === 'ALLOW' && e.topic_match && e.topic_match !== 'None') current.study++;
    else if (e.verdict === 'BLOCK') current.ent++;
  });

  const lineChartData = Array.from(lineChartMap.values()).map(d => ({
    date: d.date,
    study: Math.round((d.study / d.total) * 100) || 0,
    ent: Math.round((d.ent / d.total) * 100) || 0,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 selection:bg-primary/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 py-10">
        
        {/* Top Navigation / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center glow">
                <BrainCircuit className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight font-display">
                Welcome back, <span className="text-gradient">{session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer'}</span>
              </h1>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <Clock size={14} />
              Tracking since {oneWeekAgo.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — Today
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`glass px-4 py-2 rounded-2xl flex items-center gap-3 border-l-4 ${isStudyMode ? 'border-l-success' : 'border-l-slate-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isStudyMode ? 'bg-success animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {isStudyMode ? 'Neural Shield Active' : 'Shield Standby'}
              </span>
            </div>
            <Link href="/dashboard/settings" className="glass p-3 rounded-xl glass-hover text-slate-400 hover:text-white">
              <Settings size={20} />
            </Link>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Stats & Progress */}
          <div className="lg:col-span-4 space-y-8">
            {/* Core Metrics Card */}
            <div className="glass rounded-[2rem] p-8 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -translate-y-16 translate-x-16 group-hover:bg-primary/20 transition-colors" />
              
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Performance</h2>
                <TrendingUp className="text-success" size={18} />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {[
                  { label: 'Total Analyzed', value: totalVideos, color: 'text-white', icon: ExternalLink },
                  { label: 'Distractions Blocked', value: totalBlocked, color: 'text-primary', icon: ShieldCheck },
                  { label: 'Algorithm Signals', value: niSignals, color: 'text-secondary', icon: BrainCircuit }
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <stat.icon size={16} className={stat.color} />
                      </div>
                      <span className="text-sm font-medium text-slate-400">{stat.label}</span>
                    </div>
                    <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 text-center">
                <p className="text-success text-sm font-medium flex items-center justify-center gap-1">
                  <TrendingUp size={14} /> +23% Focus improvement this week
                </p>
              </div>
            </div>

            {/* Content Diet Distribution */}
            <div className="glass rounded-[2rem] p-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Target size={18} className="text-secondary" />
                Content Diet
              </h2>
              <ContentDietChart studyPct={studyPct} entPct={entPct} otherPct={otherPct} period="Neural Weighting" />
            </div>
          </div>

          {/* Column 2: Charts & Deep Dives */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <WeeklyReport data={weeklyReportData} />
              <div className="glass rounded-[2rem] p-8">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  Learning Velocity
                </h2>
                <StudentCharts type="line" lineData={lineChartData} />
              </div>
            </div>

            {/* Bottom Row: Channel Trust & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Channel Trust */}
              <div className="md:col-span-7 glass rounded-[2rem] p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold">Channel Trust Lattice</h2>
                  <Link href="/dashboard/settings" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                    Settings <ChevronRight size={12} />
                  </Link>
                </div>
                <ChannelTrustList channels={profile?.channel_trust} />
              </div>

              {/* Active Goal */}
              <div className="md:col-span-5 glass rounded-[2rem] p-8 primary-gradient relative overflow-hidden group">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 space-y-6">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                    <Target className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">Active Mission</h3>
                    <p className="text-xl font-bold leading-tight">Master Machine Learning Fundamentals</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
                      <span>Progress</span>
                      <span>68%</span>
                    </div>
                    <div className="h-1 w-full bg-white/20 rounded-full">
                      <div className="h-full bg-white rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>
                  <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl">
                    Accelerate Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

