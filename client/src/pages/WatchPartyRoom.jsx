import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchPartyAPI } from '../api';
import { useSocket } from '../contexts/SocketContext';
import CustomVideoPlayer from '../components/video/CustomVideoPlayer';
import { Send, Users, LogOut, Loader2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const WatchPartyRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useSelector((state) => state.auth);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [party, setParty] = useState(null);

  const playerRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Fetch party details
  const { isLoading, error } = useQuery({
    queryKey: ['watchparty-room', roomCode],
    queryFn: () => watchPartyAPI.join(roomCode),
    onSuccess: (res) => {
      setParty(res.data.party);
      setParticipants(res.data.party.participants || []);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to join room');
      navigate('/watch-party');
    },
  });

  const queryClient = useQueryClient();

  // Socket sync and chat events
  useEffect(() => {
    if (!socket || !party) return;

    // Join room
    socket.emit('watchparty:join', { roomCode, userId: user?._id });

    // Handle participants updates
    socket.on('watchparty:user_joined', () => {
      queryClient.invalidateQueries(['watchparty-room', roomCode]);
    });

    socket.on('watchparty:user_left', () => {
      queryClient.invalidateQueries(['watchparty-room', roomCode]);
    });

    // Handle live messages
    socket.on('watchparty:chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Handle sync controls (play/pause/seek)
    socket.on('watchparty:sync', ({ currentTime, isPlaying }) => {
      const video = document.querySelector('video');
      if (!video) return;

      isSyncingRef.current = true;
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      if (Math.abs(video.currentTime - currentTime) > 2) {
        video.currentTime = currentTime;
      }
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 1000);
    });

    // Handle ending party
    socket.on('watchparty:ended', () => {
      toast.error('Watch party room has been ended by the host');
      navigate('/watch-party');
    });

    return () => {
      socket.emit('watchparty:leave', { roomCode, userId: user?._id });
      socket.off('watchparty:user_joined');
      socket.off('watchparty:user_left');
      socket.off('watchparty:chat');
      socket.off('watchparty:sync');
      socket.off('watchparty:ended');
    };
  }, [socket, roomCode, party, user, navigate, queryClient]);

  // Sync actions (Host only or all depending on rules)
  const handleProgress = (currentTime) => {
    if (!socket || isSyncingRef.current) return;
    const video = document.querySelector('video');
    if (!video) return;

    const isPlaying = !video.paused;
    // Broadcast progress sync to other members
    socket.emit('watchparty:sync', { roomCode, currentTime, isPlaying });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    
    socket.emit('watchparty:chat', {
      roomCode,
      message: inputText.trim(),
      userId: user?._id,
      username: user?.username || user?.displayName,
      avatar: user?.avatar
    });
    setInputText('');
  };

  const handleLeave = async () => {
    try {
      await watchPartyAPI.leave(roomCode);
      toast.success('Left watch party');
      navigate('/watch-party');
    } catch {
      navigate('/watch-party');
    }
  };

  if (isLoading || !party) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isHost = party.hostId?._id === user?._id;

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* Playback Container */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Video Frame */}
        <CustomVideoPlayer
          src={party.videoId?.hlsUrl || party.videoId?.originalUrl}
          poster={party.videoId?.thumbnailUrl}
          onProgress={handleProgress}
        />

        {/* Title Bar */}
        <div className="flex justify-between items-center bg-[#1616194d] border border-[#27272a8c] rounded-2xl p-4">
          <div>
            <h1 className="text-sm font-bold text-white">{party.title}</h1>
            <p className="text-[11px] text-zinc-400 mt-1">Playing: {party.videoId?.title}</p>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-950/20 hover:bg-red-950/40 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Leave Room
          </button>
        </div>
      </div>

      {/* Side Interactive Workspace: Chat & Participants */}
      <div className="w-full lg:w-96 flex flex-col gap-4 h-[75vh] lg:h-auto">
        {/* Participants list */}
        <div className="bg-[#1616194d] border border-border rounded-2xl p-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 mb-3 pb-2 border-b border-[#27272a66]">
            <Users className="w-4 h-4 text-accent" />
            Participants ({participants.length})
          </h2>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {participants.map((p) => (
              <div
                key={p.userId?._id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#09090ba6] border border-border rounded-lg text-[10px] font-semibold text-slate-300"
              >
                <div className="w-3.5 h-3.5 rounded bg-primary-dark/30 flex items-center justify-center font-bold text-accent text-[8px]">
                  {p.userId?.displayName?.charAt(0)}
                </div>
                <span>{p.userId?.displayName || p.userId?.username}</span>
                {p.role === 'host' && <span className="text-[8px] font-bold text-accent uppercase ml-1">Host</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Chat box */}
        <div className="flex-1 flex flex-col bg-[#16161966] border border-border rounded-2xl overflow-hidden">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest p-4 border-b border-[#27272a66] bg-[#16161933]">
            Live Room Chat
          </h2>
          
          {/* Message stream */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[300px]">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 text-xs">
                <span className="font-bold text-accent">{msg.username}</span>
                <span className="text-slate-300 leading-relaxed bg-[#09090b66] border border-[#27272a33] rounded-xl p-2.5 w-fit mt-1">{msg.message}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#27272aa6] bg-[#09090b59] flex gap-2">
            <input
              type="text"
              placeholder="Chat with the party..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-10 bg-surface border border-border rounded-xl px-4 text-xs outline-none text-white focus:border-primary"
            />
            <button
              type="submit"
              className="h-10 px-4 bg-primary hover:bg-primary-hover rounded-xl flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WatchPartyRoom;
