import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getBatchRequestsForState, approveBatchRequest, rejectBatchRequest } from "../services/Api";

const StateBatchRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header - Center Admin Style */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black opacity-10"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                      Batch Requests
                    </h1>
                    <p className="text-blue-100 text-lg">
                      Review and approve batch creation requests from Center Admins
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-blue-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last updated: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

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
