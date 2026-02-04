import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TeacherNotificationBell from "../components/TeacherNotificationBell";
import { getMyTutorInfo, getTeacherBatches, getStudentsByTeacher, getGMeetsByBatch, getBatchById } from "../services/Api";

function TeacherPage() {
  const navigate = useNavigate();
  const [tutorInfo, setTutorInfo] = useState(null);
  const [, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [, setTotalStudents] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionChartData, setSessionChartData] = useState([]);
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

  // Get full name from token - this is the source of truth for full name
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    // Priority 1: Token full_name
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    // Priority 2: tutorInfo.full_name
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
      return tutorInfo.full_name;
    }
    // Fallback
    return "Teacher";
  };

  useEffect(() => {
    fetchTutorInfo();
    fetchBatches();
    fetchTotalStudents();
    
    // Listen for sidebar toggle
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

  // Fetch completed sessions when batches are loaded
  useEffect(() => {
    if (batches.length > 0) {
      fetchCompletedSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getTeacherBatches(token);
      setBatches(response.data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchTotalStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getStudentsByTeacher(token);
      if (response && response.data) {
        setTotalStudents(response.data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCompletedSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      let totalCompletedSessions = 0;
      let totalAllSessions = 0;
      const batchDataMap = [];

      // Fetch sessions for each batch (using getGMeetsByBatch like TakeClassPage)
      for (const batch of batches) {
        try {
          // Fetch batch details to get total_sessions (like TakeClassPage)
          const batchDetails = await getBatchById(token, batch.batch_id);
          const batchData = batchDetails?.success ? batchDetails.data : batchDetails;
          
          // Get total sessions from batch.total_sessions (like TakeClassPage)
          const totalBatchSessions = batchData?.total_sessions || 0;
          
          // Fetch actual sessions
          const sessions = await getGMeetsByBatch(batch.batch_id, token);
          
          if (sessions && Array.isArray(sessions)) {
            // Count sessions with status 'Completed'
            const completedSessions = sessions.filter(session => 
              session.status === 'Completed' || session.status === 'completed'
            );
            
            const completedCount = completedSessions.length;
            
            // Use batch.total_sessions if available, otherwise use actual sessions count
            const finalTotalSessions = totalBatchSessions > 0 ? totalBatchSessions : sessions.length;
            
            totalCompletedSessions += completedCount;
            totalAllSessions += finalTotalSessions;

            // Store batch-wise data
            const batchName = batch.batch_name || batch.batch_id?.slice(0, 15) || `Batch ${batch.batch_id?.slice(0, 8)}`;
            batchDataMap.push({
              batchName: batchName,
              completedCount: completedCount,
              totalSessions: finalTotalSessions
            });
          }
        } catch (error) {
          console.error(`Error fetching sessions for batch ${batch.batch_id}:`, error);
        }
      }

      setCompletedSessions(totalCompletedSessions);
      setTotalSessions(totalAllSessions);

      // Prepare chart data - batch-wise
      const chartData = batchDataMap.map(batch => ({
        label: batch.batchName.length > 12 ? batch.batchName.substring(0, 12) + '...' : batch.batchName,
        value: batch.completedCount,
        totalValue: batch.totalSessions,
        fullLabel: batch.batchName
      }));

      setSessionChartData(chartData);
    } catch (error) {
      console.error('Error fetching completed sessions:', error);
    }
  };

  const fetchTutorInfo = async () => {
    try {
      setLoading(true);
      const data = await getMyTutorInfo();
      setTutorInfo(data);
    } catch (error) {
      console.error("Failed to fetch tutor info:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalClasses = batches.length;
  const activeClasses = batches.filter(b => b.status !== 'Completed' && b.status !== 'completed').length;
  const completedClasses = batches.filter(b => b.status === 'Completed' || b.status === 'completed').length;
  
  // Get upcoming classes (next 5 active batches)
  const upcomingClasses = batches
    .filter(b => b.status !== 'Completed' && b.status !== 'completed')
    .slice(0, 5);



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
                    Come back, {getDisplayName()}! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    What's happening with your classes today
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
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                        />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
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
                            Welcome, {getDisplayName()?.split(' ')[0] || "Teacher"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Teacher</p>
                        </div>

                        {/* Search Bar */}
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

                        {/* Allow Notifications Toggle */}
                        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Allow Notifications</span>
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                              <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                            </button>
                    </div>
                  </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/teacher/account-settings');
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

                          {/* Social Profile */}
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
          <div className="space-y-4 sm:space-y-6">
            {/* KPI Cards Row - BERRY Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Batch Card - Blue */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Total Batch</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{totalClasses}</p>
                </div>
                    </div>

              {/* Active Batch Card - Green */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button className="px-2 sm:px-3 py-1 bg-white/20 text-white text-xs font-medium rounded">Month</button>
                      <button className="px-2 sm:px-3 py-1 text-white/70 text-xs font-medium rounded hover:bg-white/10">Year</button>
                    </div>
                  </div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium mb-1">Active Batch</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{activeClasses}</p>
                  <div className="mt-3 sm:mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${(activeClasses / totalClasses) * 100 || 0}%` }}></div>
                  </div>
                </div>
                    </div>

              {/* Complete Batch Card - Blue */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Complete Batch</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold">{completedClasses}</p>
                </div>
              </div>
            </div>

            {/* Charts and Lists Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Growth Chart - Left Section */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">Completed Sessions</h3>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
                      {completedSessions} / {totalSessions} Sessions
                    </p>
                </div>
              </div>

                {/* Batch-wise Bar Chart with Axes */}
                {sessionChartData.length > 0 ? (
                  <div className="relative">
                    {/* Y-axis labels and grid */}
                    <div className="flex">
                      {/* Y-axis */}
                      <div className="flex flex-col justify-between pr-2 pb-8" style={{ height: '280px' }}>
                        {(() => {
                          const maxValue = Math.max(...sessionChartData.map(d => d.value), 1);
                          const step = Math.ceil(maxValue / 4);
                          const ticks = [];
                          for (let i = 0; i <= 4; i++) {
                            ticks.push(i * step);
                          }
                          return ticks.reverse().map((tick, idx) => (
                            <div key={idx} className="text-xs text-gray-500" style={{ height: '20%' }}>
                              {tick}
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Chart area */}
                      <div className="flex-1 relative">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pb-8">
                          {[0, 1, 2, 3, 4].map((_, idx) => (
                            <div key={idx} className="border-t border-gray-200" style={{ height: '20%' }}></div>
                          ))}
                        </div>

                        {/* Bars */}
                        <div className="h-64 sm:h-72 flex items-end justify-between space-x-2 sm:space-x-3 pb-8 relative z-10">
                          {sessionChartData.map((data, index) => {
                            const maxValue = Math.max(...sessionChartData.map(d => d.value), 1);
                            const height = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                            return (
                              <div key={index} className="flex-1 min-w-[50px] flex flex-col items-center group">
                                {/* Bar */}
                                <div className="w-full relative">
                                  <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-all duration-300 cursor-pointer shadow-sm"
                                    style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                                    title={`${data.fullLabel}: ${data.value} completed sessions`}
                                  ></div>
                                  {/* Value on top of bar */}
                                  {data.value > 0 && (
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {data.value}
                                    </div>
                                  )}
                                </div>
                                {/* X-axis label */}
                                <div className="mt-2 text-xs text-gray-600 text-center break-words w-full" title={data.fullLabel}>
                                  {data.label}
                                </div>
                          </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* X-axis line */}
                    <div className="border-t-2 border-gray-300 mt-2"></div>
                  </div>
                ) : (
                  <div className="h-64 sm:h-72 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">No completed sessions found</p>
                  </div>
                )}
              </div>

              {/* Upcoming Classes List - Right Section */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">Upcoming Classes</h3>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.map((batch, index) => {
                      // Format batch name like "B118-ON-FR-FL-A1-02:00PM-05:00PM"
                      const batchCode = batch.batch_name || batch.batch_id?.slice(0, 10) || 'CLASS-001';
                      const centerType = batch.center_name || 'ISML-Online';
                      const studentCount = batch.students_count || 0;
                      const isActive = batch.status !== 'Completed' && batch.status !== 'completed';
                      
                      return (
                        <div
                          key={batch.batch_id || index}
                          className={`p-3 sm:p-4 rounded-lg ${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'} border border-gray-100 hover:shadow-md transition-shadow cursor-pointer`}
                          onClick={() => navigate(`/teacher/classes`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800 text-xs sm:text-sm truncate flex-1 mr-2">{batchCode}</h4>
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded flex-shrink-0">
                              {isActive ? '100% Active' : '0% Active'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1 truncate">{centerType}</p>
                          <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
                            <span className="text-xs sm:text-sm font-bold text-gray-800">
                              {studentCount} Students
                            </span>
                            <div className="h-2 bg-gray-200 rounded-full w-20 sm:w-24 overflow-hidden flex-shrink-0">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                style={{ width: `${isActive ? 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm">No upcoming classes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherPage;
