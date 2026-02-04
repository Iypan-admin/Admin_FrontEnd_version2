import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import { getStudentById, getStudentBatchHistory } from '../services/Api';
import { User, Mail, Phone, Calendar, MapPin, BookOpen, Building2, GraduationCap, ArrowLeft } from 'lucide-react';

const StudentDetailViewPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
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

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  const userRole = decodedToken?.role || null;
  
  // Helper function to check if a name is a full name (has spaces) vs username
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    if (userRole === 'admin') return "Administrator";
    if (userRole === 'manager') return "Manager";
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
    handleSidebarToggle();
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Fetch student details
  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch student details
        const studentResponse = await getStudentById(studentId);
        
        if (studentResponse && studentResponse.data) {
          setStudent(studentResponse.data);
        } else if (studentResponse && studentResponse.success && studentResponse.student) {
          setStudent(studentResponse.student);
        } else {
          throw new Error('Student not found');
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
        setError(error.message || 'Failed to load student details');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentDetails();
    }
  }, [studentId]);

  // Fetch student batches
  useEffect(() => {
    const fetchStudentBatches = async () => {
      if (!studentId) return;
      
      try {
        setLoadingBatches(true);
        const response = await getStudentBatchHistory(studentId);
        
        if (response && response.success && response.enrollments) {
          // Transform enrollments to get batch details
          const batchList = response.enrollments.map(enrollment => ({
            ...enrollment.batches,
            enrollment_id: enrollment.enrollment_id,
            enrollment_status: enrollment.status,
            enrollment_date: enrollment.created_at,
            enrollment_end_date: enrollment.end_date,
            course: enrollment.batches?.courses,
            center: enrollment.batches?.centers,
            teacher: enrollment.batches?.teachers?.users
          }));
          setBatches(batchList);
        } else if (response && response.enrollments) {
          const batchList = response.enrollments.map(enrollment => ({
            ...enrollment.batches,
            enrollment_id: enrollment.enrollment_id,
            enrollment_status: enrollment.status,
            enrollment_date: enrollment.created_at,
            enrollment_end_date: enrollment.end_date,
            course: enrollment.batches?.courses,
            center: enrollment.batches?.centers,
            teacher: enrollment.batches?.teachers?.users
          }));
          setBatches(batchList);
        }
      } catch (error) {
        console.error('Error fetching student batches:', error);
        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    if (studentId) {
      fetchStudentBatches();
    }
  }, [studentId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhone = (phone) => {
    return phone
      ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
      : "N/A";
  };

  const handleBatchClick = (batchId) => {
    navigate(`/manage-batches/${batchId}`);
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'approved') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
    } else if (statusLower === 'started') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Started</span>;
    } else if (statusLower === 'completed') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Completed</span>;
    } else if (statusLower === 'pending') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pending</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status || 'N/A'}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading student details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-4">{error || 'Student not found'}</div>
            <button
              onClick={() => navigate('/manage-students')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                  title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => navigate(userRole === 'academic' ? '/manage-students' : '/students')}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Details</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">View complete student information</p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}
                {userRole === 'academic' && <AcademicNotificationBell />}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                      {getDisplayName()?.charAt(0).toUpperCase() || "A"}
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">{userRole || "Academic Coordinator"}</p>
                        </div>

                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/academic-coordinator/settings');
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
                              localStorage.removeItem("token");
                              navigate("/");
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

        {/* Main Content - Two Column Layout */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
              
              {/* Left Side - Student Profile & Details (30%) */}
              <div className="space-y-4">
                {/* Student Profile Card */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {/* Avatar & Name */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-2xl mb-3">
                      {student.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{student.name || 'N/A'}</h2>
                    <p className="text-sm text-blue-100">{student.registration_number || 'N/A'}</p>
                    {student.status !== undefined && (
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          student.status 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {student.status ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Statistics */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{batches.length}</div>
                        <div className="text-xs text-gray-600 mt-1">Batches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {batches.filter(b => b.enrollment_status).length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Active</div>
                      </div>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="p-4 space-y-4">
                    {/* Current Status */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Status</p>
                      </div>
                      <div>
                        {student.status !== undefined ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            student.status 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {student.status ? 'Active' : 'Inactive (Pending)'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">N/A</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{student.email || 'N/A'}</p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatPhone(student.phone) || 'N/A'}</p>
                    </div>

                    {/* Center Name - Always show if available */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Center</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{student.center_name || 'N/A'}</p>
                    </div>

                    {/* Registration Number */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration Number</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{student.registration_number || 'N/A'}</p>
                    </div>

                    {/* State - Show state name if available */}
                    {student.state_name && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">State</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{student.state_name}</p>
                      </div>
                    )}

                    {/* Referred By - Show only if student is referred (is_referred is true) */}
                    {student.is_referred && student.referring_center_name && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Referred By</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{student.referring_center_name}</p>
                      </div>
                    )}

                    {/* Registration Date */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered Date</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(student.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Batches List (70%) */}
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">Enrolled Batches</h3>
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{batches.length} {batches.length === 1 ? 'batch' : 'batches'}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    {loadingBatches ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm font-semibold text-gray-500 mb-1">No batches found</p>
                        <p className="text-xs text-gray-400">This student is not enrolled in any batches yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {batches.map((batch) => (
                          <div
                            key={batch.batch_id || batch.enrollment_id}
                            onClick={() => handleBatchClick(batch.batch_id)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="text-sm font-bold text-gray-900">{batch.batch_name || 'N/A'}</h4>
                                  {getStatusBadge(batch.status)}
                                  {batch.enrollment_status && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Enrolled</span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {batch.course && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                                      <BookOpen className="w-3 h-3" />
                                      <span>{batch.course.course_name || 'N/A'}</span>
                                      {batch.course.type && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{batch.course.type}</span>
                                      )}
                                    </div>
                                  )}
                                  {batch.center && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                                      <Building2 className="w-3 h-3" />
                                      <span>{batch.center.center_name || 'N/A'}</span>
                                    </div>
                                  )}
                                  {batch.teacher && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                                      <User className="w-3 h-3" />
                                      <span>{batch.teacher.name || 'N/A'}</span>
                                    </div>
                                  )}
                                  {batch.enrollment_date && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <Calendar className="w-3 h-3" />
                                      <span>Enrolled: {formatDate(batch.enrollment_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailViewPage;

