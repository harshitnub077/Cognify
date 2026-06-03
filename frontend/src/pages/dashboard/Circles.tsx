import React, { useState, useRef } from 'react';
import { useCircles } from '../../hooks/useDashboardData';
import { IconUsers, IconPlus, IconUserPlus, IconTrophy, IconFlame, IconLoader2, IconCopy, IconCheck } from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { motion } from 'framer-motion';
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
        toast.success(`Circle "${res.data.data.name}" created! Code: ${res.data.data.inviteCode}`);
      } else {
        await api.post('/circles/join', { inviteCode: inputValue.trim().toUpperCase() });
        toast.success('Joined circle!');
      }
      queryClient.invalidateQueries({ queryKey: ['circles'] });
      setInputValue('');
      setActiveTab('my-circles');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed. Check the invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><IconUsers className="text-[#6C4FF6]" /> Accountability Circles</h1>
        <p className="text-slate-500 text-sm mt-1 max-w-xl">
          Growth happens together. Join a private circle to track collective alignment and hold each other accountable.
        </p>
      </header>

      <div className="flex gap-2 mb-6">
        {(['my-circles', 'join', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setInputValue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1 ${
              activeTab === tab
                ? 'bg-[#121212] dark:bg-white text-white dark:text-black'
                : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'join' && <IconUserPlus size={16} />}
            {tab === 'create' && <IconPlus size={16} />}
            {tab === 'my-circles' ? 'My Circles' : tab === 'join' ? 'Join' : 'Create'}
          </button>
        ))}
      </div>

      {activeTab === 'my-circles' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : !circles || circles.length === 0 ? (
            <div className="border border-dashed border-slate-300 dark:border-[#333] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-[#6C4FF6]/10 text-[#6C4FF6] rounded-full flex items-center justify-center mx-auto mb-4">
                <IconUsers size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">No active circles</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                Create a circle to invite friends, or join one using an invite code.
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setActiveTab('join')} className="px-4 py-2 text-sm font-bold border border-slate-200 dark:border-[#333] rounded-xl hover:border-[#6C4FF6] transition">Join</button>
                <button onClick={() => setActiveTab('create')} className="px-4 py-2 text-sm font-bold bg-[#6C4FF6] text-white rounded-xl hover:bg-[#5b3fd4] transition">Create</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {circles.map((circle: any) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'join' || activeTab === 'create') && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="max-w-md bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-2">
            {activeTab === 'join' ? 'Join a Circle' : 'Create a Circle'}
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            {activeTab === 'join'
              ? 'Enter the 6-character invite code provided by your circle leader.'
              : 'Give your circle a name. You will receive an invite code to share.'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                {activeTab === 'join' ? 'Invite Code' : 'Circle Name'}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={activeTab === 'join' ? 'e.g. X7B9K2' : 'e.g. The Thinkers'}
                required
                className="w-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4FF6]/50 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6C4FF6] text-white font-bold rounded-xl px-4 py-3 text-sm hover:bg-[#5b3ce0] transition shadow-md shadow-[#6C4FF6]/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <IconLoader2 size={16} className="animate-spin" />}
              {activeTab === 'join' ? 'Join Circle' : 'Create Circle'}
            </button>
          </div>
        </motion.form>
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
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C4FF6]/5 rounded-bl-[100px] -z-10" />
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-xl font-bold">{circle.name}</h3>
          <button
            onClick={copyCode}
            className="mt-1 flex items-center gap-1 text-xs font-mono bg-slate-100 dark:bg-[#1A1A1A] hover:bg-[#6C4FF6]/10 hover:text-[#6C4FF6] px-2 py-0.5 rounded transition"
          >
            Code: {circle.inviteCode}
            {copied ? <IconCheck size={12} className="text-emerald-500" /> : <IconCopy size={12} />}
          </button>
        </div>
        <div className="flex -space-x-2">
          {(circle.members || []).slice(0, 5).map((m: any, i: number) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#121212] bg-[#6C4FF6] text-white flex items-center justify-center text-xs font-bold uppercase">
              {m.userId?.charAt(0) || '?'}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <IconTrophy size={14} /> Members ({(circle.members || []).length})
        </h4>
        {(circle.members || []).slice(0, 3).map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1A1A1A] rounded-xl border border-slate-100 dark:border-[#222]">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                {i + 1}
              </span>
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Member {i + 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
              <span className="text-xs font-bold text-orange-500 flex items-center gap-0.5"><IconFlame size={12} className="fill-orange-500" /> {7 - i}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Circles;
