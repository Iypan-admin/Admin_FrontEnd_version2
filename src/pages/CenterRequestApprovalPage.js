import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import CreateCenterRequestModal from "../components/CreateCenterRequestModal";
import { getCenterRequests, getAllCenterRequestsForState, approveCenterRequest, rejectCenterRequest } from "../services/Api";

const CenterRequestApprovalPage = () => {
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
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
          <div className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading center requests...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-xl">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
                      {userRole === 'state' ? 'Center Requests' : 'Center Request Approval'}
                    </h1>
                    <p className="text-lg text-gray-600 font-medium">
                      {userRole === 'state' 
                        ? 'Manage center creation requests for your state' 
                        : 'Review and approve center creation requests'
                      }
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last updated: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Create New Request Button */}
                {userRole === 'state' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:via-green-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2 shadow-xl hover:shadow-2xl"
                  >
                    <div className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="font-semibold">Request New Center</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </button>
                )}
              </div>

              {/* Enhanced State Admin Notice */}
              {userRole === 'state' && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl shadow-lg">
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
                      <p className="text-gray-700 leading-relaxed">
                        As a State Admin, you can view all center requests for your state and create new requests. 
                        Only Managers and Admins can approve or reject requests.
                      </p>
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
                          placeholder="Search by center name, state, or requester name..."
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
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending Requests</p>
                      <p className="text-3xl font-bold text-gray-900">{pendingRequests.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Approved</p>
                      <p className="text-3xl font-bold text-gray-900">{approvedRequests.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Rejected</p>
                      <p className="text-3xl font-bold text-gray-900">{rejectedRequests.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Requests List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Center Requests</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{filteredRequests.length} requests</span>
                  </div>
                </div>
                
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-600 mb-2">No center requests found</h4>
                    <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredRequests.map((request) => (
                      <div key={request.request_id} className="group bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl hover:border-gray-300/50 transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xl font-bold text-gray-800 mb-2">{request.center_name}</h4>
                                {getStatusBadge(request.status)}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span className="font-semibold text-gray-700">State:</span>
                                  <span className="text-gray-600">{request.state_name}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span className="font-semibold text-gray-700">Requested by:</span>
                                  <span className="text-gray-600">{request.requester_name}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                  <span className="font-semibold text-gray-700">Full Name:</span>
                                  <span className="text-gray-600">{request.requester_full_name}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                  <span className="font-semibold text-gray-700">Requested:</span>
                                  <span className="text-gray-600">{formatDate(request.requested_at)}</span>
                                </div>
                                {request.reviewed_at && (
                                  <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">Reviewed:</span>
                                    <span className="text-gray-600">{formatDate(request.reviewed_at)}</span>
                                  </div>
                                )}
                                {request.rejection_reason && (
                                  <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                                    <div>
                                      <span className="font-semibold text-gray-700">Reason:</span>
                                      <p className="text-gray-600 mt-1">{request.rejection_reason}</p>
                                    </div>
                                  </div>
                                )}
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
                          
                          {request.status === 'pending' && userRole !== 'state' && (
                            <div className="flex flex-col space-y-2 ml-6">
                              <button
                                onClick={() => handleApprove(request.request_id)}
                                disabled={actionLoading[request.request_id]}
                                className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg hover:shadow-xl"
                              >
                                {actionLoading[request.request_id] === 'approving' ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Approving...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Approve</span>
                                  </div>
                                )}
                              </button>
                              <button
                                onClick={() => openRejectModal(request.request_id, request.center_name)}
                                disabled={actionLoading[request.request_id]}
                                className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 shadow-lg hover:shadow-xl"
                              >
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Reject</span>
                                </div>
                              </button>
                            </div>
                          )}
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

      {/* Enhanced Rejection Modal */}
      {showRejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Reject Center Request</h3>
                    <p className="text-gray-600">Provide a reason for rejection</p>
                  </div>
                </div>
                <button
                  onClick={closeRejectModal}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                <p className="text-gray-700">
                  You are about to reject the request for <strong className="text-red-800">{showRejectModal.requestName}</strong>
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Reason for rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="Please provide a detailed reason for rejection..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={closeRejectModal}
                  className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || actionLoading[showRejectModal.requestId]}
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                >
                  {actionLoading[showRejectModal.requestId] === 'rejecting' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Rejecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Reject Request</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Center Request Modal */}
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
