import React, { useState } from 'react';
import { IconBrandYoutube, IconBrandInstagram, IconWorld, IconEye, IconClock, IconBookmark, IconBookmarkFilled, IconScan, IconLoader2 } from '@tabler/icons-react';
import { useAddBookmark, useRemoveBookmark } from '../hooks/useDashboardData';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';

const emotionColors: Record<string, string> = {
  joy:      'bg-emerald-500',
  anger:    'bg-red-500',
  fear:     'bg-amber-500',
  sadness:  'bg-indigo-500',
  surprise: 'bg-cyan-500',
  disgust:  'bg-purple-500',
  neutral:  'bg-slate-400'
};

export const RecommendationCard = ({ item, isBookmarked: initialBookmarked = false }: any) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isBookmarked) {
      setIsBookmarked(false);
      removeBookmark.mutate(item.id);
    } else {
      setIsBookmarked(true);
      addBookmark.mutate(item);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.url) { toast.error('No URL available to analyze.'); return; }
    setIsAnalyzing(true);
    try {
      const res = await api.post('/content/analyze', { url: item.url });
      const data = res.data.data;
      const score = data?.score ?? 0;
      const emotion = data?.dominantEmotion || 'neutral';
      toast.success(`${score}% aligned · ${emotion} dominant`, { duration: 4000, icon: '🧠' });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const emotionsArray = Object.entries(item.emotions || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);

  return (
    <motion.div
      onClick={() => { if (item.url) window.open(item.url, "_blank"); }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col w-[280px] bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
    >
      <div className="relative w-full h-40 overflow-hidden bg-slate-200 dark:bg-[#1A1A1A]">
        <img
          src={item.thumbnail}
          alt={item.title}
          width="280"
          height="160"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={handleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition focus-visible:ring-2 focus-visible:ring-[#6C4FF6] outline-none"
          >
            {isBookmarked ? <IconBookmarkFilled size={16} className="text-[#6C4FF6]" /> : <IconBookmark size={16} />}
          </button>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm flex items-center gap-1">
          <IconClock size={10} /> {item.duration || '10:00'}
        </div>
        {item.platform === 'youtube'
          ? <IconBrandYoutube size={20} className="absolute bottom-2 left-2 text-white drop-shadow-md" />
          : item.platform === 'instagram'
          ? <IconBrandInstagram size={20} className="absolute bottom-2 left-2 text-white drop-shadow-md" />
          : <IconWorld size={20} className="absolute bottom-2 left-2 text-white drop-shadow-md" />
        }
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h4 className="text-sm font-bold line-clamp-2 leading-snug mb-1 group-hover:text-[#6C4FF6] transition-colors">{item.title}</h4>
        <p className="text-xs text-slate-500 mb-3">{item.channel || 'Unknown Channel'}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide', item.score > 60 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
              {item.score}% Match
            </span>
            <div className="flex -space-x-1">
              {emotionsArray.map((emotion, i) => (
                <div key={i} className={cn('w-2.5 h-2.5 rounded-full border border-white dark:border-[#121212]', emotionColors[emotion] || emotionColors.neutral)} title={emotion} />
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <IconEye size={12} /> {item.viewCount || '1K views'}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleAnalyze(e); }}
          disabled={isAnalyzing}
          className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold bg-slate-100 dark:bg-[#1A1A1A] hover:bg-[#6C4FF6] text-slate-700 dark:text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-60"
        >
          {isAnalyzing ? <IconLoader2 size={14} className="animate-spin" /> : <IconScan size={14} />}
          {isAnalyzing ? 'Analyzing…' : 'Analyze before watching'}
        </button>
      </div>
    </motion.div>
  );
};
