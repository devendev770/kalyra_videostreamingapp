import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { watchPartyAPI } from '../api';
import { Users, Video, Share2, Plus, LogIn, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const WatchParty = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [roomCode, setRoomCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Fetch active public watch parties
  const { data: publicPartiesRes, isLoading } = useQuery({
    queryKey: ['public-parties'],
    queryFn: () => watchPartyAPI.getPublic(),
  });

  const createMutation = useMutation({
    mutationFn: () => watchPartyAPI.create({ videoId, title, isPublic }),
    onSuccess: (res) => {
      toast.success('Watch party created successfully!');
      setShowCreateModal(false);
      navigate(`/watch-party/${res.data.party.roomCode}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create watch party');
    },
  });

  const handleJoin = (code) => {
    const cleanCode = (code || roomCode).trim().toUpperCase();
    if (!cleanCode) return toast.error('Please enter a room code');
    navigate(`/watch-party/${cleanCode}`);
  };

  const parties = publicPartiesRes?.data?.parties || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-dark/15 via-primary-dark/10 to-surface border border-primary/10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col gap-2 z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-accent text-[10px] font-bold uppercase tracking-wider w-fit">
            <Users className="w-3.5 h-3.5" />
            Watch Party
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none mt-1">
            Stream Together in Real-Time
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1">
            Synchronize playback, share reactions, and chat live with friends and fans globally.
          </p>
        </div>
        <div className="flex gap-2 z-10">
          <button
            onClick={() => {
              if (!isAuthenticated) return toast.error('Sign in to host a party');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/20 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Party
          </button>
        </div>
      </div>

      {/* Join Room Code Widget */}
      <div className="bg-[#16161966] border border-border rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white">Have a Party Room Code?</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter the 8-character code to join your friends instantly.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            maxLength={8}
            placeholder="ROOMCODE"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="h-10 w-full sm:w-40 bg-[#09090ba6] border border-border focus:border-primary rounded-xl px-4 text-xs text-white text-center font-bold font-mono tracking-widest outline-none"
          />
          <button
            onClick={() => handleJoin()}
            className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Join
          </button>
        </div>
      </div>

      {/* Active Public Rooms list */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 px-1">
          Active Public Parties
        </h2>

        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-16 bg-[#1616191a] border border-dashed border-border rounded-2xl p-8">
            <span className="text-xs font-semibold text-zinc-400">No public watch parties online</span>
            <p className="text-[11px] text-zinc-500 mt-1">Create one above and make it public to invite others!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {parties.map((p) => (
              <div
                key={p._id}
                onClick={() => handleJoin(p.roomCode)}
                className="group bg-[#1616194d] border border-[#27272a80] hover:border-primary/35 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all"
              >
                <div className="aspect-video w-full bg-surface-light rounded-xl overflow-hidden relative border border-border">
                  <img src={p.videoId?.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-103 transition-transform" />
                  <div className="absolute top-2.5 left-2.5 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    Live Sync
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {p.participants?.length} participants
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-white group-hover:text-accent transition-colors line-clamp-1">{p.title}</span>
                  <span className="text-[10px] text-zinc-400 mt-1">Host: {p.hostId?.displayName || p.hostId?.username}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Party Modal */}
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
              Host Sync Session
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Video ID *</label>
              <input
                type="text"
                required
                placeholder="64f9b8c0d9a3f2b1a0e9c8d7"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Room Title</label>
              <input
                type="text"
                required
                placeholder="Watching with the crew..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-b border-[#27272a66] my-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Public Room</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Allow anyone on the platform to join.</span>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
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
                className="px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5"
              >
                {createMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Host Party'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WatchParty;
