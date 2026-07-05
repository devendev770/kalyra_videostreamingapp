import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { communityAPI } from '../api';
import {
  MessageSquareCode, Send, ThumbsUp, Trash2,
  Loader2, Radio, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

const Community = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  // Post state
  const [postText, setPostText] = useState('');
  const [postType, setPostType] = useState('text'); // 'text' or 'poll'
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const { data: postsRes, isLoading, refetch } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => communityAPI.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (postData) => communityAPI.create(postData),
    onSuccess: () => {
      setPostText('');
      setPollQuestion('');
      setPollOptions(['', '']);
      setPostType('text');
      refetch();
      toast.success('Announcement posted to community!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to post');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => communityAPI.delete(id),
    onSuccess: () => {
      refetch();
      toast.success('Post deleted');
    },
  });

  const likeMutation = useMutation({
    mutationFn: (id) => communityAPI.toggleLike(id),
    onSuccess: () => refetch(),
  });

  const voteMutation = useMutation({
    mutationFn: ({ postId, optionId }) => communityAPI.vote(postId, optionId),
    onSuccess: () => {
      refetch();
      toast.success('Vote recorded');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error('Sign in to post');
    
    if (postType === 'text') {
      if (!postText.trim()) return toast.error('Post content cannot be empty');
      createMutation.mutate({ text: postText.trim(), type: 'text' });
    } else {
      if (!pollQuestion.trim()) return toast.error('Poll question is required');
      const cleanOptions = pollOptions.filter((o) => o.trim());
      if (cleanOptions.length < 2) return toast.error('At least 2 poll options are required');
      
      createMutation.mutate({
        text: pollQuestion.trim(),
        type: 'poll',
        poll: {
          question: pollQuestion.trim(),
          options: cleanOptions.map((o) => ({ text: o })),
          endsAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 Hours
        },
      });
    }
  };

  const handlePollOptionChange = (idx, val) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length >= 5) return toast.error('Max 5 options allowed');
    setPollOptions([...pollOptions, '']);
  };

  const posts = postsRes?.data?.posts || [];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fadeIn">
      {/* Post creation panel */}
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="bg-surface-light/45 border border-border rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex gap-2.5 pb-3 border-b border-[#27272a8c]">
            <button
              type="button"
              onClick={() => setPostType('text')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                postType === 'text' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Text Post
            </button>
            <button
              type="button"
              onClick={() => setPostType('poll')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                postType === 'poll' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Interactive Poll
            </button>
          </div>

          {postType === 'text' ? (
            <textarea
              placeholder="Announce something to your subscribers..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full h-20 bg-surface/55 border border-border focus:border-primary rounded-xl p-4 text-xs text-white outline-none resize-none"
            />
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full h-11 bg-surface/55 border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
              <div className="flex flex-col gap-2">
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    className="w-full h-10 bg-[#09090b59] border border-border/60 focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addPollOption}
                className="text-xs font-bold text-accent hover:text-accent w-fit cursor-pointer"
              >
                + Add Option
              </button>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25 text-xs"
            >
              {createMutation.isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish Post
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-[#1616191a] border border-dashed border-border rounded-2xl">
            <span className="text-xs font-semibold text-zinc-400">No community announcements</span>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="bg-[#1616194d] border border-border/60 rounded-2xl p-5 flex flex-col gap-3.5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {post.userId?.avatar ? (
                    <img src={post.userId.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary-dark/25 flex items-center justify-center font-bold text-accent">
                      {post.userId?.displayName?.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-white">{post.userId?.displayName || post.userId?.username}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Creator/Admin Delete */}
                {(user?._id === post.userId?._id || user?.role === 'admin') && (
                  <button
                    onClick={() => deleteMutation.mutate(post._id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Text content */}
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {post.text}
              </p>

              {/* Poll view */}
              {post.type === 'poll' && post.poll && (
                <div className="flex flex-col gap-2.5 bg-surface/50 border border-border/60 rounded-xl p-4 mt-1">
                  <h4 className="font-bold text-xs text-white pb-1 border-b border-[#27272a66]">{post.poll.question}</h4>
                  <div className="flex flex-col gap-2">
                    {post.poll.options.map((opt) => {
                      const percentage = post.poll.totalVotes > 0 ? Math.round((opt.votes / post.poll.totalVotes) * 100) : 0;
                      const voted = opt.voters?.includes(user?._id);

                      return (
                        <div
                          key={opt._id}
                          onClick={() => {
                            if (!isAuthenticated) return toast.error('Sign in to vote');
                            voteMutation.mutate({ postId: post._id, optionId: opt._id });
                          }}
                          className={`relative h-10 w-full rounded-xl border border-border/75 overflow-hidden flex items-center justify-between px-4 cursor-pointer hover:bg-[#16161980] transition-all ${
                            voted ? 'border-primary/50 bg-primary-dark/10' : ''
                          }`}
                        >
                          {/* Percent Fill bar */}
                          <div
                            className="absolute top-0 left-0 bottom-0 bg-primary/15 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                          <span className="font-semibold text-xs text-slate-200 z-10">{opt.text}</span>
                          <span className="font-bold text-[10px] text-zinc-400 z-10">{percentage}% ({opt.votes})</span>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{post.poll.totalVotes} total votes</span>
                </div>
              )}

              {/* Actions footer */}
              <div className="flex items-center gap-3 border-t border-border/30 pt-3 text-[11px] font-bold text-zinc-400">
                <button
                  onClick={() => likeMutation.mutate(post._id)}
                  className="flex items-center gap-1.5 hover:text-accent transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {post.likes}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Community;
