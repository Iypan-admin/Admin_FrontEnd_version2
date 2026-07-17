import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUpcomingEvents } from '../services/Api';

const MiniCalendarWidget = ({ scrollRef }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // =====================================================
  // FETCH UPCOMING EVENTS
  // =====================================================
  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      const data = await getUpcomingEvents(10);
      setEvents(data.data || []);
    } catch (err) {
      // Error handled silently
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
    // Use local date string to avoid timezone issues
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
        
        const isInRange = currentDate >= startDate && currentDate <= endDate;
        return isInRange;
      }
      return false;
    });
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return '👥';
      case 'exam': return '📝';
      case 'holiday': return '🎉';
      case 'training': return '🎓';
      case 'workshop': return '🔧';
      case 'conference': return '🎤';
      default: return '📅';
    }
  };

  const getEventTypeColor = (type) => {
    switch (type) {
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
  // RENDER MINI CALENDAR
  // =====================================================
  const renderMiniCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-lg border border-white/20 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
              >
                <ChevronLeft className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
              >
                <ChevronRight className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-purple-50">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold text-gray-700 border-r border-gray-200 last:border-r-0">
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
                className={`min-h-[80px] p-2 border-r border-b border-gray-100 flex flex-col items-center justify-start transition-all duration-200 ${
                  isToday 
                    ? 'bg-gradient-to-br from-blue-100 to-purple-100 border-blue-200 shadow-md' 
                    : isSelected 
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100' 
                    : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                } cursor-pointer hover:shadow-sm`}
                onClick={() => day && setSelectedDate(day)}
              >
                {day && (
                  <>
                    <div className={`text-sm font-bold ${
                      isToday 
                        ? 'text-blue-600 bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center' 
                        : 'text-gray-800'
                    }`}>
                      {day.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="space-y-1 mt-1 w-full">
                        {dayEvents.slice(0, 1).map((event, eventIndex) => (
                          <div
                            key={`${day.toDateString()}-${event.id || event.title}-${eventIndex}`}
                            className={`text-xs p-1 rounded ${getEventTypeColor(event.event_type)} shadow-sm`}
                            title={`${event.title} - ${event.event_type}`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs">{getEventTypeIcon(event.event_type)}</span>
                              <span className="text-xs font-medium opacity-90 capitalize">{event.event_type}</span>
                            </div>
                            <div className="font-semibold truncate text-xs leading-tight">{event.title}</div>
                          </div>
                        ))}
                        {dayEvents.length > 1 && (
                          <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded text-center font-medium">
                            +{dayEvents.length - 1} more
                          </div>
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
    const upcomingEvents = events.slice(0, 5);

    return (
      <div className="space-y-4">
        {/* Selected Date Events */}
        {selectedDateEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
              <Calendar className="w-4 h-4 text-blue-600" />
              {formatEventDate(selectedDate.toISOString().split('T')[0])}
            </h4>
            <div className="space-y-3">
              {selectedDateEvents.map((event, index) => (
                <div key={event.id || `selected-${index}`} className={`rounded-xl p-4 shadow-lg border-l-4 ${getEventTypeColor(event.event_type)} hover:shadow-xl transition-all duration-200`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg ${getEventTypeColor(event.event_type)}`}>
                      {getEventTypeIcon(event.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-white truncate">{event.title}</h5>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white`}>
                          {event.event_type}
                        </span>
                        {event.event_start_time && (
                          <div className="flex items-center text-xs text-white/90">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatEventTime(event.event_start_time, event.event_end_time)}
                          </div>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center text-xs text-white/90 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-full"></div>
              <Calendar className="w-4 h-4 text-green-600" />
              Upcoming Events
            </h4>
            <button
              onClick={fetchUpcomingEvents}
              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-all duration-200 font-medium"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl p-4 h-20"></div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={event.id || `upcoming-${index}`} className={`rounded-xl p-4 shadow-lg border-l-4 hover:shadow-xl transition-all duration-200 ${getEventTypeColor(event.event_type)}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg ${getEventTypeColor(event.event_type)}`}>
                      {getEventTypeIcon(event.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-white truncate">{event.title}</h5>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
                          {event.event_type}
                        </span>
                        <div className="text-xs text-white/90 font-medium">
                          {formatEventDate(event.event_start_date)}
                          {event.event_start_time && (
                            <span className="ml-2">
                              • {formatEventTime(event.event_start_time, event.event_end_time)}
                            </span>
                          )}
                        </div>
                      </div>
                      {event.location && (
                        <div className="flex items-center text-xs text-white/90 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div ref={scrollRef} className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm overflow-hidden">
      {/* Widget Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Academic Calendar</h3>
            <p className="text-white/80 text-sm">View upcoming academic events</p>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6 space-y-6">
        {/* Mini Calendar */}
        {renderMiniCalendar()}

        {/* Events List */}
        {renderUpcomingEvents()}
      </div>
    </div>
  );
};

export default MiniCalendarWidget;
