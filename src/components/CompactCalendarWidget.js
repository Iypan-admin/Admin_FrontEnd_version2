import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getPublicUpcomingEvents } from '../services/Api';

const CompactCalendarWidget = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  // =====================================================
  // FETCH PUBLIC UPCOMING EVENTS
  // =====================================================
  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      const data = await getPublicUpcomingEvents(10);
      setEvents(data.data || []);
    } catch (err) {
      console.error('Error fetching public upcoming events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  // =====================================================
  // CALENDAR UTILITIES
  // =====================================================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return events.filter(event => {
      // Check if the date matches the start date
      if (event.event_start_date === dateStr) {
        return true;
      }
      // Check if the date falls within the range (start_date to end_date)
      if (event.event_end_date && event.event_start_date && event.event_end_date !== event.event_start_date) {
        const startDate = new Date(event.event_start_date);
        const endDate = new Date(event.event_end_date);
        const currentDate = new Date(dateStr);
        
        return currentDate >= startDate && currentDate <= endDate;
      }
      return false;
    });
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-500';
      case 'exam': return 'bg-red-500';
      case 'holiday': return 'bg-green-500';
      case 'training': return 'bg-purple-500';
      case 'workshop': return 'bg-orange-500';
      case 'conference': return 'bg-indigo-500';
      case 'general': return 'bg-gray-500';
      default: return 'bg-gray-500';
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

  // =====================================================
  // RENDER COMPACT CALENDAR
  // =====================================================
  const renderCompactCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronLeft className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronRight className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {dayNames.map(day => (
            <div key={day} className="p-1 text-center text-xs font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isSelected = day && day.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                className={`min-h-[32px] p-1 border-r border-b border-gray-100 flex flex-col items-center justify-center transition-all duration-200 ${
                  isToday 
                    ? 'bg-gradient-to-br from-blue-100 to-purple-100 border-blue-200' 
                    : isSelected 
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100' 
                    : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                } cursor-pointer hover:shadow-sm`}
                onClick={() => day && setSelectedDate(day)}
              >
                {day && (
                  <>
                    <div className={`text-xs font-bold ${
                      isToday 
                        ? 'text-blue-600 bg-blue-200 w-5 h-5 rounded-full flex items-center justify-center' 
                        : 'text-gray-800'
                    }`}>
                      {day.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="flex space-x-0.5 mt-0.5">
                        {dayEvents.slice(0, 2).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(event.event_type)}`}
                            title={`${event.title} - ${event.event_type}`}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`+${dayEvents.length - 2} more events`} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =====================================================
  // RENDER UPCOMING EVENTS LIST
  // =====================================================
  const renderUpcomingEvents = () => {
    const selectedDateEvents = getEventsForDate(selectedDate);
    const upcomingEvents = events.slice(0, 3);
    
    return (
      <div className="space-y-3">
        {/* Selected Date Events */}
        {selectedDateEvents.length > 0 && (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              Events for {formatEventDate(selectedDate.toISOString().split('T')[0])}
            </h4>
            <div className="space-y-1">
              {selectedDateEvents.map(event => (
                <div key={event.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded text-xs">
                  <div className={`w-2 h-2 rounded-full ${getEventTypeColor(event.event_type)}`} />
                  <span className="font-medium text-gray-900 truncate">{event.title}</span>
                  <span className="text-gray-500">{formatEventTime(event.event_start_time, event.event_end_time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-green-600" />
              Upcoming Events
            </h4>
            <div className="space-y-1">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded text-xs">
                  <div className={`w-2 h-2 rounded-full ${getEventTypeColor(event.event_type)}`} />
                  <span className="font-medium text-gray-900 truncate">{event.title}</span>
                  <span className="text-gray-500">{formatEventDate(event.event_start_date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Events Message */}
        {events.length === 0 && !loading && (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">No upcoming events</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-xs">Loading events...</p>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div className="relative">
      {/* Compact Calendar Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
      >
        <Calendar size={20} />
        {events.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {events.length}
          </span>
        )}
      </button>

      {/* Expanded Calendar Panel */}
      {isExpanded && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden z-50">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">Academic Calendar</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-4 space-y-4">
            {/* Mini Calendar */}
            {renderCompactCalendar()}

            {/* Upcoming Events List */}
            {renderUpcomingEvents()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactCalendarWidget;






