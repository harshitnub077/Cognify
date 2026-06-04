import React from 'react';
import { useBookmarks } from '../../hooks/useDashboardData';
import { RecommendationCard } from '../../components/RecommendationCard';
import { IconBookmark } from '@tabler/icons-react';

const Saved = () => {
  const { data: bookmarks, isLoading } = useBookmarks();

  return (
    <div className="space-y-6 pb-20 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      <header className="pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Saved</h1>
        <p className="text-sm text-slate-500 max-w-2xl">Your curated collection of high-alignment content.</p>
      </header>

      {isLoading ? (
        <div className="text-center text-slate-500 py-12 text-sm">Loading...</div>
      ) : !bookmarks || bookmarks.length === 0 ? (
        <div className="bg-[#050505] border border-dashed border-[#222] rounded-lg p-12 text-center text-slate-500 mt-10">
          <IconBookmark size={32} className="mx-auto mb-3 text-[#333]" />
          <p className="text-sm font-medium">No saved content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bookmarks.map((item: any) => (
            <div key={item.id} className="w-full">
              <RecommendationCard item={item} isBookmarked={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Saved;
