import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { getMergeGroups, getEffectiveBatchesForDate, getGMeetsByBatch, getMyTutorInfo } from '../services/Api';

function TeacherClassesPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mergeGroups, setMergeGroups] = useState([]);
  const [selectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [activeTab, setActiveTab] = useState('current');
  const [schedules, setSchedules] = useState({});
  const [expandedBatches, setExpandedBatches] = useState(new Set());
  const [tutorInfo, setTutorInfo] = useState(null);
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Teacher";
  };

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

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
    const fetchTutorInfo = async () => {
      try {
        const data = await getMyTutorInfo();
        setTutorInfo(data || null);
      } catch (error) {
        console.error('Error fetching tutor info:', error);
      }
    };

    fetchTutorInfo();
  }, []);

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
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Welcome Text */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Hamburger Menu Toggle - Light Blue Square (Mobile/Tablet Only) */}
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg transition-all duration-200"
                  style={{ backgroundColor: '#e3f2fd' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                  title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Your Classes
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage and access your teaching classes
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <TeacherNotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {tutorInfo?.profile_photo ? (
                      <img
                        src={tutorInfo.profile_photo}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all"
                        onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.3)'}
                        onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.3)'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(to right, #e3f2fd, #e3f2fd)' }}>
                          <h3 className="font-bold text-gray-800 text-base">
                            Good Morning, {getDisplayName()?.split(' ')[0] || "Teacher"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Teacher</p>
                        </div>
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
                        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Allow Notifications</span>
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ '--tw-ring-color': '#2196f3' }} onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.5)'} onBlur={(e) => e.target.style.boxShadow = 'none'}>
                              <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                            </button>
                          </div>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/teacher/tutor-info');
                              setIsProfileDropdownOpen(false);
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
                              navigate('/teacher/tutor-info');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-gray-700">Social Profile</span>
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem("token");
                              navigate("/login");
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

        {/* Main Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Statistics Dashboard - BERRY Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Classes Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Classes</p>
                    <p className="text-gray-800 text-3xl font-bold">{totalClasses}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: '#e3f2fd' }}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Classes Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Active Classes</p>
                    <p className="text-gray-800 text-3xl font-bold">{activeClasses}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Completed Classes Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Completed Classes</p>
                    <p className="text-gray-800 text-3xl font-bold">{completedClasses}</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - BERRY Style */}
            <div className="flex space-x-2 bg-white rounded-xl shadow-lg p-2 border border-gray-200">
                <button
                  onClick={() => setActiveTab('current')}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'current'
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={activeTab === 'current' ? { backgroundColor: '#2196f3' } : {}}
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
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={activeTab === 'completed' ? { backgroundColor: '#2196f3' } : {}}
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
              
            {/* Error Message - BERRY Style */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center shadow-sm">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Loading State - BERRY Style */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                <div className="inline-block">
                  <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mt-6">Loading your classes...</h3>
                <p className="text-gray-600 text-sm mt-2">Please wait while we fetch your teaching classes</p>
              </div>
            ) : (
              <>
                {/* Class Cards Grid - BERRY Style */}
                {filteredBatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
                    {filteredBatches.map((batch, index) => (
                      <div 
                        key={batch.batch_id} 
                        onClick={() => handleBatchClick(batch.batch_id)}
                        className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:-translate-y-1 relative overflow-hidden cursor-pointer"
                      >
                        {/* Card Header */}
                        <div className="p-4 sm:p-5 border-b border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 truncate">
                                {batch.batch_name}
                              </h3>
                              <div className="flex items-center space-x-2 mb-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm text-gray-600 truncate">{batch.center_name}</span>
                              </div>
                              {/* Status Badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(batch.status || 'active')}`}>
                                  <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                    batch.status === 'active' ? 'bg-green-400 animate-pulse' : 
                                    batch.status === 'Completed' ? 'bg-blue-400' : 
                                    batch.status === 'completed' ? 'bg-blue-400' : 
                                    'bg-gray-400'
                                  }`}></div>
                                  {batch.status || 'Active'}
                                </span>
                                {batch.role_tag === "Sub Teacher" && (
                                  <span className="inline-flex items-center bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-medium">
                                    Sub Teacher
                                  </span>
                                )}
                                {batch.role_tag === "Main Teacher" && (
                                  <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium">
                                    Main Teacher
                                  </span>
                                )}
                                {batch.role_tag === "Assistant Tutor" && (
                                  <span className="inline-flex items-center bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-xs font-medium">
                                    Assistant
                                  </span>
                                )}
                              </div>
                            </div>
                          <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: '#e3f2fd' }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        </div>

                        {/* Course Information */}
                        <div className="space-y-2">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="text-xs text-gray-500 font-medium">Course</p>
                          </div>
                          <p className="font-semibold text-gray-800 text-sm mb-1">{batch.course_name}</p>
                          <p className="text-xs text-gray-600">{batch.course_type}</p>
                        </div>
                        
                        {/* Merge Group Info */}
                        {(() => {
                          const mergeGroup = mergeGroups.find(group => 
                            group.batches && group.batches.some(b => b.batch_id === batch.batch_id)
                          );
                          
                          if (mergeGroup && mergeGroup.batches) {
                            const batchNumbers = mergeGroup.batches
                              .map(b => {
                                if (!b.batch_name) return '';
                                const match = b.batch_name.match(/^([^-]+)/);
                                return match ? match[1] : b.batch_name;
                              })
                              .filter(name => name)
                              .join(', ');
                            
                            return (
                              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#e3f2fd', borderColor: '#90caf9' }}>
                                <div className="flex items-center space-x-2 mb-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  <p className="text-xs text-gray-500 font-medium">Merged With</p>
                                </div>
                                <p className="font-semibold text-gray-800 text-sm">{batchNumbers}</p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        </div>
                      </div>

                      {/* Detailed Information Section */}
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Schedule Information */}
                        {(batch.start_date || batch.end_date) && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-gray-500 font-medium">Schedule</p>
                            </div>
                            <div className="space-y-1.5">
                              {batch.start_date && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Start Date:</span>
                                  <span className="font-medium text-gray-800">{formatDate(batch.start_date)}</span>
                                </div>
                              )}
                              {batch.end_date && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">End Date:</span>
                                  <span className="font-medium text-gray-800">{formatDate(batch.end_date)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          )}

                        {/* Batch Type and Duration */}
                        <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            batch.type === 'Online' 
                              ? 'bg-blue-100 text-blue-800' 
                              : ''
                          }`}
                          style={batch.type !== 'Online' ? { backgroundColor: '#e3f2fd', color: '#1565c0' } : {}}
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {getTypeIcon(batch.type)}
                            </svg>
                            {batch.type}
                          </span>
                        </div>
                        {batch.duration && (
                          <div className="text-right">
                            <span className="text-xs text-gray-500 block">Duration</span>
                            <p className="text-sm font-semibold text-gray-800">{batch.duration}</p>
                          </div>
                        )}
                        </div>

                        {/* Class Schedule Overview */}
                        <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h4 className="text-sm font-semibold text-gray-800">Upcoming Classes</h4>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBatchExpansion(batch.batch_id);
                            }}
                            className="text-sm font-medium transition-colors"
                            style={{ color: '#2196f3' }}
                            onMouseEnter={(e) => e.target.style.color = '#1976d2'}
                            onMouseLeave={(e) => e.target.style.color = '#2196f3'}
                          >
                            {expandedBatches.has(batch.batch_id) ? 'Hide' : 'View All'}
                          </button>
                        </div>
                        
                        {expandedBatches.has(batch.batch_id) && (
                          <div className="space-y-2">
                            {schedules[batch.batch_id] && schedules[batch.batch_id].length > 0 ? (
                              schedules[batch.batch_id].slice(0, 3).map((classItem) => {
                                const status = getClassStatus(classItem);
                                return (
                                  <div key={classItem.meet_id} className="bg-white p-3 rounded-lg border border-gray-200 transition-colors" onMouseEnter={(e) => e.target.style.borderColor = '#90caf9'} onMouseLeave={(e) => e.target.style.borderColor = '#e5e7eb'}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">{classItem.title || 'Class Session'}</p>
                                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                                          <span className="flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatDate(classItem.date)}
                                          </span>
                                          <span className="flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {classItem.time ? classItem.time.substring(0, 5) : 'No time'}
                                          </span>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                                        status === 'Completed' 
                                          ? 'bg-green-100 text-green-800' 
                                          : ''
                                      }`}
                                      style={status !== 'Completed' ? { backgroundColor: '#e3f2fd', color: '#1565c0' } : {}}
                                      >
                                        {status}
                                      </span>
                                    </div>
                                    {classItem.meet_link && (
                                      <a 
                                        href={classItem.meet_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sm font-medium flex items-center transition-colors"
                                        style={{ color: '#2196f3' }}
                                        onMouseEnter={(e) => e.target.style.color = '#1565c0'}
                                        onMouseLeave={(e) => e.target.style.color = '#2196f3'}
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        Join Class
                                      </a>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                                No scheduled classes yet
                              </div>
                            )}
                          </div>
                        )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-gray-200 space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBatchClick(batch.batch_id);
                          }}
                          className="w-full text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center"
                          style={{ backgroundColor: '#2196f3' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Take Class
                        </button>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teacher/batch/${batch.batch_id}/assessment-marks`);
                            }}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center"
                            style={{ backgroundColor: '#f3e5f5', color: '#7b1fa2' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e1bee7'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f3e5f5'}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Assessment
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teacher/batch/${batch.batch_id}/lsrw`);
                            }}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center"
                            style={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            LSRW
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teacher/batch/${batch.batch_id}/details`);
                            }}
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all duration-300 flex-shrink-0"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                    {/* Empty State - BERRY Style */}
                    <div className="p-6 rounded-xl mx-auto w-fit mb-6" style={{ backgroundColor: '#e3f2fd' }}>
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      No Classes Found
                    </h3>
                    <p className="text-gray-600 text-base mb-6 max-w-md mx-auto">
                      You haven't been assigned to any classes yet. Check back later or contact your administrator.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#64b5f6' }}></div>
                        <span className="text-gray-700 text-sm font-medium">Waiting for assignments</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherClassesPage;