import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userAPI, subscriptionAPI, videoAPI, playlistAPI, communityAPI } from '../api';
import VideoCard from '../components/video/VideoCard';
import { VideoGridSkeleton } from '../components/common/SkeletonLoader';
import { CheckCircle2, Tv, Film, FolderHeart, MessageSquare, Info, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const Channel = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('videos');
  const [editingAssets, setEditingAssets] = useState(false);

  // Fetch channel profile metadata
  const { data: channelRes, isLoading: channelLoading, refetch: refetchChannel } = useQuery({
    queryKey: ['channel-profile', id],
    queryFn: () => userAPI.getChannel(id),
  });

  // Fetch channel videos
  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ['channel-videos', id],
    queryFn: () => videoAPI.getFeed({ userId: id, limit: 30 }),
    enabled: !!id,
  });

  // Fetch channel playlists
  const { data: playlistsRes, isLoading: playlistsLoading } = useQuery({
    queryKey: ['channel-playlists', id],
    queryFn: () => playlistAPI.getByUser(id),
    enabled: !!id,
  });

  // Fetch channel community announcements
  const { data: postsRes, isLoading: postsLoading } = useQuery({
    queryKey: ['channel-posts', id],
    queryFn: () => communityAPI.getByUser(id),
    enabled: !!id,
  });

  const subMutation = useMutation({
    mutationFn: () => subscriptionAPI.toggle(id),
    onSuccess: () => {
      refetchChannel();
      toast.success('Subscription updated');
    },
  });

  const handleAssetUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type, file);

    const uploadPromise = type === 'avatar' ? userAPI.updateAvatar(formData) : userAPI.updateBanner(formData);

    toast.promise(uploadPromise, {
      loading: `Uploading new ${type}...`,
      success: () => {
        refetchChannel();
        return `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`;
      },
      error: 'Failed to upload asset',
    });
  };

  const channel = channelRes?.data?.channel;
  if (channelLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!channel) return <div className="text-center py-20 text-zinc-400">Channel not found</div>;

  const isOwner = user?._id === channel._id;
  const isSubscribed = channelRes?.data?.isSubscribed;
  const videos = videosRes?.data?.videos || [];
  const playlists = playlistsRes?.data?.playlists || [];
  const posts = postsRes?.data?.posts || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Banner */}
      <div className="h-40 md:h-56 w-full bg-surface-light relative overflow-hidden rounded-3xl border border-border">
        {channel.banner ? (
          <img src={channel.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-primary-dark/40" />
        )}
        
        {isOwner && (
          <label className="absolute bottom-4 right-4 p-2.5 bg-black/60 hover:bg-black/85 border border-white/10 rounded-xl text-white cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold">
            <Camera className="w-4 h-4" />
            Edit Banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'banner')} />
          </label>
        )}
      </div>

      {/* Profile summary details */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-[#27272acc] pb-6 px-4">
        {/* Avatar */}
        <div className="relative group">
          {channel.avatar ? (
            <img src={channel.avatar} alt="" className="w-24 h-24 md:w-28 md:h-28 rounded-3xl object-cover border border-border" />
          ) : (
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-primary-dark/30 border border-border flex items-center justify-center font-bold text-3xl text-accent">
              {channel.displayName?.charAt(0)}
            </div>
          )}
          {isOwner && (
            <label className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAssetUpload(e, 'avatar')} />
            </label>
          )}
        </div>

        {/* Text summaries & sub triggers */}
        <div className="flex-1 flex flex-col md:items-start items-center text-center md:text-left gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-1.5">
            {channel.displayName || channel.username}
            <CheckCircle2 className="w-5 h-5 text-accent fill-primary/10" />
          </h1>
          <p className="text-xs text-zinc-400 font-medium">@{channel.username} • {channel.subscriberCount || 0} subscribers</p>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-md mt-1">{channel.bio || 'Welcome to my official Kalyra channel!'}</p>
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <Link
              to="/studio"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Creator Studio
            </Link>
          ) : (
            <button
              onClick={() => subMutation.mutate()}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-all ${
                isSubscribed
                  ? 'bg-surface-hover text-zinc-400 border border-border'
                  : 'bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/5'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272a8c] gap-4 overflow-x-auto scrollbar-none pb-0.5">
        {[
          { id: 'videos', label: 'Videos', icon: Film },
          { id: 'playlists', label: 'Playlists', icon: FolderHeart },
          { id: 'community', label: 'Community', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary text-accent'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab views */}
      {activeTab === 'videos' && (
        <div>
          {videosLoading ? (
            <VideoGridSkeleton count={4} />
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No videos online yet.</div>
          ) : (
            <div className="video-grid">
              {videos.map((vid) => (
                <VideoCard key={vid._id} video={vid} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'playlists' && (
        <div>
          {playlistsLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No playlists published.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <Link
                  key={pl._id}
                  to={`/playlist/${pl._id}`}
                  className="group bg-[#1616194d] border border-border/60 hover:border-primary/30 rounded-2xl p-4 flex flex-col gap-2 transition-all"
                >
                  <div className="aspect-video w-full bg-surface-light rounded-xl flex items-center justify-center border border-border relative">
                    <FolderHeart className="w-8 h-8 text-accent opacity-60" />
                    <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">{pl.videoCount} Videos</span>
                  </div>
                  <span className="font-bold text-xs text-white group-hover:text-accent transition-colors">{pl.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'community' && (
        <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
          {postsLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No community announcements published.</div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="bg-[#1616194d] border border-border/60 rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-[10px] text-zinc-500 font-bold">{new Date(post.createdAt).toLocaleDateString()}</span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{post.text}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Channel;
