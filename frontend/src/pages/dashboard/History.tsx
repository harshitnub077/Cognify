import React, { useState } from 'react';
import { IconSearch, IconFilter, IconDownload, IconBrandYoutube, IconBrandInstagram, IconWorld, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useContentHistory } from '../../hooks/useDashboardData';
import { Skeleton } from '../../components/Skeleton';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const emotionColors: Record<string, string> = {
  joy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  anger: 'bg-red-500/10 text-red-500 border-red-500/20',
  fear: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  sadness: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  surprise: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  disgust: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  neutral: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
};

const History = () => {
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading } = useContentHistory({ page, limit: 20 });

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Content History</h1>
        <p className="text-slate-500 text-sm">Every piece of content analyzed by Cognify.</p>
      </header>

      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-[#222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search title, platform, emotion..." 
              className="w-full bg-slate-100 dark:bg-[#1A1A1A] border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#6C4FF6] outline-none"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#222] px-4 py-2 rounded-lg text-sm font-medium transition">
              <IconFilter size={16} /> Filters
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#1A1A1A] hover:bg-slate-200 dark:hover:bg-[#222] px-4 py-2 rounded-lg text-sm font-medium transition">
              <IconDownload size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1A1A1A]/50 border-b border-slate-200 dark:border-[#222]">
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Content</th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Emotion</th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Toxicity</th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Goal Match</th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-20 rounded-md" /></td>
                    <td className="p-4"><Skeleton className="h-2 w-24 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : (!historyData?.data || historyData.data.length === 0) ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-500">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 text-[#6C4FF6]">
                        <IconWorld size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No content analyzed yet</h3>
                      <p className="text-sm text-slate-500 dark:text-[#A7A9BE] leading-relaxed mb-6">
                        Install the Cognify Chrome Extension to start analyzing your content diet on YouTube, Twitter, and Instagram.
                      </p>
                      <button className="bg-[#6C4FF6] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#5B40DB] transition shadow-md">
                        Install Extension
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                historyData.data.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-[#222]/50 hover:bg-slate-50 dark:hover:bg-[#1A1A1A]/30 transition group">
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                      {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3 max-w-sm">
                        {item.platform === 'youtube' ? <IconBrandYoutube size={20} className="text-red-500 shrink-0" /> :
                         item.platform === 'instagram' ? <IconBrandInstagram size={20} className="text-pink-500 shrink-0" /> :
                         <IconWorld size={20} className="text-blue-500 shrink-0" />}
                        <span className="text-sm font-semibold truncate group-hover:text-[#6C4FF6] transition-colors cursor-pointer">{item.title}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border", emotionColors[item.dominantEmotion] || emotionColors.neutral)}>
                        {item.dominantEmotion}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-[#333] rounded-full overflow-hidden">
                          <div className={cn("h-full", item.toxicity?.overall > 0.5 ? "bg-red-500" : item.toxicity?.overall > 0.2 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.round((item.toxicity?.overall || 0) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500">{Math.round((item.toxicity?.overall || 0) * 100)}%</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn("font-bold", item.score > 0.6 ? "text-emerald-500" : item.score > 0.3 ? "text-amber-500" : "text-red-500")}>
                        {Math.round(item.score * 100)}%
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <button className="text-xs font-bold text-[#6C4FF6] hover:underline">View details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-[#222] flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing 1 to 20 of {historyData?.total || 0} entries</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50">
              <IconChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium px-2">{page}</span>
            <button onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-slate-100 dark:bg-[#1A1A1A] text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default History;
