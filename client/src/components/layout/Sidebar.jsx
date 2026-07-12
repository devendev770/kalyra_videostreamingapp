import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Home,
  Compass,
  Tv,
  History,
  Clock,
  ThumbsUp,
  FolderHeart,
  Users,
  Film,
  Radio,
  Share2,
  Bookmark,
  MessageSquareCode,
  Upload,
  Map
} from 'lucide-react';

const Sidebar = () => {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  const navigationItems = [
    { section: 'Discover', items: [
      { name: 'Home', path: '/', icon: Home },
      { name: 'Trending', path: '/trending', icon: Compass },
      { name: 'Subscriptions', path: '/subscriptions', icon: Tv },
      { name: 'Vibes', path: '/vibes', icon: Film },
      { name: 'Live Streams', path: '/live', icon: Radio },
      { name: 'Upload Video', path: '/studio', icon: Upload },
    ]},
    { section: 'Library', items: [
      { name: 'History', path: '/library/history', icon: History },
      { name: 'Watch Later', path: '/library/watch-later', icon: Clock },
      { name: 'Playlists', path: '/library/playlists', icon: FolderHeart },
    ]},
    { section: 'Social', items: [
      { name: 'Community Feed', path: '/community', icon: MessageSquareCode },
      { name: 'Watch Party', path: '/watch-party', icon: Users },
      { name: 'Spatial Lounge', path: '/spatial', icon: Map },
    ]}
  ];

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 bg-surface border-r border-border hidden md:flex flex-col py-4 px-3 overflow-y-auto z-30 animate-fadeIn">
      {navigationItems.map((section, idx) => (
        <div key={section.section} className={idx > 0 ? 'mt-6' : ''}>
          <span className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase px-3.5 mb-2 block">
            {section.section}
          </span>
          <div className="flex flex-col gap-1.5">
            {section.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20 text-accent'
                      : 'text-zinc-400 hover:text-white hover:bg-surface-light/60 border border-transparent'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-auto pt-6 border-t border-[#27272a66] px-3.5 text-[10px] text-zinc-500 font-medium leading-relaxed">
        © 2026 Kalyra Inc. <br /> Built for global high-fidelity streaming.
      </div>
    </aside>
  );
};

export default Sidebar;
