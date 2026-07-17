import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublicUpcomingEvents } from '../services/Api';

const PublicMiniCalendarWidget = ({ scrollRef }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // =====================================================
  // FETCH PUBLIC UPCOMING EVENTS
  // =====================================================
  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      console.log('Fetching public upcoming events...');
      const data = await getPublicUpcomingEvents(10);
      console.log('Public upcoming events response:', data);
      setEvents(data.data || []);
    } catch (err) {
      console.error('Error fetching public upcoming events:', err);
      console.error('Error details:', err.message);
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
    console.log('Checking events for date:', dateStr);
    console.log('Available events:', events.map(e => ({ title: e.title, start_date: e.event_start_date, end_date: e.event_end_date })));
    
    return events.filter(event => {
      // Check if the date matches the start date
      if (event.event_start_date === dateStr) {
        console.log('Found event on start date:', event.title, event.event_start_date);
        return true;
      }
      // Check if the date falls within the range (start_date to end_date)
      if (event.event_end_date && event.event_start_date && event.event_end_date !== event.event_start_date) {
        const startDate = new Date(event.event_start_date);
        const endDate = new Date(event.event_end_date);
        const currentDate = new Date(dateStr);
        
        const isInRange = currentDate >= startDate && currentDate <= endDate;
        if (isInRange) {
          console.log('Found event in date range:', event.title, event.event_start_date, 'to', event.event_end_date);
        }
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
      case 'general': return '📅';
      default: return '📅';
    }
  };

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
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-gray-600">
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
                            key={eventIndex}
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
    
    console.log('Total events:', events.length);
    console.log('Selected date events:', selectedDateEvents.length);
    console.log('Upcoming events:', upcomingEvents.length);

    return (
      <div className="space-y-4">
        {/* Selected Date Events */}
        {selectedDateEvents.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Events for {formatEventDate(selectedDate.toISOString().split('T')[0])}
            </h4>
            <div className="space-y-2">
              {selectedDateEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full ${getEventTypeColor(event.event_type)} flex items-center justify-center text-sm`}>
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatEventTime(event.event_start_time, event.event_end_time)}</span>
                      <span className="capitalize">{event.event_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              Upcoming Events
            </h4>
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full ${getEventTypeColor(event.event_type)} flex items-center justify-center text-sm`}>
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatEventDate(event.event_start_date)}</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatEventTime(event.event_start_time, event.event_end_time)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Events Message */}
        {events.length === 0 && !loading && (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No upcoming events</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading events...</p>
          </div>
        )}
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
            <h2 className="text-xl font-bold text-white">Academic Calendar</h2>
            <p className="text-blue-100 text-sm">View upcoming events</p>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6 space-y-6">
        {/* Mini Calendar */}
        {renderMiniCalendar()}

        {/* Upcoming Events List */}
        {renderUpcomingEvents()}
      </div>
    </div>
  );
};

export default PublicMiniCalendarWidget;






