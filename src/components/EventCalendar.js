import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, MapPin, Clock, Users, AlertCircle } from 'lucide-react';
import { getEventsByDateRange, createEvent, updateEvent, deleteEvent } from '../services/Api';

const EventCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day

  // Function to populate form when editing an event
  const populateEditForm = (event) => {
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'general',
      event_start_date: event.event_start_date || '',
      event_end_date: event.event_end_date || '',
      event_start_time: event.event_start_time || '',
      event_end_time: event.event_end_time || ''
    });
  };

  // Form state for creating/editing events
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'general',
    event_start_date: '',
    event_end_date: '',
    event_start_time: '',
    event_end_time: ''
  });

  // =====================================================
  // FETCH EVENTS
  // =====================================================
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
      // For day view, start and end are the same date

      // Use local date strings to avoid timezone issues
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

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.event_start_time && formData.event_end_time && formData.event_start_time >= formData.event_end_time) {
      setError('End time must be after start time');
      return;
    }
    
    if (formData.event_start_date && new Date(formData.event_start_date) < new Date().setHours(0, 0, 0, 0)) {
      setError('Event start date cannot be in the past');
      return;
    }

    // Validate end date
    if (formData.event_end_date && new Date(formData.event_end_date) < new Date(formData.event_start_date)) {
      setError('End date must be on or after start date');
      return;
    }
    
    try {
      await createEvent(formData);

      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'general',
        event_start_date: '',
        event_end_date: '',
        event_start_time: '',
        event_end_time: ''
      });
      setError(null); // Clear any previous errors
      fetchEvents();
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.event_start_time && formData.event_end_time && formData.event_start_time >= formData.event_end_time) {
      setError('End time must be after start time');
      return;
    }

    if (formData.event_start_date && new Date(formData.event_start_date) < new Date().setHours(0, 0, 0, 0)) {
      setError('Event start date cannot be in the past');
      return;
    }

    // Validate end date
    if (formData.event_end_date && new Date(formData.event_end_date) < new Date(formData.event_start_date)) {
      setError('End date must be on or after start date');
      return;
    }
    
    try {
      await updateEvent(editingEvent.id, formData);
      setShowEditModal(false);
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
      setError(null);
      fetchEvents();
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId);
        fetchEvents();
      } catch (err) {
        console.error('Error deleting event:', err);
        setError(err.message);
      }
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    populateEditForm(event);
    setShowEditModal(true);
    setError(null);
  };

  const handleCreateClick = () => {
    setShowCreateModal(true);
    setFormData({
      title: '',
      description: '',
      event_type: 'general',
      event_start_date: '',
      event_end_date: '',
      event_start_time: '',
      event_end_time: ''
    });
    setError(null);
  };

  // =====================================================
  // EVENT TYPE COLORS
  // =====================================================
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
      default: return '📅';
    }
  };

  // =====================================================
  // CALENDAR RENDERING
  // =====================================================
  const renderCalendar = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = events.filter(event => {
        // Use local date string for comparison to avoid timezone issues
        const currentDateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
        
        // Check if the date matches the start date
        if (event.event_start_date === currentDateStr) {
          return true;
        }
        
        // Check if the date falls within the range (start_date to end_date)
        if (event.event_end_date && event.event_start_date && event.event_end_date !== event.event_start_date) {
          const eventStartDate = new Date(event.event_start_date);
          const eventEndDate = new Date(event.event_end_date);
          const currentDate = new Date(currentDateStr);
          
          return currentDate >= eventStartDate && currentDate <= eventEndDate;
        }
        
        return false;
      });
      
      days.push(
        <div
          key={i}
          className={`p-2 sm:p-3 min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] border border-gray-100 transition-all duration-200 hover:bg-gray-50 ${
            currentDay.getMonth() !== month 
              ? 'bg-gray-50 text-gray-400' 
              : 'bg-white hover:shadow-md'
          } ${
            currentDay.toDateString() === today.toDateString() 
              ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-md' 
              : ''
          }`}
        >
          <div className="flex justify-between items-center mb-1 sm:mb-2">
            <span className={`text-sm sm:text-lg font-bold ${
              currentDay.toDateString() === today.toDateString() 
                ? 'text-blue-600 bg-blue-100 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center' 
                : 'text-gray-800'
            }`}>
              {currentDay.getDate()}
            </span>
            {currentDay.getMonth() === month && (
              <button
                onClick={() => {
                  setSelectedDate(new Date(currentDay));
                  setFormData(prev => ({
                    ...prev,
                    event_start_date: `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`
                  }));
                  setShowCreateModal(true);
                }}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded-full transition-all duration-200"
              >
                <Plus size={12} className="sm:hidden" />
                <Plus size={14} className="hidden sm:block" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs p-1 sm:p-2 rounded-lg cursor-pointer hover:opacity-80 transition-all duration-200 shadow-sm hover:shadow-md ${getEventTypeColor(event.event_type)}`}
                onClick={() => handleEditEvent(event)}
                title={`${event.title} - ${event.event_type}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs">{getEventTypeIcon(event.event_type)}</span>
                  <span className="text-xs font-medium opacity-90 capitalize hidden sm:inline">{event.event_type}</span>
                </div>
                <div className="font-semibold truncate text-xs leading-tight">{event.title}</div>
                {event.event_start_time && (
                  <div className="text-xs opacity-90 mt-1 font-medium hidden sm:block">{event.event_start_time}</div>
                )}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-1 sm:px-2 py-1 rounded-full text-center font-medium">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const renderEventList = () => {
    return events.map(event => (
      <div key={event.id} className="bg-white p-6 rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm hover:shadow-xl transition-all duration-300 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl ${getEventTypeColor(event.event_type)}`}>
                {getEventTypeIcon(event.event_type)}
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">{event.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                  {event.event_type}
                </span>
              </div>
            </div>
            {event.description && (
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <Calendar size={16} className="text-blue-600" />
                <span className="font-medium text-gray-700">{new Date(event.event_start_date).toLocaleDateString()}</span>
                {event.event_end_date && event.event_end_date !== event.event_start_date && (
                  <span className="text-gray-500"> - {new Date(event.event_end_date).toLocaleDateString()}</span>
                )}
              </div>
              {event.event_start_time && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Clock size={16} className="text-green-600" />
                  <span className="font-medium text-gray-700">{event.event_start_time}</span>
                  {event.event_end_time && <span className="text-gray-500"> - {event.event_end_time}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 ml-6">
            <button
              onClick={() => handleEditEvent(event)}
              className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:shadow-md"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => handleDeleteEvent(event.id)}
              className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:shadow-md"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20 backdrop-blur-sm w-full lg:w-auto">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Event Calendar
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage academic events and schedules</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
            <div className="flex bg-white rounded-xl shadow-lg border border-white/20 backdrop-blur-sm overflow-hidden w-full sm:w-auto">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm ${
                  viewMode === 'month' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm ${
                  viewMode === 'week' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all duration-200 text-xs sm:text-sm ${
                  viewMode === 'day' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
            </div>
            <button
              onClick={handleCreateClick}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              <Plus size={16} className="sm:hidden" />
              <Plus size={20} className="hidden sm:block" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 bg-white rounded-2xl p-3 sm:p-4 shadow-lg border border-white/20 backdrop-blur-sm w-full sm:w-auto">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (viewMode === 'month') {
                  newDate.setMonth(newDate.getMonth() - 1);
                } else if (viewMode === 'week') {
                  newDate.setDate(newDate.getDate() - 7);
                } else {
                  newDate.setDate(newDate.getDate() - 1);
                }
                setCurrentDate(newDate);
              }}
              className="p-2 sm:p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 group"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                <div className="w-0 h-0 border-l-0 border-r-[6px] sm:border-r-[8px] border-t-[4px] sm:border-t-[6px] border-b-[4px] sm:border-b-[6px] border-r-transparent border-t-transparent border-b-transparent border-l-gray-600 group-hover:border-l-blue-600 transition-colors"></div>
              </div>
            </button>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (viewMode === 'month') {
                  newDate.setMonth(newDate.getMonth() + 1);
                } else if (viewMode === 'week') {
                  newDate.setDate(newDate.getDate() + 7);
                } else {
                  newDate.setDate(newDate.getDate() + 1);
                }
                setCurrentDate(newDate);
              }}
              className="p-2 sm:p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 group"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                <div className="w-0 h-0 border-r-0 border-l-[6px] sm:border-l-[8px] border-t-[4px] sm:border-t-[6px] border-b-[4px] sm:border-b-[6px] border-l-transparent border-t-transparent border-b-transparent border-r-gray-600 group-hover:border-r-blue-600 transition-colors"></div>
              </div>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
            >
              Today
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Event Type Legend */}
        <div className="mb-6 sm:mb-8 bg-white rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            Event Type Legend
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {[
              { type: 'meeting', label: 'Meeting', icon: '👥' },
              { type: 'exam', label: 'Exam', icon: '📝' },
              { type: 'holiday', label: 'Holiday', icon: '🎉' },
              { type: 'training', label: 'Training', icon: '🎓' },
              { type: 'workshop', label: 'Workshop', icon: '🔧' },
              { type: 'conference', label: 'Conference', icon: '🎤' },
              { type: 'general', label: 'General', icon: '📅' }
            ].map(({ type, label, icon }) => (
              <div key={type} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${getEventTypeColor(type)} flex items-center justify-center text-xs`}>
                  {icon}
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'month' && (
          <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 sm:p-4 text-center font-bold text-gray-700 border-r border-gray-100 last:border-r-0 text-xs sm:text-sm">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {renderCalendar()}
            </div>
          </div>
        )}

        {/* List View for Week/Day */}
        {(viewMode === 'week' || viewMode === 'day') && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-blue-600" size={32} />
                </div>
                <p className="text-gray-600 font-medium">No events found for this period</p>
              </div>
            ) : (
              renderEventList()
            )}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
              </div>
              <form onSubmit={handleCreateEvent}>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="meeting">Meeting</option>
                      <option value="exam">Exam</option>
                      <option value="holiday">Holiday</option>
                      <option value="training">Training</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={formData.event_start_date}
                        onChange={(e) => setFormData({...formData, event_start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.event_end_date}
                        onChange={(e) => setFormData({...formData, event_end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.event_start_time}
                        onChange={(e) => setFormData({...formData, event_start_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.event_end_time}
                        onChange={(e) => setFormData({...formData, event_end_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditModal && editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
              </div>
              <form onSubmit={handleUpdateEvent}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="meeting">Meeting</option>
                      <option value="exam">Exam</option>
                      <option value="holiday">Holiday</option>
                      <option value="training">Training</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={formData.event_start_date}
                        onChange={(e) => setFormData({...formData, event_start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.event_end_date}
                        onChange={(e) => setFormData({...formData, event_end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.event_start_time}
                        onChange={(e) => setFormData({...formData, event_start_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.event_end_time}
                        onChange={(e) => setFormData({...formData, event_end_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:from-green-600 hover:to-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Update Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCalendar;