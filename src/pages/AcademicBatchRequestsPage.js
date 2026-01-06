import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getBatchRequestsForAcademic, rejectBatchRequest, createBatchFromRequest } from "../services/Api";

const AcademicBatchRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      request.center_name?.toLowerCase().includes(query) ||
      request.course_name?.toLowerCase().includes(query) ||
      request.requester_name?.toLowerCase().includes(query) ||
      request.teacher_name?.toLowerCase().includes(query);
    
    return matchesSearch;
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
        await fetchRequests();
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
      case 'state_approved':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">State Approved</span>;
      case 'academic_approved':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">Academic Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200">Rejected</span>;
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
      {/* Fixed Navbar */}
      <div className="fixed inset-y-0 left-0 z-40">
        <Navbar />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Enhanced Header Section */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                          Batch Requests - Academic Review
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base">
                          Review state-approved batch requests and create batches in the system
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-xs text-blue-100 mb-1">Total Requests</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : filteredRequests.length}</p>
                      </div>
                      <div className="flex items-center space-x-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-white font-medium">
                          {filteredRequests.filter(req => req.status === 'state_approved').length} Pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
              </div>

              {/* Enhanced Error Display */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-6 shadow-lg flex items-center space-x-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Error Loading Requests</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Search Bar */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by center, course, teacher, or requester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading batch requests...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* State Approved Requests */}
                  {filteredRequests.filter(req => req.status === 'state_approved').length > 0 && (
                    <section className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span>State Approved Requests</span>
                          </h2>
                          <span className="bg-white text-blue-600 px-4 py-1 rounded-full text-sm font-semibold">
                            {filteredRequests.filter(req => req.status === 'state_approved').length}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {filteredRequests
                          .filter(req => req.status === 'state_approved')
                          .map((request) => (
                          <div key={request.request_id} className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-l-4 border-transparent hover:border-blue-400">
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <h4 className="text-xl font-bold text-gray-900">{request.course_name}</h4>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Center:</span> {request.center_name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Teacher:</span> {request.teacher_name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Requested by:</span> {request.requester_name}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Time:</span> {request.time_from} - {request.time_to}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Duration:</span> {request.duration} hours</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      <span className="text-gray-600"><span className="font-semibold text-gray-800">Max Students:</span> {request.max_students}</span>
                                    </div>
                                  </div>
                                </div>
                                {request.justification && (
                                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <p className="text-sm text-gray-700 flex items-start space-x-2">
                                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span><span className="font-semibold text-gray-800">Justification:</span> {request.justification}</span>
                                    </p>
                                  </div>
                                )}
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span><span className="font-semibold text-gray-800">Approved by:</span> {request.state_reviewer_name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span><span className="font-semibold text-gray-800">Approved at:</span> {formatDate(request.state_reviewed_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                                <button
                                  onClick={() => handleCreateBatch(request.request_id)}
                                  disabled={actionLoading[request.request_id]}
                                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                >
                                  {actionLoading[request.request_id] === 'creating' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                      <span>Creating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                      </svg>
                                      <span>Create Batch</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(request.request_id)}
                                  disabled={actionLoading[request.request_id]}
                                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                >
                                  {actionLoading[request.request_id] === 'rejecting' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                      <span>Rejecting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      <span>Reject</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Academic Approved Requests */}
                  {filteredRequests.filter(req => req.status === 'academic_approved').length > 0 && (
                    <section className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span>Academic Approved</span>
                          </h2>
                          <span className="bg-white text-green-600 px-4 py-1 rounded-full text-sm font-semibold">
                            {filteredRequests.filter(req => req.status === 'academic_approved').length}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {filteredRequests
                          .filter(req => req.status === 'academic_approved')
                          .map((request) => (
                          <div key={request.request_id} className="p-6 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <h4 className="text-xl font-bold text-gray-900">{request.course_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold text-gray-800">Center:</span> {request.center_name}</p>
                                <p><span className="font-semibold text-gray-800">Teacher:</span> {request.teacher_name}</p>
                                <p><span className="font-semibold text-gray-800">Requested by:</span> {request.requester_name}</p>
                              </div>
                              <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold text-gray-800">Time:</span> {request.time_from} - {request.time_to}</p>
                                <p><span className="font-semibold text-gray-800">Duration:</span> {request.duration} hours</p>
                                <p><span className="font-semibold text-gray-800">Max Students:</span> {request.max_students}</p>
                              </div>
                            </div>
                            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Created Batch:</p>
                                  <p className="text-gray-600">{request.created_batch_name}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Approved by:</p>
                                  <p className="text-gray-600">{request.academic_reviewer_name}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="font-semibold text-gray-800 mb-1">Approved at:</p>
                                  <p className="text-gray-600">{formatDate(request.academic_reviewed_at)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Rejected Requests */}
                  {filteredRequests.filter(req => req.status === 'rejected').length > 0 && (
                    <section className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-white flex items-center space-x-3">
                            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <span>Rejected Requests</span>
                          </h2>
                          <span className="bg-white text-red-600 px-4 py-1 rounded-full text-sm font-semibold">
                            {filteredRequests.filter(req => req.status === 'rejected').length}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {filteredRequests
                          .filter(req => req.status === 'rejected')
                          .map((request) => (
                          <div key={request.request_id} className="p-6 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 transition-all duration-200">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-rose-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              <h4 className="text-xl font-bold text-gray-900">{request.course_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold text-gray-800">Center:</span> {request.center_name}</p>
                                <p><span className="font-semibold text-gray-800">Teacher:</span> {request.teacher_name}</p>
                                <p><span className="font-semibold text-gray-800">Requested by:</span> {request.requester_name}</p>
                              </div>
                              <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold text-gray-800">Time:</span> {request.time_from} - {request.time_to}</p>
                                <p><span className="font-semibold text-gray-800">Duration:</span> {request.duration} hours</p>
                                <p><span className="font-semibold text-gray-800">Max Students:</span> {request.max_students}</p>
                              </div>
                            </div>
                            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start space-x-2">
                                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <div>
                                    <p className="font-semibold text-gray-800">Rejected by:</p>
                                    <p className="text-gray-600">{request.rejected_by_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="font-semibold text-gray-800">Rejected at:</p>
                                    <p className="text-gray-600">{formatDate(request.rejected_at)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-2 pt-2 border-t border-red-200">
                                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div>
                                    <p className="font-semibold text-gray-800">Reason:</p>
                                    <p className="text-gray-700 italic">{request.rejection_reason}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredRequests.length === 0 && !loading && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-xl border border-gray-200">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-lg">No batch requests found</p>
                        <p className="text-gray-400 text-sm mt-2">{searchTerm ? 'Try adjusting your search criteria' : 'No requests match your current filters'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicBatchRequestsPage;
