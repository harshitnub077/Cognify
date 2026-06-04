import React, { useState } from 'react';
import { useCircles } from '../../hooks/useDashboardData';
import { IconUsers, IconPlus, IconUserPlus, IconTrophy, IconFlame, IconLoader2, IconCopy, IconCheck } from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const Circles = () => {
  const { data: circles, isLoading } = useCircles();
  const [activeTab, setActiveTab] = useState<'my-circles' | 'join' | 'create'>('my-circles');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLoading(true);
    try {
      if (activeTab === 'create') {
        const res = await api.post('/circles/create', { name: inputValue.trim() });
        toast.success(`Circle created! Code: ${res.data.data.inviteCode}`);
      } else {
        await api.post('/circles/join', { inviteCode: inputValue.trim().toUpperCase() });
        toast.success('Joined circle!');
      }
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      setInputValue('');
      setActiveTab('my-circles');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full max-w-[1600px] mx-auto px-4 md:px-6 mt-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Circles</h1>
        <p className="text-sm text-slate-500">Accountability groups to track collective alignment.</p>
      </header>

      <div className="flex gap-2 bg-[#0a0a0a] border border-[#1a1a1a] p-1 rounded-md w-max">
        {(['my-circles', 'join', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setInputValue(''); }}
            className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-black'
                : 'text-slate-400 hover:text-white hover:bg-[#111]'
            }`}
          >
            {tab === 'my-circles' ? 'My Circles' : tab === 'join' ? 'Join' : 'Create'}
          </button>
        ))}
      </div>

      {activeTab === 'my-circles' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]" />)}
            </div>
          ) : !circles || circles.length === 0 ? (
            <div className="border border-dashed border-[#222] bg-[#050505] rounded-lg p-12 text-center text-slate-500">
              <IconUsers size={32} className="mx-auto mb-3 text-[#333]" />
              <p className="text-sm font-medium mb-4">No active circles</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setActiveTab('join')} className="px-4 py-1.5 rounded bg-[#111] border border-[#222] text-xs font-medium text-slate-300 hover:text-white hover:bg-[#222]">Join</button>
                <button onClick={() => setActiveTab('create')} className="px-4 py-1.5 rounded bg-white text-black text-xs font-medium hover:bg-slate-200">Create</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {circles.map((circle: any) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'join' || activeTab === 'create') && (
        <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 max-w-md">
          <h3 className="text-sm font-medium text-white mb-2">{activeTab === 'join' ? 'Join a Circle' : 'Create a Circle'}</h3>
          <p className="text-xs text-slate-500 mb-6">
            {activeTab === 'join' ? 'Enter the 6-character invite code.' : 'Give your circle a name.'}
          </p>
          <div className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={activeTab === 'join' ? 'e.g. X7B9K2' : 'e.g. The Thinkers'}
              required
              className="w-full bg-[#111] border border-[#222] text-sm text-white placeholder-slate-600 px-3 py-2 rounded-md focus:outline-none focus:border-[#444] transition-colors"
            />
            <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded bg-white text-black text-xs font-medium hover:bg-slate-200 flex justify-center items-center gap-2">
              {loading && <IconLoader2 size={14} className="animate-spin" />}
              {activeTab === 'join' ? 'Join Circle' : 'Create Circle'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const CircleCard = ({ circle }: { circle: any }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(circle.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-sm font-medium text-white">{circle.name}</h3>
          <button onClick={copyCode} className="mt-1 flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors">
            Code: {circle.inviteCode} {copied ? <IconCheck size={10} className="text-emerald-500" /> : <IconCopy size={10} />}
          </button>
        </div>
        <div className="flex -space-x-1.5">
          {(circle.members || []).slice(0, 4).map((m: any, i: number) => (
            <div key={i} className="w-6 h-6 rounded-full border border-[#0a0a0a] bg-[#222] text-slate-400 flex items-center justify-center text-[9px] font-bold uppercase">
              {m.userId?.charAt(0) || '?'}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2 border-b border-[#1a1a1a] pb-2">Leaderboard</h4>
        {(circle.members || []).slice(0, 3).map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-2 bg-[#111] border border-[#222] rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-500 w-3">{i + 1}.</span>
              <span className="text-xs font-medium text-slate-300">Member {i + 1}</span>
            </div>
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1"><IconFlame size={12} className="text-slate-500" /> {7 - i}d</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Circles;
