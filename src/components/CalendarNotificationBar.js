import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, X } from 'lucide-react';
import { getUpcomingEvents } from '../services/Api';

const CalendarNotificationBar = ({ onScrollToCalendar }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp > currentTime) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  // Fetch upcoming events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getUpcomingEvents(10);
      const upcomingEvents = data.data || [];
      setEvents(upcomingEvents);
      
      // Calculate notification count for today and tomorrow
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
      const todayEvents = upcomingEvents.filter(event => event.event_start_date === todayStr);
      const tomorrowEvents = upcomingEvents.filter(event => event.event_start_date === tomorrowStr);
      
      setNotificationCount(todayEvents.length + tomorrowEvents.length);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchEvents();
      
      // Refresh every 5 minutes
      const interval = setInterval(fetchEvents, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-500 text-white';
      case 'exam': return 'bg-red-500 text-white';
      case 'holiday': return 'bg-green-500 text-white';
      case 'training': return 'bg-purple-500 text-white';
      case 'workshop': return 'bg-orange-500 text-white';
      case 'conference': return 'bg-indigo-500 text-white';
      case 'general': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'meeting': return '👥';
      case 'exam': return '📝';
      case 'holiday': return '🎉';
      case 'training': return '🎓';
      case 'workshop': return '🔧';
      case 'conference': return '🎤';
      case 'general': return '📅';
      default: return '📅';
    }
  };

  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return '';
    const start = startTime.substring(0, 5);
    const end = endTime ? endTime.substring(0, 5) : '';
    return end ? `${start} - ${end}` : start;
  };

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleNotificationClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onScrollToCalendar) {
      // Small delay to allow expansion animation
      setTimeout(() => {
        onScrollToCalendar();
      }, 300);
    }
  };

  const handleEventClick = (event) => {
    if (onScrollToCalendar) {
      onScrollToCalendar();
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.event_start_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  // Don't render if user is not logged in
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={handleNotificationClick}
          className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Expanded Notification Panel */}
        {isExpanded && (
          <div className="absolute top-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar size={18} className="text-white" />
                  <h3 className="text-white font-semibold">Upcoming Events</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Events List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 text-sm mt-2">Loading events...</p>
                </div>
              ) : sortedDates.length === 0 ? (
                <div className="p-4 text-center">
                  <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No upcoming events</p>
                </div>
              ) : (
                sortedDates.map((dateKey) => (
                  <div key={dateKey} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-4 py-2 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {formatEventDate(dateKey)}
                      </h4>
                    </div>
                    <div className="p-2">
                      {groupedEvents[dateKey].map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full ${getEventTypeColor(event.event_type)} flex items-center justify-center text-sm`}>
                            {getEventTypeIcon(event.event_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {event.title}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>{formatEventTime(event.event_start_time, event.event_end_time)}</span>
                              <span className="capitalize">{event.event_type}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsExpanded(false);
                  if (onScrollToCalendar) {
                    onScrollToCalendar();
                  }
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                View Full Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarNotificationBar;
