import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  IconHistory, IconBrandYoutube, IconBrandInstagram, IconWorld,
  IconBookmark, IconTrash, IconMoodSmile, IconFilter, IconSearch, IconLoader2
} from '@tabler/icons-react';
import { Skeleton } from '../../components/Skeleton';
import { useContentHistory, useAddBookmark, useDeleteContent } from '../../hooks/useDashboardData';
import { cn } from '../../lib/utils';

const emotionColors: Record<string, string> = {
  joy:      'bg-emerald-500',
  anger:    'bg-red-500',
  fear:     'bg-amber-500',
  sadness:  'bg-indigo-500',
  surprise: 'bg-cyan-500',
  disgust:  'bg-purple-500',
  neutral:  'bg-slate-400',
};

const verdictColors: Record<string, string> = {
  watch:   'text-emerald-500 bg-emerald-500/10',
  caution: 'text-amber-500 bg-amber-500/10',
  skip:    'text-red-500 bg-red-500/10',
};

const History = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'watch' | 'caution' | 'skip'>('all');

  const { data: historyData, isLoading } = useContentHistory({ limit: 50 });
  const addBookmark = useAddBookmark();
  const deleteContent = useDeleteContent();

  const items: any[] = historyData?.data || [];

  const filtered = items.filter(item => {
    const matchesSearch = !search || item.title?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.isConscious === (filter === 'watch') ||
      (filter === 'caution' && !item.isConscious && item.score >= 30) ||
      (filter === 'skip' && !item.isConscious && item.score < 30);
    return matchesSearch && matchesFilter;
  });

  const handleBookmark = async (item: any) => {
    try {
      await addBookmark.mutateAsync({
        url: item.url,
        title: item.title,
        thumbnail: item.thumbnail,
        platform: item.platform || item.contentType,
        score: item.score / 100,
        dominantEmotion: item.dominantEmotion,
        emotions: item.emotions,
      });
      toast.success('Bookmarked!');
    } catch {
      toast.error('Already bookmarked or limit reached.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContent.mutateAsync(id);
      toast.success('Removed from history.');
    } catch {
      toast.error('Failed to remove.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><IconHistory size={26} /> History</h1>
        <p className="text-slate-500 text-sm">Everything you have analyzed through Cognify.</p>
      </header>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search your history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C4FF6]"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#333]">
          {(['all', 'watch', 'caution', 'skip'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg transition capitalize', filter === f ? 'bg-white/80 dark:bg-[#222]/80 backdrop-blur shadow text-[#6C4FF6]' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-[#111]/50')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="flex gap-4 text-sm text-slate-500">
          <span><strong className="text-slate-800 dark:text-white">{items.length}</strong> total analyzed</span>
          <span><strong className="text-emerald-500">{items.filter(i => i.isConscious).length}</strong> conscious picks</span>
          <span><strong className="text-[#6C4FF6]">{items.length > 0 ? Math.round(items.reduce((a, i) => a + (i.score || 0), 0) / items.length) : 0}%</strong> avg alignment</span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[90px] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <IconMoodSmile size={40} className="text-slate-300 dark:text-slate-600" />
          <p className="font-semibold">No history yet</p>
          <p className="text-sm">Analyze a URL from the dashboard to get started.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="flex flex-col sm:flex-row gap-4 p-4 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-slate-200/50 dark:border-[#222]/50 rounded-xl hover:border-[#6C4FF6]/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
              >
                {/* Thumbnail */}
                <img
                  src={item.thumbnail || (item.url?.includes('youtube.com/watch') ? `https://img.youtube.com/vi/${new URL(item.url).searchParams.get('v')}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400')}
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400";
                  }}
                  className="w-20 h-14 rounded-lg object-cover bg-slate-200 dark:bg-[#333] shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{item.title || 'Untitled'}</h3>
                    <PlatformIcon platform={item.platform || item.contentType} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span className={cn('px-1.5 py-0.5 rounded text-white', emotionColors[item.dominantEmotion] || emotionColors.neutral)}>
                      {item.dominantEmotion || 'neutral'}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded font-bold', item.score >= 60 ? 'text-emerald-500 bg-emerald-500/10' : item.score >= 30 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10')}>
                      {item.score}% match
                    </span>
                    <span className="text-slate-400">{format(new Date(item.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.summary}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleBookmark(item)}
                    disabled={addBookmark.isPending}
                    title="Save"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#6C4FF6] hover:bg-[#6C4FF6]/10 transition"
                  >
                    {addBookmark.isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconBookmark size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteContent.isPending}
                    title="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={16} className="text-red-500 shrink-0" />;
  if (platform === 'instagram') return <IconBrandInstagram size={16} className="text-pink-500 shrink-0" />;
  return <IconWorld size={16} className="text-blue-500 shrink-0" />;
};

export default History;
