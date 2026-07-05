import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchAPI, subscriptionAPI } from '../api';
import VideoCard from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/SkeletonLoader';
import { Search as SearchIcon, Filter, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance');
  const [duration, setDuration] = useState(searchParams.get('duration') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Fetch search results
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['search', query, type, sort, duration],
    queryFn: () => {
      const params = { q: query, type, sort };
      if (duration) params.duration = duration;
      return searchAPI.search(params);
    },
    enabled: !!query,
  });

  const handleFilterChange = (key, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
    if (key === 'type') setType(val || 'all');
    if (key === 'sort') setSort(val || 'relevance');
    if (key === 'duration') setDuration(val || '');
  };

  const handleSubscribe = async (channelId) => {
    if (!isAuthenticated) {
      toast.error('Sign in to subscribe to channels');
      return;
    }
    try {
      await subscriptionAPI.toggle(channelId);
      toast.success('Subscription updated');
      refetch();
    } catch (err) {
      toast.error('Subscription change failed');
    }
  };

  const videos = data?.data?.videos?.items || [];
  const channels = data?.data?.channels?.items || [];
  const playlists = data?.data?.playlists?.items || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Search Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <SearchIcon className="w-5 h-5 text-accent" />
            Search Results for <span className="text-accent">"{query}"</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Found {videos.length + channels.length + playlists.length} items matches
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-light border border-border text-zinc-400 hover:text-white hover:bg-surface-hover transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-accent" />
          Filters
        </button>
      </div>

      {/* Filters Expansion Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#16161966] border border-border rounded-2xl p-5 animate-fadeIn">
          {/* Result Type */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Result Type</span>
            <div className="flex flex-wrap gap-2">
              {['all', 'video', 'channel', 'playlist'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleFilterChange('type', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border ${
                    type === t
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface border-border text-zinc-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sort By</span>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Relevance', value: 'relevance' },
                { name: 'Newest', value: 'date' },
                { name: 'Views', value: 'views' },
                { name: 'Likes', value: 'rating' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleFilterChange('sort', s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    sort === s.value
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface border-border text-zinc-400 hover:text-white'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duration</span>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Any', value: '' },
                { name: 'Short (< 4m)', value: 'short' },
                { name: 'Medium (4m - 20m)', value: 'medium' },
                { name: 'Long (> 20m)', value: 'long' },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => handleFilterChange('duration', d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    duration === d.value
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface border-border text-zinc-400 hover:text-white'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Container */}
      {isLoading ? (
        <VideoGridSkeleton count={6} />
      ) : isError ? (
        <div className="text-center py-16 bg-[#16161933] border border-[#27272a66] rounded-2xl">
          <span className="text-sm text-red-400 font-semibold">Search failure</span>
          <p className="text-xs text-zinc-400 mt-1">{error.message}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Channels Result List */}
          {channels.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Channels</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((ch) => (
                  <div key={ch._id} className="flex items-center justify-between bg-[#1616194d] border border-border/60 rounded-2xl p-4">
                    <Link to={`/channel/${ch._id}`} className="flex items-center gap-3">
                      {ch.avatar ? (
                        <img src={ch.avatar} alt="" className="w-12 h-12 rounded-2xl object-cover border border-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-primary-dark/30 flex items-center justify-center font-bold text-accent">
                          {ch.displayName?.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-white flex items-center gap-1">
                          {ch.displayName || ch.username}
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent fill-primary/10" />
                        </span>
                        <span className="text-xs text-zinc-400 mt-0.5">@{ch.username} • {ch.subscriberCount} subscribers</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleSubscribe(ch._id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-200 text-black active:scale-95 transition-all"
                    >
                      Subscribe
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlists Result List */}
          {playlists.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Playlists</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {playlists.map((pl) => (
                  <Link
                    key={pl._id}
                    to={`/playlist/${pl._id}`}
                    className="group bg-[#1616194d] border border-border/60 hover:border-primary/30 rounded-2xl p-4 flex flex-col gap-2 transition-all"
                  >
                    <div className="aspect-video w-full bg-surface-light rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
                      <SlidersHorizontal className="w-8 h-8 text-accent opacity-60" />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                        {pl.videoCount} Videos
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-white group-hover:text-accent transition-colors line-clamp-1">{pl.name}</span>
                      <span className="text-xs text-zinc-400 mt-1">Created by {pl.userId?.displayName || pl.userId?.username}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Videos Result Grid */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Videos</h2>
            {videos.length > 0 ? (
              <div className="video-grid">
                {videos.map((vid) => (
                  <VideoCard key={vid._id} video={vid} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#1616191a] border border-border/60 rounded-2xl">
                <span className="text-xs text-zinc-400 font-semibold">No videos matches this query</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
