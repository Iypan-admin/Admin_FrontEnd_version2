import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import Navbar from '../components/Navbar';
import { getMergeGroups, getEffectiveBatchesForDate, getGMeetsByBatch } from '../services/Api';

function TeacherClassesPage() {
  const navigate = useNavigate(); // Add this
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mergeGroups, setMergeGroups] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'completed'
  const [schedules, setSchedules] = useState({}); // Store schedules for each batch
  const [expandedBatches, setExpandedBatches] = useState(new Set()); // Track expanded batches

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getTypeIcon = (type) => {
    return type === 'Online' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    );
  };

  // Fetch schedules for a specific batch
  const fetchSchedules = async (batchId) => {
    if (schedules[batchId]) return; // Already loaded
    
    try {
      const token = localStorage.getItem('token');
      const scheduleData = await getGMeetsByBatch(batchId, token);
      setSchedules(prev => ({ ...prev, [batchId]: scheduleData }));
    } catch (error) {
      console.error(`Error fetching schedules for batch ${batchId}:`, error);
      setSchedules(prev => ({ ...prev, [batchId]: [] }));
    }
  };

  // Determine if a class is upcoming or completed
  const getClassStatus = (classItem) => {
    if (!classItem.date || !classItem.time) {
      return 'Upcoming';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const classDate = new Date(classItem.date + 'T' + classItem.time);
    
    if (classDate < today) {
      return 'Completed';
    }
    return 'Upcoming';
  };

  // Toggle batch expansion
  const toggleBatchExpansion = (batchId) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
      fetchSchedules(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const fetchMergeGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getMergeGroups(token);
      if (response && response.data) {
        setMergeGroups(response.data);
      }
    } catch (error) {
      console.error('Error fetching merge groups:', error);
    }
  };

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await getEffectiveBatchesForDate(selectedDate);
        const resolved = response.data || [];
        setBatches(resolved);
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError('Failed to load your classes');
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
    fetchMergeGroups();
  }, [selectedDate]);

  // Filter batches based on active tab
  const filteredBatches = batches.filter(batch => {
    if (activeTab === 'completed') {
      // Show only completed batches
      return batch.status === 'Completed' || batch.status === 'completed';
    } else {
      // Show all non-completed batches (current batches)
      return batch.status !== 'Completed' && batch.status !== 'completed';
    }
  });

  // Calculate statistics
  const totalClasses = batches.length;
  const activeClasses = batches.filter(b => b.status !== 'Completed' && b.status !== 'completed').length;
  const completedClasses = batches.filter(b => b.status === 'Completed' || b.status === 'completed').length;

  // Modify the handleBatchClick function - Navigate to Take Class page for the batch
  const handleBatchClick = (batchId) => {
    // Navigate to Take Class page for this batch
    navigate(`/teacher/batch/${batchId}/take-class`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Fixed Sidebar Navbar */}
      <Navbar />
      
      {/* Main Content Area - Fixed positioning with scrollable content */}
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-2 sm:p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Compact Header Section */}
              <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
                {/* Simplified Background Elements */}
                <div className="absolute inset-0 bg-black/5"></div>
                <div className="absolute -top-2 -right-2 w-24 sm:w-32 h-24 sm:h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
                
                <div className="relative p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 group">
                      <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-105 transition-all duration-300">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="text-center sm:text-left">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                          Your Classes
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base font-medium">
                          📚 Manage and access your teaching classes
                        </p>
                      </div>
                    </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white text-xs font-medium">Live</span>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 rounded-full">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white text-xs font-medium">{batches.length} Classes</span>
                      </div>
                        <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 rounded-full">
                          <input
                            type="date"
                            className="bg-transparent text-white text-xs outline-none"
                            value={selectedDate}
                            onChange={(e)=>{ setLoading(true); setSelectedDate(e.target.value); }}
                          />
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Classes Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-semibold mb-1">Total Classes</p>
                      <p className="text-white text-3xl font-bold">{totalClasses}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Active Classes Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-semibold mb-1">Active Classes</p>
                      <p className="text-white text-3xl font-bold">{activeClasses}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Completed Classes Card */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-semibold mb-1">Completed Classes</p>
                      <p className="text-white text-3xl font-bold">{completedClasses}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-2 bg-white rounded-xl shadow-lg p-2">
                <button
                  onClick={() => setActiveTab('current')}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'current'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Current Batches</span>
                    {batches.filter(b => b.status !== 'Completed' && b.status !== 'completed').length > 0 && (
                      <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {batches.filter(b => b.status !== 'Completed' && b.status !== 'completed').length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'completed'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Completed Batches</span>
                    {batches.filter(b => b.status === 'Completed' || b.status === 'completed').length > 0 && (
                      <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {batches.filter(b => b.status === 'Completed' || b.status === 'completed').length}
                      </span>
                    )}
                  </div>
                </button>
              </div>
              
              {/* Enhanced Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border border-red-200 text-red-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center shadow-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-red-400 to-rose-500 rounded-full mr-3 sm:mr-4 shadow-lg flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-base sm:text-lg block">{error}</span>
                    <p className="text-red-600 text-xs sm:text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
                  </div>
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0 mt-2 sm:mt-0"></div>
                </div>
              )}

              {/* Enhanced Loading State */}
              {loading ? (
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 animate-pulse"></div>
                  <div className="absolute top-4 right-4 w-24 sm:w-32 h-24 sm:h-32 bg-blue-200/20 rounded-full blur-2xl animate-bounce"></div>
                  <div className="absolute bottom-4 left-4 w-20 sm:w-24 h-20 sm:h-24 bg-purple-200/20 rounded-full blur-xl animate-bounce delay-1000"></div>
                  
                  <div className="relative z-10">
                    <div className="relative inline-block">
                      {/* Outer Ring */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border-4 border-blue-200 rounded-full animate-spin"></div>
                      {/* Inner Ring */}
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-13 sm:w-16 lg:w-20 h-13 sm:h-16 lg:h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                      {/* Center Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Loading your classes...</h3>
                      <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Please wait while we fetch your teaching classes</p>
                      <div className="flex justify-center space-x-1 mt-3 sm:mt-4">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Enhanced Class Cards Grid with Full Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
                  {filteredBatches.map((batch, index) => (
                    <div 
                      key={batch.batch_id} 
                      onClick={() => handleBatchClick(batch.batch_id)}
                      className="group bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-blue-100/50 transform hover:-translate-y-1 hover:scale-102 relative overflow-hidden cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Decorative Background Elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-200/20 to-blue-200/20 rounded-full blur-xl"></div>
                      
                      {/* Card Header */}
                      <div className="relative p-2 sm:p-3 border-b border-blue-100/50">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                            {batch.batch_name}
                          </h3>
                            <div className="flex items-center space-x-1 mb-1">
                              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-xs text-gray-600 font-medium truncate">{batch.center_name}</span>
                            </div>
                            {/* Status Badge + Role Tag */}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch.status || 'active')}`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                batch.status === 'active' ? 'bg-green-400 animate-pulse' : 
                                batch.status === 'Completed' ? 'bg-blue-400' : 
                                batch.status === 'completed' ? 'bg-blue-400' : 
                                'bg-gray-400'
                              }`}></div>
                              {batch.status || 'Active'}
                              {batch.role_tag === "Sub Teacher" ? (
                                <span className="ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  {`You are Sub Teacher${batch.sub_date_from && batch.sub_date_to ? ` from ${batch.sub_date_from} to ${batch.sub_date_to}` : (selectedDate ? ` for ${selectedDate}` : '')}`}
                                </span>
                              ) : batch.role_tag === "Main Teacher" ? (
                                <span className="ml-2 inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  {batch.assistant_tutor_name 
                                    ? `You are the main teacher of this batch. Your assistant tutor is ${batch.assistant_tutor_name}`
                                    : `You are the main teacher of this batch`
                                  }
                                </span>
                              ) : batch.role_tag === "Assistant Tutor" ? (
                                <span className="ml-2 inline-flex items-center bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  {batch.main_teacher_name 
                                    ? `You are the assistant tutor of this batch. Main teacher is ${batch.main_teacher_name}`
                                    : `You are the assistant tutor of this batch`
                                  }
                                </span>
                              ) : null}
                          </span>
                          </div>
                          <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        </div>

                        {/* Course Information */}
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          <div className="flex-1 min-w-full bg-gradient-to-r from-blue-50 to-indigo-50 p-1.5 rounded-lg border border-blue-100">
                            <div className="flex items-center space-x-1 mb-0.5">
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <p className="text-xs text-blue-600 font-semibold">Course</p>
                            </div>
                            <p className="font-semibold text-gray-800 text-xs truncate">{batch.course_name}</p>
                            <p className="text-xs text-gray-600 truncate">{batch.course_type}</p>
                          </div>
                          
                          {/* Merge Group Info */}
                          {(() => {
                            const mergeGroup = mergeGroups.find(group => 
                              group.batches && group.batches.some(b => b.batch_id === batch.batch_id)
                            );
                            
                            if (mergeGroup && mergeGroup.batches) {
                              // Extract batch numbers
                              const batchNumbers = mergeGroup.batches
                                .map(b => {
                                  if (!b.batch_name) return '';
                                  const match = b.batch_name.match(/^([^-]+)/);
                                  return match ? match[1] : b.batch_name;
                                })
                                .filter(name => name)
                                .join(', ');
                              
                              return (
                                <div className="flex-1 min-w-full bg-gradient-to-r from-purple-50 to-pink-50 p-1.5 rounded-lg border border-purple-100">
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <p className="text-xs text-purple-600 font-semibold">Merged With</p>
                                  </div>
                                  <p className="font-semibold text-gray-800 text-xs truncate">{batchNumbers}</p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Detailed Information Section */}
                      <div className="relative p-2 sm:p-3 space-y-1.5">

                        {/* Schedule Information */}
                        {(batch.start_date || batch.end_date) && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-1.5 rounded-lg border border-purple-100">
                            <div className="flex items-center space-x-1 mb-1">
                              <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-purple-600 font-semibold">Schedule</p>
                            </div>
                            <div className="space-y-1">
                              {batch.start_date && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Start:</span>
                                  <span className="font-medium text-gray-800 text-xs">{formatDate(batch.start_date)}</span>
                                </div>
                              )}
                              {batch.end_date && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">End:</span>
                                  <span className="font-medium text-gray-800 text-xs">{formatDate(batch.end_date)}</span>
                                </div>
                              )}
                          </div>
                          </div>
                        )}

                        {/* Batch Type and Duration */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              batch.type === 'Online' 
                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' 
                                : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300'
                            }`}>
                              <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {getTypeIcon(batch.type)}
                              </svg>
                              {batch.type}
                            </span>
                          </div>
                          {batch.duration && (
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs text-gray-500">Duration</span>
                              <p className="text-xs font-medium text-gray-700">{batch.duration}</p>
                            </div>
                          )}
                        </div>

                        {/* Class Schedule Overview */}
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <h4 className="text-xs font-semibold text-gray-900">Schedule</h4>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBatchExpansion(batch.batch_id);
                              }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              {expandedBatches.has(batch.batch_id) ? 'Hide' : 'View'}
                            </button>
                          </div>
                          
                          {expandedBatches.has(batch.batch_id) && (
                            <div className="space-y-1.5">
                              {schedules[batch.batch_id] && schedules[batch.batch_id].length > 0 ? (
                                schedules[batch.batch_id].slice(0, 2).map((classItem) => {
                                  const status = getClassStatus(classItem);
                                  return (
                                    <div key={classItem.meet_id} className="bg-white p-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                      <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-gray-900 mb-0.5 truncate">{classItem.title || 'Class Session'}</p>
                                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                                            <span className="flex items-center">
                                              <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              <span className="text-xs">{formatDate(classItem.date)}</span>
                                            </span>
                                            <span className="flex items-center">
                                              <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span className="text-xs">{classItem.time ? classItem.time.substring(0, 5) : 'No time'}</span>
                                            </span>
                                          </div>
                                        </div>
                                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                                          status === 'Completed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {status}
                                        </span>
                                      </div>
                                      {classItem.meet_link && (
                                        <a 
                                          href={classItem.meet_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                                        >
                                          <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                          </svg>
                                          Link
                                        </a>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-2 text-xs text-gray-500">
                                  No scheduled classes yet
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-1.5 pt-1.5 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBatchClick(batch.batch_id);
                            }}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Take Class
                          </button>
                          <div className="flex space-x-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/teacher/batch/${batch.batch_id}/lsrw`);
                              }}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-1.5 rounded-lg text-xs font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                              LSRW
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                                navigate(`/teacher/batch/${batch.batch_id}/details`);
                            }}
                            className="px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all duration-300 flex-shrink-0"
                              title="View Details"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          </div>
                        </div>

                        {/* Footer Information */}
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 hidden sm:flex">
                          <span className="truncate text-xs">Created {formatDate(batch.created_at)}</span>
                          {batch.updated_at && (
                            <span className="truncate text-xs ml-2">Updated {formatDate(batch.updated_at)}</span>
                          )}
                        </div>

                        {/* Hover Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
              
              {/* Enhanced Empty State */}
              {!loading && filteredBatches.length === 0 && (
                <div className="text-center py-12 sm:py-16 lg:py-20">
                  <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100/50 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-blue-200/20 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
                      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl sm:rounded-3xl shadow-xl mx-auto w-fit mb-6 sm:mb-8">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                      </div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-800 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        No Classes Found
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg lg:text-xl mb-6 max-w-md mx-auto">
                        You haven't been assigned to any classes yet. Check back later or contact your administrator.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-blue-700 text-sm font-medium">Waiting for assignments</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-indigo-700 text-sm font-medium">Check back soon</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherClassesPage;