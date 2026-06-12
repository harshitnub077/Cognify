/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import {
  IconBrandYoutube, IconBrandInstagram, IconWorld,
  IconBookmark, IconTrash, IconMoodSmile, IconSearch, IconLoader2,
  IconFingerprint
} from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { useContentHistory, useAddBookmark, useDeleteContent, useSemanticSearch } from '../../hooks/useDashboardData';
import { cn } from '../../lib/utils';

// Clean, professional metric colors
const emotionStyles: Record<string, string> = {
  joy:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  anger:    'text-red-400 bg-red-500/10 border-red-500/20',
  fear:     'text-purple-400 bg-purple-500/10 border-purple-500/20',
  sadness:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  surprise: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  disgust:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  neutral:  'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const History = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'watch' | 'caution' | 'skip'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: historyData, isLoading: isLoadingHistory } = useContentHistory({ limit: 100 });
  const { data: searchResults, isLoading: isLoadingSearch } = useSemanticSearch(debouncedSearch);
  const addBookmark = useAddBookmark();
  const deleteContent = useDeleteContent();

  const isLoading = debouncedSearch ? isLoadingSearch : isLoadingHistory;
  const items: any[] = debouncedSearch ? (searchResults || []) : (historyData?.data || []);

  const filtered = items.filter(item => {
    const matchesFilter = filter === 'all' || item.isConscious === (filter === 'watch') ||
      (filter === 'caution' && !item.isConscious && item.score >= 30) ||
      (filter === 'skip' && !item.isConscious && item.score < 30);
    return matchesFilter;
  });

  const groupedItems = filtered.reduce((groups: any, item) => {
    const date = new Date(item.createdAt);
    let dateKey = format(date, 'MMMM d, yyyy');
    if (isToday(date)) dateKey = 'Today';
    else if (isYesterday(date)) dateKey = 'Yesterday';
    
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
    return groups;
  }, {});

  const handleBookmark = async (item: any) => {
    try {
      await addBookmark.mutateAsync(item);
      toast.success('Bookmarked successfully');
    } catch {
      toast.error('Already bookmarked');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContent.mutateAsync(id);
      toast.success('Removed from history');
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="space-y-8 pb-20 w-full max-w-[1600px] mx-auto px-4 md:px-6 mt-4">
      {/* Professional Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-black shadow-lg shadow-white/5">
              <IconFingerprint size={20} />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Consumption Ledger</h1>
          </div>
          <p className="text-sm text-slate-500 max-w-lg leading-relaxed font-medium">
            An immutable, visually structured record of your digital consumption inputs.
          </p>
        </div>

        {/* Dynamic Stats */}
        {!isLoading && items.length > 0 && (
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-2 rounded-lg text-white shadow-sm">
              <span className="text-slate-500">Indexed:</span>
              <span className="font-mono">{items.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-lg text-white shadow-sm">
              <span className="text-emerald-500/70">Aligned:</span>
              <span className="text-emerald-400 font-mono">
                {items.filter(i => i.isConscious || i.score >= 60).length}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Clean UI Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-[#0a0a0a] border border-[#1a1a1a] p-2 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full group">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors" />
          <input
            type="search"
            placeholder="Search consumption history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-[15px] text-white placeholder-slate-600 pl-11 pr-4 py-2.5 rounded-lg focus:outline-none transition-colors"
          />
        </div>
        <div className="hidden md:block w-px h-8 bg-[#1a1a1a]" />
        <div className="flex w-full md:w-auto p-1 bg-[#111] border border-[#222] rounded-lg shrink-0">
          {(['all', 'watch', 'caution', 'skip'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 md:flex-none px-5 py-2 rounded-md text-xs font-semibold capitalize transition-all',
                filter === f 
                  ? 'bg-[#222] text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout with Professional Thumbnails */}
      {isLoading ? (
        <div className="space-y-8">
          {[1,2].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-32 bg-[#111]" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4].map(j => <Skeleton key={j} className="h-64 w-full rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-4 border border-dashed border-[#1a1a1a] rounded-xl bg-[#050505]">
          <IconMoodSmile size={40} stroke={1.5} className="text-[#333]" />
          <p className="text-sm font-medium">Your history is completely empty.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedItems).map(([dateLabel, dateItems]: [string, any]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                {dateLabel}
                <div className="h-px bg-[#1a1a1a] flex-1" />
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {dateItems.map((item: any) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group flex flex-col bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden relative hover:border-[#333] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                    >
                      {/* Integrated Professional Thumbnail */}
                      <div className="relative w-full aspect-[21/9] bg-[#111] overflow-hidden border-b border-[#1a1a1a]">
                        <img
                          src={item.thumbnail || (item.url?.includes('youtube.com/watch') ? `https://img.youtube.com/vi/${new URL(item.url).searchParams.get('v')}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400')}
                          alt="thumb"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                        
                        <div className="absolute top-3 left-3 p-1.5 bg-black/60 backdrop-blur-md rounded border border-white/10 shadow-sm">
                          <PlatformIcon platform={item.platform || item.contentType} />
                        </div>

                        {/* Hidden Actions -> Reveal on Hover */}
                        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-5px] group-hover:translate-y-0 duration-300">
                          <button 
                            onClick={() => handleBookmark(item)} 
                            disabled={addBookmark.isPending} 
                            className="p-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded hover:bg-white hover:text-black text-white transition-colors shadow-lg"
                          >
                            {addBookmark.isPending ? <IconLoader2 size={14} className="animate-spin" /> : <IconBookmark size={14} />}
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            disabled={deleteContent.isPending} 
                            className="p-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded hover:bg-red-500 hover:border-red-500 text-white transition-colors shadow-lg"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-[15px] font-semibold text-white leading-snug mb-3 line-clamp-2 group-hover:text-slate-200 transition-colors">
                            {item.title || 'Untitled Knowledge Extract'}
                          </h3>

                          {item.url && (
                            <p className="text-[11px] text-slate-500 font-mono line-clamp-1 mb-4">
                              {new URL(item.url).hostname}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider', emotionStyles[item.dominantEmotion] || emotionStyles.neutral)}>
                              {item.dominantEmotion || 'neutral'}
                            </span>
                            <span className={cn(
                              'px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider', 
                              item.score >= 60 ? 'text-white border-[#333]' : 
                              item.score >= 30 ? 'text-slate-400 border-[#222]' : 
                              'text-slate-500 border-[#1a1a1a]'
                            )}>
                              {item.score}% 
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-600">
                            {format(new Date(item.createdAt), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={14} className="text-white" />;
  if (platform === 'instagram') return <IconBrandInstagram size={14} className="text-white" />;
  return <IconWorld size={14} className="text-white" />;
};

export default History;
