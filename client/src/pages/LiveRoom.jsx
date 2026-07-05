import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { liveAPI } from '../api';
import { useSocket } from '../contexts/SocketContext';
import CustomVideoPlayer from '../components/video/CustomVideoPlayer';
import { Send, Radio, MessageSquare, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const LiveRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useSelector((state) => state.auth);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [viewerCount, setViewerCount] = useState(0);

  // Fetch live stream metadata
  const { data, isLoading, isError } = useQuery({
    queryKey: ['liveroom', id],
    queryFn: () => liveAPI.getOne(id),
    refetchInterval: 10000, // Poll every 10s to pick up status changes
  });

  const stream = data?.data?.stream;

  const endMutation = useMutation({
    mutationFn: () => liveAPI.end(id),
    onSuccess: () => {
      toast.success('Live stream ended');
      navigate('/live');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to end stream');
    },
  });

  useEffect(() => {
    if (isError) {
      toast.error('Live stream room not found');
      navigate('/live');
    }
  }, [isError, navigate]);

  useEffect(() => {
    if (stream) {
      setViewerCount(stream.viewerCount || 0);
    }
  }, [stream]);

  // Socket hook
  useEffect(() => {
    if (!socket || !stream) return;

    // Join live stream
    socket.emit('live:join', id);

    // Handle view count sync
    socket.on('live:viewer_count', ({ count }) => {
      setViewerCount(count);
    });

    // Handle stream chat
    socket.on('live:chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Handle end stream notice
    socket.on('live:ended', () => {
      toast.error('The stream has ended');
      navigate('/live');
    });

    return () => {
      socket.emit('live:leave', id);
      socket.off('live:viewer_count');
      socket.off('live:chat');
      socket.off('live:ended');
    };
  }, [socket, id, stream, navigate]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    socket.emit('live:chat', {
      streamId: id,
      message: inputText.trim(),
      userId: user?._id,
      username: user?.username || user?.displayName,
      avatar: user?.avatar
    });
    setInputText('');
  };

  if (isLoading || !stream) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  // Determine playback URL: prefer HLS, fallback to HTTP-FLV
  const hlsPlaybackUrl = stream.hlsUrl || `/live/${stream.streamKey}/index.m3u8`;
  const flvPlaybackUrl = stream.flvUrl || `/live/${stream.streamKey}.flv`;
  // Use HLS as primary, FLV as fallback
  const streamPlaybackUrl = stream.status === 'live' ? hlsPlaybackUrl : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* Video section */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-border">
          {stream.status === 'live' ? (
            <CustomVideoPlayer
              src={streamPlaybackUrl}
              flvSrc={flvPlaybackUrl}
              poster={stream.thumbnailUrl}
              isLive
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#09090b] px-6 text-center">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-sm font-semibold text-zinc-400">
                {user?._id === stream.userId?._id
                  ? "Offline - Ready for your broadcast"
                  : "Waiting for streamer to go live..."}
              </p>
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                {user?._id === stream.userId?._id
                  ? "Configure OBS Studio with the RTMP Server URL and Stream Key below, then click 'Start Streaming' in OBS to begin."
                  : "The broadcast will appear here automatically once the streamer starts broadcasting."}
              </p>
            </div>
          )}
          {/* Overlay Live Badge */}
          {stream.status === 'live' && (
            <span className="absolute top-4 left-4 z-20 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Live
            </span>
          )}
        </div>

        {/* Info panel */}
        <div className="bg-[#1616194d] border border-[#27272aa6] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-base font-bold text-white">{stream.title}</h1>
              <p className="text-xs text-zinc-400 mt-1">Streamer: @{stream.userId?.username}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-red-950/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
                <Users className="w-4 h-4" />
                {viewerCount} Viewers
              </div>
              
              {(user?._id === stream.userId?._id || user?.role === 'admin') && stream.status !== 'ended' && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to end this live stream?')) {
                      endMutation.mutate();
                    }
                  }}
                  disabled={endMutation.isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {endMutation.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  End Stream
                </button>
              )}
            </div>
          </div>
          
          {user?._id === stream.userId?._id && stream.status !== 'ended' && (
            <div className="mt-2 p-3 bg-zinc-950/50 border border-[#27272a66] rounded-xl flex flex-col gap-2">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Broadcast Credentials</p>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between gap-2 bg-black/40 p-2 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-500 font-mono">RTMP Server:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-mono select-all">rtmp://localhost:1935/live</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('rtmp://localhost:1935/live');
                        toast.success('RTMP Server URL copied!');
                      }}
                      className="text-zinc-500 hover:text-white transition-colors text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 bg-black/40 p-2 rounded-lg border border-zinc-800/40">
                  <span className="text-zinc-500 font-mono">Stream Key:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-mono select-all">{stream.streamKey}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(stream.streamKey);
                        toast.success('Stream Key copied!');
                      }}
                      className="text-zinc-500 hover:text-white transition-colors text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-400 leading-relaxed mt-2 border-t border-[#27272a66] pt-3">
            {stream.description || 'Welcome to the live stream!'}
          </p>
        </div>
      </div>

      {/* Side chat box */}
      <div className="w-full lg:w-96 flex flex-col bg-[#16161966] border border-border rounded-2xl overflow-hidden h-[75vh] lg:h-[70vh]">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest p-4 border-b border-[#27272a66] bg-surface-light/25 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-500" />
          Live Chat Room
        </h2>

        {/* Message logs */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col gap-0.5 text-xs">
              <span className="font-bold text-slate-100">{msg.username}</span>
              <span className="text-slate-300 leading-relaxed bg-[#09090b66] border border-[#27272a33] rounded-xl p-2.5 w-fit mt-1">{msg.message}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#27272aa6] bg-[#09090b59] flex gap-2">
          <input
            type="text"
            placeholder="Send a live chat message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 h-10 bg-surface border border-border rounded-xl px-4 text-xs outline-none text-white focus:border-red-500"
          />
          <button
            type="submit"
            className="h-10 px-4 bg-red-600 hover:bg-red-500 rounded-xl flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveRoom;
