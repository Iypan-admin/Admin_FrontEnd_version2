import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import { getAllTeachers, getAllCenters, getAllStudents, getCurrentUserProfile } from "../services/Api";

const AcademicCoordinatorPage = () => {
  const navigate = useNavigate();
  const [teacherCount, setTeacherCount] = useState(0);
  const [centerCount, setCenterCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState({
    teachers: true,
    centers: true,
    students: true,
    pending: true
  });
  const [error, setError] = useState({
    teachers: null,
    centers: null,
    students: null,
    pending: null
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
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students and filter pending ones
        const studentsResponse = await getAllStudents();
        const students = studentsResponse.data || [];
        const pending = students.filter(student => !student.status);
        setStudentCount(students.length);
        setPendingStudents(pending.slice(0, 5)); // Show only latest 5 pending students
        setLoading(prev => ({ ...prev, students: false, pending: false }));
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setError(prev => ({ 
          ...prev, 
          students: "Failed to load student count",
          pending: "Failed to load pending approvals"
        }));
        setLoading(prev => ({ ...prev, students: false, pending: false }));
      }

      try {
        // Fetch teachers - handle both array and wrapped responses
        const teachersResponse = await getAllTeachers();
        const teachers = Array.isArray(teachersResponse)
          ? teachersResponse
          : teachersResponse?.data || [];
        setTeacherCount(teachers.length);
        setLoading(prev => ({ ...prev, teachers: false }));
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
        setError(prev => ({ ...prev, teachers: "Failed to load teacher count" }));
        setLoading(prev => ({ ...prev, teachers: false }));
      }

      try {
        // Fetch centers
        const centersResponse = await getAllCenters();
        const centers = centersResponse.data || [];
        setCenterCount(centers.length);
        setLoading(prev => ({ ...prev, centers: false }));
      } catch (error) {
        console.error("Failed to fetch centers:", error);
        setError(prev => ({ ...prev, centers: "Failed to load center count" }));
        setLoading(prev => ({ ...prev, centers: false }));
      }
    };

    fetchData();
  }, []);

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
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Welcome back, {getDisplayName()}! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage your academic operations efficiently
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <AcademicNotificationBell />

                {/* Profile Dropdown */}
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

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    ></div>
                    
                    {/* Dropdown Box */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      {/* Header Section */}
                      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                        <h3 className="font-bold text-gray-800 text-base">
                          Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Academic Coordinator</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Account Settings */}
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

                        {/* Certificate Management */}
                        <button
                          onClick={() => {
                            navigate('/certificates');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">Certificates</span>
                        </button>

                        {/* Logout */}
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

        {/* Main Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

              {/* Statistics Cards - BERRY Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  {
                    title: "Total Teachers",
                    count: loading.teachers ? "..." : teacherCount,
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    gradient: "from-blue-500 to-blue-600",
                    error: error.teachers
                  },
                  {
                    title: "Active Centers",
                    count: loading.centers ? "..." : centerCount,
                    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                    gradient: "from-green-500 to-green-600",
                    error: error.centers
                  },
                  {
                    title: "Total Students",
                    count: loading.students ? "..." : studentCount,
                    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                    gradient: "from-purple-500 to-purple-600",
                    error: error.students
                  }
                ].map((stat, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br bg-white rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200"
                    style={{ background: `linear-gradient(to bottom right, ${stat.gradient.includes('blue') ? '#2196f3' : stat.gradient.includes('green') ? '#4caf50' : '#9c27b0'}, ${stat.gradient.includes('blue') ? '#1976d2' : stat.gradient.includes('green') ? '#388e3c' : '#7b1fa2'})` }}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">{stat.title}</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {loading.teachers || loading.centers || loading.students ? (
                          <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span>
                        ) : (
                          stat.count
                        )}
                      </div>
                      {stat.error && (
                        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                          <p className="text-sm text-red-700 font-medium">{stat.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Two Column Layout - BERRY Style */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Pending Approvals Card - BERRY Style */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #ff9800, #f57c00)' }}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                          Pending Student Approvals
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {pendingStudents.length} recent registration requests
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/manage-students')}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: '#ff9800' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f57c00'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
                    >
                      View All
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {loading.pending ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4" style={{ borderColor: '#e3f2fd', borderTopColor: '#ff9800' }}></div>
                      <p className="text-gray-500 text-sm mt-4">Loading pending approvals...</p>
                    </div>
                  ) : error.pending ? (
                    <div className="text-center py-8">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-600 font-medium">{error.pending}</p>
                      </div>
                    </div>
                  ) : pendingStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                        <svg className="mx-auto h-16 w-16 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">All Caught Up!</h3>
                        <p className="text-green-600">No pending student approvals at the moment.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {pendingStudents.map((student, index) => (
                              <tr key={student.student_id} className="hover:bg-blue-50 transition-colors duration-200">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#ff9800' }}>
                                        {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {student.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Student #{index + 1}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">
                                    {student.email}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {student.center_name}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions Card - BERRY Style */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                        Quick Actions
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">Access your management tools</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      {
                        title: "Manage Teachers",
                        description: "Add, edit, and manage teacher profiles",
                        path: '/manage-teachers',
                        color: '#2196f3',
                        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      },
                      {
                        title: "Manage Batches",
                        description: "Create and manage course batches",
                        path: '/manage-batches',
                        color: '#ff9800',
                        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      },
                      {
                        title: "Manage Students",
                        description: "View and approve student registrations",
                        path: '/manage-students',
                        color: '#9c27b0',
                        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      },
                      {
                        title: "Event Calendar",
                        description: "Manage academic events and schedules",
                        path: '/academic/event-calendar',
                        color: '#4caf50',
                        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      },
                    ].map((action, index) => (
                      <button
                        key={index}
                        onClick={() => action.action ? action.action() : navigate(action.path)}
                        className="w-full group relative overflow-hidden rounded-lg p-4 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${action.color}20` }}>
                              <svg className="w-5 h-5" style={{ color: action.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon} />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h3 className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                                {action.title}
                              </h3>
                              <p className="text-xs text-gray-600">
                                {action.description}
                              </p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
};

export default AcademicCoordinatorPage;