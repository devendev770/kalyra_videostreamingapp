import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { videoAPI } from '../api';
import VideoCard from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/SkeletonLoader';
import InfiniteScroll from '../components/common/InfiniteScroll';
import { Sparkles } from 'lucide-react';

const CATEGORIES = [
  'all', 'gaming', 'music', 'education', 'tech',
  'sports', 'comedy', 'news', 'entertainment', 'other'
];

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['videos', selectedCategory],
    queryFn: ({ pageParam = 1 }) => {
      if (selectedCategory === 'all') {
        return videoAPI.getFeed({ page: pageParam, limit: 12 });
      }
      return videoAPI.getByCategory(selectedCategory, { page: pageParam, limit: 12 });
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.data.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });

  const videos = data?.pages.flatMap((page) => page.data.videos) || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Dynamic Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary-dark/10 to-surface border border-primary/10 p-6 md:p-8 flex items-center justify-between shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col gap-2 z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-hover/10 border border-primary/25 text-accent text-[10px] font-bold uppercase tracking-wider w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            Discover what's hot
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none mt-1">
            Experience High Fidelity Streaming
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1">
            Explore high-fidelity videos, curated playlists, and professional creator channels in real-time.
          </p>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-image">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-300 flex-shrink-0 cursor-pointer border ${
              selectedCategory === category
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-95'
                : 'bg-[#16161980] border-border text-zinc-400 hover:text-white hover:bg-[#161619e6]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <VideoGridSkeleton count={8} />
      ) : isError ? (
        <div className="text-center py-16 bg-[#16161933] border border-[#27272a66] rounded-2xl p-8">
          <span className="text-sm text-red-400 font-semibold">Failed to load video feed</span>
          <p className="text-xs text-zinc-400 mt-1">{error.message}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-[#1616191a] border border-dashed border-border rounded-2xl p-8">
          <span className="text-sm font-semibold text-zinc-400">No videos found</span>
          <p className="text-xs text-zinc-500 mt-1">Be the first to upload a video to this category!</p>
        </div>
      ) : (
        <InfiniteScroll
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default Home;
