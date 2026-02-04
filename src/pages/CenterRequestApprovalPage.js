import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import CreateCenterRequestModal from "../components/CreateCenterRequestModal";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import StateNotificationBell from "../components/StateNotificationBell";
import { getCenterRequests, getAllCenterRequestsForState, approveCenterRequest, rejectCenterRequest, getCurrentUserProfile } from "../services/Api";

import { useNavigate } from "react-router-dom";

const CenterRequestApprovalPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRejectModal, setShowRejectModal] = useState({ isOpen: false, requestId: null, requestName: '' });
  const [rejectionReason, setRejectionReason] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;



  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return userRole === 'manager' ? "Manager" : (userRole === 'admin' ? "Admin" : "User");
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
    handleSidebarToggle();
    
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  // Filter requests by search term and status
  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      request.center_name?.toLowerCase().includes(query) ||
      request.state_name?.toLowerCase().includes(query) ||
      request.requester_name?.toLowerCase().includes(query) ||
      request.requester_full_name?.toLowerCase().includes(query);
    
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Organize requests by status
  const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
  const approvedRequests = filteredRequests.filter(req => req.status === 'approved');
  const rejectedRequests = filteredRequests.filter(req => req.status === 'rejected');

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Get user role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUserRole(decoded.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      // Use different API based on user role
      const response = userRole === 'state' 
        ? await getAllCenterRequestsForState(token)
        : await getCenterRequests(token);
      
      if (response?.success && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch center requests:", error);
      setError("Failed to load center requests: " + error.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const handleApprove = async (requestId) => {
    const isConfirmed = window.confirm("Are you sure you want to approve this center request? This will create the center immediately.");
    if (!isConfirmed) return;

    try {
      setActionLoading(prev => ({ ...prev, [requestId]: 'approving' }));
      const token = localStorage.getItem("token");
      
      const response = await approveCenterRequest(token, requestId);
      
      if (response?.message) {
        alert(`✅ ${response.message}`);
        await fetchRequests();
      } else {
        throw new Error("Failed to approve request");
      }
    } catch (error) {
      console.error("Approve request error:", error);
      alert("Failed to approve request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [showRejectModal.requestId]: 'rejecting' }));
      const token = localStorage.getItem("token");
      
      const response = await rejectCenterRequest(token, showRejectModal.requestId, rejectionReason);
      
      if (response?.message) {
        alert(`✅ ${response.message}`);
        await fetchRequests();
        setShowRejectModal({ isOpen: false, requestId: null, requestName: '' });
        setRejectionReason("");
      } else {
        throw new Error("Failed to reject request");
      }
    } catch (error) {
      console.error("Reject request error:", error);
      alert("Failed to reject request. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [showRejectModal.requestId]: null }));
    }
  };

  const openRejectModal = (requestId, requestName) => {
    setShowRejectModal({ isOpen: true, requestId, requestName });
    setRejectionReason("");
  };

  const closeRejectModal = () => {
    setShowRejectModal({ isOpen: false, requestId: null, requestName: '' });
    setRejectionReason("");
  };

  const handleRequestSuccess = () => {
    // Refresh data after successful request creation
    fetchRequests();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-4 lg:p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Requests</h3>
                <p className="text-gray-500">Please wait while we fetch your data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
                    {userRole === 'state' ? 'Center Requests' : 'Center Request Approval'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {userRole === 'state' 
                      ? 'Manage center creation requests for your state' 
                      : 'Review and approve center creation requests'
                    }
                  </p>
                </div>
              </div>

              {/* Right Side: Notifications & Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Request Button (State only) */}
                {userRole === 'state' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg mr-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Request
                  </button>
                )}

                {/* Notifications */}
                {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}
                {userRole === 'state' && <StateNotificationBell />}


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
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

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
                            Welcome, {getDisplayName() || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">{userRole}</p>
                        </div>


                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              if (userRole === 'state') {
                                navigate('/state/account-settings');
                              } else if (userRole === 'admin') {
                                navigate('/admin/account-settings');
                              } else {
                                navigate('/manager/account-settings');
                              }
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced State Admin Notice */}
            {userRole === 'state' && (
              <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">State Admin Access</h3>
                    <p className="text-gray-700 leading-relaxed text-sm">
                      As a State Admin, you can view all center requests for your state and create new requests. 
                      Only Managers and Admins can approve or reject requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-300 transform hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-300 transform hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{approvedRequests.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-300 transform hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900">{rejectedRequests.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by center name, state, or requester..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div className="sm:w-64">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Requests List - Table with Pagination */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Center Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location / Requester</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Requested At</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-500 mb-1">No requests found</h4>
                            <p className="text-gray-400 text-sm">Adjust your filters or search terms</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRequests.map((request) => (
                        <tr key={request.request_id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:scale-105 transition-transform">
                                {request.center_name?.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-sm font-bold text-gray-800">{request.center_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-gray-700">{request.state_name}</p>
                              <p className="text-xs text-gray-500 italic">By: {request.requester_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(request.status)}
                            {request.rejection_reason && (
                              <p className="mt-1 text-[10px] text-red-500 font-medium truncate max-w-[150px]" title={request.rejection_reason}>
                                Reason: {request.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-600">{formatDate(request.requested_at)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center items-center space-x-2">
                              {request.status === 'pending' && userRole !== 'state' ? (
                                <>
                                  <button
                                    onClick={() => handleApprove(request.request_id)}
                                    disabled={actionLoading[request.request_id]}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                    title="Approve"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(request.request_id, request.center_name)}
                                    disabled={actionLoading[request.request_id]}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Reject"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">---</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI - BERRY Style */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">
                    Showing <span className="text-blue-600 font-bold">{startIndex + 1}</span> to <span className="text-blue-600 font-bold">{Math.min(startIndex + itemsPerPage, filteredRequests.length)}</span> of <span className="text-blue-600 font-bold">{filteredRequests.length}</span> records
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                          <span key={`dots-${idx}`} className="px-3 py-1 text-gray-400 text-sm">...</span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-2px]"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-300"
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Reject Request</h3>
              <button onClick={closeRejectModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to reject the request for <span className="font-bold text-gray-800">{showRejectModal.requestName}</span>?
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-sm resize-none"
                  placeholder="Explain why this request is being rejected..."
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex flex-col sm:flex-row gap-3">
              <button
                onClick={closeRejectModal}
                className="flex-1 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading[showRejectModal.requestId]}
                className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-md"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCenterRequestModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  );
};

export default CenterRequestApprovalPage;
