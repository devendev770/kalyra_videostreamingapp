import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { spatialAPI, dreamscapeAPI } from '../api';
import { useSocket } from '../contexts/SocketContext';
import SpatialMap from '../components/spatial/SpatialMap';
import DreamscapeCanvas from '../components/spatial/DreamscapeCanvas';
import CustomVideoPlayer from '../components/video/CustomVideoPlayer';
import {
  Send, Users, LogOut, Loader2, Map, Palette,
  Copy, Globe, Lock, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const SpatialRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useSelector((state) => state.auth);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [room, setRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('map');        // map | canvas
  const [canvasData, setCanvasData] = useState(null);
  const [inkBalance, setInkBalance] = useState(100);

  const chatEndRef = useRef(null);

  // Fetch room details
  const { data: roomData, isLoading, error } = useQuery({
    queryKey: ['spatial-room', roomCode],
    queryFn: () => spatialAPI.join(roomCode),
  });

  useEffect(() => {
    if (roomData?.data?.room) {
      const r = roomData.data.room;
      setRoom(r);
      setParticipants(
        r.participants.map((p) => ({
          userId: p.userId?._id || p.userId,
          displayName: p.userId?.displayName || p.userId?.username || 'User',
          avatar: p.userId?.avatar,
          username: p.userId?.username,
          x: p.x,
          y: p.y,
          color: p.color,
          role: p.role,
        }))
      );
    }
  }, [roomData]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to join spatial room');
      navigate('/spatial');
    }
  }, [error, navigate]);

  // Fetch canvas data
  useEffect(() => {
    if (!room?._id) return;
    dreamscapeAPI.getCanvas(room._id).then((res) => {
      setCanvasData(res.data.canvas);
    }).catch(() => {});

    dreamscapeAPI.getInk(room._id).then((res) => {
      setInkBalance(res.data.ink);
    }).catch(() => {});
  }, [room?._id]);

  // Socket events
  useEffect(() => {
    if (!socket || !room) return;

    socket.emit('spatial:join', {
      roomCode,
      userId: user?._id,
      displayName: user?.displayName,
      avatar: user?.avatar,
      color: participants.find((p) => p.userId === user?._id)?.color || '#c9a048',
    });

    socket.on('spatial:user_joined', ({ userId, displayName, avatar, color }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === userId)) return prev;
        return [...prev, { userId, displayName, avatar, color, x: 0.5 + Math.random() * 0.2, y: 0.5 + Math.random() * 0.2, role: 'viewer' }];
      });
      toast(`${displayName || 'Someone'} joined the space`, { icon: '✨', duration: 2000 });
    });

    socket.on('spatial:user_left', ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });

    socket.on('spatial:move', ({ userId, x, y }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, x, y } : p))
      );
    });

    socket.on('spatial:chat', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('spatial:ended', () => {
      toast.error('The host has closed this space');
      navigate('/spatial');
    });

    return () => {
      socket.emit('spatial:leave', { roomCode, userId: user?._id });
      socket.off('spatial:user_joined');
      socket.off('spatial:user_left');
      socket.off('spatial:move');
      socket.off('spatial:chat');
      socket.off('spatial:ended');
    };
  }, [socket, room, roomCode, user, navigate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    socket.emit('spatial:chat', {
      roomCode,
      message: inputText.trim(),
      userId: user?._id,
      username: user?.displayName || user?.username,
      avatar: user?.avatar,
    });
    setInputText('');
  };

  const handleLeave = async () => {
    try {
      await spatialAPI.leave(roomCode);
      toast.success('Left the space');
      navigate('/spatial');
    } catch {
      navigate('/spatial');
    }
  };

  const handleEndRoom = async () => {
    if (!window.confirm('End this space for everyone?')) return;
    try {
      await spatialAPI.end(roomCode);
      toast.success('Space ended');
      navigate('/spatial');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to end space');
    }
  };

  if (isLoading || !room) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isHost = room.hostId?._id === user?._id || room.hostId === user?._id;
  const video = room.videoId;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1616194d] border border-[#27272a8c] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{room.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                {room.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {room.isPublic ? 'Public' : 'Private'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participants.length} in space
              </span>
              <span>•</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCode);
                  toast.success('Room code copied!');
                }}
                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {roomCode}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={handleEndRoom}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 transition-all"
            >
              End Space
            </button>
          )}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 bg-surface-hover hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Video + Interactive Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Video Player (if a video is linked) */}
          {video && (
            <CustomVideoPlayer
              src={video.hlsUrl || video.originalUrl}
              poster={video.thumbnailUrl}
            />
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#1616194d] border border-border rounded-xl p-1">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'map'
                  ? 'bg-primary text-black shadow-lg shadow-primary/20'
                  : 'text-zinc-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Spatial Map
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'canvas'
                  ? 'bg-primary text-black shadow-lg shadow-primary/20'
                  : 'text-zinc-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Dreamscape Canvas
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'map' ? (
            <SpatialMap
              participants={participants}
              currentUserId={user?._id}
              isHost={isHost}
              roomCode={roomCode}
              proximityRadius={room.proximityRadius || 0.15}
              socket={socket}
            />
          ) : (
            <DreamscapeCanvas
              roomId={room._id}
              socket={socket}
              currentUserId={user?._id}
              assets={canvasData?.assets || []}
              drawings={canvasData?.drawings || []}
              inkRemaining={inkBalance}
              isLocked={canvasData?.status === 'locked'}
              onAssetClick={(asset) => {
                if (asset.timestamp > 0) {
                  const video = document.querySelector('video');
                  if (video) video.currentTime = asset.timestamp;
                }
              }}
              onInkUpdate={setInkBalance}
            />
          )}
        </div>

        {/* Right Column: Chat */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Participants */}
          <div className="bg-[#1616194d] border border-border rounded-2xl p-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5 mb-3 pb-2 border-b border-[#27272a66]">
              <Users className="w-4 h-4 text-accent" />
              In This Space ({participants.length})
            </h2>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#09090ba6] border border-border rounded-lg text-[10px] font-semibold text-slate-300"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#c9a048' }}
                  />
                  <span className="truncate max-w-[80px]">{p.displayName}</span>
                  {p.role === 'host' && (
                    <span className="text-[8px] font-bold text-accent uppercase ml-0.5">👑</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col bg-[#16161966] border border-border rounded-2xl overflow-hidden min-h-[300px] lg:min-h-0 lg:h-[55vh]">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest p-4 border-b border-[#27272a66] bg-surface-light/25 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Spatial Chat
            </h2>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-8">
                  Walk closer to someone to chat privately, or use the megaphone to broadcast to everyone.
                </p>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold text-accent">{msg.username}</span>
                  <span className="text-slate-300 leading-relaxed bg-[#09090b66] border border-[#27272a33] rounded-xl p-2.5 w-fit mt-1">
                    {msg.message}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#27272aa6] bg-[#09090b59] flex gap-2">
              <input
                type="text"
                placeholder="Chat in this space..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 h-10 bg-surface border border-border rounded-xl px-4 text-xs outline-none text-white focus:border-primary transition-colors"
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
    </div>
  );
};

export default SpatialRoom;
