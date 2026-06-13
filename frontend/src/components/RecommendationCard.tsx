import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IconBrandYoutube, IconBrandInstagram, IconWorld, IconBookmark, IconBookmarkFilled, IconLoader2 } from '@tabler/icons-react';
import { useAddBookmark, useRemoveBookmark } from '../hooks/useDashboardData';
import { cn } from '../lib/utils';

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'youtube') return <IconBrandYoutube size={12} />;
  if (platform === 'instagram') return <IconBrandInstagram size={12} />;
  return <IconWorld size={12} />;
};

export const RecommendationCard = ({ item, isBookmarked: initialBookmarked = false }: any) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isHovered, setIsHovered] = useState(false);
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

  const isPending = addBookmark.isPending || removeBookmark.isPending;

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => { 
        let targetUrl = item.url || item.link;
        if (targetUrl) {
          if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
          }
          window.open(targetUrl, '_blank'); 
        }
      }}
      className="group flex flex-col w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer hover:border-[#333] transition-colors"
    >
      <div className="relative aspect-video w-full bg-[#111] overflow-hidden border-b border-[#1a1a1a]">
        <img
          src={(() => {
            const videoUrl = item.url || item.link;
            const isYoutube = item.platform === 'youtube' || (videoUrl && videoUrl.includes('youtu'));
            if (isYoutube && videoUrl) {
              const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?\s]+)/);
              if (match && match[1]) {
                return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
              }
            }
            return item.thumbnail;
          })()}
          alt={item.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          loading="lazy"
          onError={(e) => {
            // Fallback to hqdefault if maxresdefault doesn't exist
            const img = e.currentTarget;
            if (img.src.includes('maxresdefault.jpg')) {
              img.src = img.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
            }
          }}
        />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex justify-between items-start right-3 z-10">
          <div className="px-2 py-0.5 rounded bg-[#111] border border-[#222] text-[10px] font-bold tracking-widest text-slate-300 uppercase shadow-sm">
            {item.score}% Align
          </div>
          
          <button
            onClick={handleBookmark}
            disabled={isPending}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            className={cn(
              "p-1.5 rounded bg-[#111] border border-[#222] shadow-sm transition-all",
              isBookmarked 
                ? "text-white border-[#333]" 
                : "text-slate-400 hover:text-white"
            )}
          >
            {isPending ? (
              <IconLoader2 size={12} className="animate-spin" />
            ) : isBookmarked ? (
              <IconBookmarkFilled size={12} className="text-white" />
            ) : (
              <IconBookmark size={12} />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-[#111] border border-[#222] flex items-center justify-center text-slate-400">
              <PlatformIcon platform={item.platform} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
              {item.channel || 'Source'}
            </span>
          </div>
          
          <h4 className="text-sm font-medium leading-snug line-clamp-2 text-white group-hover:text-slate-200 transition-colors">
            {item.title || 'Untitled Extract'}
          </h4>
        </div>
      </div>
    </motion.div>
  );
};
