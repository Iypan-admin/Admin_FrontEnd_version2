import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  getBatches,
  createBatch,
  updateBatch,
  getMergeGroups,
} from "../services/Api";
import EditBatchModal from "../components/EditBatchModal";
import CreateBatchModal from "../components/CreateBatchModal";
import BatchMergeModal from "../components/BatchMergeModal";
import EnrolledStudentsModal from "../components/EnrolledStudentsModal";
import StartBatchModal from "../components/StartBatchModal";

const ManageBatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [startingBatch, setStartingBatch] = useState(null);
  const [completingBatch, setCompletingBatch] = useState(null);
  const [mergeGroups, setMergeGroups] = useState([]);
  const [mergedBatchMap, setMergedBatchMap] = useState({});
  const [enrolledStudentsModal, setEnrolledStudentsModal] = useState({ isOpen: false, batchId: null, batchName: null });
  const [startBatchModal, setStartBatchModal] = useState({ isOpen: false, batchId: null, batchName: '' });

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



  const filteredBatches = batches
    .filter((batch) => {
      const query = searchTerm.toLowerCase();

      return (
        batch.batch_name?.toLowerCase().includes(query) ||
        batch.course_type?.toLowerCase().includes(query) ||
        String(batch.duration)?.toLowerCase().includes(query) ||
        batch.center_name?.toLowerCase().includes(query) ||
        batch.teacher_name?.toLowerCase().includes(query) ||
        batch.course_name?.toLowerCase().includes(query) ||
        String(batch.student_count ?? 0).toLowerCase().includes(query) ||
        batch.status?.toLowerCase().includes(query) ||
        batch.created_by?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Sort by status first (Pending, Approved, Rejected), then by batch number
      const statusOrder = { 'Pending': 0, 'Approved': 1, 'Rejected': 2, 'Started': 3, 'Completed': 4, 'Cancelled': 5 };
      const statusA = statusOrder[a.status] ?? 6;
      const statusB = statusOrder[b.status] ?? 6;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      const numA = parseInt(a.batch_name.replace(/\D/g, ""), 10);
      const numB = parseInt(b.batch_name.replace(/\D/g, ""), 10);
      return numB - numA; // highest batch number first
    });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const response = await getBatches(token);
      console.log("Batches response:", response);

      if (response?.success && Array.isArray(response.data)) {
        setBatches(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setError("Failed to load batches: " + error.message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMergeGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const groups = await getMergeGroups(token);
      
      if (groups && groups.data) {
        setMergeGroups(groups.data);
        console.log("Merge groups:", groups.data);
      }
    } catch (error) {
      console.error("Failed to fetch merge groups:", error);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchMergeGroups();
  }, []);

  const handleUpdateBatch = async (batchId, updateData) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");

      console.log("Updating batch:", { batchId, updateData });

      const response = await updateBatch(token, batchId, updateData);

      if (response && response.success) {
        alert("Batch updated successfully!");
        await fetchBatches();
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
      await fetchBatches();
      setShowCreateModal(false);
      alert("Batch created successfully!");
    } catch (error) {
      console.error("Failed to create batch:", error);
      setError("Failed to create batch: " + error.message);
    }
  };

  const handleStartBatchClick = (batchId, batchName) => {
    setStartBatchModal({ isOpen: true, batchId, batchName });
  };

  const handleStartBatchConfirm = async (totalSessions) => {
    try {
      setError(null);
      setStartingBatch(startBatchModal.batchId);
      const token = localStorage.getItem("token");

      const response = await fetch(`http://localhost:3005/api/batches/${startBatchModal.batchId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_date: new Date().toISOString(),
          total_sessions: totalSessions
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Batch started successfully!");
        await fetchBatches();
        setStartBatchModal({ isOpen: false, batchId: null, batchName: '' });
      } else {
        throw new Error(data.error || "Failed to start batch");
      }
    } catch (error) {
      console.error("Failed to start batch:", error);
      setError("Failed to start batch: " + error.message);
      alert("Failed to start batch. Please try again.");
    } finally {
      setStartingBatch(null);
    }
  };

  const handleCompleteBatch = async (batchId) => {
    try {
      setError(null);
      setCompletingBatch(batchId);
      const token = localStorage.getItem("token");

      const response = await fetch(`http://localhost:3005/api/batches/${batchId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          end_date: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Batch completed successfully!");
        await fetchBatches();
      } else {
        throw new Error(data.error || "Failed to complete batch");
      }
    } catch (error) {
      console.error("Failed to complete batch:", error);
      setError("Failed to complete batch: " + error.message);
      alert("Failed to complete batch. Please try again.");
    } finally {
      setCompletingBatch(null);
    }
  };

  const handleMergeSuccess = async (response) => {
    try {
      alert("Merge group created successfully!");
      await fetchBatches();
    } catch (error) {
      console.error("Error refreshing batches:", error);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
          <div className="p-4 lg:p-8">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Batches</h3>
                  <p className="mt-2 text-gray-500">Please wait while we fetch your batch data...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
          <div className="p-4 lg:p-8">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Enhanced Header Section */}
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative p-8 lg:p-12">
                    <div className="flex flex-col lg:flex-row items-center justify-between">
                      <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                            Manage Batches
                          </h1>
                          <p className="text-blue-100 text-lg lg:text-xl">
                            Create and manage course batches efficiently
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Merge Batches Button - Only for Academic Admin */}
                        {userRole === 'academic' && (
                          <button
                            onClick={() => setShowMergeModal(true)}
                            className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg font-semibold border border-white/30"
                          >
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Merge Batches
                          </button>
                        )}
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg font-semibold border border-white/30"
                        >
                          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Create Batch
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
                </div>

              {/* Enhanced Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 p-6 rounded-xl shadow-lg mb-6">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">{error}</span>
                  </div>
                </div>
              )}


              {/* Enhanced Search and Filter Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Search Batches</h2>
                    <p className="text-sm text-gray-500">Find batches by name, center, course, or teacher</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search batches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Enhanced Table Container */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Batch Management</h3>
                        <p className="text-sm text-gray-500">{filteredBatches.length} batches found</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Live Data</span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="min-w-[1200px] divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Batch Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Course Info
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Center & Teacher
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Capacity
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Merge Group
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Created By
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredBatches.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Batches Found</h3>
                                <p className="text-gray-500 mb-6 max-w-md text-center">
                                  {searchTerm ? 'No batches match your search criteria. Try adjusting your search terms.' : 'Get started by creating your first batch.'}
                                </p>
                                {!searchTerm && (
                                  <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                                  >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Your First Batch
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredBatches.map((batch, index) => (
                          <tr key={batch.batch_id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                            {/* Batch Details */}
                            <td className="px-6 py-6">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {batch.batch_name?.charAt(0) || 'B'}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate">
                                    {batch.batch_name}
                                  </p>
                                  <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                    {batch.duration} months duration
                                  </p>
                                </div>
                              </div>
                            </td>
                            
                            {/* Course Info */}
                            <td className="px-6 py-6">
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-800">
                                  {batch.course_name}
                                </p>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    batch.course_type === "Immersion"
                                      ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                                      : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800"
                                  }`}
                                >
                                  {batch.course_type}
                                </span>
                              </div>
                            </td>
                            
                            {/* Center & Teacher */}
                            <td className="px-6 py-6">
                              <div className="space-y-1">
                                <p className="text-sm text-gray-900 group-hover:text-gray-800 font-medium">
                                  {batch.center_name}
                                </p>
                                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                  {batch.teacher_name}
                                </p>
                                {batch.assistant_tutor_name && (
                                  <p className="text-xs text-blue-600 group-hover:text-blue-700">
                                    Asst: {batch.assistant_tutor_name}
                                  </p>
                                )}
                              </div>
                            </td>
                            
                            {/* Capacity */}
                            <td className="px-6 py-6">
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
                            
                            {/* Status */}
                            <td className="px-6 py-6">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  batch.status === 'Approved'
                                    ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800"
                                    : batch.status === 'Started'
                                    ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                                    : batch.status === 'Completed'
                                    ? "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800"
                                    : batch.status === 'Cancelled'
                                    ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800"
                                    : batch.status === 'Pending'
                                    ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800"
                                    : batch.status === 'Rejected'
                                    ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800"
                                    : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800"
                                }`}
                              >
                                {batch.status || 'Approved'}
                              </span>
                            </td>
                            
                            {/* Merge Group */}
                            <td className="px-6 py-6">
                              {(() => {
                                // Find if this batch is part of a merge group
                                const mergeGroup = mergeGroups.find(group => 
                                  group.batches && group.batches.some(b => b.batch_id === batch.batch_id)
                                );
                                
                                if (mergeGroup && mergeGroup.batches) {
                                  // Extract batch numbers (e.g., "B119" from "B119-ON-FR-IMM-R-A2-B2-10:30AM-12:30PM")
                                  const batchNumbers = mergeGroup.batches
                                    .map(b => {
                                      if (!b.batch_name) return '';
                                      // Extract the batch number (everything before the first dash)
                                      const match = b.batch_name.match(/^([^-]+)/);
                                      return match ? match[1] : b.batch_name;
                                    })
                                    .filter(name => name)
                                    .join(', ');
                                  
                                  return (
                                    <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                      </svg>
                                      <span className="text-xs font-semibold text-purple-800">{batchNumbers}</span>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <span className="text-xs text-gray-400 italic">Not merged</span>
                                );
                              })()}
                            </td>
                            
                            {/* Created By */}
                            <td className="px-6 py-6">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-semibold">
                                  {batch.created_by?.charAt(0) || 'U'}
                                </div>
                                <span className="text-sm text-gray-600 group-hover:text-gray-800">
                                  {batch.created_by || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            
                            {/* Actions */}
                            <td className="px-6 py-6">
                              <div className="flex flex-wrap items-center gap-2">

                                {/* Start Batch Button - For approved batches */}
                                {batch.status === 'Approved' && (userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                                  <button
                                    onClick={() => handleStartBatchClick(batch.batch_id, batch.batch_name)}
                                    disabled={startingBatch === batch.batch_id}
                                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {startingBatch === batch.batch_id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                        Starting...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Start Batch
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Complete Batch Button - For started batches */}
                                {batch.status === 'Started' && (userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                                  <button
                                    onClick={() => handleCompleteBatch(batch.batch_id)}
                                    disabled={completingBatch === batch.batch_id}
                                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {completingBatch === batch.batch_id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                        Completing...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Complete Batch
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Edit Button - For approved/started batches or admin/manager */}
                                {((batch.status === 'Approved' || batch.status === 'Started' || !batch.status) && (userRole === 'admin' || userRole === 'manager' || userRole === 'academic')) && (
                                  <button
                                    onClick={() => setEditingBatch(batch)}
                                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                )}

                                {/* Pending Status - For pending batches */}
                                {batch.status === 'Pending' && (
                                  <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 text-xs font-medium rounded-lg">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending
                                  </span>
                                )}

                              </div>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      
      {editingBatch && (
        <EditBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onUpdate={handleUpdateBatch}
        />
      )}
      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBatch}
        />
      )}
      {showMergeModal && (
        <BatchMergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          onSuccess={handleMergeSuccess}
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
      <StartBatchModal
        isOpen={startBatchModal.isOpen}
        onClose={() => setStartBatchModal({ isOpen: false, batchId: null, batchName: '' })}
        onConfirm={handleStartBatchConfirm}
        batchName={startBatchModal.batchName}
        isLoading={startingBatch === startBatchModal.batchId}
      />
    </>
  );
};

export default ManageBatchesPage;
