import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import BatchHistoryModal from "../components/BatchHistoryModal";
import { getAllStudents } from "../services/Api";

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [batchHistoryModal, setBatchHistoryModal] = useState({ isOpen: false, student: null });

  // Get unique values for filters
  const uniqueCenters = [...new Set(students
    .map(student => student.center_name)
    .filter(name => name && name.trim() !== "")
    .sort()
  )];
  const uniqueBatches = [...new Set(students
    .map(student => student.batch_name)
    .filter(name => name && name.trim() !== "")
    .sort()
  )];
  const uniqueStatuses = [...new Set(students.map(student => student.status))];

  // Fetch students data
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllStudents();
      
      if (response.success) {
        setStudents(response.data);
        setFilteredStudents(response.data);
      } else {
        throw new Error(response.message || "Failed to fetch students");
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Filter and search students
  useEffect(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Center filter
    if (centerFilter) {
      filtered = filtered.filter(student => 
        student.center_name && student.center_name === centerFilter
      );
    }

    // Batch filter
    if (batchFilter) {
      filtered = filtered.filter(student => 
        student.batch_name && student.batch_name === batchFilter
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(student => {
        if (statusFilter === "true") {
          return student.status === true;
        } else if (statusFilter === "false") {
          return student.status === false;
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "created_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [students, searchTerm, centerFilter, batchFilter, statusFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Format date
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

  // Batch history handlers
  const handleBatchHistory = (student) => {
    setBatchHistoryModal({ isOpen: true, student });
  };

  const handleBatchHistoryClose = () => {
    setBatchHistoryModal({ isOpen: false, student: null });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setCenterFilter("");
    setBatchFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || centerFilter || batchFilter || statusFilter;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-lg font-medium text-gray-600 animate-pulse">Loading students...</p>
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 truncate">All Students</h1>
                        <p className="text-blue-100 text-sm sm:text-base lg:text-lg leading-tight">View and manage all student records across the platform</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Total Students</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{students.length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Active Students</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{students.filter(s => s.status === true).length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Pending Approval</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{students.filter(s => s.status === false).length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Centers</p>
                          <p className="text-xl sm:text-2xl font-bold text-white">{uniqueCenters.length}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

              {/* Enhanced Search and Filter Section */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
                {/* Search Section Header */}
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Search & Filter Students</h2>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">Find students by name, email, phone, or registration number</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  {/* Search Input */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by name, email, phone, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Center Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Center</label>
                    <select
                      value={centerFilter}
                      onChange={(e) => setCenterFilter(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    >
                      <option value="">All Centers ({uniqueCenters.length})</option>
                      {uniqueCenters.map(center => (
                        <option key={center} value={center}>{center}</option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    >
                      <option value="">All Batches ({uniqueBatches.length})</option>
                      {uniqueBatches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active ({students.filter(s => s.status === true).length})</option>
                      <option value="false">Pending ({students.filter(s => s.status === false).length})</option>
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-3 sm:px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear Filters
                      </button>
                    )}
                    {hasActiveFilters && (
                      <div className="text-xs text-gray-500">
                        {[searchTerm && "Search", centerFilter && "Center", batchFilter && "Batch", statusFilter && "Status"].filter(Boolean).join(", ")} active
                      </div>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Showing {filteredStudents.length} of {students.length} students
                    {hasActiveFilters && (
                      <span className="text-blue-600 font-medium"> (filtered)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Table Section */}
              {filteredStudents.length > 0 ? (
                <div className="mb-8">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Enhanced Table Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">Students Overview</span>
                      </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-blue-600 to-purple-600 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider w-[200px]">
                              <button
                                onClick={() => handleSort("name")}
                                className="flex items-center hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">Student Name</span>
                                {sortField === "name" && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider w-[220px]">
                              <button
                                onClick={() => handleSort("email")}
                                className="flex items-center hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate">Contact</span>
                                {sortField === "email" && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider w-[220px]">
                              <button
                                onClick={() => handleSort("center_name")}
                                className="flex items-center hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">Center & Batch</span>
                                {sortField === "center_name" && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider w-[120px]">
                              <button
                                onClick={() => handleSort("status")}
                                className="flex items-center hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="truncate">Status</span>
                                {sortField === "status" && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-6 text-left text-xs font-semibold text-white uppercase tracking-wider w-[160px]">
                              <button
                                onClick={() => handleSort("created_at")}
                                className="flex items-center hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate">Registration Date</span>
                                {sortField === "created_at" && (
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                  </svg>
                                )}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {currentStudents.map((student, index) => (
                            <tr key={student.student_id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 group ${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}>
                              <td className="px-6 py-6">
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                                      <span className="text-white font-bold text-lg">
                                        {student.name?.charAt(0)?.toUpperCase() || "?"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200" title={student.name}>
                                      {student.name || "N/A"}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate font-medium" title={student.registration_number}>
                                      ID: {student.registration_number || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors duration-200" title={student.email}>
                                    ✉️ {student.email || "N/A"}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate font-medium" title={student.phone}>
                                    📞 {student.phone || "N/A"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors duration-200" title={student.center_name}>
                                      {student.center_name || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs font-medium text-gray-700 truncate" title={student.batch_name}>
                                      📋 {student.batch_name || "N/A"}
                                    </div>
                                    {student.student_id && (
                                      <button
                                        onClick={() => handleBatchHistory(student)}
                                        className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                                        title="View Batch History"
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        History
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                  student.status 
                                    ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200" 
                                    : "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200"
                                }`}>
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    student.status ? 'bg-green-500' : 'bg-yellow-500'
                                  }`}></div>
                                  {student.status ? "Active" : "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-6">
                                <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                                  {formatDate(student.created_at)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Enhanced Empty State */
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || centerFilter || batchFilter || statusFilter
                      ? "Try adjusting your search criteria or filters."
                      : "No students have been registered yet."}
                  </p>
                  {(searchTerm || centerFilter || batchFilter || statusFilter) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch History Modal */}
      <BatchHistoryModal
        isOpen={batchHistoryModal.isOpen}
        onClose={handleBatchHistoryClose}
        student={batchHistoryModal.student}
      />
    </div>
  );
};

export default StudentsPage;
