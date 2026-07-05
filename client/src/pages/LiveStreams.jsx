import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { liveAPI } from '../api';
import { Radio, Tv, ArrowRight, Loader2, Play, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

const LiveStreams = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Stream form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('gaming');

  // Fetch active streams
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['active-streams'],
    queryFn: () => liveAPI.getActive(),
    refetchInterval: 15000, // Poll every 15s as a safety net
  });

  // Listen for real-time stream updates
  useEffect(() => {
    if (!socket) return;

    const handleStreamUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
    };

    socket.on('live:started', handleStreamUpdate);
    socket.on('live:ended', handleStreamUpdate);
    socket.on('live:stream_update', handleStreamUpdate);

    return () => {
      socket.off('live:started', handleStreamUpdate);
      socket.off('live:ended', handleStreamUpdate);
      socket.off('live:stream_update', handleStreamUpdate);
    };
  }, [socket, queryClient]);

  const createMutation = useMutation({
    mutationFn: () => liveAPI.create({ title, description, category }),
    onSuccess: (res) => {
      toast.success('Live stream room created!');
      setShowCreateModal(false);
      navigate(`/live/${res.data.stream._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to initialize broadcast');
    },
  });

  const streams = data?.data?.streams || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/20 via-primary-dark/10 to-surface border border-red-500/10 p-6 md:p-8 flex items-center justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col gap-2 z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase tracking-wider w-fit animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            Go Live
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none mt-1">
            Real-Time Broadcast Center
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1">
            Join ongoing streams, chat in real-time, or start your own RTMP broadcast instantly.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="z-10 flex items-center gap-1 px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-600/20 text-xs"
        >
          Go Live Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of active streams */}
      {isLoading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : streams.length === 0 ? (
        <div className="text-center py-20 bg-[#1616191a] border border-dashed border-border rounded-2xl p-8">
          <span className="text-sm font-semibold text-zinc-400">No live streams online</span>
          <p className="text-xs text-zinc-500 mt-1">Click "Go Live Now" to initiate the first stream!</p>
        </div>
      ) : (
        <div className="video-grid">
          {streams.map((stream) => (
            <Link
              key={stream._id}
              to={`/live/${stream._id}`}
              className="group flex flex-col bg-[#1616194d] border border-[#27272a66] hover:border-red-500/30 rounded-2xl overflow-hidden transition-all"
            >
              <div className="aspect-video w-full bg-surface-light relative overflow-hidden">
                {stream.thumbnailUrl ? (
                  <img src={stream.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-10 h-10 text-red-500 animate-pulse" />
                  </div>
                )}
                {/* Status Badge */}
                {stream.status === 'live' ? (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    Live
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Starting Soon
                  </span>
                )}
                <span className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {stream.viewerCount}
                </span>
              </div>
              <div className="p-4 flex gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-primary-dark/30 border border-border flex-shrink-0 flex items-center justify-center font-bold text-xs text-accent">
                  {stream.userId?.displayName?.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1">{stream.title}</span>
                  <span className="text-[11px] text-zinc-400 mt-1">@{stream.userId?.username}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Stream Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="w-full max-w-md bg-surface-light border border-border rounded-2xl p-6 shadow-2xl animate-fadeIn flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-widest pb-2 border-b border-border">
              Start Broadcast Session
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Stream Title</label>
              <input
                type="text"
                required
                placeholder="My epic live gameplay..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-red-500 rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Description</label>
              <textarea
                placeholder="Details about the stream..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 bg-[#09090b99] border border-border focus:border-red-500 rounded-xl p-4 text-xs text-white outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-red-500 rounded-xl px-4 text-xs text-zinc-400 outline-none"
              >
                <option value="gaming">Gaming</option>
                <option value="music">Music</option>
                <option value="education">Education</option>
                <option value="entertainment">Entertainment</option>
                <option value="sports">Sports</option>
                <option value="news">News</option>
                <option value="technology">Technology</option>
                <option value="cooking">Cooking</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 text-xs mt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl font-semibold bg-surface-hover text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="px-4 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5"
              >
                {createMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize Stream'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LiveStreams;
