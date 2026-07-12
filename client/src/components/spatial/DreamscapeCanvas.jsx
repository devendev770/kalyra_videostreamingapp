import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Type, Smile, Eraser, MousePointer, Droplet } from 'lucide-react';

/**
 * DreamscapeCanvas - Collaborative persistent whiteboard
 * Assets placed here are timestamped and become interactive VOD navigation points.
 */
const DreamscapeCanvas = ({
  roomId,
  socket,
  currentUserId,
  assets: initialAssets = [],
  drawings: initialDrawings = [],
  inkRemaining = 100,
  isLocked = false,
  onAssetClick,            // (asset) => seek to asset.timestamp
  onInkUpdate,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tool, setTool] = useState('pointer');    // pointer | draw | text | emoji | eraser
  const [assets, setAssets] = useState(initialAssets);
  const [drawings, setDrawings] = useState(initialDrawings);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [drawColor, setDrawColor] = useState('#c9a048');
  const [ink, setInk] = useState(inkRemaining);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const animRef = useRef(null);

  const EMOJIS = ['⭐', '🔥', '💡', '❤️', '😂', '🎵', '🎮', '📌', '💎', '🌀'];
  const COLORS = ['#c9a048', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#ffffff'];

  // Sync with initial data
  useEffect(() => { setAssets(initialAssets); }, [initialAssets]);
  useEffect(() => { setDrawings(initialDrawings); }, [initialDrawings]);
  useEffect(() => { setInk(inkRemaining); }, [inkRemaining]);

  // Socket listeners for real-time sync
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('canvas:join', roomId);

    socket.on('canvas:add_asset', (asset) => {
      setAssets((prev) => [...prev, asset]);
    });

    socket.on('canvas:move_asset', ({ assetId, x, y }) => {
      setAssets((prev) => prev.map((a) =>
        a.assetId === assetId ? { ...a, x, y } : a
      ));
    });

    socket.on('canvas:draw', (path) => {
      setDrawings((prev) => [...prev, path]);
    });

    socket.on('canvas:draw_progress', ({ pathId, point }) => {
      setDrawings((prev) => {
        const existing = prev.find((d) => d.pathId === pathId);
        if (existing) {
          return prev.map((d) =>
            d.pathId === pathId
              ? { ...d, points: [...d.points, point] }
              : d
          );
        }
        return [...prev, { pathId, points: [point], color: '#c9a048', strokeWidth: 2 }];
      });
    });

    return () => {
      socket.emit('canvas:leave', roomId);
      socket.off('canvas:add_asset');
      socket.off('canvas:move_asset');
      socket.off('canvas:draw');
      socket.off('canvas:draw_progress');
    };
  }, [socket, roomId]);

  // Handle canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = 'rgba(9, 9, 11, 0.98)';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid
      ctx.fillStyle = 'rgba(39, 39, 42, 0.25)';
      const gridSize = 30;
      for (let x = 0; x < W; x += gridSize) {
        for (let y = 0; y < H; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw saved drawing paths
      for (const path of drawings) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x * W, path.points[0].y * H);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x * W, path.points[i].y * H);
        }
        ctx.strokeStyle = path.color || '#c9a048';
        ctx.lineWidth = path.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Draw current path being drawn
      if (currentPath && currentPath.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPath.points[0].x * W, currentPath.points[0].y * H);
        for (let i = 1; i < currentPath.points.length; i++) {
          ctx.lineTo(currentPath.points[i].x * W, currentPath.points[i].y * H);
        }
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Draw assets
      for (const asset of assets) {
        const ax = asset.x * W;
        const ay = asset.y * H;
        const isHovered = hoveredAsset === asset.assetId;

        if (asset.type === 'emoji' || asset.type === 'sticker' || asset.type === 'reaction') {
          ctx.font = `${isHovered ? 28 : 22}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(asset.content, ax, ay);
        } else if (asset.type === 'text') {
          const fontSize = asset.fontSize || 13;
          ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Background pill
          const metrics = ctx.measureText(asset.content);
          const padding = 8;
          const bgW = metrics.width + padding * 2;
          const bgH = fontSize + padding * 2;
          ctx.fillStyle = isHovered ? 'rgba(201, 160, 72, 0.2)' : 'rgba(22, 22, 25, 0.8)';
          ctx.beginPath();
          ctx.roundRect(ax - bgW / 2, ay - bgH / 2, bgW, bgH, 6);
          ctx.fill();
          ctx.strokeStyle = isHovered ? '#c9a048' : 'rgba(39, 39, 42, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = asset.color || '#e8c86e';
          ctx.fillText(asset.content, ax, ay);
        }

        // Timestamp indicator dot
        if (asset.timestamp > 0) {
          ctx.beginPath();
          ctx.arc(ax + 12, ay - 12, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [assets, drawings, currentPath, hoveredAsset, drawColor]);

  // Pointer handlers
  const getCanvasCoords = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (isLocked) return;
    const pos = getCanvasCoords(e);

    if (tool === 'draw' && ink > 0) {
      const pathId = `path_${Date.now()}_${currentUserId}`;
      setCurrentPath({ pathId, points: [pos], color: drawColor, strokeWidth: 2 });
      setIsDrawing(true);
    } else if (tool === 'pointer') {
      // Check if clicking an asset
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (const asset of assets) {
        const dist = Math.sqrt((pos.x - asset.x) ** 2 + (pos.y - asset.y) ** 2);
        if (dist < 0.03) {
          onAssetClick?.(asset);
          return;
        }
      }
    }
  }, [tool, ink, drawColor, currentUserId, assets, isLocked, getCanvasCoords, onAssetClick]);

  const handlePointerMove = useCallback((e) => {
    const pos = getCanvasCoords(e);

    if (isDrawing && currentPath) {
      setCurrentPath((prev) => ({
        ...prev,
        points: [...prev.points, pos],
      }));
      // Stream live drawing to others
      if (socket && roomId) {
        socket.emit('canvas:draw_progress', { roomId, pathId: currentPath.pathId, point: pos });
      }
    }

    // Hover detection
    let found = null;
    for (const asset of assets) {
      const dist = Math.sqrt((pos.x - asset.x) ** 2 + (pos.y - asset.y) ** 2);
      if (dist < 0.03) {
        found = asset.assetId;
        break;
      }
    }
    setHoveredAsset(found);
  }, [isDrawing, currentPath, socket, roomId, assets, getCanvasCoords]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing && currentPath && currentPath.points.length > 1) {
      setDrawings((prev) => [...prev, currentPath]);
      setInk((prev) => Math.max(0, prev - 3));
      onInkUpdate?.(Math.max(0, ink - 3));

      // Broadcast completed drawing
      if (socket && roomId) {
        socket.emit('canvas:draw', { roomId, path: currentPath });
      }
    }
    setIsDrawing(false);
    setCurrentPath(null);
  }, [isDrawing, currentPath, socket, roomId, ink, onInkUpdate]);

  // Place text asset
  const placeTextAsset = () => {
    if (isLocked || ink <= 0) return;
    const text = prompt('Enter text for the canvas:');
    if (!text || !text.trim()) return;

    const asset = {
      assetId: `asset_${Date.now()}_${currentUserId}`,
      type: 'text',
      content: text.trim(),
      x: 0.3 + Math.random() * 0.4,
      y: 0.3 + Math.random() * 0.4,
      color: drawColor,
      fontSize: 13,
      createdBy: currentUserId,
      timestamp: 0,
    };

    setAssets((prev) => [...prev, asset]);
    setInk((prev) => Math.max(0, prev - 5));
    onInkUpdate?.(Math.max(0, ink - 5));

    if (socket && roomId) {
      socket.emit('canvas:add_asset', { roomId, asset });
    }
  };

  // Place emoji asset
  const placeEmoji = (emoji) => {
    if (isLocked || ink <= 0) return;

    const asset = {
      assetId: `asset_${Date.now()}_${currentUserId}`,
      type: 'emoji',
      content: emoji,
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6,
      createdBy: currentUserId,
      timestamp: 0,
    };

    setAssets((prev) => [...prev, asset]);
    setInk((prev) => Math.max(0, prev - 2));
    onInkUpdate?.(Math.max(0, ink - 2));
    setShowEmojiPicker(false);

    if (socket && roomId) {
      socket.emit('canvas:add_asset', { roomId, asset });
    }
  };

  const toolClasses = (t) =>
    `w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
      tool === t
        ? 'bg-primary text-black shadow-lg shadow-primary/30'
        : 'bg-[#16161980] border border-[#27272a80] text-zinc-400 hover:text-white hover:bg-surface-hover'
    }`;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-[#09090b]">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`w-full aspect-[2/1] ${tool === 'draw' ? 'cursor-crosshair' : tool === 'pointer' ? 'cursor-default' : 'cursor-cell'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <p className="text-sm font-bold text-white">🎨 Canvas Locked</p>
            <p className="text-xs text-zinc-400 mt-1">This canvas is now a permanent mural. Click assets to jump to that moment in the video.</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {!isLocked && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#161619cc] backdrop-blur-md border border-[#27272a80] rounded-2xl px-3 py-2">
          <button onClick={() => setTool('pointer')} className={toolClasses('pointer')} title="Select">
            <MousePointer className="w-4 h-4" />
          </button>
          <button onClick={() => setTool('draw')} className={toolClasses('draw')} title="Draw">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => { setTool('text'); placeTextAsset(); }} className={toolClasses('text')} title="Add Text">
            <Type className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={toolClasses('emoji')}
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-surface-light border border-border rounded-xl p-2 grid grid-cols-5 gap-1 shadow-2xl z-30">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => placeEmoji(emoji)}
                    className="w-8 h-8 text-lg hover:bg-surface-hover rounded-lg flex items-center justify-center transition-all hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setDrawColor(c)}
                className={`w-5 h-5 rounded-full transition-all ${drawColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#161619] scale-125' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Ink meter */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
            <Droplet className="w-3.5 h-3.5 text-primary" />
            <span className={ink <= 10 ? 'text-red-400' : ''}>{ink}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamscapeCanvas;
