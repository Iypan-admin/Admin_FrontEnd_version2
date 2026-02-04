import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { getBatchById, getTeacherBatchStudents, getLSRWByBatch, markLSRWComplete, getMyTutorInfo } from '../services/Api';
import { BookOpen, Users, Calendar, Clock, GraduationCap, User, CheckCircle, AlertCircle, Loader2, Award, Building, Headphones, FileText, Play } from 'lucide-react';

function BatchCourseDetailsPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [lsrwContent, setLsrwContent] = useState([]);
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'lsrw'
  
  // Get user role to conditionally show LSRW tab
  const token = localStorage.getItem('token');
  const decodedToken = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const userRole = decodedToken?.role || null;
  const isAcademic = userRole === 'academic' || userRole === 'admin';
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingLSRW, setLoadingLSRW] = useState(false);
  const [error, setError] = useState(null);
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
  const [tutorInfo, setTutorInfo] = useState(null);

  // Get full name from token
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
      return tutorInfo.full_name;
    }
    return "Teacher";
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Fetch tutor info
  useEffect(() => {
    const fetchTutorInfo = async () => {
      try {
        const data = await getMyTutorInfo();
        setTutorInfo(data);
      } catch (error) {
        console.error("Failed to fetch tutor info:", error);
      }
    };
    fetchTutorInfo();
  }, []);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');
        if (!batchId) throw new Error('Batch ID is required');

        setLoadingBatch(true);
        const response = await getBatchById(token, batchId);

        if (response && response.success && response.data) {
          setBatch(response.data);
        } else {
          throw new Error(response?.message || 'Failed to fetch batch details');
        }
      } catch (err) {
        console.error('Error fetching batch details:', err);
        setError(err.message || 'Failed to load batch details');
      } finally {
        setLoadingBatch(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');
        if (!batchId) throw new Error('Batch ID is required');

        setLoadingStudents(true);
        const response = await getTeacherBatchStudents(batchId, token);

        // Update this condition to match new response structure
        if (response && response.success && Array.isArray(response.data)) {
          setStudents(response.data); // response.data already contains the formatted student data
        } else {
          throw new Error('Invalid students data format');
        }
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(err.message || 'Failed to load details');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [batchId]);

  useEffect(() => {
    if (activeTab === 'lsrw' && batchId && isAcademic) {
      fetchLSRWContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, batchId, isAcademic]);

  const fetchLSRWContent = async () => {
    try {
      setLoadingLSRW(true);
      const token = localStorage.getItem('token');
      const response = await getLSRWByBatch(batchId, token, 'listening');
      if (response && response.success) {
        setLsrwContent(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching LSRW content:', err);
    } finally {
      setLoadingLSRW(false);
    }
  };

  const handleMarkComplete = async (mappingId) => {
    if (!window.confirm('Mark this lesson as completed? Students will be able to see it.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await markLSRWComplete(mappingId, token);
      alert('Lesson marked as completed!');
      fetchLSRWContent();
    } catch (err) {
      alert('Failed to mark lesson as complete: ' + err.message);
    }
  };

  if (loadingBatch) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Course Details</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="text-center py-20">
                  <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Details</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg transition-all duration-200" style={{ backgroundColor: '#e3f2fd' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'} onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
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
                    {batch?.batch_name || 'Course Details'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Course Details & Student Information
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <TeacherNotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {tutorInfo?.profile_photo ? (
                      <img
                        src={tutorInfo.profile_photo}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all" onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
                      </div>
                    )}
                  </button>

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
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ '--focus-ring': '#2196f3' }} onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onBlur={(e) => e.target.style.boxShadow = 'none'}>
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
                              navigate('/teacher');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-sm text-gray-700">Dashboard</span>
                          </button>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              localStorage.removeItem('token');
                              window.dispatchEvent(new Event('storage'));
                              navigate('/');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium">Logout</span>
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

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {batch && (
            <>
              {/* Enhanced Course Overview */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
                    <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                      <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Course Overview</h2>
                        <p className="text-sm text-gray-600">Batch information and details</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Batch Name</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.batch_name}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5 border border-green-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <GraduationCap className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Course Name</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.course_name || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border border-purple-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Clock className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Duration</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.duration} months</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-5 border border-orange-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <Building className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Center</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.center_name || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-5 border border-indigo-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Created At</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation - BERRY Style */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mb-6">
                    <div className="flex space-x-2 border-b border-gray-200 mb-6">
                      <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                          activeTab === 'students'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Students</span>
                          {students.length > 0 && (
                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                              {students.length}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Only show LSRW tab for academic/admin roles */}
                      {isAcademic && (
                        <button
                          onClick={() => setActiveTab('lsrw')}
                          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                            activeTab === 'lsrw'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Headphones className="w-4 h-4" />
                            <span>LSRW</span>
                            {lsrwContent.length > 0 && (
                              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                {lsrwContent.length}
                              </span>
                            )}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Students Tab Content */}
                    {activeTab === 'students' && (
                      <div>
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Enrolled Students</h2>
                          <p className="text-sm text-gray-600">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
                        </div>
                      </div>
                    </div>
                    
                    {loadingStudents ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Students</h3>
                      </div>
                    ) : students.length > 0 ? (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4" />
                                    <span>Registration</span>
                                  </div>
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4" />
                                    <span>Student Name</span>
                                  </div>
                                </th>
                                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4" />
                                    <span>Center</span>
                                  </div>
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Status</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {students.map((student, index) => (
                                <tr key={student.enrollment_id} className="hover:bg-blue-50 transition-colors duration-200">
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                                      {student.registration_number}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                      </div>
                                      <div className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">
                                        {student.name}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{student.center_name}</div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      student.status 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                        student.status ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                      {student.status ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        </div>
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Students Enrolled</h4>
                        <p className="text-gray-500 text-sm sm:text-base">No students have been enrolled in this batch yet</p>
                      </div>
                    )}
                      </div>
                    )}

                    {/* LSRW Tab Content */}
                    {activeTab === 'lsrw' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                              <Headphones className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Listening Lessons</h2>
                              <p className="text-sm text-gray-600">Manage LSRW content for this batch</p>
                            </div>
                          </div>
                        </div>

                        {loadingLSRW ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Lessons</h3>
                          </div>
                        ) : lsrwContent.length > 0 ? (
                          <div className="space-y-4">
                            {lsrwContent.map((mapping) => {
                              const content = mapping.lsrw_content;
                              if (!content) return null;

                              return (
                                <div key={mapping.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <h3 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h3>
                                      {content.instruction && (
                                        <p className="text-gray-600 mb-3">{content.instruction}</p>
                                      )}
                                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>Max Marks: {content.max_marks}</span>
                                        <span>•</span>
                                        <span>Type: {content.module_type}</span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                        mapping.tutor_status === 'completed'
                                          ? 'bg-green-100 text-green-800 border border-green-200'
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                      }`}>
                                        {mapping.tutor_status === 'completed' ? 'Completed' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-4 mb-4">
                                    {content.audio_url && (
                                      <a
                                        href={content.audio_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <Play className="w-4 h-4" />
                                        <span>Play Audio</span>
                                      </a>
                                    )}
                                    {content.question_doc_url && (
                                      <a
                                        href={content.question_doc_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>View Questions</span>
                                      </a>
                                    )}
                                  </div>

                                  {mapping.tutor_status === 'pending' && (
                                    <button
                                      onClick={() => handleMarkComplete(mapping.id)}
                                      className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold"
                                    >
                                      Mark as Completed
                                    </button>
                                  )}

                                  {mapping.tutor_status === 'completed' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <p className="text-sm text-green-800">
                                        ✓ Lesson completed. Students can now access this content.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                              <Headphones className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No LSRW Lessons</h4>
                            <p className="text-gray-500">No listening lessons have been uploaded for this course yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchCourseDetailsPage;

