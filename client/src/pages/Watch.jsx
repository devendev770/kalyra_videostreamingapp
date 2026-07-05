import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videoAPI, commentAPI, subscriptionAPI, userAPI, playlistAPI } from '../api';
import CustomVideoPlayer from '../components/video/CustomVideoPlayer';
import { VideoDetailsSkeleton } from '../components/common/SkeletonLoader';
import {
  ThumbsUp, ThumbsDown, Share2, FolderPlus,
  Send, MoreVertical, Heart, Pin, CheckCircle2, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // commentId
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Fetch video details
  const { data: videoRes, isLoading: videoLoading, refetch: refetchVideo } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoAPI.getVideo(id),
  });

  // Fetch comments
  const { data: commentsRes, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentAPI.getComments(id, { limit: 30 }),
  });

  // Fetch recommendations (trending/feed)
  const { data: recommendationsRes } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => videoAPI.getFeed({ limit: 10 }),
  });

  // Fetch user playlists
  const { data: playlistsRes } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => playlistAPI.getMine(),
    enabled: isAuthenticated,
  });

  // Actions Mutators — optimistic updates for instant UI feedback
  const likeMutation = useMutation({
    mutationFn: (type) => videoAPI.toggleLike(id, type),
    onMutate: async (type) => {
      await queryClient.cancelQueries(['video', id]);
      const prev = queryClient.getQueryData(['video', id]);
      queryClient.setQueryData(['video', id], (old) => {
        if (!old?.data?.video) return old;
        const v = { ...old.data.video };
        const wasLiked = v.userLikeStatus === 'like';
        const wasDisliked = v.userLikeStatus === 'dislike';
        if (type === 'like') {
          if (wasLiked) { v.likes--; v.userLikeStatus = null; }
          else { v.likes++; if (wasDisliked) v.dislikes--; v.userLikeStatus = 'like'; }
        } else {
          if (wasDisliked) { v.dislikes--; v.userLikeStatus = null; }
          else { v.dislikes++; if (wasLiked) v.likes--; v.userLikeStatus = 'dislike'; }
        }
        return { ...old, data: { ...old.data, video: v } };
      });
      return { prev };
    },
    onError: (_err, _type, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['video', id], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries(['video', id]),
  });

  const subMutation = useMutation({
    mutationFn: (channelId) => subscriptionAPI.toggle(channelId),
    onMutate: async () => {
      await queryClient.cancelQueries(['video', id]);
      const prev = queryClient.getQueryData(['video', id]);
      queryClient.setQueryData(['video', id], (old) => {
        if (!old?.data?.video) return old;
        const v = { ...old.data.video };
        v.isSubscribed = !v.isSubscribed;
        return { ...old, data: { ...old.data, video: v } };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['video', id], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries(['video', id]),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text) => commentAPI.addComment(id, { text }),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries(['comments', id]);
      toast.success('Comment posted');
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: ({ commentId, text }) => commentAPI.addComment(id, { text, parentId: commentId }),
    onSuccess: () => {
      setReplyText('');
      setReplyingTo(null);
      queryClient.invalidateQueries(['comments', id]);
      toast.success('Reply posted');
    },
  });

  const watchLaterMutation = useMutation({
    mutationFn: () => userAPI.toggleWatchLater(id),
    onSuccess: () => toast.success('Watch Later updated'),
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: (playlistId) => playlistAPI.addVideo(playlistId, id),
    onSuccess: () => {
      toast.success('Added to playlist');
      setShowPlaylistModal(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add video');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => videoAPI.deleteVideo(id),
    onSuccess: () => {
      toast.success('Video deleted successfully');
      navigate('/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete video');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (videoLoading) return <VideoDetailsSkeleton />;

  const video = videoRes?.data?.video;
  if (!video) return <div className="text-center py-20 text-zinc-400">Video not found</div>;

  const channel = video.userId;
  const comments = commentsRes?.data?.comments || [];
  const recommendations = recommendationsRes?.data?.videos || [];
  const playlists = playlistsRes?.data?.playlists || [];

  const handleProgress = (currentTime) => {
    // throttle progress sync
    const lastSync = window[`lastSync_${id}`] || 0;
    if (Date.now() - lastSync > 8000) {
      videoAPI.saveProgress(id, currentTime);
      window[`lastSync_${id}`] = Date.now();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* Left Column: Player & Detail Info */}
      <div className="flex-1 min-w-0">
        <CustomVideoPlayer
          src={video.hlsUrl || video.originalUrl}
          poster={video.thumbnailUrl}
          onProgress={handleProgress}
        />

        {/* Title */}
        <h1 className="text-lg md:text-xl font-bold text-white mt-4 leading-snug">
          {video.title}
        </h1>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pb-5 border-b border-[#27272acc]">
          {/* Channel metadata */}
          <div className="flex items-center gap-3">
            <Link to={`/channel/${channel?._id}`} className="flex-shrink-0">
              {channel?.avatar ? (
                <img src={channel.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary-dark/30 border border-border flex items-center justify-center font-bold text-accent">
                  {channel?.displayName?.charAt(0)}
                </div>
              )}
            </Link>
            <div className="flex flex-col">
              <Link to={`/channel/${channel?._id}`} className="font-semibold text-sm text-white hover:text-primary-hover transition-colors flex items-center gap-1">
                {channel?.displayName || channel?.username}
                <CheckCircle2 className="w-3.5 h-3.5 text-accent fill-primary/10" />
              </Link>
              <span className="text-xs text-zinc-400 mt-0.5">{channel?.subscriberCount || 0} subscribers</span>
            </div>
            {user?._id !== channel?._id && (
              <button
                onClick={() => subMutation.mutate(channel?._id)}
                className={`ml-3 px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all ${
                  video.isSubscribed
                    ? 'bg-surface-hover text-zinc-400 border border-border'
                    : 'bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/5'
                }`}
              >
                {video.isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>

          {/* Video Engagement Buttons */}
          <div className="flex items-center gap-2">
            {/* Likes */}
            <div className="flex items-center bg-surface-light/60 border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => likeMutation.mutate('like')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all hover:bg-surface-hover ${
                  video.userLikeStatus === 'like' ? 'text-accent bg-[#2d2d3066]' : 'text-zinc-400'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                {video.likes}
              </button>
              <div className="w-[1px] h-4 bg-border" />
              <button
                onClick={() => likeMutation.mutate('dislike')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all hover:bg-surface-hover ${
                  video.userLikeStatus === 'dislike' ? 'text-red-400 bg-red-950/10' : 'text-zinc-400'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            {/* Share */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('URL copied to clipboard!');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-light/60 border border-border hover:text-white hover:bg-surface-hover text-zinc-400 rounded-xl text-xs font-bold transition-all"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {/* Add Playlist */}
            <button
              onClick={() => {
                if (!isAuthenticated) return toast.error('Please sign in to manage playlists');
                setShowPlaylistModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-light/60 border border-border hover:text-white hover:bg-surface-hover text-zinc-400 rounded-xl text-xs font-bold transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              Save
            </button>

            {/* Delete Video (Owner or Admin only) */}
            {(user?._id === channel?._id || user?.role === 'admin') && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-red-950/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* Video Description Box */}
        <div className="bg-[#16161966] border border-[#27272a66] rounded-2xl p-4 mt-5">
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
            <span>{video.views} views</span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <span>{video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : ''}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-3 whitespace-pre-wrap leading-relaxed">
            {video.description || 'No description provided.'}
          </p>
        </div>

        {/* Comment Section */}
        <div className="mt-7">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">
            {comments.length} Comments
          </h3>

          {/* Comment Form */}
          {isAuthenticated ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (commentText.trim()) addCommentMutation.mutate(commentText.trim());
              }}
              className="flex gap-3 mb-6"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary-dark/30 flex items-center justify-center font-bold text-xs">
                  {user?.displayName?.charAt(0)}
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a public comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-10 bg-surface-light/60 border border-border focus:border-primary rounded-xl px-4 text-xs outline-none text-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={addCommentMutation.isLoading}
                  className="h-10 px-4 bg-primary hover:bg-primary-hover rounded-xl flex items-center justify-center text-white active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 bg-[#1616191a] border border-border rounded-xl mb-6 text-xs text-zinc-400">
              Please <Link to="/auth/login" className="text-accent hover:underline">Sign In</Link> to join the discussion.
            </div>
          )}

          {/* Comment List */}
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <div key={comment._id} className="flex gap-3 bg-surface-light/15 border border-[#27272a33] rounded-xl p-3">
                {/* Avatar */}
                <Link to={`/channel/${comment.userId?._id}`} className="flex-shrink-0">
                  {comment.userId?.avatar ? (
                    <img src={comment.userId.avatar} alt="" className="w-8.5 h-8.5 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8.5 h-8.5 rounded-lg bg-primary-dark/25 flex items-center justify-center font-bold text-accent text-xs">
                      {comment.userId?.displayName?.charAt(0)}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{comment.userId?.displayName || comment.userId?.username}</span>
                    <span className="text-[10px] text-zinc-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    {comment.isPinned && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-accent uppercase tracking-wider"><Pin className="w-2.5 h-2.5" /> Pinned</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {comment.text}
                  </p>
                  
                  {/* Heart and actions */}
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-zinc-500 font-bold">
                    <button className="hover:text-accent transition-colors">Like ({comment.likes})</button>
                    <button
                      onClick={() => {
                        if (!isAuthenticated) return toast.error('Please sign in');
                        setReplyingTo(replyingTo === comment._id ? null : comment._id);
                      }}
                      className="hover:text-primary-hover transition-colors"
                    >
                      Reply
                    </button>
                    {comment.isHearted && <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />}
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment._id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (replyText.trim()) {
                          addReplyMutation.mutate({ commentId: comment._id, text: replyText.trim() });
                        }
                      }}
                      className="flex gap-2 mt-3"
                    >
                      <input
                        type="text"
                        placeholder="Reply to this comment..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 h-8 bg-surface border border-border rounded-lg px-3 text-xs outline-none text-white"
                      />
                      <button type="submit" className="h-8 px-3 bg-primary hover:bg-primary-hover rounded-lg text-xs font-semibold text-white">
                        Reply
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Recommendations Sidebar */}
      <div className="w-full lg:w-96 flex flex-col gap-4 flex-shrink-0">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest px-1">
          Up Next
        </h2>

        <div className="flex flex-col gap-3">
          {recommendations
            .filter((rec) => rec._id !== id)
            .map((rec) => (
              <Link
                key={rec._id}
                to={`/watch/${rec._id}`}
                className="group flex gap-2.5 bg-[#16161933] hover:bg-[#16161980] border border-[#27272a66] rounded-xl p-2 transition-all"
              >
                <div className="relative w-32 aspect-video bg-surface-light rounded-lg overflow-hidden flex-shrink-0">
                  <img src={rec.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <span className="font-semibold text-xs text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {rec.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1">
                    {rec.userId?.displayName || rec.userId?.username}
                  </span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 font-bold">
                    {rec.views} views • {rec.createdAt ? formatDistanceToNow(new Date(rec.createdAt)) : ''}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </div>

      {/* Playlist Save Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xs bg-surface-light border border-border rounded-2xl p-6 shadow-2xl animate-fadeIn">
            <h3 className="text-sm font-bold text-white mb-4">Save to Playlist</h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4">
              {playlists.map((pl) => (
                <button
                  key={pl._id}
                  onClick={() => addToPlaylistMutation.mutate(pl._id)}
                  className="w-full text-left px-3 py-2 bg-surface hover:bg-primary/15 border border-border hover:border-primary/30 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all"
                >
                  {pl.name} ({pl.videoCount})
                </button>
              ))}
              {playlists.length === 0 && (
                <span className="text-xs text-zinc-500 text-center py-4">No playlists found. Create one in Library.</span>
              )}
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="px-4 py-2 rounded-xl font-semibold bg-surface-hover text-zinc-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watch;
