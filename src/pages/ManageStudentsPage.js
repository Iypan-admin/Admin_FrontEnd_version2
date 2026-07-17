import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import BatchChangeModal from "../components/BatchChangeModal";
import BatchHistoryModal from "../components/BatchHistoryModal";
import { getAllStudents, approveStudent, getCurrentUserProfile } from "../services/Api";

const ManageStudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchChangeModal, setBatchChangeModal] = useState({ isOpen: false, student: null });
  const [batchHistoryModal, setBatchHistoryModal] = useState({ isOpen: false, student: null });
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
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Academic Coordinator";
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

  // Fetch user profile picture
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

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen" style={{ marginLeft: isMobile ? '0' : sidebarWidth }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
              <div className="flex items-center space-x-3 sm:space-x-4">
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
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Manage Students</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">View and manage student registrations</p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
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
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Academic Coordinator</p>
                        </div>

                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/academic-coordinator/settings');
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
            {/* Header Section - BERRY Style */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Students</h2>
                  <p className="text-sm text-gray-500">Manage student registrations and approvals</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {students.filter(s => s.status).length}
                  </div>
                  <div className="text-sm text-gray-600">Approved</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">
                    {students.filter(s => !s.status).length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Table Container - BERRY Style */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] divide-y divide-gray-200">
                  <thead className="bg-gray-50">
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
                              <span>Batch</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStudents.map((student, index) => (
                      <tr 
                        key={student.student_id} 
                        className="hover:bg-blue-50 transition-colors duration-150"
                      >
                        {/* Registration Number */}
                        <td 
                          className="px-4 sm:px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => navigate(`/manage-students/${student.student_id}`)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-600">{student.registration_number || "N/A"}</span>
                          </div>
                        </td>
                        
                        {/* Student Name */}
                        <td 
                          className="px-4 sm:px-6 py-4 text-sm text-gray-900 whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => navigate(`/manage-students/${student.student_id}`)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                              {student.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 hover:text-blue-600">{student.name}</div>
                              {student.referring_center_name && (
                                <div className="text-xs text-gray-500">
                                  Referred by {student.referring_center_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Batch Name */}
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{student.batch_name || "N/A"}</span>
                            {student.student_id && (
                              <button
                                onClick={() => handleBatchHistory(student)}
                                className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
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
                        
                        {/* Status */}
                        <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            student.status 
                              ? "bg-green-100 text-green-800" 
                              : "bg-orange-100 text-orange-800"
                          }`}>
                            {student.status ? "Active" : "Pending"}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            {/* 3-Dot Menu Button */}
                            <button
                              ref={el => actionButtonRefs.current[student.student_id] = el}
                              onClick={(e) => {
                                e.stopPropagation();
                                const button = e.currentTarget;
                                const rect = button.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + 8,
                                  left: rect.right - 180
                                });
                                setOpenActionMenu(openActionMenu === student.student_id ? null : student.student_id);
                              }}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            
                            {/* Action Dropdown Menu */}
                            {openActionMenu === student.student_id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[100]"
                                  onClick={() => setOpenActionMenu(null)}
                                ></div>
                                <div 
                                  className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[101] overflow-hidden min-w-[180px]"
                                  style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`
                                  }}
                                >
                                  {/* If approved, show "Approved" option */}
                                  {student.status ? (
                                    <>
                                      <div className="px-4 py-2.5 text-sm text-gray-700 bg-green-50 border-b border-gray-200">
                                        <div className="flex items-center">
                                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span className="font-medium text-green-700">Approved</span>
                                        </div>
                                      </div>
                                      
                                      {/* Batch Change Button - Only if batch exists */}
                                      {student.batch_name && student.batch_name !== "N/A" && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBatchChange(student);
                                            setOpenActionMenu(null);
                                          }}
                                          className="w-full flex items-center px-4 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm text-gray-700"
                                        >
                                          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                          </svg>
                                          Change Batch
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    /* If not approved, show "Approve" option */
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(student.student_id);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full flex items-center px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm text-gray-700"
                                    >
                                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Approve
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                          </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination - BERRY Style */}
              {totalPages > 1 && (
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span> of{" "}
                      <span className="font-medium">{filteredStudents.length}</span> entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center space-x-1">
                        {getPageNumbers().map((page, idx) => (
                          <React.Fragment key={idx}>
                            {page === 'ellipsis' ? (
                              <span className="px-2 text-gray-500">...</span>
                            ) : (
                              <button
                                onClick={() => goToPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State - BERRY Style */}
            {filteredStudents.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-10 h-10 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No students found" : "No students registered"}
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  {searchQuery 
                    ? `No students match your search for "${searchQuery}". Try adjusting your search terms.`
                    : "No students have been registered in the system yet. Students will appear here once they complete registration."
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
