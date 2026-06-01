import React from 'react';
import { useBookmarks } from '../../hooks/useDashboardData';
import { RecommendationCard } from '../../components/RecommendationCard';
import { IconBookmark } from '@tabler/icons-react';

const Saved = () => {
  const { data: bookmarks, isLoading } = useBookmarks();

  return (
    <div className="space-y-6 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconBookmark className="text-[#6C4FF6]" /> Saved for Later
        </h1>
        <p className="text-slate-500 text-sm">Your curated collection of high-alignment content.</p>
      </header>

      {isLoading ? (
        <div className="text-center text-slate-500 py-12">Loading bookmarks...</div>
      ) : !bookmarks || bookmarks.length === 0 ? (
        <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#222] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 text-slate-400">
            <IconBookmark size={32} />
          </div>
          <h3 className="text-lg font-bold mb-2">No saved content</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            When you see highly aligned content in your recommendations, click the bookmark icon to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {bookmarks.map((item: any) => (
            <RecommendationCard key={item.id} item={item} isBookmarked={true} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Saved;
