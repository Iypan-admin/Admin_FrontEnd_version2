import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import AdminNotificationBell from "../components/AdminNotificationBell";
import { getAllUsers, getAllStates, getAllCenters, getAllStudents, getRevenueStats, getCurrentUserProfile } from "../services/Api";

const AdminPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStates: 0,
    totalCenters: 0,
    totalStudents: 0,
  });
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    courseRevenue: [],
    totalTransactions: 0,
    monthlyTransactions: 0,
    monthlyRevenueData: [],
    paymentMethods: { emi: 0, full: 0 },
    paymentStatus: { approved: 0, pending: 0 },
    recentTransactions: [],
    revenueGrowth: 0,
    averageTransactionValue: 0,
    topPerformingCourse: null,
  });
  const [chartView, setChartView] = useState('chart'); // 'chart' or 'table'
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'Admin');

  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    return userName;
  };

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
  const [profileInfo, setProfileInfo] = useState(null);

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersResponse, statesResponse, centersResponse, studentsResponse] = await Promise.all([
          getAllUsers({ pagination: false }),
          getAllStates(),
          getAllCenters(),
          getAllStudents()
        ]);

        setStats({
          totalUsers: usersResponse?.data?.length || 0,
          totalStates: statesResponse?.data?.length || 0,
          totalCenters: centersResponse?.data?.length || 0,
          totalStudents: studentsResponse?.data?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        setError("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    const fetchRevenueStats = async () => {
      try {
        setRevenueLoading(true);
        const revenueResponse = await getRevenueStats();
        if (revenueResponse.success && revenueResponse.data) {
          setRevenueStats(revenueResponse.data);
        }
      } catch (error) {
        console.error("Error fetching revenue stats:", error);
      } finally {
        setRevenueLoading(false);
      }
    };

    fetchStats();
    fetchRevenueStats();
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

    window.addEventListener('profileUpdated', fetchProfileInfo);
    return () => {
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);

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
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Welcome Text */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Hamburger Menu Toggle */}
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
                    Administrator Dashboard
                  </p>
                </div>
              </div>

              {/* Right: Notifications & Profile Dropdown */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <AdminNotificationBell />

                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profileInfo?.profile_picture ? (
                      <img
                        src={profileInfo.profile_picture}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
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
                      
                      {/* Dropdown Box - BERRY Style */}
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {/* Header Section */}
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "Admin"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Administrator</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/admin/account-settings');
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

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
              {/* Enhanced Statistics Section */}
              {error ? (
                <div className="mb-8 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-6 shadow-sm">
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Total Users Card */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Total Users</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {loading ? <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span> : stats.totalUsers.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Total States Card */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #4caf50, #388e3c)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Total States</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {loading ? <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span> : stats.totalStates.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Total Centers Card */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #9c27b0, #7b1fa2)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Total Centers</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {loading ? <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span> : stats.totalCenters.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Total Students Card */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #ff9800, #f57c00)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Total Students</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {loading ? <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span> : stats.totalStudents.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Statistics Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Revenue Statistics</h2>
                    <p className="text-gray-600 text-sm">Live financial data from student payments</p>
                  </div>
                </div>

                {revenueLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-3 w-24"></div>
                          <div className="h-8 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Total Revenue Card */}
                    <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #4caf50, #388e3c)' }}>
                      <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Total Revenue</p>
                        <div className="text-white text-3xl sm:text-4xl font-bold">
                          ₹{revenueStats.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-white/80 text-xs mt-2">{revenueStats.totalTransactions} transactions</p>
                      </div>
                    </div>

                    {/* Monthly Revenue Card */}
                    <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                      <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Monthly Revenue</p>
                        <div className="text-white text-3xl sm:text-4xl font-bold">
                          ₹{revenueStats.monthlyRevenue.toLocaleString()}
                        </div>
                        <p className="text-white/80 text-xs mt-2">{revenueStats.monthlyTransactions} transactions</p>
                      </div>
                    </div>

                    {/* Top Course Revenue Card */}
                    <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #9c27b0, #7b1fa2)' }}>
                      <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Top Course</p>
                        <div className="text-white text-lg sm:text-xl font-bold">
                          {revenueStats.courseRevenue[0]?.course || 'N/A'}
                        </div>
                        <p className="text-white/80 text-xs mt-2">
                          ₹{revenueStats.courseRevenue[0]?.revenue?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue Analytics Dashboard */}
              <div className="space-y-6">
                {/* Revenue Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Average Transaction Value */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #ff6b6b, #ee5a24)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Avg Transaction</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        ₹{revenueStats.averageTransactionValue.toLocaleString()}
                      </div>
                      <p className="text-white/80 text-xs mt-2">Per transaction</p>
                    </div>
                  </div>

                  {/* Revenue Growth */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: revenueStats.revenueGrowth >= 0 ? 'linear-gradient(to bottom right, #00b894, #00a085)' : 'linear-gradient(to bottom right, #d63031, #74b9ff)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Revenue Growth</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {revenueStats.revenueGrowth >= 0 ? '+' : ''}{revenueStats.revenueGrowth}%
                      </div>
                      <p className="text-white/80 text-xs mt-2">Month over month</p>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #6c5ce7, #5f3dc4)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">Payment Status</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {revenueStats.paymentStatus.approved}
                      </div>
                      <p className="text-white/80 text-xs mt-2">{revenueStats.paymentStatus.pending} pending</p>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200" style={{ background: 'linear-gradient(to bottom right, #00cec9, #00b894)' }}>
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">EMI vs Full</p>
                      <div className="text-white text-3xl sm:text-4xl font-bold">
                        {revenueStats.paymentMethods.emi > 0 ? Math.round((revenueStats.paymentMethods.emi / (revenueStats.paymentMethods.emi + revenueStats.paymentMethods.full)) * 100) : 0}%
                      </div>
                      <p className="text-white/80 text-xs mt-2">EMI payments</p>
                    </div>
                  </div>
                </div>

                {/* Revenue Chart & Course Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Revenue Chart */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Monthly Revenue Trend</h3>
                          <p className="text-gray-600 text-sm">Last 12 months performance</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setChartView('chart')}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            chartView === 'chart' 
                              ? 'text-blue-600 bg-blue-50' 
                              : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          Chart
                        </button>
                        <button 
                          onClick={() => setChartView('table')}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            chartView === 'table' 
                              ? 'text-blue-600 bg-blue-50' 
                              : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          Table
                        </button>
                      </div>
                    </div>

                    {/* Revenue Statistics Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-blue-600 font-medium">Best Month</p>
                            <p className="text-lg font-bold text-blue-900">
                              {revenueStats.monthlyRevenueData.length > 0 ? 
                                revenueStats.monthlyRevenueData.reduce((max, month) => 
                                  month.revenue > max.revenue ? month : max
                                ).month : 'N/A'
                              }
                            </p>
                          </div>
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-green-600 font-medium">Average Monthly</p>
                            <p className="text-lg font-bold text-green-900">
                              ₹{revenueStats.monthlyRevenueData.length > 0 ? 
                                Math.round(revenueStats.monthlyRevenueData.reduce((sum, month) => sum + month.revenue, 0) / revenueStats.monthlyRevenueData.length).toLocaleString() : 0
                              }
                            </p>
                          </div>
                          <div className="p-2 bg-green-100 rounded-lg">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-purple-600 font-medium">Total Transactions</p>
                            <p className="text-lg font-bold text-purple-900">
                              {revenueStats.monthlyRevenueData.reduce((sum, month) => sum + month.transactions, 0)}
                            </p>
                          </div>
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Chart Visualization */}
                    <div className="space-y-4">
                      {chartView === 'chart' ? (
                        <>
                          {/* Chart Header */}
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Monthly Performance</span>
                            <span>Revenue (₹) | Transactions</span>
                          </div>

                          {/* Chart Container */}
                          <div className="relative h-64 bg-gray-50 rounded-lg p-4">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 w-8">
                              <span>₹{Math.max(...revenueStats.monthlyRevenueData.map(m => m.revenue)).toLocaleString()}</span>
                              <span>₹{Math.round(Math.max(...revenueStats.monthlyRevenueData.map(m => m.revenue)) / 2).toLocaleString()}</span>
                              <span>₹0</span>
                            </div>

                            {/* Chart Area */}
                            <div className="ml-10 h-full flex items-end justify-between space-x-2">
                              {revenueStats.monthlyRevenueData.map((month, index) => {
                                const maxRevenue = Math.max(...revenueStats.monthlyRevenueData.map(m => m.revenue));
                                const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                                
                                return (
                                  <div key={index} className="flex-1 flex flex-col items-center">
                                    {/* Revenue Bar */}
                                    <div className="w-full relative group">
                                      <div 
                                        className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 cursor-pointer relative"
                                        style={{ height: `${height}%`, minHeight: '4px' }}
                                      >
                                        {/* Hover Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                          <div>₹{month.revenue.toLocaleString()}</div>
                                          <div>{month.transactions} transactions</div>
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                      
                                      {/* Transaction Count Indicator */}
                                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {month.transactions}
                                      </div>
                                    </div>
                                    
                                    {/* Month Label */}
                                    <div className="text-xs text-gray-600 mt-2 text-center">
                                      <div className="font-medium">{month.month.split(' ')[0]}</div>
                                      <div className="text-gray-400">{month.month.split(' ')[1]}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Table Header */}
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Monthly Revenue Table</span>
                            <span>12 months data</span>
                          </div>

                          {/* Table Container */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Transaction</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {revenueStats.monthlyRevenueData.map((month, index) => {
                                    const avgTransaction = month.transactions > 0 ? month.revenue / month.transactions : 0;
                                    const maxRevenue = Math.max(...revenueStats.monthlyRevenueData.map(m => m.revenue));
                                    const performance = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                                    
                                    return (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">{month.month}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="text-sm font-semibold text-gray-900">₹{month.revenue.toLocaleString()}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">{month.transactions}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">₹{Math.round(avgTransaction).toLocaleString()}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                              <div 
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                                style={{ width: `${performance}%` }}
                                              ></div>
                                            </div>
                                            <span className="text-sm text-gray-600">{performance.toFixed(1)}%</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Growth Indicator */}
                      {revenueStats.monthlyRevenueData.length >= 2 && (
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1 rounded-full ${revenueStats.revenueGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                              <svg className={`w-4 h-4 ${revenueStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={revenueStats.revenueGrowth >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {revenueStats.revenueGrowth >= 0 ? 'Revenue Growth' : 'Revenue Decline'}
                            </span>
                          </div>
                          <span className={`text-lg font-bold ${revenueStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {revenueStats.revenueGrowth >= 0 ? '+' : ''}{revenueStats.revenueGrowth}% vs last month
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Revenue Breakdown */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Course Revenue Breakdown</h3>
                        <p className="text-gray-600 text-sm">Top performing courses</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {revenueStats.courseRevenue.slice(0, 5).map((course, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{course.course}</p>
                              <p className="text-sm text-gray-600">{course.count} students</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{course.revenue.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{course.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
                        <p className="text-gray-600 text-sm">Latest payment activities</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] sm:text-xs text-green-700 font-bold uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {revenueStats.recentTransactions.slice(0, 5).map((transaction, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{transaction.studentName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{transaction.courseName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">₹{transaction.amount.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.paymentType === 'emi' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {transaction.paymentType?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                transaction.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                    <p className="text-gray-600">Frequently used administrative functions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <button
                    onClick={() => navigate('/students')}
                    className="flex items-center space-x-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                  >
                    <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">View Students</p>
                      <p className="text-xs text-gray-600">All student records</p>
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
                    onClick={() => navigate('/demo-management')}
                    className="flex items-center space-x-3 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors duration-200 group"
                  >
                    <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">Lead Demo Class</p>
                      <p className="text-xs text-gray-600">Manage demo requests</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => navigate('/event-management')}
                    className="flex items-center space-x-3 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 group"
                  >
                    <div className="p-2 bg-indigo-500 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">Event Management</p>
                      <p className="text-xs text-gray-600">Manage events</p>
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

export default AdminPage;