import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import flvjs from 'flv.js';
import ReactPlayer from 'react-player';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, SkipForward, RotateCcw, MonitorPlay
} from 'lucide-react';

const isYouTubeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    try {
      const urlObj = new URL(apiUrl);
      return `${urlObj.origin}${url}`;
    } catch(e) {}
  }
  return url;
};

const CustomVideoPlayer = ({ src: rawSrc, flvSrc: rawFlvSrc, poster: rawPoster, onProgress, isLive }) => {
  const src = resolveMediaUrl(rawSrc);
  const flvSrc = resolveMediaUrl(rawFlvSrc);
  const poster = resolveMediaUrl(rawPoster);

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const controlsTimeoutRef = useRef(null);
  const hlsRef = useRef(null);
  const flvPlayerRef = useRef(null);

  // Cleanup FLV player
  const destroyFlvPlayer = () => {
    if (flvPlayerRef.current) {
      flvPlayerRef.current.pause();
      flvPlayerRef.current.unload();
      flvPlayerRef.current.detachMediaElement();
      flvPlayerRef.current.destroy();
      flvPlayerRef.current = null;
    }
  };

  // Initialize HLS / FLV / HTML5 Source
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!src) {
      video.src = '';
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      destroyFlvPlayer();
      return;
    }

    // YouTube URLs are handled by ReactPlayer, not the native video element
    if (isYouTubeUrl(src)) return;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      // Clean up previous instances
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      destroyFlvPlayer();

      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      // If HLS fails and we have an FLV fallback, try that
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && flvSrc && flvjs.isSupported()) {
          console.warn('HLS failed, falling back to HTTP-FLV');
          hls.destroy();
          hlsRef.current = null;

          const flvPlayer = flvjs.createPlayer({
            type: 'flv',
            url: flvSrc,
            isLive: true,
          }, {
            enableStashBuffer: false,
            stashInitialSize: 128,
          });
          flvPlayer.attachMediaElement(video);
          flvPlayer.load();
          flvPlayer.play();
          flvPlayerRef.current = flvPlayer;
        }
      });
    } else if (src.endsWith('.flv') && flvjs.isSupported()) {
      // Direct FLV playback
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      destroyFlvPlayer();

      const flvPlayer = flvjs.createPlayer({
        type: 'flv',
        url: src,
        isLive: true,
      }, {
        enableStashBuffer: false,
        stashInitialSize: 128,
      });
      flvPlayer.attachMediaElement(video);
      flvPlayer.load();
      flvPlayer.play();
      flvPlayerRef.current = flvPlayer;
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      destroyFlvPlayer();
    };
  }, [src, flvSrc]);

  // Handle Controls visibility timeout
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Player controls
  const togglePlay = () => {
    if (isYouTubeUrl(src)) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (onProgress) {
      onProgress(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
      else if (containerRef.current.webkitRequestFullscreen) containerRef.current.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (isYouTubeUrl(src)) {
      if (playerRef.current) {
        playerRef.current.seekTo(val, 'seconds');
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const changeQuality = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
    }
    setShowQualityMenu(false);
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="video-player-container group aspect-video relative overflow-hidden bg-black border border-border rounded-2xl cursor-pointer"
      onClick={isYouTubeUrl(src) ? undefined : togglePlay}
    >
      {isYouTubeUrl(src) ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          {getYouTubeId(src) ? (
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(src)}?autoplay=0&modestbranding=1&rel=0&origin=${window.location.origin}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              Invalid YouTube URL
            </div>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-contain"
          playsInline
        />
      )}

      {!src && (
        <div className="absolute inset-0 bg-[#09090b] flex flex-col items-center justify-center gap-3 text-center p-6 z-20 cursor-default" onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MonitorPlay className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-white font-bold text-sm tracking-wide">Video Stream Unavailable</h3>
          <p className="text-zinc-500 text-[11px] max-w-xs leading-relaxed">
            The media stream for this video is currently offline, still processing, or unavailable.
          </p>
        </div>
      )}

      {/* Overlay controls */}
      {!isYouTubeUrl(src) && (
        <div
          className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 px-4 pb-3 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Progress bar */}
        <div className="flex items-center gap-3 w-full mb-3 group/progress">
          <span className="text-[11px] font-bold text-white font-mono">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/20 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
          />
          <span className="text-[11px] font-bold text-zinc-400 font-mono">{formatTime(duration)}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-accent transition-colors p-1">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => {
                if (isYouTubeUrl(src)) {
                  if (playerRef.current) {
                    playerRef.current.seekTo(currentTime + 10, 'seconds');
                  }
                } else if (videoRef.current) {
                  videoRef.current.currentTime += 10;
                }
              }}
              className="text-white hover:text-accent transition-colors p-1"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume controls */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-accent transition-colors p-1">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-16 h-1 rounded bg-white/25 appearance-none cursor-pointer accent-primary transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="text-xs font-bold text-white hover:text-accent transition-all px-2 py-1 bg-white/10 rounded-lg"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-surface-light border border-border rounded-xl py-1.5 w-20 shadow-2xl flex flex-col gap-0.5">
                  {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`text-[11px] font-bold py-1 px-3 text-left w-full hover:bg-primary hover:text-white ${
                        playbackSpeed === s ? 'text-accent' : 'text-zinc-400'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* HLS Resolution Selector */}
            {levels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className="text-xs font-bold text-white hover:text-accent transition-all px-2 py-1 bg-white/10 rounded-lg flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {currentLevel === -1 ? 'Auto' : `${levels[currentLevel]?.height}p`}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-9 right-0 bg-surface-light border border-border rounded-xl py-1.5 w-24 shadow-2xl flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    <button
                      onClick={() => changeQuality(-1)}
                      className={`text-[11px] font-bold py-1 px-3 text-left w-full hover:bg-primary hover:text-white ${
                        currentLevel === -1 ? 'text-accent' : 'text-zinc-400'
                      }`}
                    >
                      Auto
                    </button>
                    {levels.map((lvl, idx) => (
                      <button
                        key={idx}
                        onClick={() => changeQuality(idx)}
                        className={`text-[11px] font-bold py-1 px-3 text-left w-full hover:bg-primary hover:text-white ${
                          currentLevel === idx ? 'text-accent' : 'text-zinc-400'
                        }`}
                      >
                        {lvl.height}p
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PIP Mode */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                  } else {
                    await videoRef.current.requestPictureInPicture();
                  }
                }
              }}
              className="text-white hover:text-accent transition-colors p-1"
            >
              <MonitorPlay className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-accent transition-colors p-1">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;
