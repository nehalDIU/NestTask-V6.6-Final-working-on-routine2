import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceDot,
  ReferenceArea,
  Brush,
  Legend,
  AreaChart,
  ComposedChart,
} from 'recharts';
import { TrendingUp, Calendar, ArrowUpRight, Info } from 'lucide-react';
import type { User } from '../../../types/auth';

interface TimeFilterProps {
  selected: 'week' | 'month' | 'year';
  onChange: (filter: 'week' | 'month' | 'year') => void;
  isMobile: boolean;
}

const TimeFilter = ({ selected, onChange, isMobile }: TimeFilterProps) => {
  return (
    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto justify-center sm:justify-start mt-3 sm:mt-0 shadow-sm border border-gray-200 dark:border-gray-700">
      <button
        className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all duration-300 ${
          selected === 'week'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => onChange('week')}
      >
        {isMobile ? '7D' : 'Week'}
      </button>
      <button
        className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all duration-300 ${
          selected === 'month'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => onChange('month')}
      >
        {isMobile ? '30D' : 'Month'}
      </button>
      <button
        className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-all duration-300 ${
          selected === 'year'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={() => onChange('year')}
      >
        {isMobile ? '1Y' : 'Year'}
      </button>
    </div>
  );
};

interface UserGraphProps {
  users: User[];
}

export function UserGraph({ users }: UserGraphProps) {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('year');
  const [animationActive, setAnimationActive] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Check if mobile view and update when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Trigger animation on first load and when changing time filter
  useEffect(() => {
    setAnimationActive(true);
    setIsInitialLoad(false);
    
    const timer = setTimeout(() => {
      setAnimationActive(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [timeFilter]);

  // Handle clicks outside the info tooltip to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoButtonRef.current && !infoButtonRef.current.contains(event.target as Node)) {
        setShowInfoTooltip(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate chart data based on the selected time filter
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { name: string; users: number; newUsers?: number; date?: Date }[] = [];
    
    if (timeFilter === 'week') {
      // Generate data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { 
          weekday: isMobile ? 'narrow' : 'short' // Use narrower format on mobile
        });
        
        const newUsersCount = users.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate.toDateString() === date.toDateString();
        }).length;
        
        data.push({ 
          name: dayName, 
          users: 0, // Will be calculated for cumulative
          newUsers: newUsersCount,
          date: new Date(date)
        });
      }
    } else if (timeFilter === 'month') {
      // Generate data for the last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - (i * 7));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        
        const weekNum = 4 - i;
        // Shorter label for mobile
        const weekLabel = isMobile ? `W${weekNum}` : `Week ${weekNum}`;
        
        const newUsersCount = users.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate >= startDate && userDate <= endDate;
        }).length;
        
        data.push({ 
          name: weekLabel, 
          users: 0, // Will be calculated for cumulative
          newUsers: newUsersCount,
          date: new Date(startDate)
        });
      }
    } else {
      // Generate data for the year (by month)
      const months = isMobile 
        ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] // Single letter for mobile
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 0; i < 12; i++) {
        const month = i;
        const year = now.getFullYear();
        const date = new Date(year, month, 1);
        
        const newUsersCount = users.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate.getMonth() === month && userDate.getFullYear() === year;
        }).length;
        
        data.push({ 
          name: months[i], 
          users: 0, // Will be calculated for cumulative
          newUsers: newUsersCount,
          date
        });
      }
    }
    
    // Calculate cumulative users for each data point
    let cumulativeCount = 0;
    
    // Start with users registered before our timeframe
    if (timeFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      cumulativeCount = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate < weekStart;
      }).length;
    } else if (timeFilter === 'month') {
      const monthStart = new Date(now);
      monthStart.setDate(monthStart.getDate() - 28);
      monthStart.setHours(0, 0, 0, 0);
      
      cumulativeCount = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate < monthStart;
      }).length;
    } else {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      
      cumulativeCount = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate < yearStart;
      }).length;
    }
    
    const cumulativeData = data.map(item => {
      cumulativeCount += item.newUsers || 0;
      return { ...item, users: cumulativeCount };
    });
    
    return cumulativeData;
  }, [users, timeFilter, isMobile]);

  // Find all significant points (points with large increases)
  const significantPoints = useMemo(() => {
    if (chartData.length < 2) return [];
    
    const points: number[] = [];
    const threshold = Math.max(
      5, // Minimum threshold
      Math.floor(chartData.reduce((sum, item) => sum + (item.newUsers || 0), 0) * 0.15 / chartData.length) // 15% of average
    );
    
    // Find indices with significant increases
    for (let i = 0; i < chartData.length; i++) {
      if ((chartData[i].newUsers || 0) > threshold) {
        points.push(i);
      }
    }
    
    // On mobile, limit to max 3 significant points to avoid clutter
    if (isMobile && points.length > 3) {
      points.sort((a, b) => (chartData[b].newUsers || 0) - (chartData[a].newUsers || 0));
      points.splice(3);
    }
    
    return points;
  }, [chartData, isMobile]);

  // Find max user growth point
  const maxGrowthPoint = useMemo(() => {
    if (chartData.length < 2) return null;
    
    let maxIndex = 0;
    let maxGrowth = 0;
    
    for (let i = 0; i < chartData.length; i++) {
      if ((chartData[i].newUsers || 0) > maxGrowth) {
        maxGrowth = chartData[i].newUsers || 0;
        maxIndex = i;
      }
    }
    
    return maxGrowth > 0 ? maxIndex : null;
  }, [chartData]);

  // Calculate total new users in the period
  const totalNewUsers = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (item.newUsers || 0), 0);
  }, [chartData]);

  // Custom tooltip component with animation
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-scale-in touch-auto min-w-[160px]">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center justify-between">
            <span className="font-semibold">{label}</span>
            {data.date && <span className="text-xs text-gray-500 ml-2">
              {new Date(data.date).toLocaleDateString()}
            </span>}
          </div>
          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span>Total: {payload[0].value.toLocaleString()}</span>
          </div>
          {data.newUsers !== undefined && (
            <div className="flex items-center text-sm text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
              <span>New: +{data.newUsers.toLocaleString()} users</span>
            </div>
          )}
          {maxGrowthPoint !== null && chartData.indexOf(data) === maxGrowthPoint && (
            <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">
              <ArrowUpRight className="w-3 h-3 inline mr-1" /> Peak Growth
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [chartData, maxGrowthPoint]);

  const handleTimeFilterChange = (filter: 'week' | 'month' | 'year') => {
    setTimeFilter(filter);
  };

  const handleMouseMove = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined) {
      setHoveredPoint(e.activeTooltipIndex);
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-b-2xl rounded-t-none sm:rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-300 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="relative">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center group">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            User Growth Trends
            <button 
              ref={infoButtonRef}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              onClick={() => setShowInfoTooltip(!showInfoTooltip)}
              aria-label="Information about user growth"
            >
              <Info className="w-4 h-4" />
            </button>
          </h3>
          {showInfoTooltip && (
            <div className="absolute z-10 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 animate-slide-in-right">
              <p>This chart shows the total number of registered users over time, with the green line indicating new registrations within each period.</p>
              <p className="mt-2">Highlighted points show periods of significant growth.</p>
            </div>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <span>
              {timeFilter === 'week' ? 'Last 7 days' : 
              timeFilter === 'month' ? 'Last 30 days' : 
              `${new Date().getFullYear()} overview`}
            </span>
          </div>
        </div>
        <TimeFilter selected={timeFilter} onChange={handleTimeFilterChange} isMobile={isMobile} />
      </div>

      <div className="bg-gray-50 dark:bg-gray-850 rounded-xl p-4 mb-4">
        <div className={`h-60 sm:h-[320px] ${isMobile ? 'mx-[-0.5rem]' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={isMobile ? { top: 15, right: 5, left: 0, bottom: 10 } : { top: 20, right: 20, left: 10, bottom: 10 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => e && e.activeTooltipIndex !== undefined && setHoveredPoint(e.activeTooltipIndex)}
            >
              {/* Reference area for hovered point */}
              {hoveredPoint !== null && (
                <ReferenceArea
                  x1={chartData[hoveredPoint]?.name}
                  x2={chartData[hoveredPoint]?.name}
                  strokeOpacity={0.3}
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              )}
              
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} strokeOpacity={0.6} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
                dy={10}
                angle={isMobile ? (timeFilter === 'year' ? 0 : -45) : 0}
                textAnchor={isMobile && timeFilter !== 'year' ? "end" : "middle"}
                height={isMobile ? 35 : 50}
                interval={isMobile ? (timeFilter === 'year' ? 1 : 0) : 0}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
                width={isMobile ? 30 : 40}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                content={CustomTooltip} 
                cursor={false} 
                position={{ y: 0 }}
                isAnimationActive={true}
                wrapperStyle={{ zIndex: 10, touchAction: 'auto' }}
              />
              
              {/* Only show brush on desktop in year view */}
              {!isMobile && timeFilter === 'year' && (
                <Brush 
                  dataKey="name"
                  height={30}
                  stroke="#3b82f6"
                  fill="#f9fafb"
                  fillOpacity={0.8}
                  travellerWidth={10}
                  startIndex={6}
                />
              )}
              
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <Area
                type="monotone"
                dataKey="users"
                stroke="none"
                fillOpacity={1}
                fill="url(#colorUsers)"
                isAnimationActive={animationActive}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              
              <Line
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={isMobile ? 2 : 3}
                dot={false}
                activeDot={{ 
                  r: isMobile ? 6 : 8, 
                  fill: "#3b82f6", 
                  stroke: "#fff", 
                  strokeWidth: 2 
                }}
                isAnimationActive={animationActive}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              
              {/* Significant growth points - conditionally rendered */}
              {significantPoints.map(index => (
                <ReferenceDot
                  key={`ref-dot-${index}`}
                  x={chartData[index].name}
                  y={chartData[index].users}
                  r={isMobile ? 4 : 5}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={2}
                  isFront={true}
                />
              ))}

              {/* Highlight max growth point with special marker */}
              {maxGrowthPoint !== null && (
                <ReferenceDot
                  key="max-growth"
                  x={chartData[maxGrowthPoint].name}
                  y={chartData[maxGrowthPoint].users}
                  r={isMobile ? 5 : 7}
                  fill="#ec4899"
                  stroke="#fff"
                  strokeWidth={2}
                  isFront={true}
                  className="animate-pulse-glow"
                />
              )}
              
              {/* Line showing new users count - conditionally rendered based on screen size */}
              {(!isMobile || timeFilter !== 'year') && (
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#10b981"
                  strokeWidth={isMobile ? 1 : 1.5}
                  strokeDasharray="3 3"
                  dot={{ r: isMobile ? 2 : 3, fill: "#10b981", stroke: "#fff", strokeWidth: 1 }}
                  activeDot={{ r: isMobile ? 4 : 6 }}
                  isAnimationActive={animationActive}
                  animationDuration={2000}
                  animationEasing="ease-out"
                  hide={isInitialLoad} // Hide on initial load
                />
              )}
              
              {/* Add Area for new users trend */}
              {(!isMobile || timeFilter !== 'year') && (
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorNewUsers)"
                  isAnimationActive={animationActive}
                  animationDuration={2000}
                  animationEasing="ease-out"
                  hide={isInitialLoad} // Hide on initial load
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend and statistics panel */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Legend */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-6">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Total users</span>
          </div>
          
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">New registrations</span>
          </div>
          
          {maxGrowthPoint !== null && (
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Peak growth</span>
            </div>
          )}
        </div>
        
        {/* Statistics */}
        {chartData.length > 0 && (
          <div className="flex justify-between items-center px-5 py-3">
            <div className="flex flex-col">
              <div className="text-lg font-bold text-gray-900 dark:text-white flex items-baseline gap-2">
                {chartData[chartData.length - 1].users.toLocaleString()}
                <span className="text-sm font-medium text-gray-500">total users</span>
              </div>
            </div>

            <div className="flex items-center bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                +{totalNewUsers.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">new in this period</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 