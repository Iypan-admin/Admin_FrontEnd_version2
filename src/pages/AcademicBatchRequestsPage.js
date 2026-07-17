import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import { getBatchRequestsForAcademic, rejectBatchRequest, createBatchFromRequest, getCurrentUserProfile } from "../services/Api";
import { Search, CheckCircle, XCircle, FileText, X, Calendar, Clock, User, Building2, BookOpen, GraduationCap, Users } from "lucide-react";

const AcademicBatchRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'state_approved', 'academic_approved', 'rejected'
  
  // BERRY style states
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Modal states for request details
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
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

  // Mobile and sidebar handling
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

  // Fetch user profile picture on component mount
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

  // Filter requests with status filter
  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      request.center_name?.toLowerCase().includes(query) ||
      request.course_name?.toLowerCase().includes(query) ||
      request.requester_name?.toLowerCase().includes(query) ||
      request.teacher_name?.toLowerCase().includes(query);
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Fetch requests with background polling
  const fetchRequests = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
      setLoading(true);
      }
      setError(null);
      const response = await getBatchRequestsForAcademic(token);
      
      if (response?.success && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch batch requests:", error);
      setError("Failed to load batch requests: " + error.message);
      setRequests([]);
    } finally {
      if (isInitialLoad) {
      setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    // Initial load
    fetchRequests(true);
    
    // Background polling every 5 seconds
    const interval = setInterval(() => {
      fetchRequests(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleCreateBatch = async (requestId) => {
    if (!window.confirm("Are you sure you want to create this batch? This will create the actual batch in the system.")) {
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: 'creating' }));
      const token = localStorage.getItem("token");
      
      const response = await createBatchFromRequest(token, requestId);
      
      if (response?.message || response?.data) {
        alert("Batch created successfully!");
        // Don't call fetchRequests here - let polling handle it
      } else {
        throw new Error(response?.error || "Failed to create batch");
      }
    } catch (error) {
      console.error("Create batch error:", error);
      alert("Failed to create batch. " + (error.message || "Please try again."));
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      setActionLoading(prev => ({ ...prev, [requestId]: 'rejecting' }));
      
      const response = await rejectBatchRequest(token, requestId, reason);
      
      if (response?.message || response?.data) {
        alert("Batch request rejected successfully!");
        // Don't call fetchRequests here - let polling handle it
      } else {
        throw new Error(response?.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Reject request error:", error);
      alert("Failed to reject request. " + (error.message || "Please try again."));
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'state_approved':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">State Approved</span>;
      case 'academic_approved':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-200">Academic Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">Pending</span>;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle row/status click to show details
  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
    setIsDetailsModalVisible(true);
  };

  // Close details modal with animation
  const handleCloseDetailsModal = () => {
    setIsDetailsModalVisible(false);
    setTimeout(() => {
      setIsDetailsModalOpen(false);
      setSelectedRequest(null);
    }, 300);
  };

  // Body scroll lock for modal
  useEffect(() => {
    if (isDetailsModalVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDetailsModalVisible]);

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
                {isMobile && (
                  <button
                    onClick={toggleMobileMenu}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                  </button>
                )}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                    <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900">Batch Requests</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Review and create batches from requests</p>
                  </div>
                      </div>
                    </div>

              {/* Right: Notification Bell & Profile */}
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
                              window.location.href = '/academic-coordinator/settings';
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
                              window.location.href = "/login";
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

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : filteredRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e3f2fd, #bbdefb)' }}>
                    <FileText className="w-6 h-6" style={{ color: '#2196f3' }} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">State Approved</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredRequests.filter(req => req.status === 'state_approved').length}
                    </p>
                    </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredRequests.filter(req => req.status === 'academic_approved').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-50">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredRequests.filter(req => req.status === 'rejected').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-sm">{error}</span>
                  </div>
                </div>
              )}

            {/* Search and Filter - BERRY Style */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                  <div className="flex-1 relative">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by center, course, teacher, or requester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                
                {/* Status Filter */}
                <div className="md:w-48">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="state_approved">State Approved</option>
                    <option value="academic_approved">Academic Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
                            </div>

            {/* Table Section - BERRY Style */}
            {loading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-16 shadow-sm">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                  <p className="text-sm text-gray-600 font-medium">Loading batch requests...</p>
                        </div>
                      </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-16 shadow-sm">
                <div className="flex flex-col items-center justify-center text-center">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-sm font-semibold text-gray-500 mb-1">No batch requests found</p>
                  <p className="text-xs text-gray-400">
                    {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No requests available'}
                  </p>
                                    </div>
                                  </div>
            ) : (
              <>
                {/* Table Container - BERRY Style */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">S.No</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Center</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Created Batch</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRequests.map((request, index) => (
                          <tr 
                            key={request.request_id} 
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => handleRequestClick(request)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="font-semibold">{request.course_name || 'N/A'}</div>
                              {request.course_type && (
                                <div className="text-xs text-gray-500 mt-0.5">{request.course_type}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {request.center_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div 
                                className="inline-block"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestClick(request);
                                }}
                              >
                                {getStatusBadge(request.status)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {request.created_batch_name ? (
                                <span className="font-semibold text-green-700">{request.created_batch_name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                              {request.status === 'state_approved' && (
                                <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleCreateBatch(request.request_id)}
                                    disabled={actionLoading[request.request_id] === 'creating'}
                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                                >
                                  {actionLoading[request.request_id] === 'creating' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                      <span>Creating...</span>
                                    </>
                                  ) : (
                                    <>
                                        <CheckCircle className="w-3 h-3" />
                                      <span>Create Batch</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(request.request_id)}
                                    disabled={actionLoading[request.request_id] === 'rejecting'}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                                >
                                  {actionLoading[request.request_id] === 'rejecting' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                      <span>Rejecting...</span>
                                    </>
                                  ) : (
                                    <>
                                        <XCircle className="w-3 h-3" />
                                      <span>Reject</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              )}
                              {request.status === 'academic_approved' && (
                                <div className="text-xs text-gray-500">
                                  <div>Approved by: {request.academic_reviewer_name || 'N/A'}</div>
                                  <div className="mt-0.5">{formatDate(request.academic_reviewed_at)}</div>
                            </div>
                              )}
                              {request.status === 'rejected' && (
                                <div className="text-xs text-gray-500">
                                  <div>Rejected by: {request.rejected_by_name || 'N/A'}</div>
                                  {request.rejection_reason && (
                                    <div className="mt-0.5 text-red-600 italic">{request.rejection_reason}</div>
                                  )}
                          </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination - BERRY Style */}
                  {filteredRequests.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-4 sm:px-6 py-4 border-t border-gray-200">
                      {/* Left: Showing entries info */}
                      <div className="text-sm text-gray-500 mb-4 sm:mb-0">
                        Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredRequests.length)}</span> of{' '}
                        <span className="font-semibold text-gray-900">{filteredRequests.length}</span> entries
                      </div>

                      {/* Right: Pagination buttons - Only show when more than 1 page */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          {/* Previous button */}
                          <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Page numbers */}
                          {getPageNumbers().map((page, idx) => {
                            if (page === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}

                          {/* Next button */}
                          <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
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

      {/* Request Details Modal - BERRY Style Right-Side Slide-In */}
      {isDetailsModalOpen && selectedRequest && (
        <div 
          className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isDetailsModalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleCloseDetailsModal}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isDetailsModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                        <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Batch Request Details</h2>
                    {selectedRequest.course_name && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedRequest.course_name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleCloseDetailsModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto">
              {/* Course Details */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
                  Course Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Course Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.course_name || 'N/A'}</p>
                            </div>
                        </div>
                  {selectedRequest.course_type && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                        <GraduationCap className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Course Type</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedRequest.course_type}</p>
                              </div>
                            </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100">
                      <Clock className="w-4 h-4 text-purple-600" />
                              </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Duration</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.duration || 0} months</p>
                              </div>
                            </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100">
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                                <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Max Students</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.max_students || 10}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
                      <Clock className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatTime(selectedRequest.time_from)} - {formatTime(selectedRequest.time_to)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedRequest.mode || 'Offline'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

              {/* Center Request */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                  Center Request
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Center Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.center_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Requested By</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.requester_name || selectedRequest.requester_full_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Request Date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Teacher</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.teacher_name || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedRequest.justification && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Justification</p>
                      <p className="text-sm text-gray-700">{selectedRequest.justification}</p>
                      </div>
                  )}
                </div>
              </div>

              {/* State Admin Approval */}
              {selectedRequest.state_reviewed_at && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    State Admin Approval
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Approved By</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedRequest.state_reviewer_name || 'N/A'}</p>
                            </div>
                        </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Approved Date</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.state_reviewed_at)}</p>
                              </div>
                            </div>
                    {selectedRequest.state_approval_notes && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Approval Notes</p>
                        <p className="text-sm text-gray-700">{selectedRequest.state_approval_notes}</p>
                              </div>
                    )}
                              </div>
                            </div>
              )}

              {/* Academic Admin Approval/Create */}
              {selectedRequest.academic_reviewed_at && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Academic Admin Action
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                                  <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Processed By</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedRequest.academic_reviewer_name || 'N/A'}</p>
                                  </div>
                                </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                                  <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Processed Date</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.academic_reviewed_at)}</p>
                      </div>
                    </div>
                    {selectedRequest.academic_approval_notes && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{selectedRequest.academic_approval_notes}</p>
                      </div>
                    )}
                                  </div>
                                </div>
              )}

              {/* Created Batch */}
              {selectedRequest.created_batch_name && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Created Batch
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                                  <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Batch Name</p>
                        <p className="text-sm font-semibold text-green-700">{selectedRequest.created_batch_name}</p>
                                  </div>
                                </div>
                              </div>
                </div>
              )}

              {/* Rejection Details (if rejected) */}
              {selectedRequest.status === 'rejected' && selectedRequest.rejected_at && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
                    Rejection Details
                  </h3>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
                        <User className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Rejected By</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedRequest.rejected_by_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
                        <Calendar className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Rejected Date</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.rejected_at)}</p>
                            </div>
                          </div>
                    {selectedRequest.rejection_reason && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                        <p className="text-sm text-gray-700 italic">{selectedRequest.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* State Name */}
              {selectedRequest.state_name && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-gray-600" />
                    State Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                        <Building2 className="w-4 h-4 text-gray-600" />
                        </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">State</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedRequest.state_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicBatchRequestsPage;


