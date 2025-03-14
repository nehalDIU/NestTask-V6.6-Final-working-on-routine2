import { Home, Calendar, Bell, Search, BookOpen } from 'lucide-react';
import { NavPage } from '../types/navigation';
import { ExpandableTabs } from './ui/expandable-tabs';
import { useEffect, useState } from 'react';

interface BottomNavigationProps {
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  hasUnreadNotifications: boolean;
}

export function BottomNavigation({ activePage, onPageChange, hasUnreadNotifications }: BottomNavigationProps) {
  // Convert the nav items to the format expected by ExpandableTabs with shorter titles for mobile
  const tabs = [
    { title: 'Home', icon: Home, id: 'home' },
    { title: 'Upcoming', icon: Calendar, id: 'upcoming' },
    { title: 'Routine', icon: BookOpen, id: 'routine', noBackdrop: true },
    { type: 'separator' as const },
    { title: hasUnreadNotifications ? 'New' : 'Notifications', icon: Bell, id: 'notifications' },
    { title: 'Search', icon: Search, id: 'search' }
  ];

  // Map between tab indices and NavPage values (accounting for separator)
  const tabIndexToNavPage = [
    'home',         // index 0
    'upcoming',     // index 1
    'routine',      // index 2
    null,           // index 3 - separator
    'notifications', // index 4
    'search'        // index 5
  ];
  
  // Find active tab index based on current active page
  const getActiveTabIndex = (): number | null => {
    const indexMap: Record<string, number> = {
      'home': 0,
      'upcoming': 1,
      'routine': 2,
      'notifications': 4, // Accounting for separator
      'search': 5         // Accounting for separator
    };
    
    return indexMap[activePage] ?? null;
  };

  // Handle the tabs change
  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    
    // Skip separator
    const navPage = tabIndexToNavPage[index] as NavPage | null;
    if (navPage) {
      onPageChange(navPage);
    }
  };
  
  // Custom color for routine tab
  const getActiveColorClass = () => {
    if (activePage === 'routine') {
      return "text-blue-500 dark:text-blue-300";
    }
    return "text-blue-600 dark:text-blue-400";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 w-full h-16 safe-area-bottom">
      <div className="w-full h-full flex items-center px-2">
        <ExpandableTabs 
          tabs={tabs}
          activeIndex={getActiveTabIndex()}
          activeColor={getActiveColorClass()}
          className="w-full h-full justify-between border-none shadow-none"
          onChange={handleTabChange}
        />
        
        {/* Notification indicator - positioned relative to the icon for better accuracy */}
        {hasUnreadNotifications && (
          <div className="absolute top-2.5 right-[32%] w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    </nav>
  );
}