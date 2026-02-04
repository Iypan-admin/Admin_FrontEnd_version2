import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from 'lucide-react';
import Navbar from "../components/Navbar";
import { getBatchRequestsForState, approveBatchRequest, rejectBatchRequest, getCurrentUserProfile } from "../services/Api";

import StateNotificationBell from "../components/StateNotificationBell";


const StateBatchRequestsPage = () => {

  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);


  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });


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



  // Filter requests

  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      request.center_name?.toLowerCase().includes(query) ||
      request.course_name?.toLowerCase().includes(query) ||
      request.requester_name?.toLowerCase().includes(query) ||
      request.teacher_name?.toLowerCase().includes(query);
    
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Organize requests by status
  const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
  const stateApprovedRequests = filteredRequests.filter(req => req.status === 'state_approved');
  const academicApprovedRequests = filteredRequests.filter(req => req.status === 'academic_approved');
  const rejectedRequests = filteredRequests.filter(req => req.status === 'rejected');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await getBatchRequestsForState(token);
      
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);

    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);

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
      window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);



  const handleApprove = async (requestId) => {
    if (!window.confirm("Are you sure you want to approve this batch request?")) {
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: 'approving' }));
      const token = localStorage.getItem("token");
      
      const response = await approveBatchRequest(token, requestId, "Approved by State Admin");
      
      if (response?.message || response?.data) {
        alert("Batch request approved successfully!");
        await fetchRequests();
      } else {
        throw new Error(response?.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Approve request error:", error);
      alert("Failed to approve request. " + (error.message || "Please try again."));
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      setActionLoading(prev => ({ ...prev, [requestId]: 'rejecting' }));
      const token = localStorage.getItem("token");
      
      const response = await rejectBatchRequest(token, requestId, reason);
      
      if (response?.message || response?.data) {
        alert("Batch request rejected successfully!");
        await fetchRequests();
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
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'state_approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">State Approved</span>;
      case 'academic_approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Academic Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>



        {/* Top Header Bar - BERRY Style */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                {/* Mobile Toggle */}
                <button 
                  onClick={() => {
                    const newState = !isMobileMenuOpen;
                    setIsMobileMenuOpen(newState);
                    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
                  }}
                  className="lg:hidden p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}
                >
                  <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Batch Requests</h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate">Review and approve batch creation requests from Center Admins</p>
                </div>
              </div>

              {/* Right: Notifications & Profile */}
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
        </nav>


        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Enhanced Header - Center Admin Style */}


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
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Search and Filter */}
            <div className="mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Search Requests
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by center, course, teacher, or requester..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  <div className="lg:w-64">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="state_approved">State Approved</option>
                      <option value="academic_approved">Academic Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <h4 className="text-xl font-semibold text-gray-600 mb-2">Loading Requests</h4>
                <p className="text-gray-500">Please wait while we fetch the batch requests...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Enhanced Pending Requests */}
                {pendingRequests.length > 0 && (
                  <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200/50">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-yellow-800">Pending Requests</h2>
                          <p className="text-yellow-600 font-medium">{pendingRequests.length} requests awaiting approval</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200/50">
                      {pendingRequests.map((request) => (
                        <div key={request.request_id} className="group p-6 hover:bg-gradient-to-r hover:from-yellow-50/50 hover:to-orange-50/50 transition-all duration-300">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-xl font-bold text-gray-800 mb-2">{request.course_name}</h4>
                                  {getStatusBadge(request.status)}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Center:</span>
                                    <span className="text-gray-600">{request.center_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Teacher:</span>
                                    <span className="text-gray-600">{request.teacher_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Requested by:</span>
                                    <span className="text-gray-600">{request.requester_name}</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Time:</span>
                                    <span className="text-gray-600">{request.time_from} - {request.time_to}</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Duration:</span>
                                    <span className="text-gray-600">{request.duration} hours</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Max Students:</span>
                                    <span className="text-gray-600">{request.max_students}</span>
                                  </div>
                                </div>
                              </div>
                              {request.justification && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200/50">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-gray-800">Justification:</span> {request.justification}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-3 lg:min-w-[200px]">
                              <button
                                onClick={() => handleApprove(request.request_id)}
                                disabled={actionLoading[request.request_id]}
                                className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg hover:shadow-xl"
                              >
                                {actionLoading[request.request_id] === 'approving' ? (
                                  <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Approving...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Approve</span>
                                  </div>
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(request.request_id)}
                                disabled={actionLoading[request.request_id]}
                                className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 shadow-lg hover:shadow-xl"
                              >
                                {actionLoading[request.request_id] === 'rejecting' ? (
                                  <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Rejecting...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Reject</span>
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Enhanced State Approved Requests */}
                {stateApprovedRequests.length > 0 && (
                  <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-blue-800">State Approved</h2>
                          <p className="text-blue-600 font-medium">{stateApprovedRequests.length} requests approved by state</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200/50">
                      {stateApprovedRequests.map((request) => (
                        <div key={request.request_id} className="group p-6 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-800 mb-2">{request.course_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Center:</span>
                                <span className="text-gray-600">{request.center_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Teacher:</span>
                                <span className="text-gray-600">{request.teacher_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Requested by:</span>
                                <span className="text-gray-600">{request.requester_name}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Time:</span>
                                <span className="text-gray-600">{request.time_from} - {request.time_to}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Duration:</span>
                                <span className="text-gray-600">{request.duration} hours</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Max Students:</span>
                                <span className="text-gray-600">{request.max_students}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                            <div className="text-sm text-gray-700 space-y-2">
                              <p><span className="font-semibold text-blue-800">State Approved by:</span> {request.state_reviewer_name}</p>
                              <p><span className="font-semibold text-blue-800">Approved at:</span> {formatDate(request.state_reviewed_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Enhanced Academic Approved Requests */}
                {academicApprovedRequests.length > 0 && (
                  <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200/50">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-green-800">Academic Approved</h2>
                          <p className="text-green-600 font-medium">{academicApprovedRequests.length} requests fully approved</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200/50">
                      {academicApprovedRequests.map((request) => (
                        <div key={request.request_id} className="group p-6 hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/50 transition-all duration-300">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-800 mb-2">{request.course_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Center:</span>
                                <span className="text-gray-600">{request.center_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Teacher:</span>
                                <span className="text-gray-600">{request.teacher_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Requested by:</span>
                                <span className="text-gray-600">{request.requester_name}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Time:</span>
                                <span className="text-gray-600">{request.time_from} - {request.time_to}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Duration:</span>
                                <span className="text-gray-600">{request.duration} hours</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Max Students:</span>
                                <span className="text-gray-600">{request.max_students}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                            <div className="text-sm text-gray-700 space-y-2">
                              <p><span className="font-semibold text-green-800">Created Batch:</span> {request.created_batch_name}</p>
                              <p><span className="font-semibold text-green-800">Academic Approved by:</span> {request.academic_reviewer_name}</p>
                              <p><span className="font-semibold text-green-800">Approved at:</span> {formatDate(request.academic_reviewed_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Enhanced Rejected Requests */}
                {rejectedRequests.length > 0 && (
                  <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-200/50">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-red-800">Rejected Requests</h2>
                          <p className="text-red-600 font-medium">{rejectedRequests.length} requests rejected</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200/50">
                      {rejectedRequests.map((request) => (
                        <div key={request.request_id} className="group p-6 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-pink-50/50 transition-all duration-300">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-800 mb-2">{request.course_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Center:</span>
                                <span className="text-gray-600">{request.center_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Teacher:</span>
                                <span className="text-gray-600">{request.teacher_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Requested by:</span>
                                <span className="text-gray-600">{request.requester_name}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Time:</span>
                                <span className="text-gray-600">{request.time_from} - {request.time_to}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Duration:</span>
                                <span className="text-gray-600">{request.duration} hours</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                <span className="font-semibold text-gray-700">Max Students:</span>
                                <span className="text-gray-600">{request.max_students}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200/50">
                            <div className="text-sm text-gray-700 space-y-2">
                              <p><span className="font-semibold text-red-800">Rejected by:</span> {request.rejected_by_name}</p>
                              <p><span className="font-semibold text-red-800">Rejected at:</span> {formatDate(request.rejected_at)}</p>
                              <p><span className="font-semibold text-red-800">Reason:</span> {request.rejection_reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Enhanced Empty State */}
                {filteredRequests.length === 0 && !loading && (
                  <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-600 mb-2">No batch requests found</h4>
                    <p className="text-gray-500">No batch requests match your current search criteria</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateBatchRequestsPage;
