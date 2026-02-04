import React, { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import BatchHistoryModal from "../components/BatchHistoryModal";
import BatchChangeModal from "../components/BatchChangeModal";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import { getAllStudents, approveStudent, getCurrentUserProfile } from "../services/Api";
import { useNavigate } from "react-router-dom";

const StudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [batchHistoryModal, setBatchHistoryModal] = useState({ isOpen: false, student: null });
  const [batchChangeModal, setBatchChangeModal] = useState({ isOpen: false, student: null });
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});
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
  const [profileInfo, setProfileInfo] = useState(null);

  // Get current user role from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userRole = decodedToken?.role || null;
  const tokenFullName = decodedToken?.full_name || null;

  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };

  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '' && isFullName(profileInfo.full_name)) {
      return profileInfo.full_name;
    }
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return userRole === 'manager' ? "Manager" : "Admin";
  };

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

  // Fetch profile info
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfileInfo();

    window.addEventListener('profileUpdated', fetchProfileInfo);
    return () => {
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

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



  // Batch history handlers
  const handleBatchHistory = (student) => {
    setBatchHistoryModal({ isOpen: true, student });
  };

  const handleBatchHistoryClose = () => {
    setBatchHistoryModal({ isOpen: false, student: null });
  };

  const handleBatchChange = (student) => {
    setBatchChangeModal({ isOpen: true, student });
  };

  const handleBatchChangeClose = () => {
    setBatchChangeModal({ isOpen: false, student: null });
  };

  const handleBatchUpdate = async () => {
    fetchStudents();
  };

  const handleApprove = async (studentId) => {
    try {
      const token = localStorage.getItem("token");
      await approveStudent(token, studentId);
      fetchStudents();
      alert("Student approved successfully!");
    } catch (error) {
      console.error("Error approving student:", error);
      alert("Failed to approve student: " + error.message);
    }
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
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <p className="text-lg font-medium text-gray-600 animate-pulse">Loading students...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Welcome Text */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Hamburger Menu Toggle - Light Blue Square (Mobile/Tablet Only) */}
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
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Manage Students
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    View and manage student registrations
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profileInfo?.profile_picture ? (
                      <img
                        src={profileInfo.profile_picture}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase()}
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
                            Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">{userRole}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/manager/account-settings');
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
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
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
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 truncate">Manage Students</h1>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
                {/* Search Section Header - BERRY Style */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">Search & Filter Students</h2>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium">Find students by name or academic details</p>
                    </div>
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
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Center Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Center</label>
                    <select
                      value={centerFilter}
                      onChange={(e) => setCenterFilter(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium cursor-pointer"
                    >
                      <option value="">All Centers</option>
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium cursor-pointer"
                    >
                      <option value="">All Batches</option>
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium cursor-pointer"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Pending</option>
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
                <div className="mb-8 overflow-hidden">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Enhanced Table Header */}
                    <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                        <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="truncate">Students Overview</span>
                      </h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-y border-gray-100">
                          <tr>
                            <th 
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort("registration_number")}
                            >
                              <div className="flex items-center space-x-2">
                                <span>Reg Number</span>
                                {sortField === "registration_number" ? (
                                  sortOrder === "asc" ? (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center space-x-2">
                                <span>Student</span>
                                {sortField === "name" ? (
                                  sortOrder === "asc" ? (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort("batch_name")}
                            >
                              <div className="flex items-center space-x-2">
                                <span>Batch</span>
                                {sortField === "batch_name" ? (
                                  sortOrder === "asc" ? (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleSort("status")}
                            >
                              <div className="flex items-center space-x-2">
                                <span>Status</span>
                                {sortField === "status" ? (
                                  sortOrder === "asc" ? (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            {userRole !== 'manager' && (
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <span>Actions</span>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </div>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentStudents.map((student) => (
                            <tr 
                              key={student.student_id} 
                              className="hover:bg-blue-50 transition-colors duration-150 group"
                            >
                              {/* Registration Number */}
                              <td 
                                className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap cursor-pointer hover:bg-blue-100/50 transition-colors"
                                onClick={() => navigate(`/manage-students/${student.student_id}`)}
                              >
                                <span className="text-blue-600 hover:underline">{student.registration_number || "N/A"}</span>
                              </td>
                              
                              {/* Student Name & Center/Reference */}
                              <td 
                                className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap cursor-pointer hover:bg-blue-100/50 transition-colors"
                                onClick={() => navigate(`/manage-students/${student.student_id}`)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                    {student.name?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{student.name}</div>
                                    <div className="text-xs text-gray-500 font-medium">
                                      {student.center_name || (student.referring_center_name ? `Ref: ${student.referring_center_name}` : "N/A")}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Batch Name & History */}
                              <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-800">{student.batch_name || "N/A"}</span>
                                  {student.student_id && (
                                    <button
                                      onClick={() => handleBatchHistory(student)}
                                      className="inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
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
                              
                              {/* Status Badge */}
                              <td className="px-6 py-4 text-sm whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  student.status 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-orange-100 text-orange-800"
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    student.status ? 'bg-green-600' : 'bg-orange-600'
                                  }`}></div>
                                  {student.status ? "Active" : "Pending"}
                                </span>
                              </td>
                              
                              {/* Action Menu */}
                              {userRole !== 'manager' && (
                                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-right">
                                  <div className="relative inline-block text-left">
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
                                      className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                      </svg>
                                    </button>
                                    
                                    {openActionMenu === student.student_id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-[100]"
                                          onClick={() => setOpenActionMenu(null)}
                                        ></div>
                                        <div 
                                          className="fixed bg-white rounded-lg shadow-xl border border-gray-100 z-[101] overflow-hidden min-w-[180px]"
                                          style={{
                                            top: `${dropdownPosition.top}px`,
                                            left: `${dropdownPosition.left}px`
                                          }}
                                        >
                                          {student.status ? (
                                            <>
                                              <div className="px-4 py-2.5 text-xs font-bold text-green-700 bg-green-50 border-b border-gray-100 uppercase tracking-wider flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Approved
                                              </div>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleBatchChange(student); setOpenActionMenu(null); }}
                                                className="w-full flex items-center px-4 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium"
                                              >
                                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                Change Batch
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleApprove(student.student_id); setOpenActionMenu(null); }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm text-gray-700 font-medium"
                                            >
                                              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              Approve Student
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Section */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
                      <div className="text-xs sm:text-sm text-gray-500 font-medium order-2 sm:order-1">
                        Showing <span className="text-blue-600 font-bold">{startIndex + 1}</span> to <span className="text-blue-600 font-bold">{Math.min(endIndex, filteredStudents.length)}</span> of <span className="text-blue-600 font-bold">{filteredStudents.length}</span> students
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                currentPage === page
                                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 translate-y-[-2px]"
                                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-300"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Enhanced Empty State */
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-gray-50 to-blue-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No students found</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto font-medium">
                    {hasActiveFilters
                      ? "We couldn't find any students matching your current filters. Try adjusting your criteria."
                      : "There are currently no students registered in the system."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 hover:shadow-lg active:scale-95"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Batch History Modal */}
      <BatchHistoryModal
        isOpen={batchHistoryModal.isOpen}
        onClose={handleBatchHistoryClose}
        student={batchHistoryModal.student}
      />

      <BatchChangeModal
        isOpen={batchChangeModal.isOpen}
        onClose={handleBatchChangeClose}
        student={batchChangeModal.student}
        onUpdate={handleBatchUpdate}
      />
    </div>
  );
};

export default StudentsPage;
