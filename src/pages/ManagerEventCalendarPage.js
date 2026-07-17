import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, List, Grid, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import { getEventsByDateRange, getCurrentUserProfile } from '../services/Api';

const ManagerEventCalendarPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day, list
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [eventFilters, setEventFilters] = useState({
    viewAll: true,
    general: true,
    meeting: true,
    exam: true,
    holiday: true,
    training: true,
    workshop: true,
    conference: true
  });
  const [profileInfo, setProfileInfo] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  const getDisplayName = () => {
    // Priority 1: profileInfo.full_name from user table (from getCurrentUserProfile API)
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    // Priority 2: Token full_name (fallback)
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    // Fallback
    return "Manager";
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync mobile menu state with Navbar
  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Fetch profile info
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile info:", error);
      }
    };
    fetchProfileInfo();
    
    // Listen for profile update events (when name is updated in account settings)
    const handleProfileUpdate = () => {
      fetchProfileInfo();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Fetch events
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let startDate, endDate;
      
      if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        startDate = new Date(year, month - 6, 1);
        endDate = new Date(year, month + 7, 0);
      } else if (viewMode === 'week') {
        const day = currentDate.getDay();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - day);
        startDate.setMonth(startDate.getMonth() - 3);
        endDate = new Date(currentDate);
        endDate.setDate(currentDate.getDate() - day + 6);
        endDate.setMonth(endDate.getMonth() + 3);
      } else {
        startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 3);
        endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 3);
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await getEventsByDateRange(startDateStr, endDateStr);
      
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Get event type color
  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'general': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'exam': return 'bg-red-100 text-red-700 border-red-300';
      case 'holiday': return 'bg-green-100 text-green-700 border-green-300';
      case 'training': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'workshop': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'conference': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Navigate dates
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  // Get month name
  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get week range
  const getWeekRange = (date) => {
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startMonth = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    const year = start.getFullYear();
    
    return `${startMonth}/${startDay} - ${endMonth}/${endDay}, ${year}`;
  };

  // Render mini calendar
  const renderMiniCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayDate = new Date(currentDay);
      const isCurrentMonth = dayDate.getMonth() === month;
      const isSelected = dayDate.toDateString() === selectedDate.toDateString();
      const isToday = dayDate.toDateString() === new Date().toDateString();
      
      days.push(
        <button
          key={i}
          onClick={() => {
            setSelectedDate(dayDate);
            setCurrentDate(dayDate);
          }}
          className={`w-8 h-8 text-xs rounded ${
            isCurrentMonth 
              ? isSelected 
                ? 'bg-blue-500 text-white' 
                : isToday 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-400'
          }`}
        >
          {dayDate.getDate()}
        </button>
      );
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const currentDay = new Date(startDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-auto">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {weekDays.map(day => (
            <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0, 1)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => {
            const dayDate = new Date(currentDay);
            dayDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = dayDate.getMonth() === month;
            const isToday = dayDate.toDateString() === new Date().toDateString();
            const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
            
            const dayEvents = events.filter(event => {
              if (event.event_start_date === dateStr) return true;
              if (event.event_end_date && event.event_start_date <= dateStr && event.event_end_date >= dateStr) return true;
              return false;
            }).filter(event => {
              if (eventFilters.viewAll) return true;
              return eventFilters[event.event_type] || false;
            });
            
            return (
              <div
                key={i}
                className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] border-r border-b border-gray-200 p-1 sm:p-2 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600' : ''}`}>
                  {dayDate.getDate()}
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate ${getEventTypeColor(event.event_type)}`}
                      title={event.title}
                    >
                      <span className="hidden sm:inline">
                        {event.event_type === 'holiday' 
                          ? `All-Day: ${event.title}`
                          : event.event_start_time 
                            ? `${event.event_start_time} ${event.title}`
                            : event.title}
                      </span>
                      <span className="sm:hidden">•</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] sm:text-xs text-gray-500">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    const sortedEvents = [...events]
      .filter(event => {
        if (eventFilters.viewAll) return true;
        return eventFilters[event.event_type] || false;
      })
      .sort((a, b) => {
        const dateA = new Date(a.event_start_date);
        const dateB = new Date(b.event_start_date);
        return dateB.getTime() - dateA.getTime();
      });
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm sm:text-base text-center">No events found</p>
          </div>
        ) : (
          sortedEvents.map(event => {
            const eventDate = new Date(event.event_start_date);
            return (
              <div key={event.id} className="p-3 sm:p-4 border-b border-gray-200 hover:bg-gray-50">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                      event.event_type === 'general' ? 'bg-gray-500' :
                      event.event_type === 'meeting' ? 'bg-blue-500' :
                      event.event_type === 'exam' ? 'bg-red-500' :
                      event.event_type === 'holiday' ? 'bg-green-500' :
                      event.event_type === 'training' ? 'bg-purple-500' :
                      event.event_type === 'workshop' ? 'bg-orange-500' :
                      event.event_type === 'conference' ? 'bg-indigo-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">{event.title}</div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {event.event_type !== 'holiday' && event.event_start_time && ` • ${event.event_start_time}`}
                        {event.event_type !== 'holiday' && event.event_end_time && ` - ${event.event_end_time}`}
                        {event.event_type === 'holiday' && ' • All-Day'}
                      </div>
                      {event.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{event.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ marginLeft: isMobile ? '0' : sidebarWidth, transition: 'margin-left 0.3s ease' }}>
      <Navbar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* Navbar - BERRY Style */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 lg:z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              {/* Mobile Toggle */}
              <button 
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Title Section - BERRY Style */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{
                    background: "linear-gradient(to bottom right, #2196f3, #1976d2)",
                  }}
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate">
                    Event Calendar
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                    View academic events and schedules
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Notifications */}
              <ManagerNotificationBell />

              {/* Manager Profile Dropdown - Matching ManagerPage Design */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center focus:outline-none"
                >
                  {profileInfo?.profile_picture ? (
                    <img
                      src={profileInfo.profile_picture}
                      alt="Profile"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                      {getDisplayName()?.charAt(0).toUpperCase() || "M"}
                    </div>
                  )}
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileDropdown(false)}
                    ></div>
                    
                    {/* Dropdown Box */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      {/* Header Section */}
                      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                        <h3 className="font-bold text-gray-800 text-base">
                          Welcome, {getDisplayName() || "Manager"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Manager</p>
                      </div>

                      {/* Search Bar */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search profile options"
                            className="bg-transparent border-none outline-none text-sm flex-1 text-gray-600"
                          />
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Account Settings */}
                        <button
                          onClick={() => {
                            navigate('/manager/account-settings');
                            setShowProfileDropdown(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-700">Account Settings</span>
                        </button>

                        {/* Logout */}
                        <button
                          onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/login");
                            setShowProfileDropdown(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-gray-200"
                        >
                          <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-sm text-gray-700">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-180px)]">
          {/* Left Sidebar - Hidden on mobile/tablet, shown on desktop */}
          <div className="hidden lg:block w-80 flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs text-center text-gray-500 font-medium">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderMiniCalendar()}
              </div>
            </div>

            {/* Event Filters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Event Filters
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'viewAll', label: 'View All', color: 'gray' },
                  { key: 'general', label: 'General', color: 'gray' },
                  { key: 'meeting', label: 'Meeting', color: 'blue' },
                  { key: 'exam', label: 'Exam', color: 'red' },
                  { key: 'holiday', label: 'Holiday', color: 'green' },
                  { key: 'training', label: 'Training', color: 'purple' },
                  { key: 'workshop', label: 'Workshop', color: 'orange' },
                  { key: 'conference', label: 'Conference', color: 'indigo' }
                ].map(filter => (
                  <label key={filter.key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventFilters[filter.key]}
                      onChange={(e) => {
                        if (filter.key === 'viewAll') {
                          setEventFilters({
                            viewAll: e.target.checked,
                            general: e.target.checked,
                            meeting: e.target.checked,
                            exam: e.target.checked,
                            holiday: e.target.checked,
                            training: e.target.checked,
                            workshop: e.target.checked,
                            conference: e.target.checked
                          });
                        } else {
                          setEventFilters(prev => ({
                            ...prev,
                            [filter.key]: e.target.checked,
                            viewAll: false
                          }));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        filter.color === 'gray' ? 'bg-gray-500' :
                        filter.color === 'blue' ? 'bg-blue-500' :
                        filter.color === 'red' ? 'bg-red-500' :
                        filter.color === 'green' ? 'bg-green-500' :
                        filter.color === 'purple' ? 'bg-purple-500' :
                        filter.color === 'orange' ? 'bg-orange-500' :
                        filter.color === 'indigo' ? 'bg-indigo-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm text-gray-700">{filter.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 p-4 min-h-[600px]">
            {/* View Controls */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <div className="ml-4 text-lg font-semibold text-gray-900">
                  {viewMode === 'month' ? getMonthName(currentDate) :
                   viewMode === 'week' ? getWeekRange(currentDate) :
                   currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('month')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'month' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Month View"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calendar Content */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading events...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-500 mb-2">{error}</p>
                  <button
                    onClick={fetchEvents}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : viewMode === 'month' ? (
              renderMonthView()
            ) : (
              renderListView()
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ManagerEventCalendarPage;

