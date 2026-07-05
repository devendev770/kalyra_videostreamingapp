import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userAPI, playlistAPI } from '../api';
import { History, Clock, FolderHeart, Trash2, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Library = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistVisibility, setPlaylistVisibility] = useState('public');

  // Fetch watch history
  const { data: historyRes, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['library-history'],
    queryFn: () => userAPI.getHistory(),
  });

  // Fetch watch later
  const { data: watchLaterRes, isLoading: wlLoading, refetch: refetchWl } = useQuery({
    queryKey: ['library-watchlater'],
    queryFn: () => userAPI.getWatchLater(),
  });

  // Fetch playlists
  const { data: playlistsRes, isLoading: playlistsLoading, refetch: refetchPlaylists } = useQuery({
    queryKey: ['library-playlists'],
    queryFn: () => playlistAPI.getMine(),
  });

  // Actions
  const clearHistoryMutation = useMutation({
    mutationFn: () => userAPI.clearHistory(),
    onSuccess: () => {
      refetchHistory();
      toast.success('Watch history cleared');
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: () => playlistAPI.create({ name: playlistName, visibility: playlistVisibility }),
    onSuccess: () => {
      setPlaylistName('');
      setPlaylistVisibility('public');
      setShowCreateModal(false);
      refetchPlaylists();
      toast.success('Playlist created');
    },
  });

  const history = historyRes?.data?.history || [];
  const watchLater = watchLaterRes?.data?.watchLater || [];
  const playlists = playlistsRes?.data?.playlists || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header banner */}
      <div className="flex justify-between items-center bg-[#1616194d] border border-[#27272a8c] rounded-2xl p-5">
        <div>
          <h1 className="text-base font-bold text-white">Your Media Library</h1>
          <p className="text-[11px] text-zinc-400 mt-1">Access history, bookmarks, and custom playback catalogs.</p>
        </div>
        {activeTab === 'playlists' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover rounded-xl text-xs font-semibold text-white cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Playlist
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272a8c] gap-4">
        {[
          { id: 'history', label: 'Watch History', icon: History },
          { id: 'watchlater', label: 'Watch Later', icon: Clock },
          { id: 'playlists', label: 'Playlists', icon: FolderHeart },
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

      {/* History panel */}
      {activeTab === 'history' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Playback Timeline</h3>
            {history.length > 0 && (
              <button
                onClick={() => clearHistoryMutation.mutate()}
                className="flex items-center gap-1 text-[10px] font-bold text-red-450 hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All History
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No watch history cataloged.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((h) => (
                <Link
                  key={h._id}
                  to={`/watch/${h.videoId?._id}`}
                  className="group flex gap-3 bg-[#09090b59] border border-[#27272a66] rounded-xl p-3 hover:border-primary/20 transition-all"
                >
                  <img src={h.videoId?.thumbnailUrl} alt="" className="w-20 aspect-video object-cover rounded-lg" />
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="font-bold text-xs text-white group-hover:text-accent transition-colors truncate">{h.videoId?.title}</span>
                    <span className="text-[10px] text-zinc-400 mt-1.5">Watched at: {new Date(h.watchedAt).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watch later panel */}
      {activeTab === 'watchlater' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Saved Bookmarks</h3>
          
          {wlLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : watchLater.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No bookmarked videos.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {watchLater.map((wl) => (
                <Link
                  key={wl._id}
                  to={`/watch/${wl.videoId?._id}`}
                  className="group flex gap-3 bg-[#09090b59] border border-[#27272a66] rounded-xl p-3 hover:border-primary/20 transition-all"
                >
                  <img src={wl.videoId?.thumbnailUrl} alt="" className="w-20 aspect-video object-cover rounded-lg" />
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="font-bold text-xs text-white group-hover:text-accent transition-colors truncate">{wl.videoId?.title}</span>
                    <span className="text-[10px] text-zinc-400 mt-1.5">Saved to bookmarks</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlists panel */}
      {activeTab === 'playlists' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 font-sans">Playlists Collection</h3>

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
                  className="group bg-[#09090b59] border border-border/60 hover:border-primary/30 rounded-2xl p-4 flex flex-col gap-2 transition-all"
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

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPlaylistMutation.mutate();
            }}
            className="w-full max-w-sm bg-surface-light border border-border rounded-2xl p-6 shadow-2xl animate-fadeIn flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-widest pb-2 border-b border-border">
              Create New Playlist
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Playlist Name *</label>
              <input
                type="text"
                required
                placeholder="My favorite videos..."
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Visibility</label>
              <select
                value={playlistVisibility}
                onChange={(e) => setPlaylistVisibility(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-zinc-400 outline-none"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
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
                disabled={createPlaylistMutation.isLoading}
                className="px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white"
              >
                Create Playlist
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Library;
