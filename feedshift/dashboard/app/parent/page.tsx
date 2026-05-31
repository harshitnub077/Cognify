import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ShieldCheck, Users, Search, AlertOctagon, Settings } from 'lucide-react'

export default async function ParentDashboard() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  // Fetch parent profile to ensure role is correct
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (profile?.role !== 'parent') {
    redirect('/dashboard') // Redirect students back to their dashboard
  }

  // Mock Child Data
  const children = [
    { name: 'Alex Rivera', age: 14, blockedThisWeek: 342, status: 'Active', safeScore: 92 },
    { name: 'Mia Rivera', age: 11, blockedThisWeek: 128, status: 'Active', safeScore: 98 }
  ];

  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 selection:bg-secondary/30 pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <ShieldCheck className="text-secondary" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">Family Shield</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">PARENT DASHBOARD</p>
            </div>
          </div>
          <button className="glass px-4 py-2 rounded-full text-sm font-bold hover:bg-white/5 transition-colors">
            Account Settings
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Children Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display">Monitored Accounts</h2>
            <button className="text-sm font-bold text-secondary hover:text-white transition-colors flex items-center gap-2">
              <Users size={16} /> Link Device
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {children.map((child, i) => (
              <div key={i} className="glass rounded-3xl p-6 border-white/5 relative group cursor-pointer glass-hover">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{child.name}</h3>
                    <p className="text-sm text-slate-400">Age {child.age}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-secondary/20 flex items-center justify-center">
                    <span className="font-bold text-secondary">{child.safeScore}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Distractions Blocked</span>
                    <span className="font-bold text-white">{child.blockedThisWeek}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Filter Status</span>
                    <span className="font-bold text-success flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" /> Active
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex justify-between">
                  <button className="text-sm font-bold hover:text-secondary transition-colors">View Report</button>
                  <button className="text-sm font-bold text-slate-500 hover:text-white transition-colors"><Settings size={18}/></button>
                </div>
              </div>
            ))}
          </div>

          {/* Activity Log */}
          <div className="glass rounded-3xl p-8 border-white/5 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-display">Recent Interceptions</h3>
              <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <input type="text" placeholder="Search logs..." className="bg-transparent border-none outline-none text-sm w-32" />
              </div>
            </div>

            <div className="space-y-4">
              {[
                { time: '10 mins ago', user: 'Alex', action: 'BLOCKED', item: '100 Days Building A Modern Underground Hut', reason: 'High Risk Distraction' },
                { time: '1 hour ago', user: 'Mia', action: 'BLOCKED', item: 'Try Not To Laugh Challenge #45', reason: 'Entertainment' },
                { time: '2 hours ago', user: 'Alex', action: 'ALLOWED', item: 'Introduction to Calculus', reason: 'Matches Mission: Mathematics' }
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${log.action === 'BLOCKED' ? 'bg-danger' : 'bg-success'}`} />
                    <div>
                      <p className="text-sm font-bold text-white">{log.item}</p>
                      <p className="text-xs text-slate-400">{log.user} • {log.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${log.action === 'BLOCKED' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {log.action}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{log.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Hard Blocks */}
        <div className="space-y-6">
          <div className="glass rounded-3xl p-8 border-white/5">
            <h3 className="text-lg font-bold font-display flex items-center gap-2 mb-6">
              <AlertOctagon className="text-danger" size={20} /> Network Hard Blocks
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              These categories are strictly blocked across all family accounts, overriding personal missions.
            </p>

            <div className="space-y-3">
              {['Gaming', 'Shorts/Reels', 'Pranks & Challenges', 'Drama/Gossip'].map((cat, i) => (
                <label key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <span className="text-sm font-medium">{cat}</span>
                  <div className="w-10 h-6 bg-danger/20 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-danger rounded-full shadow-sm" />
                  </div>
                </label>
              ))}
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors opacity-50">
                <span className="text-sm font-medium">Educational Channels</span>
                <div className="w-10 h-6 bg-white/10 rounded-full relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-sm" />
                </div>
              </label>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border-white/5 secondary-gradient relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Upgrade to Family Pro</h3>
              <p className="text-sm text-white/80 mb-4">Get custom schedules, daily email reports, and up to 5 devices.</p>
              <button className="bg-white text-secondary px-4 py-2 rounded-xl text-sm font-bold shadow-lg w-full">
                View Plans
              </button>
            </div>
            <ShieldCheck className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
          </div>
        </div>

      </main>
    </div>
  )
}
