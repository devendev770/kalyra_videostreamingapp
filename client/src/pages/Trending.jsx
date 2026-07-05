import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { videoAPI } from '../api';
import VideoCard from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/SkeletonLoader';
import InfiniteScroll from '../components/common/InfiniteScroll';
import { Flame, Award, Globe, Heart } from 'lucide-react';

const Trending = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['trending'],
    queryFn: ({ pageParam = 1 }) => videoAPI.getTrending({ page: pageParam, limit: 12 }),
    getNextPageParam: (lastPage) => {
      const { page } = lastPage.data.pagination;
      // Trending aggregates up to 5 pages
      return page < 5 ? page + 1 : undefined;
    },
  });

  const videos = data?.pages.flatMap((page) => page.data.videos) || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/20 via-orange-950/10 to-surface border border-orange-500/10 p-6 md:p-8 flex items-center justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col gap-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[10px] font-bold uppercase tracking-wider w-fit">
            <Flame className="w-4 h-4 fill-orange-500/20" />
            Trending Now
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none mt-1">
            What's Popular Around The Globe
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1">
            Top performing videos ranked dynamically by views, likes, and engagement ratios.
          </p>
        </div>
      </div>

      {/* Grid view */}
      {isLoading ? (
        <VideoGridSkeleton count={8} />
      ) : isError ? (
        <div className="text-center py-16 bg-[#16161933] border border-[#27272a66] rounded-2xl p-8">
          <span className="text-sm text-red-400 font-semibold">Failed to load trending feed</span>
          <p className="text-xs text-zinc-400 mt-1">{error.message}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-[#1616191a] border border-dashed border-border rounded-2xl p-8">
          <span className="text-sm font-semibold text-zinc-400">No trending videos</span>
          <p className="text-xs text-slate-500 mt-1">Check back later for updated global trends!</p>
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

export default Trending;
