import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const VideoCard = ({ video }) => {
  const {
    _id,
    title,
    thumbnailUrl,
    duration,
    views,
    createdAt,
    userId: channel
  } = video;

  // Format duration (seconds to mm:ss or hh:mm:ss)
  const formatDuration = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formattedTime = createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : '';

  return (
    <div className="group flex flex-col bg-[#16161966] border border-[#27272a66] hover:border-primary/30 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 transition-all duration-300">
      {/* Thumbnail */}
      <Link to={`/watch/${_id}`} className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-light via-[#1c1c1f] to-primary/10 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-inner">
              <Play className="w-5 h-5 text-accent fill-accent/10" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">Kalyra Video</span>
          </div>
        )}
        
        {/* Overlay Play Icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-primary/30">
            <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider text-white border border-white/10">
          {formatDuration(duration || 0)}
        </span>
      </Link>

      {/* Content */}
      <div className="p-4 flex gap-3">
        {/* Avatar */}
        <Link to={`/channel/${channel?._id}`} className="flex-shrink-0">
          {channel?.avatar ? (
            <img
              src={channel.avatar}
              alt=""
              className="w-9 h-9 rounded-xl object-cover border border-border hover:border-primary transition-colors"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary-dark/25 border border-border flex items-center justify-center text-accent font-bold text-xs">
              {channel?.displayName?.charAt(0).toUpperCase() || 'S'}
            </div>
          )}
        </Link>

        {/* Video Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <Link
            to={`/watch/${_id}`}
            className="font-semibold text-sm text-white hover:text-accent line-clamp-2 leading-snug cursor-pointer transition-colors"
            title={title}
          >
            {title}
          </Link>

          <Link
            to={`/channel/${channel?._id}`}
            className="text-xs text-zinc-400 hover:text-white mt-1.5 flex items-center gap-1 font-medium transition-colors"
          >
            {channel?.displayName || channel?.username}
            <CheckCircle2 className="w-3 h-3 text-accent fill-primary/10" />
          </Link>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500 font-semibold">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views} views
            </span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
