import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="min-h-screen bg-surface flex flex-col text-white">
      {/* Global Header */}
      <Header />

      <div className="flex flex-1 pt-16">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Workspace */}
        <main
          className={`flex-1 min-w-0 px-4 md:px-8 py-6 transition-all duration-300 ${
            sidebarOpen ? 'md:ml-64' : 'ml-0'
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
