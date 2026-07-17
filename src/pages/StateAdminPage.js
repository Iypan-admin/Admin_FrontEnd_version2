import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateCenterRequestModal from "../components/CreateCenterRequestModal";



import { getCentersForStateAdmin, getMyCenterRequests, getCurrentUserProfile } from "../services/Api";
import StateNotificationBell from "../components/StateNotificationBell";


function StateAdminPage() {
  const navigate = useNavigate();

  const [showRequestModal, setShowRequestModal] = useState(false);
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
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [stats, setStats] = useState({
    totalCenters: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'State Admin');


  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    if (userName && userName.trim() !== '') {
      return userName;
    }
    return "State Admin";
  };



  // Scroll to calendar function


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
        const token = localStorage.getItem("token");
        
        // Check if user is logged in
        if (!token) {
          setError("No authentication token found. Please log in again.");
          setLoading(false);
          return;
        }

        const [centersResponse, requestsResponse] = await Promise.all([
          getCentersForStateAdmin(token),
          getMyCenterRequests(token)
        ]);
        
        const centers = centersResponse.data || [];

        setStats({
          totalCenters: centers.length,
          activeCenters: centers.filter(center => center.center_admin).length,
          totalAdmins: centers.filter(center => center.center_admin).length,
          pendingRequests: (requestsResponse.data || []).filter(req => req.status === 'pending').length
        });
        
      } catch (error) {
        console.error("Error fetching stats:", error);
        
        // Provide more specific error messages
        if (error.message.includes("State not found for this admin")) {
          setError("You are not assigned to any state. Please contact your administrator to assign you to a state.");
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
          setError("Access denied. You don't have permission to view this page.");
        } else if (error.message.includes("404") || error.message.includes("Not Found")) {
          setError("Service not available. Please check if all backend services are running.");
        } else {
          setError(`Failed to load dashboard statistics: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Fetch profile info
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
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

  const handleRequestSuccess = () => {
    // Refresh data after successful request creation
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const [, requestsResponse] = await Promise.all([
          getCentersForStateAdmin(token),
          getMyCenterRequests(token)
        ]);
        
        const requests = requestsResponse.data || [];

        setStats(prev => ({
          ...prev,
          pendingRequests: requests.filter(req => req.status === 'pending').length
        }));
        
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };

    fetchStats();
  };

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
                    Manage your state operations efficiently
                  </p>
                </div>

              </div>

              {/* Right: Notification & Profile Dropdown */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <StateNotificationBell />
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
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                          {getDisplayName()?.charAt(0).toUpperCase()}
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
                          <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                            <h3 className="font-bold text-gray-800 text-base">
                              Welcome, {getDisplayName() || "User"}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 capitalize">State Admin</p>
                          </div>


                          <div className="py-2">
                            <button
                              onClick={() => {
                                navigate('/state/account-settings');
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
                                navigate("/login");
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
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">


            {error && (
              <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    
                    {/* Debug Information */}
                    <div className="p-4 bg-red-100/50 rounded-xl border border-red-200/50">
                      <h4 className="text-sm font-semibold text-red-800 mb-3">Debug Information:</h4>
                      <div className="text-sm text-red-700 space-y-2">
                        <p>• Check if you are logged in as a state admin user</p>
                        <p>• Verify that your user account is assigned to a state in the database</p>
                        <p>• Ensure all backend services (Listing Service:3008, Role Assignment:3002) are running</p>
                        <p>• Check the browser console for detailed error messages</p>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-lg transition-colors font-medium"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Statistics Cards - BERRY Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Total Centers",
                  value: loading ? "..." : stats.totalCenters,
                  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                  gradient: "from-blue-500 to-blue-600",
                  shadow: "shadow-blue-200"
                },
                {
                  title: "Active Centers",
                  value: loading ? "..." : stats.activeCenters,
                  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                  gradient: "from-emerald-500 to-emerald-600",
                  shadow: "shadow-emerald-200"
                },
                {
                  title: "Center Admins",
                  value: loading ? "..." : stats.totalAdmins,
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
                  gradient: "from-purple-500 to-purple-600",
                  shadow: "shadow-purple-200"
                },
                {
                  title: "Pending Requests",
                  value: loading ? "..." : stats.pendingRequests,
                  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                  gradient: "from-amber-500 to-amber-600",
                  shadow: "shadow-amber-200"
                }
              ].map((stat, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-2xl p-6 shadow-lg ${stat.shadow} bg-gradient-to-br ${stat.gradient} transform hover:scale-105 transition-all duration-300 group`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-white/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} />
                        </svg>
                      </div>
                      {stat.title === 'Pending Requests' && stats.pendingRequests > 0 && (
                        <div className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
                      <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* Enhanced Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Quick Actions</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Quick access to main features</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => navigate('/state-admin/centers')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-blue-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">View Centers</span>
                    <p className="text-sm text-blue-600/70">Manage all centers</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-green-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Request New Center</span>
                    <p className="text-sm text-green-600/70">Create center request</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/state-admin/center-requests')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-2xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-purple-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Center Requests</span>
                    <p className="text-sm text-purple-600/70">Review requests</p>
                  </div>
                  {stats.pendingRequests > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <CreateCenterRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  );
}

export default StateAdminPage;