import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import BatchChangeModal from "../components/BatchChangeModal";
import BatchHistoryModal from "../components/BatchHistoryModal";
import { getAllStudents, approveStudent } from "../services/Api";

// Add CSS animations
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  
  .table-row {
    opacity: 0;
    transform: translateY(20px);
  }
  
  .table-row.animate {
    animation: fadeInUp 0.5s ease-out forwards;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchChangeModal, setBatchChangeModal] = useState({ isOpen: false, student: null });
  const [batchHistoryModal, setBatchHistoryModal] = useState({ isOpen: false, student: null });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhone = (phone) => {
    return phone
      ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
      : "N/A";
  };

  const handleApprove = async (studentId) => {
    try {
      const token = localStorage.getItem("token");
      await approveStudent(token, studentId);
      const response = await getAllStudents();
      if (response && response.data) {
        setStudents(response.data);
      }
      alert("Student approved successfully!");
    } catch (error) {
      console.error("Error approving student:", error);
      alert("Failed to approve student: " + error.message);
    }
  };

  const handleBatchChange = (student) => {
    setBatchChangeModal({ isOpen: true, student });
  };

  const handleBatchChangeClose = () => {
    setBatchChangeModal({ isOpen: false, student: null });
  };

  const handleBatchHistory = (student) => {
    setBatchHistoryModal({ isOpen: true, student });
  };

  const handleBatchHistoryClose = () => {
    setBatchHistoryModal({ isOpen: false, student: null });
  };

  const handleBatchUpdate = async () => {
    // Refresh the students list after batch update
    try {
      const response = await getAllStudents();
      if (response && response.data) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error("Error refreshing students after batch update:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllStudents();
      if (response && response.data) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // Filter by search query & sort by status then by created_at descending
  const filteredStudents = students
    .filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    .sort((a, b) => {
      // Pending first, Active later
      if (a.status !== b.status) return a.status ? 1 : -1;
      // If same status, sort by recent created_at first
      return new Date(b.created_at) - new Date(a.created_at);
    });

  useEffect(() => {
    fetchStudents();
  }, []);

  // Trigger animations when students data changes
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const rows = document.querySelectorAll('.table-row');
      rows.forEach((row, index) => {
        setTimeout(() => {
          row.classList.add('animate');
        }, index * 50);
      });
    }
  }, [filteredStudents]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Navbar />
        <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="flex-1 lg:ml-64 overflow-hidden">
        <div className="h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Manage Students
              </h1>
                      <p className="text-gray-600 mt-1">View and manage student registrations</p>
                    </div>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="hidden lg:flex space-x-4">
                    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                      <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                      <div className="text-sm text-gray-600">Total Students</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                      <div className="text-2xl font-bold text-green-600">
                        {students.filter(s => s.status).length}
                      </div>
                      <div className="text-sm text-gray-600">Approved</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                      <div className="text-2xl font-bold text-orange-600">
                        {students.filter(s => !s.status).length}
                      </div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Search Bar */}
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                <input
                  type="text"
                    placeholder="Search students by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  {error}
                  </div>
                </div>
              )}

              {/* Enhanced Table Container */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    <table className="w-full min-w-[900px] divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-blue-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Reg Number</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Student</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Contact</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Batch</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Center</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Joined</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Status</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Actions</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredStudents.map((student, index) => (
                          <tr 
                            key={student.student_id} 
                            className="table-row hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                            data-index={index}
                          >
                            {/* Registration Number */}
                            <td className="px-6 py-5 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-blue-600">{student.registration_number || "N/A"}</span>
                              </div>
                            </td>
                            
                            {/* Student Name */}
                            <td className="px-6 py-5 text-sm text-gray-900 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {student.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{student.name}</div>
                                  {student.referring_center_name && (
                                    <div className="text-xs text-blue-600">
                                      Referred by {student.referring_center_name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Contact Info */}
                            <td className="px-6 py-5 text-sm text-gray-600">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate max-w-[180px]">{student.email}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-gray-500">{formatPhone(student.phone)}</span>
                                </div>
                              </div>
                            </td>
                            
                            {/* Batch Name */}
                            <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    <span className="font-medium">{student.batch_name || "N/A"}</span>
                                  </div>
                                </div>
                                {student.student_id && (
                                  <button
                                    onClick={() => handleBatchHistory(student)}
                                    className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-md transition-colors duration-200 border border-blue-200 hover:border-blue-300"
                                    title="View Batch History"
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    History
                                  </button>
                                )}
                              </div>
                            </td>
                            
                            {/* Center */}
                            <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{student.center_name || "N/A"}</span>
                              </div>
                            </td>
                            
                            {/* Created Date */}
                            <td className="px-6 py-5 text-sm text-gray-500 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{formatDate(student.created_at)}</span>
                              </div>
                            </td>
                            
                            {/* Status */}
                            <td className="px-6 py-5 text-sm whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${student.status ? "bg-green-400" : "bg-orange-400"}`}></div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  student.status 
                                    ? "bg-green-100 text-green-800 border border-green-200" 
                                    : "bg-orange-100 text-orange-800 border border-orange-200"
                                }`}>
                                  {student.status ? (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                      Pending
                                    </>
                                  )}
                              </span>
                              </div>
                            </td>
                            
                            {/* Actions */}
                            <td className="px-6 py-5 text-sm font-medium whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {!student.status ? (
                                  <button 
                                    onClick={() => handleApprove(student.student_id)} 
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Approve
                                  </button>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center text-green-600">
                                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm font-medium">Approved</span>
                                    </div>
                                    
                                    {/* Batch Change Button - Only for approved students with existing batch */}
                                    {student.batch_name && student.batch_name !== "N/A" && (
                                      <button
                                        onClick={() => handleBatchChange(student)}
                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                        title="Change Batch Assignment"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        Change Batch
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Enhanced Empty State */}
              {filteredStudents.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <svg
                      className="w-12 h-12 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                        strokeWidth="1.5"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchQuery ? "No students found" : "No students registered"}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? `No students match your search for "${searchQuery}". Try adjusting your search terms.`
                      : "No students have been registered in the system yet. Students will appear here once they complete registration."
                    }
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Change Modal */}
      <BatchChangeModal
        isOpen={batchChangeModal.isOpen}
        onClose={handleBatchChangeClose}
        student={batchChangeModal.student}
        onUpdate={handleBatchUpdate}
      />

      {/* Batch History Modal */}
      <BatchHistoryModal
        isOpen={batchHistoryModal.isOpen}
        onClose={handleBatchHistoryClose}
        student={batchHistoryModal.student}
      />
    </div>
  );
};

export default ManageStudentsPage;
