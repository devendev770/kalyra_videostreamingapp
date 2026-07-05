import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { updateUploadProgress } from '../store/uiSlice';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const socketUrl = window.location.origin;

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('📡 Real-time Socket connected successfully');
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('📡 Socket connection error:', error.message);
    });

    // Handle global upload/processing events
    socketInstance.on('video:processing', (data) => {
      dispatch(updateUploadProgress(data));
    });

    socketInstance.on('video:ready', ({ videoId }) => {
      toast.success('Your video has been processed successfully and is ready to view!', {
        duration: 5000,
        style: {
          background: 'var(--color-surface-light)',
          color: '#f1f1f1',
          border: '1px solid var(--color-border)',
        },
      });
    });

    socketInstance.on('video:error', ({ videoId, error }) => {
      toast.error(`Video processing failed: ${error}`, {
        duration: 6000,
        style: {
          background: 'var(--color-surface-light)',
          color: '#f1f1f1',
          border: '1px solid #ef4444',
        },
      });
    });

    // Handle incoming notification
    socketInstance.on('notification:new', (notification) => {
      toast((t) => (
        <div className="flex flex-col gap-1 cursor-pointer" onClick={() => {
          toast.dismiss(t.id);
          if (notification.actionUrl) window.location.href = notification.actionUrl;
        }}>
          <span className="font-semibold text-sm text-accent">{notification.title}</span>
          <span className="text-xs text-slate-300">{notification.message}</span>
        </div>
      ), {
        duration: 4000,
        position: 'top-right',
        style: {
          background: 'var(--color-surface-light)',
          color: '#f1f1f1',
          border: '1px solid #6366f1',
          borderRadius: '8px',
        },
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
