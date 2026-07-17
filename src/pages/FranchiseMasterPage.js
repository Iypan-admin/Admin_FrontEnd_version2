import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAllCenters, getAllStudents, getAllUsers, getCenterRequests, getCurrentUserProfile } from "../services/Api";

function FranchiseMasterPage() {
  const navigate = useNavigate();

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
  const [stats, setStats] = useState({
    totalCenters: 0,
    totalStudents: 0,
    totalTutors: 0,
    totalEmployees: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync mobile layout check
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

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please log in again.");
          setLoading(false);
          return;
        }

        const [centersRes, studentsRes, usersRes, requestsRes] = await Promise.all([
          getAllCenters(),
          getAllStudents(),
          getAllUsers({ pagination: false }),
          getCenterRequests(token).catch(err => {
            console.error("Failed to load requests:", err);
            return { data: [] }; // Fallback if API fails
          })
        ]);

        const centers = centersRes?.data || [];
        const students = studentsRes?.data || [];
        const users = usersRes?.data || [];
        const requests = requestsRes?.data || [];

        const tutorsCount = users.filter(u => u.role?.toLowerCase() === 'teacher').length;
        const employeesCount = users.filter(u => 
          u.role && 
          !['teacher', 'student', 'admin', 'center', 'franchise_master'].includes(u.role.toLowerCase())
        ).length;

        const pendingReqsCount = requests.filter(r => r.status === 'pending').length;

        setStats({
          totalCenters: centers.length,
          totalStudents: students.length,
          totalTutors: tutorsCount,
          totalEmployees: employeesCount,
          pendingRequests: pendingReqsCount
        });

      } catch (err) {
        console.error("Error loading stats:", err);
        setError("Failed to load dashboard statistics. Please verify backend services are running.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Fetch user profile info
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch profile info:", err);
      }
    };
    fetchProfileInfo();

    window.addEventListener('profileUpdated', fetchProfileInfo);
    return () => {
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);

  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        if (decodedToken.full_name) return decodedToken.full_name;
        if (decodedToken.name) return decodedToken.name;
      } catch (e) {}
    }
    return "Master Franchise";
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar />

      <div 
        className="flex-1 overflow-y-auto transition-all duration-300" 
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left Welcome */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
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
                    Master Franchise Operations Hub
                  </p>
                </div>
              </div>

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
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
                      {getDisplayName()?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-50/35">
                        <h3 className="font-bold text-gray-800 text-base">
                          {getDisplayName()}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 capitalize">Master Franchise</p>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/franchise-master/account-settings');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
                          <span className="text-sm text-gray-700 font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-sm text-red-700">
                <p className="font-semibold">{error}</p>
              </div>
            )}

            {/* Premium Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {[
                {
                  title: "Total Centres",
                  value: loading ? "..." : stats.totalCenters,
                  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                  gradient: "from-blue-500 to-blue-600",
                  shadow: "shadow-blue-200",
                  path: "/manage-centers"
                },
                {
                  title: "Total Students",
                  value: loading ? "..." : stats.totalStudents,
                  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
                  gradient: "from-emerald-500 to-emerald-600",
                  shadow: "shadow-emerald-200",
                  path: "/students"
                },
                {
                  title: "Total Tutors",
                  value: loading ? "..." : stats.totalTutors,
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                  gradient: "from-purple-500 to-purple-600",
                  shadow: "shadow-purple-200",
                  path: "/manage-users?filter=tutor"
                },
                {
                  title: "Total Employees",
                  value: loading ? "..." : stats.totalEmployees,
                  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                  gradient: "from-indigo-500 to-indigo-600",
                  shadow: "shadow-indigo-200",
                  path: "/manage-users?filter=employee"
                },
                {
                  title: "Pending Requests",
                  value: loading ? "..." : stats.pendingRequests,
                  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                  gradient: "from-amber-500 to-amber-600",
                  shadow: "shadow-amber-200",
                  path: "/center-request-approval"
                }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(stat.path)}
                  className={`cursor-pointer overflow-hidden rounded-2xl p-6 shadow-lg ${stat.shadow} bg-gradient-to-br ${stat.gradient} transform hover:scale-105 transition-all duration-300 group`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 shadow-sm border border-white/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} />
                        </svg>
                      </div>
                      {stat.title === "Pending Requests" && stats.pendingRequests > 0 && (
                        <div className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1">{stat.title}</p>
                      <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Navigation Panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Quick Navigation Actions</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Operations shortlinks</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => navigate('/manage-centers')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 transform hover:scale-105 border border-blue-200/50 shadow-md"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Centre Management</span>
                    <p className="text-sm text-blue-600/70">Manage operational centers</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/center-request-approval')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 rounded-2xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 transform hover:scale-105 border border-amber-200/50 shadow-md"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Centre Requests</span>
                    <p className="text-sm text-amber-600/70">Approve center requests</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/students')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-2xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 transform hover:scale-105 border border-emerald-200/50 shadow-md"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Student Management</span>
                    <p className="text-sm text-emerald-600/70">Manage portal students</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FranchiseMasterPage;
