import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RejectionModal from "../components/RejectionModal";
import EditBatchModal from "../components/EditBatchModal";
import CreateBatchModal from "../components/CreateBatchModal";
import EnrolledStudentsModal from "../components/EnrolledStudentsModal";
import { getBatches, approveBatch, rejectBatch, updateBatch, createBatch, deleteBatch } from "../services/Api";

const BatchApprovalPage = () => {
  const navigate = useNavigate();
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, batchId: null, batchName: '' });
  const [editingBatch, setEditingBatch] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [enrolledStudentsModal, setEnrolledStudentsModal] = useState({ isOpen: false, batchId: null, batchName: null });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'completed'

  // Filter batches by search term
  const filteredBatches = allBatches.filter((batch) => {
    const query = searchTerm.toLowerCase();
    return (
      batch.batch_name?.toLowerCase().includes(query) ||
      batch.center_name?.toLowerCase().includes(query) ||
      batch.course_name?.toLowerCase().includes(query) ||
      batch.teacher_name?.toLowerCase().includes(query) ||
      batch.created_by?.toLowerCase().includes(query)
    );
  });

  // Get user role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setUserRole(decodedToken.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  // Role-based permission helpers
  const canCreate = () => ['admin', 'manager', 'academic'].includes(userRole);
  const canEdit = () => ['admin', 'manager', 'academic'].includes(userRole);
  const canDelete = () => userRole === 'admin';
  const canApprove = () => ['admin', 'manager'].includes(userRole);

  // Organize batches by status
  const pendingBatches = filteredBatches.filter(batch => batch.status === 'Pending');
  const approvedBatches = filteredBatches.filter(batch => 
    ['Approved', 'Started'].includes(batch.status)
  );
  const completedBatches = filteredBatches.filter(batch => batch.status === 'Completed');
  const rejectedBatches = filteredBatches.filter(batch => batch.status === 'Rejected');

  // Filter batches based on active tab
  const getTabBatches = () => {
    switch (activeTab) {
      case 'pending':
        return pendingBatches;
      case 'approved':
        return approvedBatches;
      case 'completed':
        return completedBatches;
      default:
        return [];
    }
  };

  const fetchAllBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await getBatches(token);
      
      console.log("🔄 Frontend: Fetched batches response:", response);
      
      if (response?.success && Array.isArray(response.data)) {
        console.log("🔄 Frontend: Setting batches data:", response.data);
        setAllBatches(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setError("Failed to load batches: " + error.message);
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBatches();
  }, []);

  const handleApprove = async (batchId) => {
    try {
      setActionLoading(prev => ({ ...prev, [batchId]: 'approving' }));
      const token = localStorage.getItem("token");
      
      const response = await approveBatch(token, batchId);
      
      if (response?.success) {
        alert("Batch approved successfully!");
        await fetchAllBatches();
      } else {
        throw new Error(response?.message || "Failed to approve batch");
      }
    } catch (error) {
      console.error("Approve batch error:", error);
      alert("Failed to approve batch. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [batchId]: null }));
    }
  };

  const handleRejectClick = (batchId, batchName) => {
    setRejectionModal({
      isOpen: true,
      batchId,
      batchName
    });
  };

  const handleRejectConfirm = async (rejectionReason) => {
    try {
      setActionLoading(prev => ({ ...prev, [rejectionModal.batchId]: 'rejecting' }));
      const token = localStorage.getItem("token");
      
      const response = await rejectBatch(token, rejectionModal.batchId, rejectionReason);
      
      if (response?.success) {
        alert("Batch rejected successfully!");
        setRejectionModal({ isOpen: false, batchId: null, batchName: '' });
        await fetchAllBatches();
      } else {
        throw new Error(response?.message || "Failed to reject batch");
      }
    } catch (error) {
      console.error("Reject batch error:", error);
      alert("Failed to reject batch. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [rejectionModal.batchId]: null }));
    }
  };

  const handleRejectCancel = () => {
    setRejectionModal({ isOpen: false, batchId: null, batchName: '' });
  };

  const handleUpdateBatch = async (batchId, updateData) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");

      console.log("🔄 Frontend: Updating batch:", { batchId, updateData });
      console.log("🔄 Frontend: max_students value:", updateData.max_students, typeof updateData.max_students);

      const response = await updateBatch(token, batchId, updateData);

      if (response && response.success) {
        console.log("✅ Frontend: Update successful, refreshing data...");
        alert("Batch updated successfully!");
        await fetchAllBatches();
        setEditingBatch(null);
      } else {
        throw new Error(response?.message || "Failed to update batch");
      }
    } catch (error) {
      console.error("Update batch error:", error);
      setError(`Failed to update batch: ${error.message}`);
      alert("Failed to update batch. Please try again.");
    }
  };

  const handleCreateBatch = async (batchData) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      await createBatch(token, batchData);
      await fetchAllBatches();
      setShowCreateModal(false);
      alert("Batch created successfully!");
    } catch (error) {
      console.error("Failed to create batch:", error);
      setError("Failed to create batch: " + error.message);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      setActionLoading(prev => ({ ...prev, [batchId]: 'deleting' }));
      const token = localStorage.getItem("token");
      
      const response = await deleteBatch(token, batchId);
      
      if (response?.success) {
        // Remove the batch from the local state
        setAllBatches(prev => prev.filter(batch => batch.batch_id !== batchId));
        alert('Batch deleted successfully');
      } else {
        throw new Error(response?.error || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [batchId]: null }));
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return timeString;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-lg font-medium text-gray-600 animate-pulse">Loading batches...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header Section */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 truncate">Batch Management</h1>
                        <p className="text-blue-100 text-sm sm:text-base lg:text-lg leading-tight">Review and manage all batch requests from Academic Coordinators</p>
                      </div>
                    </div>
                    {canCreate() && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/30 w-full sm:w-auto"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm sm:text-base font-semibold">Create New Batch</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Pending Batches</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{pendingBatches.length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Approved Batches</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{approvedBatches.length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Rejected Batches</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{rejectedBatches.length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Error Display */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-4 mb-6 shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Search Section */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
                {/* Search Section Header */}
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Search & Filter Batches</h2>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">Find batches by name, center, course, teacher, or creator</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search batches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      />
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Search Results Info */}
                  {searchTerm && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs sm:text-sm text-gray-600">
                        Showing {filteredBatches.length} of {allBatches.length} batches
                      </p>
                      {filteredBatches.length === 0 && (
                        <p className="text-xs sm:text-sm text-red-600 font-medium">
                          No batches found matching your search
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Navigation - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-white rounded-xl shadow-lg p-2 sm:p-2 mb-6">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'pending'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg sm:transform sm:scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm sm:text-base">Pending</span>
                    {pendingBatches.length > 0 && (
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === 'pending' ? 'bg-white text-yellow-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {pendingBatches.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`flex-1 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'approved'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg sm:transform sm:scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm sm:text-base">
                      <span className="hidden sm:inline">Approved/Started</span>
                      <span className="sm:hidden">Approved</span>
                    </span>
                    {approvedBatches.length > 0 && (
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === 'approved' ? 'bg-white text-green-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {approvedBatches.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'completed'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg sm:transform sm:scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base">Completed</span>
                    {completedBatches.length > 0 && (
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === 'completed' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {completedBatches.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Enhanced Table Section */}
              {getTabBatches().length > 0 && (
                <div className="mb-8">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Enhanced Table Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">All Batches Overview</span>
                      </h2>
                    </div>
                    
                    {/* Single Table with Sticky Header */}
                    <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-blue-600 to-purple-600 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '220px', minWidth: '220px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">Batch Details</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '200px', minWidth: '200px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">Center & Course</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '150px', minWidth: '150px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="truncate">Capacity</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '180px', minWidth: '180px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">Teacher & Timing</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '140px', minWidth: '140px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Created By</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '140px', minWidth: '140px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Approved By</span>
                              </div>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider" style={{ width: '150px', minWidth: '150px' }}>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">Actions</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {/* Display batches based on active tab */}
                          {getTabBatches().map((batch, index) => {
                            // Determine border color based on status
                            const getBorderColor = () => {
                              if (batch.status === 'Pending') return 'border-yellow-400';
                              if (batch.status === 'Approved' || batch.status === 'Started') return 'border-green-400';
                              if (batch.status === 'Completed') return 'border-blue-400';
                              if (batch.status === 'Rejected') return 'border-red-400';
                              return 'border-gray-300';
                            };
                            
                            const getHoverColor = () => {
                              if (batch.status === 'Pending') return 'hover:from-yellow-50 hover:to-orange-50';
                              if (batch.status === 'Approved' || batch.status === 'Started') return 'hover:from-green-50 hover:to-emerald-50';
                              if (batch.status === 'Completed') return 'hover:from-blue-50 hover:to-indigo-50';
                              if (batch.status === 'Rejected') return 'hover:from-red-50 hover:to-pink-50';
                              return 'hover:from-gray-50 hover:to-blue-50';
                            };

                            // Get status badge styling
                            const getStatusBadge = () => {
                              if (batch.status === 'Pending') {
                                return {
                                  bg: 'bg-gradient-to-r from-yellow-100 to-orange-100',
                                  text: 'text-yellow-800',
                                  border: 'border-yellow-200',
                                  dot: 'bg-yellow-400',
                                  label: 'Pending Approval'
                                };
                              } else if (batch.status === 'Approved' || batch.status === 'Started') {
                                return {
                                  bg: 'bg-gradient-to-r from-green-100 to-emerald-100',
                                  text: 'text-green-800',
                                  border: 'border-green-200',
                                  dot: 'bg-green-400',
                                  label: batch.status
                                };
                              } else if (batch.status === 'Completed') {
                                return {
                                  bg: 'bg-gradient-to-r from-blue-100 to-indigo-100',
                                  text: 'text-blue-800',
                                  border: 'border-blue-200',
                                  dot: 'bg-blue-400',
                                  label: 'Completed'
                                };
                              } else if (batch.status === 'Rejected') {
                                return {
                                  bg: 'bg-gradient-to-r from-red-100 to-pink-100',
                                  text: 'text-red-800',
                                  border: 'border-red-200',
                                  dot: 'bg-red-400',
                                  label: 'Rejected'
                                };
                              }
                              return {
                                bg: 'bg-gradient-to-r from-gray-100 to-gray-100',
                                text: 'text-gray-800',
                                border: 'border-gray-200',
                                dot: 'bg-gray-400',
                                label: batch.status || 'Unknown'
                              };
                            };

                            // Get icon background color
                            const getIconBg = () => {
                              if (batch.status === 'Pending') return 'from-yellow-400 to-orange-400';
                              if (batch.status === 'Approved' || batch.status === 'Started') return 'from-green-400 to-emerald-400';
                              if (batch.status === 'Completed') return 'from-blue-400 to-indigo-400';
                              if (batch.status === 'Rejected') return 'from-red-400 to-pink-400';
                              return 'from-gray-400 to-gray-400';
                            };

                            const statusBadge = getStatusBadge();

                            return (
                            <tr key={batch.batch_id} className={`hover:bg-gradient-to-r ${getHoverColor()} transition-all duration-200 border-l-4 ${getBorderColor()}`}>
                              <td className="px-6 py-6" style={{ width: '220px', minWidth: '220px' }}>
                                <div className="flex items-start space-x-2 sm:space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${getIconBg()} rounded-lg flex items-center justify-center`}>
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm sm:text-lg font-semibold text-gray-900 truncate" title={batch.batch_name}>
                                      {batch.batch_name}
                                    </div>
                                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                      <span className="flex items-center">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {batch.duration} months
                                      </span>
                                      <span className="flex items-center">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {batch.max_students} seats
                                      </span>
                                    </div>
                                    <div className="mt-2">
                                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}>
                                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${statusBadge.dot} rounded-full mr-1.5 sm:mr-2 ${batch.status === 'Pending' ? 'animate-pulse' : ''}`}></div>
                                        <span className="hidden sm:inline">{statusBadge.label}</span>
                                        <span className="sm:hidden">{batch.status}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6" style={{ width: '200px', minWidth: '200px' }}>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 truncate" title={batch.center_name}>
                                      {batch.center_name}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 truncate" title={batch.course_name}>
                                    {batch.course_name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-1">
                                    {batch.course_type} • {batch.mode}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6 whitespace-normal" style={{ width: '150px', minWidth: '150px' }}>
                                <div 
                                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                  onClick={() => setEnrolledStudentsModal({ isOpen: true, batchId: batch.batch_id, batchName: batch.batch_name })}
                                >
                                  <div className="flex-1">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                      <span>Students</span>
                                      <span className="font-semibold text-blue-600">{batch.student_count ?? 0}/{batch.max_students}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(((batch.student_count ?? 0) / batch.max_students) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6" style={{ width: '180px', minWidth: '180px' }}>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 truncate" title={batch.teacher_name}>
                                      {batch.teacher_name}
                                    </div>
                                  </div>
                                  {batch.assistant_tutor_name && (
                                    <div className="flex items-center space-x-2 mb-2">
                                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      </div>
                                      <div className="text-xs text-gray-600 truncate" title={batch.assistant_tutor_name}>
                                        Asst: {batch.assistant_tutor_name}
                                      </div>
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600">
                                    {formatTime(batch.time_from)} - {formatTime(batch.time_to)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6" style={{ width: '140px', minWidth: '140px' }}>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 truncate" title={batch.created_by}>
                                      {batch.created_by}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(batch.created_at)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6" style={{ width: '140px', minWidth: '140px' }}>
                                <div className="min-w-0">
                                  {batch.approved_by ? (
                                    <>
                                      <div className="text-sm font-semibold text-gray-900">{batch.approved_by}</div>
                                      <div className="text-xs text-gray-500">{formatDate(batch.approved_at)}</div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">Awaiting approval</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-6" style={{ width: '150px', minWidth: '150px' }}>
                                <div className="flex flex-col space-y-2">
                                  {batch.status === 'Pending' && canApprove() ? (
                                    <>
                                      <button
                                        onClick={() => handleApprove(batch.batch_id)}
                                        disabled={actionLoading[batch.batch_id]}
                                        className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                      >
                                        {actionLoading[batch.batch_id] === 'approving' ? (
                                          <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Approving...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Approve
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleRejectClick(batch.batch_id, batch.batch_name)}
                                        disabled={actionLoading[batch.batch_id]}
                                        className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                                      >
                                        {actionLoading[batch.batch_id] === 'rejecting' ? (
                                          <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Rejecting...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Reject
                                          </>
                                        )}
                                      </button>
                                    </>
                                  ) : batch.status !== 'Pending' && canEdit() ? (
                                    <div className="flex flex-col space-y-2">
                                      <button
                                        onClick={() => setEditingBatch(batch)}
                                        className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                      </button>
                                      {canDelete() && (
                                        <button
                                          onClick={() => handleDeleteBatch(batch.batch_id)}
                                          disabled={actionLoading[batch.batch_id]}
                                          className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-2">
                                      <span className="text-sm text-gray-400 italic">No actions available</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })}

                          {/* Approved and Rejected sections removed - now handled by activeTab */}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Empty State for Tab */}
              {getTabBatches().length === 0 && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="text-center py-16 px-8">
                    <div className="mb-8">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-r from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        No {activeTab === 'pending' ? 'Pending' : activeTab === 'approved' ? 'Approved/Started' : 'Completed'} batches
                      </h3>
                      <p className="text-lg text-gray-500 max-w-lg mx-auto mb-8">
                        No batches found for this category
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={handleRejectCancel}
        onConfirm={handleRejectConfirm}
        batchName={rejectionModal.batchName}
        isLoading={actionLoading[rejectionModal.batchId] === 'rejecting'}
      />

      {/* Edit Batch Modal */}
      {editingBatch && (
        <EditBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onUpdate={handleUpdateBatch}
        />
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBatch}
        />
      )}
      {enrolledStudentsModal.isOpen && (
        <EnrolledStudentsModal
          isOpen={enrolledStudentsModal.isOpen}
          onClose={() => setEnrolledStudentsModal({ isOpen: false, batchId: null, batchName: null })}
          batchId={enrolledStudentsModal.batchId}
          batchName={enrolledStudentsModal.batchName}
        />
      )}
    </div>
  );
};

export default BatchApprovalPage;
