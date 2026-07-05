import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { subscriptionAPI } from '../api';
import VideoCard from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/SkeletonLoader';
import InfiniteScroll from '../components/common/InfiniteScroll';
import { Tv, Heart, LogIn } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const Subscriptions = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fadeIn">
        <div className="w-16 h-16 bg-primary-dark/30 border border-primary/25 rounded-2xl flex items-center justify-center mb-6 text-accent">
          <Tv className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-white">Don't miss new videos</h1>
        <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
          Sign in to see updates from your favorite creators, streamers, and watch party groups.
        </p>
        <Link
          to="/auth/login"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 text-xs"
        >
          <LogIn className="w-4 h-4" />
          Sign In Now
        </Link>
      </div>
    );
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['subscriptions-feed'],
    queryFn: ({ pageParam = 1 }) => subscriptionAPI.getFeed({ page: pageParam, limit: 12 }),
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.data.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });

  const videos = data?.pages.flatMap((page) => page.data.videos) || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-dark/15 via-slate-900/10 to-surface border border-primary/10 p-6 md:p-8 flex items-center justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col gap-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-hover/10 border border-primary/25 text-accent text-[10px] font-bold uppercase tracking-wider w-fit">
            <Tv className="w-4 h-4" />
            Subscriptions
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none mt-1">
            From Channels You Follow
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1">
            All recent uploads, uploads, and media announcements from your subscribed creators.
          </p>
        </div>
      </div>

      {/* Grid feed */}
      {isLoading ? (
        <VideoGridSkeleton count={8} />
      ) : isError ? (
        <div className="text-center py-16 bg-[#16161933] border border-[#27272a66] rounded-2xl p-8">
          <span className="text-sm text-red-400 font-semibold">Failed to load subscription feed</span>
          <p className="text-xs text-zinc-400 mt-1">{error.message}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-[#1616191a] border border-dashed border-border rounded-2xl p-8">
          <span className="text-sm font-semibold text-zinc-400">No uploads found</span>
          <p className="text-xs text-zinc-500 mt-1">Explore creators in the home feed and subscribe to see uploads here!</p>
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

export default Subscriptions;
