import { useState, useEffect } from 'react';
import { Activity, Users, Filter, Calendar, PieChart, Zap, SearchIcon, Bell, ChevronDown } from 'lucide-react';
import { UserActivity } from '../UserActivity';
import { UserGraph } from './UserGraph';
import type { User } from '../../../types/auth';
import type { Task } from '../../../types';

interface DashboardProps {
  users: User[];
  tasks: Task[];
}

export function Dashboard({ users, tasks }: DashboardProps) {
  const [filterValue, setFilterValue] = useState('All');
  const [currentDate, setCurrentDate] = useState('');
  const [greetingTime, setGreetingTime] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Check if mobile view and update when window resizes
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Format current date
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: isMobile ? 'short' : 'long', 
      year: 'numeric', 
      month: isMobile ? 'short' : 'long', 
      day: 'numeric' 
    };
    setCurrentDate(now.toLocaleDateString('en-US', dateOptions));
    
    // Set greeting based on time of day
    const hours = now.getHours();
    let greeting = '';
    if (hours < 12) {
      greeting = 'Good Morning';
    } else if (hours < 18) {
      greeting = 'Good Afternoon';
    } else {
      greeting = 'Good Evening';
    }
    setGreetingTime(greeting);
  }, [isMobile]);

  // Filter users based on selected filter
  const getFilteredUsers = () => {
    if (filterValue === 'All') return users;
    return users.filter(user => user.role === filterValue.toLowerCase());
  };
  
  const filteredUsers = getFilteredUsers();
  const adminUser = users.find(user => user.role === 'admin');

  // Calculate stats
  const activeUsers = users.filter(user => user.lastActive).length;
  const activePercentage = Math.round((activeUsers / users.length) * 100) || 0;
  const newUsersThisWeek = users.filter(user => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(user.createdAt) >= weekAgo;
  }).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-6 animate-fade-in">
        <div className="flex items-center justify-between p-4">
          <div className="relative w-full max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="search" 
              placeholder="Search users, tasks, or courses..." 
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border-none dark:text-gray-200"
            />
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button 
                className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 relative hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg z-10 p-4 border border-gray-100 dark:border-gray-700 animate-fadeIn">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium dark:text-white">5 new users joined today</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium dark:text-white">User activity increased by 24%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Yesterday</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full text-xs text-blue-600 dark:text-blue-400 mt-3 py-1.5 hover:underline">
                    View all notifications
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                {adminUser?.name.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  {adminUser?.name || 'Admin'}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden animate-scale-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mt-16 -mr-16"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500 opacity-20 rounded-full"></div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
          <div>
            <span className="inline-block text-xs bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm mb-2">
              <Calendar className="w-3 h-3 inline-block mr-1" />
              {currentDate}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {greetingTime}, <span className="text-blue-200">{adminUser?.name?.split(' ')[0] || 'Admin'}!</span>
            </h2>
            <p className="text-sm text-blue-100 max-w-md">
              Welcome to your dashboard. You have <span className="text-white font-medium">{newUsersThisWeek} new users</span> this week and <span className="text-white font-medium">{activeUsers} active users</span> today.
            </p>
          </div>
          <div className="mt-2 md:mt-0 flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3.5 sm:p-4 transition-all hover:bg-white/30 hover:shadow-xl">
              <div className="text-xs font-medium">TOTAL USERS</div>
              <div className="text-2xl sm:text-3xl font-bold">{users.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
              <div className="text-xs text-blue-100 flex items-center mt-0.5">
                <span className="inline-block px-1.5 py-0.5 bg-green-500/30 text-green-100 rounded-md mr-1">
                  +{Math.round((newUsersThisWeek / users.length) * 100)}%
                </span> 
                vs last week
              </div>
            </div>
            <div className="hidden sm:block bg-white/20 backdrop-blur-sm rounded-xl p-3.5 sm:p-4 transition-all hover:bg-white/30 hover:shadow-xl">
              <div className="text-xs font-medium">ACTIVE RATE</div>
              <div className="text-2xl sm:text-3xl font-bold">{activePercentage}%</div>
              <div className="text-xs text-blue-100 flex items-center mt-0.5">
                <Zap className="w-3.5 h-3.5 mr-1" /> 
                {activeUsers} online today
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md card-hover-effect animate-fade-in" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Users</h3>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeUsers}</p>
          <div className="flex items-center">
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded mr-1.5">+12%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last week</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md card-hover-effect animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">New Users</h3>
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{newUsersThisWeek}</p>
          <div className="flex items-center">
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded mr-1.5">+5%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last week</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md card-hover-effect animate-fade-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Tasks</h3>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{tasks.length}</p>
          <div className="flex items-center">
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded mr-1.5">Active</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{tasks.filter(t => t.status !== 'completed').length} pending</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md card-hover-effect animate-fade-in" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Completion Rate</h3>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {tasks.length ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
          </p>
          <div className="flex items-center">
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded mr-1.5">+8%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-slide-up" style={{animationDelay: '0.2s'}}>
          {/* Analytics Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-gray-800 rounded-t-2xl p-4 border-b border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <PieChart className="w-5 h-5 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                User Analytics
              </h2>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl py-1.5 px-3 border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none w-full"
              >
                <option>All</option>
                <option>Admin</option>
                <option>User</option>
              </select>
            </div>
          </div>

          {/* User Graph Section */}
          <div className="rounded-b-2xl overflow-hidden">
            <UserGraph users={users} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm animate-slide-in-right">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              <Users className="w-4.5 h-4.5 mr-2 text-blue-600 dark:text-blue-400" />
              Recent Activity
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {users.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-start gap-3 hover-scale" style={{animationDelay: `${0.1 + index * 0.05}s`}}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {index === 0 ? 'Just now' : 
                           index === 1 ? '5 minutes ago' : 
                           index === 2 ? '2 hours ago' : 
                           index === 3 ? 'Yesterday' : 
                           '3 days ago'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
                      {index === 0 ? 'Completed their profile setup' : 
                       index === 1 ? 'Submitted a new task' : 
                       index === 2 ? 'Commented on a discussion' : 
                       index === 3 ? 'Created a new project' : 
                       'Joined the platform'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* User List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden animate-slide-up" style={{animationDelay: '0.3s'}}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-4 sm:px-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              User Information
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="text-sm py-1.5 pl-8 pr-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-auto"
              />
              <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full self-start sm:self-auto hidden sm:flex">
              {filteredUsers.length} users
            </span>
          </div>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    User ID
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    Name
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    Role
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    Student ID
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    Email Address
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="group px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer">
                  <div className="flex items-center">
                    Phone Number
                    <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10l5 5 5-5" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.slice(0, 5).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center group">
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user.id.substring(0, 8)}</span>
                      <button 
                        className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                        title="Copy ID"
                        onClick={() => {
                          navigator.clipboard.writeText(user.id);
                          // You could add a toast notification here
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-9 h-9">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm transform transition-transform group-hover:scale-105">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      <span className={`mr-1.5 w-1.5 h-1.5 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-500' : 'bg-green-500'
                      }`}></span>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.studentId || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center group">
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{user.email}</span>
                      <button 
                        className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                        title="Copy Email"
                        onClick={() => {
                          navigator.clipboard.writeText(user.email);
                          // You could add a toast notification here
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.phone || <span className="text-gray-400 dark:text-gray-500 italic">Not available</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="p-1 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        title="Edit User"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile List - Improved for better mobile UX */}
        <div className="md:hidden">
          {filteredUsers.slice(0, 5).map((user) => (
            <div key={user.id} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium text-lg shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="font-mono">{user.id.substring(0, 8)}</span>
                      <span className="mx-1.5">•</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full inline-flex items-center ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      }`}>
                        <span className={`mr-1 w-1 h-1 rounded-full ${
                          user.role === 'admin' ? 'bg-purple-500' : 'bg-green-500'
                        }`}></span>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <button className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl overflow-hidden">
                {/* Email with copy button */}
                <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-900 dark:text-white truncate max-w-[180px]">{user.email}</span>
                    <button 
                      className="ml-2 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" 
                      onClick={() => navigator.clipboard.writeText(user.email)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Phone */}
                <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Phone</span>
                  </div>
                  <span className="text-xs text-gray-900 dark:text-white">
                    {user.phone || <span className="text-gray-400 dark:text-gray-500 italic">Not available</span>}
                  </span>
                </div>
                
                {/* Student ID */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Student ID</span>
                  </div>
                  <span className="text-xs text-gray-900 dark:text-white">
                    {user.studentId || <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>}
                  </span>
                </div>
              </div>
              
              {/* Action buttons for mobile */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()} 
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredUsers.length > 5 && (
          <div className="py-4 text-center border-t border-gray-100 dark:border-gray-700">
            <button className="px-5 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors active:scale-95 shadow-sm">
              View All Users
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 