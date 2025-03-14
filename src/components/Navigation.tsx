import { useState } from 'react';
import { ProfileMenu } from './profile/ProfileMenu';
import { NotificationBadge } from './notifications/NotificationBadge';
import { Layout, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { SlidingNavigation } from './navigation/SlidingNavigation';
import type { NavPage } from '../types';

interface NavigationProps {
  onLogout: () => void;
  hasUnreadNotifications: boolean;
  onNotificationsClick: () => void;
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  taskStats: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export function Navigation({ 
  onLogout, 
  hasUnreadNotifications, 
  onNotificationsClick,
  activePage,
  onPageChange,
  user,
  taskStats
}: NavigationProps) {
  const { isDark, toggle } = useTheme();
  const [isSlidingNavOpen, setIsSlidingNavOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Brand */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSlidingNavOpen(true)}
                  className="group flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl"
                >
                  <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all duration-300">
                    <Layout className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300">
                    NestTask
                  </h1>
                </button>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggle}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {/* Notification Icon */}
                <div className="relative">
                  <NotificationBadge
                    hasUnread={hasUnreadNotifications}
                    onClick={onNotificationsClick}
                  />
                </div>

                {/* Profile Menu */}
                <div className="relative">
                  <ProfileMenu onLogout={onLogout} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sliding Navigation */}
      <SlidingNavigation
        isOpen={isSlidingNavOpen}
        onClose={() => setIsSlidingNavOpen(false)}
        activePage={activePage}
        onPageChange={onPageChange}
        onLogout={onLogout}
        user={user}
        taskStats={taskStats}
      />
    </>
  );
}