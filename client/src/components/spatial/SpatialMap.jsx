import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Megaphone, Crosshair, Sparkles } from 'lucide-react';

/**
 * SpatialMap - A 2D radar-style proximity map
 * Renders draggable user dots with proximity-based visual connections.
 * The host glows at the center. Users drag their dot to "walk" around.
 */
const SpatialMap = ({
  participants = [],       // [{userId, displayName, avatar, x, y, color, role}]
  currentUserId,
  isHost,
  roomCode,
  proximityRadius = 0.15,
  socket,
  onMegaphone,
  onSpotlight,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [myPos, setMyPos] = useState({ x: 0.5, y: 0.5 });
  const [reactions, setReactions] = useState([]);      // Temporary emoji bursts
  const [megaphoneActive, setMegaphoneActive] = useState(false);
  const [spotlightUserId, setSpotlightUserId] = useState(null);
  const animFrameRef = useRef(null);
  const particleRef = useRef([]);

  // Find my participant data
  const myParticipant = participants.find((p) => p.userId === currentUserId);

  // Initialize my position from participant data
  useEffect(() => {
    if (myParticipant) {
      setMyPos({ x: myParticipant.x, y: myParticipant.y });
    }
  }, [myParticipant?.userId]);

  // Listen for spatial events
  useEffect(() => {
    if (!socket) return;

    socket.on('spatial:megaphone', ({ userId, active }) => {
      setMegaphoneActive(active);
    });

    socket.on('spatial:spotlight', ({ targetUserId }) => {
      setSpotlightUserId(targetUserId);
      setTimeout(() => setSpotlightUserId(null), 3000);
    });

    socket.on('spatial:reaction', ({ emoji, userId, x, y }) => {
      const id = `${Date.now()}_${userId}`;
      setReactions((prev) => [...prev, { id, emoji, x, y }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    });

    return () => {
      socket.off('spatial:megaphone');
      socket.off('spatial:spotlight');
      socket.off('spatial:reaction');
    };
  }, [socket]);

  // Calculate distance between two points (normalized 0-1 space)
  const getDistance = (a, b) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  };

  // Proximity strength (inverse square law, clamped 0-1)
  const getProximityStrength = (distance) => {
    if (distance <= 0.01) return 1;
    if (distance >= proximityRadius) return 0;
    const normalized = distance / proximityRadius;
    return Math.max(0, 1 - normalized * normalized);
  };

  // Handle drag
  const handlePointerDown = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const dist = getDistance({ x, y }, myPos);
    if (dist < 0.04) {
      setDragging(true);
    }
  }, [myPos]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0.03, Math.min(0.97, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.03, Math.min(0.97, (e.clientY - rect.top) / rect.height));
    setMyPos({ x, y });

    // Throttle socket emissions
    if (socket && roomCode) {
      socket.emit('spatial:move', { roomCode, userId: currentUserId, x, y });
    }
  }, [dragging, socket, roomCode, currentUserId]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Draw the entire canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
      bgGrad.addColorStop(0, 'rgba(22, 22, 25, 0.95)');
      bgGrad.addColorStop(0.5, 'rgba(9, 9, 11, 0.98)');
      bgGrad.addColorStop(1, 'rgba(9, 9, 11, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.3)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo((W / 10) * i, 0);
        ctx.lineTo((W / 10) * i, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (H / 10) * i);
        ctx.lineTo(W, (H / 10) * i);
        ctx.stroke();
      }

      // Draw radar rings from center
      const centerX = W / 2;
      const centerY = H / 2;
      for (let r = 1; r <= 4; r++) {
        const radius = (W * 0.1) * r;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 160, 72, ${0.06 / r})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw proximity connections (lines between nearby users)
      const allPositions = participants.map((p) => ({
        ...p,
        px: (p.userId === currentUserId ? myPos.x : p.x) * W,
        py: (p.userId === currentUserId ? myPos.y : p.y) * H,
        nx: p.userId === currentUserId ? myPos.x : p.x,
        ny: p.userId === currentUserId ? myPos.y : p.y,
      }));

      // Draw connection lines
      for (let i = 0; i < allPositions.length; i++) {
        for (let j = i + 1; j < allPositions.length; j++) {
          const dist = getDistance(
            { x: allPositions[i].nx, y: allPositions[i].ny },
            { x: allPositions[j].nx, y: allPositions[j].ny }
          );
          const strength = getProximityStrength(dist);
          if (strength > 0) {
            ctx.beginPath();
            ctx.moveTo(allPositions[i].px, allPositions[i].py);
            ctx.lineTo(allPositions[j].px, allPositions[j].py);
            ctx.strokeStyle = `rgba(201, 160, 72, ${strength * 0.4})`;
            ctx.lineWidth = strength * 3;
            ctx.stroke();
          }
        }
      }

      // Draw each user dot
      for (const p of allPositions) {
        const isMe = p.userId === currentUserId;
        const isHostDot = p.role === 'host';
        const dotRadius = isHostDot ? 14 : isMe ? 12 : 9;
        const color = p.color || '#c9a048';

        // Glow effect
        const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, dotRadius * 3);
        glow.addColorStop(0, `${color}33`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(p.px - dotRadius * 3, p.py - dotRadius * 3, dotRadius * 6, dotRadius * 6);

        // Spotlight effect
        if (p.userId === spotlightUserId) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, dotRadius + 12 + Math.sin(Date.now() / 200) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#e8c86e';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Main dot
        ctx.beginPath();
        ctx.arc(p.px, p.py, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isMe ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = isMe ? 2.5 : 1;
        ctx.stroke();

        // Host crown indicator
        if (isHostDot) {
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👑', p.px, p.py - dotRadius - 6);
        }

        // Name label
        ctx.font = `${isMe ? 'bold ' : ''}10px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isMe ? '#f4f4f5' : '#a1a1aa';
        ctx.fillText(
          p.displayName || p.username || 'User',
          p.px,
          p.py + dotRadius + 14
        );

        // Proximity circle around current user
        if (isMe) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, proximityRadius * W, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(201, 160, 72, 0.12)';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw emoji reactions
      for (const r of reactions) {
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.emoji, r.x * W, r.y * H);
      }

      // Megaphone visual indicator
      if (megaphoneActive) {
        const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, W * 0.45 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232, 200, 110, ${0.15 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [participants, myPos, reactions, megaphoneActive, spotlightUserId, proximityRadius, currentUserId]);

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

  // Send reaction
  const sendReaction = (emoji) => {
    if (socket && roomCode) {
      socket.emit('spatial:reaction', {
        roomCode, emoji, userId: currentUserId,
        x: myPos.x, y: myPos.y,
      });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-[#09090b]">
      {/* Map Canvas */}
      <div
        ref={containerRef}
        className="w-full aspect-video cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        {/* Emoji reactions */}
        {['🔥', '❤️', '😂', '👏', '💀'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="w-9 h-9 rounded-xl bg-[#16161980] border border-[#27272a80] hover:bg-surface-hover 
                       text-base flex items-center justify-center transition-all active:scale-90 hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            onPointerDown={() => {
              setMegaphoneActive(true);
              onMegaphone?.(true);
              if (socket) socket.emit('spatial:megaphone', { roomCode, userId: currentUserId, active: true });
            }}
            onPointerUp={() => {
              setMegaphoneActive(false);
              onMegaphone?.(false);
              if (socket) socket.emit('spatial:megaphone', { roomCode, userId: currentUserId, active: false });
            }}
            onPointerLeave={() => {
              if (megaphoneActive) {
                setMegaphoneActive(false);
                onMegaphone?.(false);
                if (socket) socket.emit('spatial:megaphone', { roomCode, userId: currentUserId, active: false });
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95
              ${megaphoneActive
                ? 'bg-accent text-black shadow-lg shadow-accent/30'
                : 'bg-surface-light/80 border border-border text-zinc-400 hover:text-white'
              }`}
          >
            <Megaphone className="w-4 h-4" />
            {megaphoneActive ? 'Broadcasting...' : 'Hold to Broadcast'}
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 flex items-center gap-3 text-[10px] font-semibold text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#c9a048]" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-zinc-500" /> Others
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full border border-dashed border-[#c9a04866]" /> Audio Zone
        </span>
      </div>
    </div>
  );
};

export default SpatialMap;
