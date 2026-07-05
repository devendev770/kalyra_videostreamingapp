import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shortAPI, videoAPI } from '../api';
import {
  ThumbsUp, ThumbsDown, MessageCircle, Share2,
  Volume2, VolumeX, Loader2, Music, UserPlus, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const Vibes = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch vibes feed (uses the shortAPI.getFeed endpoint)
  const { data, isLoading } = useQuery({
    queryKey: ['vibes'],
    queryFn: () => shortAPI.getFeed({ limit: 15 }),
  });

  const vibes = data?.data?.shorts || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => videoAPI.deleteVideo(id),
    onSuccess: () => {
      toast.success('Vibe deleted successfully');
      queryClient.invalidateQueries(['vibes']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete vibe');
    }
  });

  const handleDeleteVibe = (id) => {
    if (window.confirm('Are you sure you want to delete this vibe? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' && currentIndex < vibes.length - 1) {
        scrollToVibe(currentIndex + 1);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        scrollToVibe(currentIndex - 1);
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayCurrent();
      } else if (e.key === 'm') {
        setMuted(!muted);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, vibes, muted]);

  // Handle auto-play on scroll trigger
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    // Pause all other videos
    videoRefs.current.forEach((vid, idx) => {
      if (vid && idx !== currentIndex) {
        vid.pause();
        vid.currentTime = 0;
      }
    });

    if (isPlaying) {
      currentVideo.muted = muted;
      currentVideo.play().catch(() => {});
    }
  }, [currentIndex, isPlaying, muted, vibes]);

  const scrollToVibe = (index) => {
    setCurrentIndex(index);
    const element = document.getElementById(`vibe-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const togglePlayCurrent = () => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleLike = async (id, type) => {
    if (!isAuthenticated) return toast.error('Sign in to interact');
    try {
      await videoAPI.toggleLike(id, type);
      toast.success('Interaction saved');
    } catch {
      toast.error('Action failed');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (vibes.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        No vibes found. Check back later!
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[85vh] w-full max-w-md mx-auto overflow-y-scroll snap-y snap-mandatory scrollbar-none rounded-2xl bg-black border border-border relative shadow-2xl"
      onScroll={(e) => {
        const index = Math.round(e.target.scrollTop / e.target.clientHeight);
        if (index !== currentIndex && index >= 0 && index < vibes.length) {
          setCurrentIndex(index);
          setIsPlaying(true);
        }
      }}
    >
      {vibes.map((vibe, index) => (
        <div
          key={vibe._id}
          id={`vibe-${index}`}
          className="h-full w-full snap-start snap-always relative flex flex-col justify-end"
        >
          {/* Vertical Video Element */}
          <video
            ref={(el) => (videoRefs.current[index] = el)}
            src={vibe.hlsUrl || vibe.originalUrl}
            poster={vibe.thumbnailUrl}
            loop
            muted={muted}
            onClick={togglePlayCurrent}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            playsInline
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />

          {/* Top action: mute toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className="absolute top-4 right-4 p-2 bg-black/40 border border-white/10 rounded-full text-white hover:bg-black/60 transition-all z-20"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Bottom metadata details overlay */}
          <div className="p-4 z-10 text-white flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <Link to={`/channel/${vibe.userId?._id}`}>
                {vibe.userId?.avatar ? (
                  <img src={vibe.userId.avatar} alt="" className="w-9 h-9 rounded-xl object-cover border border-white/20" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-primary-dark/30 flex items-center justify-center font-bold text-xs">
                    {vibe.userId?.displayName?.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="flex flex-col">
                <span className="font-bold text-xs flex items-center gap-1">
                  @{vibe.userId?.username}
                  <UserPlus className="w-3.5 h-3.5 text-accent" />
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200 line-clamp-2 max-w-[80%]">
              {vibe.title}
            </p>

            <div className="flex items-center gap-1 text-[10px] text-accent font-bold">
              <Music className="w-3.5 h-3.5" />
              <span>Original audio</span>
            </div>
          </div>

          {/* Right side interaction bar overlay */}
          <div className="absolute right-3 bottom-20 flex flex-col gap-4 items-center z-10">
            {/* Like */}
            <div className="flex flex-col items-center gap-1 text-white">
              <button
                onClick={() => handleLike(vibe._id, 'like')}
                className="p-3 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <ThumbsUp className="w-4.5 h-4.5 text-accent fill-primary/10" />
              </button>
              <span className="text-[10px] font-bold">{vibe.likes}</span>
            </div>

            {/* Dislike */}
            <div className="flex flex-col items-center gap-1 text-white">
              <button
                onClick={() => handleLike(vibe._id, 'dislike')}
                className="p-3 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <ThumbsDown className="w-4.5 h-4.5" />
              </button>
              <span className="text-[10px] font-bold">Dislike</span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center gap-1 text-white">
              <button
                onClick={() => toast.success('Open comments panel')}
                className="p-3 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <MessageCircle className="w-4.5 h-4.5" />
              </button>
              <span className="text-[10px] font-bold">{vibe.commentCount}</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center gap-1 text-white">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/vibes/${vibe._id}`);
                  toast.success('Vibe URL copied!');
                }}
                className="p-3 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Share2 className="w-4.5 h-4.5" />
              </button>
              <span className="text-[10px] font-bold">Share</span>
            </div>

            {/* Delete Vibe (Owner or Admin only) */}
            {(user?._id === vibe.userId?._id || user?.role === 'admin') && (
              <div className="flex flex-col items-center gap-1 text-red-500 mt-2">
                <button
                  onClick={() => handleDeleteVibe(vibe._id)}
                  disabled={deleteMutation.isPending}
                  className="p-3 bg-black/50 hover:bg-red-950/80 border border-red-500/30 hover:border-red-500/50 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5 text-red-500" />
                </button>
                <span className="text-[10px] font-bold text-red-400">Delete</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Vibes;
