import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  IconBrandYoutube, IconBrandInstagram, IconWorld,
  IconBookmark, IconTrash, IconMoodSmile, IconSearch, IconLoader2,
  IconSparkles, IconCalendarTime, IconFingerprint
} from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { useContentHistory, useAddBookmark, useDeleteContent, useSemanticSearch } from '../../hooks/useDashboardData';
import { cn } from '../../lib/utils';

const emotionStyles: Record<string, string> = {
  joy:      'text-slate-300 border-[#222] bg-[#111]',
  anger:    'text-slate-300 border-[#222] bg-[#111]',
  fear:     'text-slate-300 border-[#222] bg-[#111]',
  sadness:  'text-slate-300 border-[#222] bg-[#111]',
  surprise: 'text-slate-300 border-[#222] bg-[#111]',
  disgust:  'text-slate-300 border-[#222] bg-[#111]',
  neutral:  'text-slate-400 border-[#222] bg-[#111]',
};

const History = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'watch' | 'caution' | 'skip'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: historyData, isLoading: isLoadingHistory } = useContentHistory({ limit: 50 });
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

  const handleBookmark = async (item: any) => {
    try {
      await addBookmark.mutateAsync(item);
      toast.success('Bookmarked successfully');
    } catch {
      toast.error('Already bookmarked or limit reached.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContent.mutateAsync(id);
      toast.success('Removed from history');
    } catch {
      toast.error('Failed to remove.');
    }
  };

  return (
    <div className="space-y-8 pb-20 w-full max-w-[1600px] mx-auto px-4 md:px-6 mt-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">History Ledger</h1>
        <p className="text-sm text-slate-500">A cryptographic record of your digital consumption.</p>
      </header>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Search history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-sm text-white placeholder-slate-600 pl-9 pr-3 py-2 rounded-md focus:outline-none focus:border-[#444] transition-colors"
          />
        </div>
        <div className="flex p-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md shrink-0">
          {(['all', 'watch', 'caution', 'skip'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded text-xs font-medium capitalize transition-colors',
                filter === f 
                  ? 'bg-white text-black' 
                  : 'text-slate-400 hover:text-white hover:bg-[#111]'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {!isLoading && items.length > 0 && (
        <div className="flex items-center gap-6 px-1 text-xs font-medium border-b border-[#1a1a1a] pb-4">
          <div className="flex items-center gap-2 text-slate-400">
            <IconFingerprint size={14} className="text-slate-500" />
            <span><strong className="text-white">{items.length}</strong> Entries Indexed</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <IconSparkles size={14} className="text-slate-500" />
            <span><strong className="text-white">{items.filter(i => i.isConscious).length}</strong> High Alignment</span>
          </div>
        </div>
      )}

      {/* Content Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4 border border-dashed border-[#222] rounded-lg bg-[#050505]">
          <IconMoodSmile size={32} className="text-[#333]" />
          <p className="text-sm font-medium">Your history is a blank slate</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col sm:flex-row gap-4 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden hover:border-[#333] transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative shrink-0 w-full sm:w-40 h-24 rounded overflow-hidden bg-[#111]">
                  <img
                    src={item.thumbnail || (item.url?.includes('youtube.com/watch') ? `https://img.youtube.com/vi/${new URL(item.url).searchParams.get('v')}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400')}
                    alt="thumb"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-1 right-1 p-1 bg-black/80 rounded border border-white/10">
                    <PlatformIcon platform={item.platform || item.contentType} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1 z-10">
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight mb-2 pr-12 truncate group-hover:text-slate-300 transition-colors">
                      {item.title || 'Untitled Knowledge'}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                      <span className={cn('px-2 py-0.5 rounded border', emotionStyles[item.dominantEmotion] || emotionStyles.neutral)}>
                        {item.dominantEmotion || 'neutral'}
                      </span>
                      
                      <span className={cn(
                        'px-2 py-0.5 rounded border', 
                        item.score >= 60 ? 'text-white bg-[#111] border-[#222]' : 
                        item.score >= 30 ? 'text-slate-400 bg-[#111] border-[#222]' : 
                        'text-slate-500 bg-[#111] border-[#222]'
                      )}>
                        {item.score}% alignment
                      </span>

                      {item.similarityScore && (
                        <span className="px-2 py-0.5 rounded bg-[#111] border border-[#222] text-slate-300">
                          {(item.similarityScore * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 text-[10px] font-medium text-slate-500">
                    <IconCalendarTime size={12} />
                    <span>{format(new Date(item.createdAt), 'MMMM do, yyyy • h:mm a')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button 
                    onClick={() => handleBookmark(item)} 
                    disabled={addBookmark.isPending} 
                    className="p-1.5 bg-[#111] border border-[#222] rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
                  >
                    {addBookmark.isPending ? <IconLoader2 size={14} className="animate-spin" /> : <IconBookmark size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)} 
                    disabled={deleteContent.isPending} 
                    className="p-1.5 bg-[#111] border border-[#222] rounded hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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
