import React, { useState } from 'react';
import { useCircles } from '../../hooks/useDashboardData';
import { IconUsers, IconPlus, IconUserPlus, IconTrophy, IconFlame } from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { motion } from 'framer-motion';

const Circles = () => {
  const { data: circles, isLoading } = useCircles();
  const [activeTab, setActiveTab] = useState<'my-circles' | 'join' | 'create'>('my-circles');

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconUsers className="text-[#6C4FF6]" /> Accountability Circles
        </h1>
        <p className="text-slate-500 text-sm mt-1 max-w-xl">
          Growth happens together. Join a private circle to track collective alignment, maintain streaks, and hold each other accountable without sharing specific content history.
        </p>
      </header>

      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('my-circles')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === 'my-circles' ? 'bg-[#121212] dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          My Circles
        </button>
        <button 
          onClick={() => setActiveTab('join')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1 ${activeTab === 'join' ? 'bg-[#121212] dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <IconUserPlus size={16} /> Join
        </button>
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1 ${activeTab === 'create' ? 'bg-[#121212] dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          <IconPlus size={16} /> Create
        </button>
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
                Create a circle to invite your friends, or join an existing one using an invite code.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {circles.map((circle: any) => (
                <div key={circle.id} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C4FF6]/5 rounded-bl-[100px] -z-10" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold">{circle.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-100 dark:bg-[#1A1A1A] px-2 py-0.5 rounded inline-block">
                        Code: {circle.inviteCode}
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      {circle.members?.map((m: any, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#121212] bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                          {m.user?.profile?.displayName?.charAt(0) || m.user?.email?.charAt(0) || '?'}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <IconTrophy size={14} /> Weekly Leaderboard
                    </h4>
                    
                    {/* Mocked Leaderboard logic for UI */}
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1A1A1A] rounded-xl border border-slate-100 dark:border-[#222]">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                            {i + 1}
                          </span>
                          <span className="font-semibold text-sm">Member {i+1}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">9{8-i}% Aligned</span>
                          <span className="text-xs font-bold text-orange-500 flex items-center gap-0.5"><IconFlame size={12} className="fill-orange-500"/> {12-i*3}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forms for Join/Create */}
      {(activeTab === 'join' || activeTab === 'create') && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-4">
            {activeTab === 'join' ? 'Join a Circle' : 'Create a Circle'}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {activeTab === 'join' 
              ? 'Enter the 6-character invite code provided by your circle leader.' 
              : 'Give your circle a name. You will get an invite code to share with friends.'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                {activeTab === 'join' ? 'Invite Code' : 'Circle Name'}
              </label>
              <input 
                type="text" 
                placeholder={activeTab === 'join' ? "e.g. X7B9K2" : "e.g. The Thinkers"}
                className="w-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4FF6]/50 transition"
              />
            </div>
            
            <button className="w-full bg-[#6C4FF6] text-white font-bold rounded-xl px-4 py-3 text-sm hover:bg-[#5b3ce0] transition shadow-md shadow-[#6C4FF6]/20">
              {activeTab === 'join' ? 'Join Circle' : 'Create Circle'}
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default Circles;
