import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import { getAllCenters, getAllStates, getAllUsers, getAllCourses, getCurrentUserProfile } from "../services/Api";

const ManagerPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStates: 0,
    totalCenters: 0,
    totalCourses: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
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
  
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  const getDisplayName = () => {
    // Priority 1: profileInfo.full_name from user table
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '' && isFullName(profileInfo.full_name)) {
      return profileInfo.full_name;
    }
    // Priority 2: Token full_name (fallback)
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    // Priority 3: Token full_name even if it doesn't have spaces (better than username)
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    // Fallback
    return "Manager";
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

  // Fetch profile info
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile info:", error);
      }
    };
    fetchProfileInfo();

    // Listen for profile updates from AccountSettingsPage
    window.addEventListener('profileUpdated', fetchProfileInfo);
    return () => {
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersResponse, statesResponse, centersResponse, coursesResponse] = await Promise.all([
          getAllUsers(1, 9999, { pagination: false }),
          getAllStates(),
          getAllCenters(),
          getAllCourses(localStorage.getItem('token'))
        ]);

        setStats({
          totalUsers: usersResponse?.data?.length || 0,
          totalStates: statesResponse?.data?.length || 0,
          totalCenters: centersResponse?.data?.length || 0,
          totalCourses: coursesResponse?.data?.length || 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        setError("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard</h3>
                <p className="text-gray-500">Please wait while we fetch your data...</p>
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
                    Manage your operations efficiently
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <ManagerNotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profileInfo?.profile_picture ? (
                      <img
                        src={profileInfo.profile_picture}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                        {getDisplayName()?.charAt(0).toUpperCase() || "M"}
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
                            Welcome, {getDisplayName()?.split(' ')[0] || "Manager"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Manager</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/manager/account-settings');
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
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Statistics Cards - BERRY Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Users Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Total Users</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-blue-100 text-xs mt-1">System users</p>
                </div>
              </div>

              {/* Total States Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium mb-1">Total States</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{stats.totalStates.toLocaleString()}</p>
                  <p className="text-green-100 text-xs mt-1">State locations</p>
                </div>
              </div>

              {/* Total Centers Card */}
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-yellow-100 text-xs sm:text-sm font-medium mb-1">Total Centers</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{stats.totalCenters.toLocaleString()}</p>
                  <p className="text-yellow-100 text-xs mt-1">Learning centers</p>
                </div>
              </div>

              {/* Total Courses Card */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1">Total Courses</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{stats.totalCourses.toLocaleString()}</p>
                  <p className="text-purple-100 text-xs mt-1">Available courses</p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-6 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-red-100 rounded-full">
                      <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-red-800">Error Loading Statistics</h3>
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Management Tools Section - BERRY Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Management Tools</h2>
                  <p className="text-sm text-gray-500 mt-1">Access administrative functions and system controls</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "Manage Users",
                    description: "Add, edit, and manage system users",
                    path: '/manage-users',
                    color: '#2196f3',
                    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  },
                  {
                    title: "Manage States",
                    description: "View and manage state locations",
                    path: '/manage-states',
                    color: '#4caf50',
                    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  },
                  {
                    title: "Manage Centers",
                    description: "View and manage learning centers",
                    path: '/manage-centers',
                    color: '#ff9800',
                    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  },
                  {
                    title: "Manage Courses",
                    description: "View and manage course content",
                    path: '/manage-courses',
                    color: '#9c27b0',
                    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(action.path)}
                    className="w-full group relative overflow-hidden rounded-lg p-4 bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${action.color}20` }}>
                          <svg className="w-5 h-5" style={{ color: action.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon} />
                          </svg>
                        </div>
                        <div>
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

            {/* Quick Actions Section - BERRY Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #4caf50, #388e3c)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800">Quick Actions</h3>
                  <p className="text-sm text-gray-500 mt-1">Frequently used administrative functions</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/manage-users')}
                  className="flex items-center space-x-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                >
                  <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Manage Users</p>
                    <p className="text-xs text-gray-600">User management</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/batch-approval')}
                  className="flex items-center space-x-3 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors duration-200 group"
                >
                  <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Batch Approval</p>
                    <p className="text-xs text-gray-600">Approve batches</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/center-request-approval')}
                  className="flex items-center space-x-3 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors duration-200 group"
                >
                  <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Center Requests</p>
                    <p className="text-xs text-gray-600">Approve centers</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/manager/event-calendar')}
                  className="flex items-center space-x-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors duration-200 group"
                >
                  <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Event Calendar</p>
                    <p className="text-xs text-gray-600">View events</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerPage;
