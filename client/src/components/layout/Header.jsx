import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, Search, Bell, Upload, User, LogOut, Settings, BarChart2, Shield, Play } from 'lucide-react';
import { toggleSidebar } from '../../store/uiSlice';
import { logoutUser } from '../../store/authSlice';
import { notificationAPI } from '../../api';
import { useQuery } from '@tanstack/react-query';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch notifications
  const { data: notificationData, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll({ limit: 5 }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    setShowProfileMenu(false);
    navigate('/auth/login');
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileMenu(false);
      setShowNotifications(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const notifications = notificationData?.data?.notifications || [];
  const unreadCount = notificationData?.data?.unreadCount || 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#09090be6] backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-40">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 hover:bg-[#2d2d3080] rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <img src="/kalyra-logo.png" alt="Kalyra" className="w-9 h-9 object-contain" />
          <span className="text-lg tracking-[0.25em] uppercase text-[#e8c547]" style={{ fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
            Kalyra
          </span>
        </Link>
      </div>

      {/* Search section */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4 hidden md:block">
        <div className="relative">
          <input
            type="text"
            placeholder="Search videos, channels, playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-surface-light/60 border border-border hover:border-zinc-600 focus:border-primary rounded-full pl-5 pr-12 text-sm text-zinc-100 outline-none transition-all duration-300"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary/20 text-zinc-400 hover:text-accent rounded-full transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-4">
        {isAuthenticated ? (
          <>
            {user && (
              <Link
                to="/studio"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Link>
            )}

            {/* Notifications */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="p-2 hover:bg-[#2d2d3080] rounded-xl text-zinc-400 hover:text-white transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-surface-light border border-border rounded-2xl shadow-2xl p-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-2">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button
                      onClick={() => notificationAPI.markAsRead().then(() => refetch())}
                      className="text-xs text-accent hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`p-2.5 rounded-xl flex gap-3 cursor-pointer hover:bg-[#2d2d30b3] transition-all ${
                            !notif.read ? 'bg-primary-dark/20 border-l-2 border-primary' : ''
                          }`}
                          onClick={() => {
                            if (notif.actionUrl) navigate(notif.actionUrl);
                            setShowNotifications(false);
                          }}
                        >
                          {notif.thumbnail ? (
                            <img src={notif.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary-dark/30 flex items-center justify-center flex-shrink-0 text-accent text-xs font-bold">
                              SV
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-100">{notif.title}</span>
                            <span className="text-[11px] text-zinc-400 line-clamp-2">{notif.message}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 text-center py-6">No notifications yet</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="w-9 h-9 rounded-xl border border-border overflow-hidden hover:border-primary transition-all"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-dark/30 flex items-center justify-center text-accent font-bold text-sm">
                    {user?.displayName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-surface-light border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-border bg-[#2d2d3033]">
                    <p className="font-semibold text-sm text-white truncate">{user?.displayName}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">@{user?.username}</p>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <Link
                      to={`/channel/${user?._id}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#2d2d30b3] rounded-xl transition-all"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      My Channel
                    </Link>
                    {user && (
                      <Link
                        to="/studio"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#2d2d30b3] rounded-xl transition-all"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <BarChart2 className="w-4 h-4" />
                        Creator Studio
                      </Link>
                    )}
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl transition-all"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#2d2d30b3] rounded-xl transition-all"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-350 hover:bg-[#2d2d3080] rounded-xl w-full text-left transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/auth/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/auth/register"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white gradient-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
