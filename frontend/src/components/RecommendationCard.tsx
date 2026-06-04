import React, { useState } from 'react';
import { IconBrandYoutube, IconBrandInstagram, IconWorld, IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { useAddBookmark, useRemoveBookmark } from '../hooks/useDashboardData';
import { cn } from '../lib/utils';

const scoreColor = (score: number) => {
  return 'text-white bg-[#111] border border-[#222]';
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={14} className="text-slate-300" />;
  if (platform === 'instagram') return <IconBrandInstagram size={14} className="text-slate-300" />;
  return <IconWorld size={14} className="text-slate-300" />;
};

export const RecommendationCard = ({ item, isBookmarked: initialBookmarked = false }: any) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
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

  return (
    <div
      onClick={() => { if (item.url) window.open(item.url, '_blank'); }}
      className="group flex flex-col w-full rounded-lg overflow-hidden cursor-pointer border border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333] transition-colors"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[#111] border-b border-[#1a1a1a]">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <div className="px-2 py-1 rounded text-[10px] font-medium bg-black/80 text-white border border-[#222]">
            {item.score}% Match
          </div>
          <button
            onClick={handleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            className="p-1.5 rounded bg-black/80 text-slate-400 hover:text-white border border-[#222] transition-colors"
          >
            {isBookmarked
              ? <IconBookmarkFilled size={14} className="text-white" />
              : <IconBookmark size={14} />}
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <PlatformIcon platform={item.platform} />
          <span className="text-[10px] font-medium text-slate-500 truncate">{item.channel || 'Unknown Channel'}</span>
        </div>
        
        <h4 className="text-sm font-medium leading-snug line-clamp-2 text-white group-hover:text-slate-300 transition-colors">
          {item.title}
        </h4>
      </div>
    </div>
  );
};
