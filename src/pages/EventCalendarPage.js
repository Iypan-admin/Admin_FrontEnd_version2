import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import { getEventsByDateRange, createEvent, updateEvent, deleteEvent, getCurrentUserProfile } from '../services/Api';

const EventCalendarPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day, list
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
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
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Academic Coordinator";
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Fetch user profile picture
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'general',
    event_start_date: '',
    event_end_date: '',
    event_start_time: '',
    event_end_time: ''
  });

  // Fetch events with loading indicator
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      if (viewMode === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else if (viewMode === 'week') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        endDate.setDate(startDate.getDate() + 6);
      }

      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      const data = await getEventsByDateRange(startDateStr, endDateStr);
      setEvents(data.data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Background refresh without loading indicator
  const backgroundRefreshEvents = async () => {
    try {
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      if (viewMode === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else if (viewMode === 'week') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        endDate.setDate(startDate.getDate() + 6);
      }

      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      const data = await getEventsByDateRange(startDateStr, endDateStr);
      setEvents(data.data || []);
    } catch (err) {
      // Silent error - don't show anything, just log
      console.error('Background refresh error:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Background polling every 5 seconds (no loading indicator)
    const interval = setInterval(() => {
      backgroundRefreshEvents();
    }, 5000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode]);

  // Event handlers
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    try {
      // For holiday events, set time fields to null
      const eventData = { ...formData };
      if (formData.event_type === 'holiday') {
        eventData.event_start_time = null;
        eventData.event_end_time = null;
      } else {
        // Convert empty strings to null for time fields
        if (!eventData.event_start_time) eventData.event_start_time = null;
        if (!eventData.event_end_time) eventData.event_end_time = null;
      }
      
      await createEvent(eventData);
      setShowAddEventModal(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'general',
        event_start_date: '',
        event_end_date: '',
        event_start_time: '',
        event_end_time: ''
      });
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    
    try {
      // For holiday events, set time fields to null
      const eventData = { ...formData };
      if (formData.event_type === 'holiday') {
        eventData.event_start_time = null;
        eventData.event_end_time = null;
      } else {
        // Convert empty strings to null for time fields
        if (!eventData.event_start_time) eventData.event_start_time = null;
        if (!eventData.event_end_time) eventData.event_end_time = null;
      }
      
      await updateEvent(editingEvent.id, eventData);
      setShowAddEventModal(false);
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        event_type: 'general',
        event_start_date: '',
        event_end_date: '',
        event_start_time: '',
        event_end_time: ''
      });
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId);
        fetchEvents();
      } catch (err) {
        setError(err.message || 'Failed to delete event');
      }
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'general',
      event_start_date: event.event_start_date || '',
      event_end_date: event.event_end_date || event.event_start_date || '',
      event_start_time: event.event_type === 'holiday' ? '' : (event.event_start_time || ''),
      event_end_time: event.event_type === 'holiday' ? '' : (event.event_end_time || '')
    });
    setShowAddEventModal(true);
  };

  const handleCloseModal = () => {
    setShowAddEventModal(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      event_type: 'general',
      event_start_date: '',
      event_end_date: '',
      event_start_time: '',
      event_end_time: ''
    });
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
                      onClick={() => handleEditEvent(event)}
                      className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer truncate ${getEventTypeColor(event.event_type)}`}
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

  // Render week view
  const renderWeekView = () => {
    const day = currentDate.getDay();
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - day);
    
    const weekDays = [];
    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = ['All-Day', '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDays.push(date);
    }

    // Helper function for week view time matching
    const eventMatchesHour = (event, hourLabel, dateStr) => {
      if (event.event_start_date !== dateStr && !(event.event_end_date && event.event_start_date <= dateStr && event.event_end_date >= dateStr)) {
        return false;
      }
      
      if (hourLabel === 'All-Day') {
        return !event.event_start_time || event.event_type === 'holiday';
      }
      
      if (!event.event_start_time || event.event_type === 'holiday') {
        return false;
      }
      
      // Simple hour matching for week view
      const hourMap = {
        '12AM': 0, '1AM': 1, '2AM': 2, '3AM': 3, '4AM': 4, '5AM': 5,
        '6AM': 6, '7AM': 7, '8AM': 8, '9AM': 9, '10AM': 10, '11AM': 11,
        '12PM': 12, '1PM': 13, '2PM': 14, '3PM': 15, '4PM': 16, '5PM': 17,
        '6PM': 18, '7PM': 19, '8PM': 20, '9PM': 21, '10PM': 22, '11PM': 23
      };
      
      const eventHour = parseInt(event.event_start_time.substring(0, 2));
      return eventHour === hourMap[hourLabel];
    };
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Week Header - Horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[800px] border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="p-2 sm:p-3 border-r border-gray-200 bg-gray-50 sticky left-0 z-20"></div>
            {weekDays.map((date, idx) => (
              <div key={idx} className="p-2 sm:p-3 text-center border-r border-gray-200 last:border-r-0 min-w-[100px]">
                <div className="text-[10px] sm:text-xs font-semibold text-gray-600">{weekDayNames[idx]}</div>
                <div className="text-xs sm:text-sm font-bold text-gray-900">{date.getMonth() + 1}/{date.getDate()}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Week Grid - Horizontal and vertical scroll on mobile */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="min-w-[800px]">
            {hours.map((hour, hourIdx) => (
              <div key={hourIdx} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-2 text-[10px] sm:text-xs text-gray-600 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">{hour}</div>
                {weekDays.map((date, dayIdx) => {
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const dayEvents = events.filter(event => {
                    if (!eventMatchesHour(event, hour, dateStr)) return false;
                    if (eventFilters.viewAll) return true;
                    return eventFilters[event.event_type] || false;
                  });
                  
                  return (
                    <div key={dayIdx} className="p-1 sm:p-2 border-r border-gray-100 last:border-r-0 min-h-[40px] sm:min-h-[50px] md:min-h-[60px]">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => handleEditEvent(event)}
                          className={`text-[10px] sm:text-xs p-1 rounded cursor-pointer mb-1 truncate ${getEventTypeColor(event.event_type)}`}
                          title={event.title}
                        >
                          <span className="hidden sm:inline">{event.title}</span>
                          <span className="sm:hidden">•</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = ['All-Day', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dayEvents = events.filter(event => {
      if (event.event_start_date === dateStr) return true;
      if (event.event_end_date && event.event_start_date <= dateStr && event.event_end_date >= dateStr) return true;
      return false;
    }).filter(event => {
      if (eventFilters.viewAll) return true;
      return eventFilters[event.event_type] || false;
    });

    // Helper function to convert hour label to time format (HH:MM)
    const hourLabelToTime = (hourLabel) => {
      if (hourLabel === 'All-Day') return null;
      
      const isPM = hourLabel.includes('PM');
      let hour = parseInt(hourLabel.replace(/[^0-9]/g, ''));
      
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (!isPM && hour === 12) {
        hour = 0;
      }
      
      return `${String(hour).padStart(2, '0')}:00`;
    };

    // Helper function to check if event matches hour
    const eventMatchesHour = (event, hourLabel) => {
      if (hourLabel === 'All-Day') {
        // Show holidays and events without start_time in All-Day
        return !event.event_start_time || event.event_type === 'holiday';
      }
      
      if (!event.event_start_time || event.event_type === 'holiday') {
        return false; // Events without time or holidays don't show in specific hour slots
      }
      
      const hourTime = hourLabelToTime(hourLabel);
      if (!hourTime) return false;
      
      // Get event start time in HH:MM format
      const eventStartTime = event.event_start_time.substring(0, 5); // Extract HH:MM from HH:MM:SS if present
      const eventHour = eventStartTime.substring(0, 2);
      const hourOnly = hourTime.substring(0, 2);
      
      // Match if event starts at this hour
      return eventHour === hourOnly;
    };
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {hours.map((hour, hourIdx) => {
            const hourEvents = dayEvents.filter(event => eventMatchesHour(event, hour));
            
            return (
              <div key={hourIdx} className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] border-b border-gray-100">
                <div className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600 border-r border-gray-200 bg-gray-50">{hour}</div>
                <div className="p-2 sm:p-3">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEditEvent(event)}
                      className={`text-xs sm:text-sm p-1.5 sm:p-2 rounded cursor-pointer mb-2 ${getEventTypeColor(event.event_type)}`}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {event.event_start_time && event.event_type !== 'holiday' && (
                        <div className="text-[10px] sm:text-xs opacity-75 mt-1">
                          {event.event_start_time}
                          {event.event_end_time && ` - ${event.event_end_time}`}
                        </div>
                      )}
                      {event.event_type === 'holiday' && (
                        <div className="text-[10px] sm:text-xs opacity-75 mt-1">All-Day</div>
                      )}
                    </div>
                  ))}
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
        return dateA - dateB;
      });
    
    return (
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
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
                    </div>
                  </div>
                  <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        {/* Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-1 min-w-0">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Event Calendar</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">Manage academic events and schedules</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <AcademicNotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                        {getDisplayName()?.charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                  </button>
                  {isProfileDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}</h3>
                          <p className="text-sm text-gray-500 mt-1">Academic Coordinator</p>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              navigate('/academic-coordinator/settings');
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-700">Account Settings</span>
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem("token");
                              window.location.href = "/login";
                              setIsProfileDropdownOpen(false);
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
        </div>

        {/* Main Content */}
        <div className="p-2 sm:p-4 md:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-180px)]">
            {/* Left Sidebar - Hidden on mobile/tablet, shown on desktop */}
            <div className="hidden lg:block w-80 flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
              {/* Add Event Button */}
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setFormData({
                    title: '',
                    description: '',
                    event_type: 'general',
                    event_start_date: selectedDate.toISOString().split('T')[0],
                    event_end_date: selectedDate.toISOString().split('T')[0],
                    event_start_time: '',
                    event_end_time: ''
                  });
                  setShowAddEventModal(true);
                }}
                className="w-full mb-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Event</span>
              </button>

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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
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
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Event Filters</h3>
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
                          filter.color === 'red' ? 'bg-red-500' :
                          filter.color === 'blue' ? 'bg-blue-500' :
                          filter.color === 'orange' ? 'bg-orange-500' :
                          filter.color === 'green' ? 'bg-green-500' :
                          filter.color === 'purple' ? 'bg-purple-500' :
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
            <div className="flex-1 flex flex-col min-w-0">
              {/* View Toggles */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
                <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => navigateDate(-1)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 px-2 sm:px-4 truncate flex-1 sm:flex-none">
                    {viewMode === 'month' ? getMonthName(currentDate) :
                     viewMode === 'week' ? getWeekRange(currentDate) :
                     viewMode === 'day' ? currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) :
                     'Event List'}
                  </div>
                  <button
                    onClick={() => navigateDate(1)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="flex space-x-1 sm:space-x-2 w-full sm:w-auto">
                  {['Month', 'Week', 'Day', 'List'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode.toLowerCase())}
                      className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                        viewMode === mode.toLowerCase()
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar View */}
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'list' && renderListView()}
            </div>
          </div>
        </div>

        {/* Mobile Floating Add Event Button - Hidden on desktop */}
        <button
          onClick={() => {
            setEditingEvent(null);
            setFormData({
              title: '',
              description: '',
              event_type: 'general',
              event_start_date: selectedDate.toISOString().split('T')[0],
              event_end_date: selectedDate.toISOString().split('T')[0],
              event_start_time: '',
              event_end_time: ''
            });
            setShowAddEventModal(true);
          }}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Right Side Add Event Modal */}
      {showAddEventModal && (
        <div 
          className="fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCloseModal}
        >
          <div 
            className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[28rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto translate-x-0`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingEvent ? 'Edit Event' : 'Add Event'}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({ 
                        ...formData, 
                        event_type: newType,
                        // Clear time fields if holiday is selected
                        event_start_time: newType === 'holiday' ? '' : formData.event_start_time,
                        event_end_time: newType === 'holiday' ? '' : formData.event_end_time
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  >
                    <option value="general">General</option>
                    <option value="meeting">Meeting</option>
                    <option value="exam">Exam</option>
                    <option value="holiday">Holiday</option>
                    <option value="training">Training</option>
                    <option value="workshop">Workshop</option>
                    <option value="conference">Conference</option>
                  </select>
                  {formData.event_type === 'holiday' && (
                    <p className="mt-2 text-sm text-gray-500">Holiday events are full-day events (no time required)</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.event_start_date}
                      onChange={(e) => setFormData({ ...formData, event_start_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.event_end_date}
                      onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    />
                  </div>
                </div>

                {formData.event_type !== 'holiday' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={formData.event_start_time}
                        onChange={(e) => setFormData({ ...formData, event_start_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={formData.event_end_time}
                        onChange={(e) => setFormData({ ...formData, event_end_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      />
                    </div>
                  </div>
                )}
                {formData.event_type === 'holiday' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Full-Day Event</p>
                    <p className="text-xs text-green-600 mt-1">This holiday event will span the entire day. Time fields are not required.</p>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-6 border-t border-gray-200 mt-6">
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: '#2196f3' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                    >
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendarPage;


