import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { spatialAPI, videoAPI } from '../api';
import {
  Sparkles, Plus, Users, Globe, Map, ArrowRight,
  Loader2, Search, Gamepad2, Music, BookOpen, MonitorPlay, MessageCircle, Coffee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const CATEGORY_ICONS = {
  hangout: Coffee,
  debate: MessageCircle,
  gaming: Gamepad2,
  music: Music,
  study: BookOpen,
  watch: MonitorPlay,
  other: Sparkles,
};

const CATEGORY_LABELS = {
  hangout: 'Hangout',
  debate: 'Debate',
  gaming: 'Gaming',
  music: 'Music',
  study: 'Study',
  watch: 'Watch Together',
  other: 'Other',
};

const SpatialLounge = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'hangout',
    isPublic: true,
  });

  // Fetch public rooms
  const { data: roomsRes, isLoading } = useQuery({
    queryKey: ['spatial-public'],
    queryFn: () => spatialAPI.getPublic(),
    refetchInterval: 10000,
  });

  const rooms = roomsRes?.data?.rooms || [];

  // Create room mutation
  const createMutation = useMutation({
    mutationFn: (data) => spatialAPI.create(data),
    onSuccess: (res) => {
      toast.success('Space created!');
      setShowCreateModal(false);
      navigate(`/spatial/${res.data.room.roomCode}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create space');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Please sign in first');
    if (!createForm.title.trim()) return toast.error('Please enter a title');
    createMutation.mutate(createForm);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Please sign in first');
    if (!joinCode.trim()) return;
    navigate(`/spatial/${joinCode.trim()}`);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-[#1a1610] via-[#0f0d0a] to-[#09090b] border border-[#27272a66] rounded-3xl p-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Map className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Spatial Lounge</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Walk, talk, and create together in proximity-based spaces</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 max-w-lg leading-relaxed">
              Join a space and drag your dot to move around. You'll only hear people near you — just like a real party. 
              Hosts can use the megaphone to broadcast to everyone or spotlight a viewer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Join by code */}
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="h-10 w-36 bg-[#09090b] border border-border rounded-xl px-3 text-xs outline-none text-white focus:border-primary transition-colors uppercase tracking-widest font-mono"
                maxLength={8}
              />
              <button
                type="submit"
                className="h-10 px-4 bg-surface-hover border border-border rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Join
              </button>
            </form>

            <button
              onClick={() => {
                if (!isAuthenticated) return toast.error('Please sign in to create a space');
                setShowCreateModal(true);
              }}
              className="h-10 px-5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-black flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Space
            </button>
          </div>
        </div>
      </div>

      {/* Active Rooms Grid */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          Active Spaces
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 bg-[#1616194d] border border-border rounded-2xl">
            <Map className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No active spaces yet</p>
            <p className="text-xs text-zinc-500 mt-1">Be the first to create a spatial room!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const CategoryIcon = CATEGORY_ICONS[room.category] || Sparkles;
              return (
                <button
                  key={room._id}
                  onClick={() => {
                    if (!isAuthenticated) return toast.error('Please sign in to join a space');
                    navigate(`/spatial/${room.roomCode}`);
                  }}
                  className="group flex flex-col bg-[#16161966] hover:bg-[#16161999] border border-[#27272a66] hover:border-primary/30 rounded-2xl p-5 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <CategoryIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 bg-[#09090b80] px-2.5 py-1 rounded-lg">
                      <Users className="w-3 h-3" />
                      {room.participants?.length || 0}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                    {room.title}
                  </h3>

                  <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {room.description || `A ${CATEGORY_LABELS[room.category] || 'spatial'} room hosted by ${room.hostId?.displayName || 'someone'}`}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#27272a33]">
                    <div className="flex items-center gap-1.5">
                      {room.hostId?.avatar ? (
                        <img src={room.hostId.avatar} alt="" className="w-5 h-5 rounded-md object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                          {room.hostId?.displayName?.charAt(0)}
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-400 font-semibold">{room.hostId?.displayName}</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-surface-light border border-border rounded-2xl p-6 shadow-2xl animate-fadeIn">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create a Space
            </h3>
            <p className="text-xs text-zinc-500 mb-5">Invite others into your proximity-based spatial room.</p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="My Chill Zone"
                  className="w-full h-10 bg-surface border border-border rounded-xl px-4 text-xs outline-none text-white focus:border-primary transition-colors"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What's this space about?"
                  className="w-full h-20 bg-surface border border-border rounded-xl p-3 text-xs outline-none text-white focus:border-primary transition-colors resize-none"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                    const Icon = CATEGORY_ICONS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, category: key })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          createForm.category === key
                            ? 'bg-primary text-black'
                            : 'bg-surface border border-border text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isPublic}
                    onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-xs text-zinc-400">Public (visible in Spatial Lounge)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-hover text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpatialLounge;
