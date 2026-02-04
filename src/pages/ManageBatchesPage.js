import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import {
  getBatches,
  createBatch,
  updateBatch,
  getMergeGroups,
  getCurrentUserProfile,
} from "../services/Api";
import EditBatchModal from "../components/EditBatchModal";
import CreateBatchModal from "../components/CreateBatchModal";
import BatchMergeModal from "../components/BatchMergeModal";
import EnrolledStudentsModal from "../components/EnrolledStudentsModal";
import StartBatchModal from "../components/StartBatchModal";
import { BATCHES_URL } from "../services/Api";


const ManageBatchesPage = () => {
  const navigate = useNavigate();
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
  const [, setMergeGroups] = useState([]);
  const [enrolledStudentsModal, setEnrolledStudentsModal] = useState({ isOpen: false, batchId: null, batchName: null });
  const [startBatchModal, setStartBatchModal] = useState({ isOpen: false, batchId: null, batchName: '' });
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

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "User";
  };

  // Get role display name
  const getRoleDisplayName = () => {
    if (!userRole) return "User";
    const roleLower = userRole.toLowerCase();
    if (roleLower === 'academic') {
      return "Academic Coordinator";
    } else if (roleLower === 'manager') {
      return "Manager";
    } else if (roleLower === 'admin') {
      return "Admin";
    } else if (roleLower === 'teacher') {
      return "Teacher";
    } else if (roleLower === 'financial') {
      return "Financial Partner";
    }
    return userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
  };

  // Get default avatar letter based on role
  const getDefaultAvatarLetter = () => {
    if (!userRole) return "U";
    const roleLower = userRole.toLowerCase();
    if (roleLower === 'academic') {
      return "A";
    } else if (roleLower === 'manager') {
      return "M";
    } else if (roleLower === 'admin') {
      return "A";
    } else if (roleLower === 'teacher') {
      return "T";
    } else if (roleLower === 'financial') {
      return "F";
    }
    return userRole.charAt(0).toUpperCase();
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

  // Filter and sort batches - MUST BE DECLARED BEFORE PAGINATION CALCULATIONS
  const filteredBatches = useMemo(() => {
    return batches
      .filter((batch) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();

        return (
          batch.batch_name?.toLowerCase().includes(query) ||
          batch.course_type?.toLowerCase().includes(query) ||
          String(batch.duration)?.toLowerCase().includes(query) ||
          batch.center_name?.toLowerCase().includes(query) ||
          batch.teacher_name?.toLowerCase().includes(query) ||
          batch.assistant_tutor_name?.toLowerCase().includes(query) ||
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
        
        const numA = parseInt(a.batch_name?.replace(/\D/g, "") || "0", 10);
        const numB = parseInt(b.batch_name?.replace(/\D/g, "") || "0", 10);
        return numB - numA; // highest batch number first
      });
  }, [batches, searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations - MUST BE AFTER filteredBatches declaration
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

  // Reset to page 1 if current page is beyond total pages after filtering
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filteredBatches.length, currentPage, totalPages]);

  // Pagination helper functions
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      pages.push(1);
      
      if (currentPage <= 3) {
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

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

      const response = await fetch(`${BATCHES_URL}/${startBatchModal.batchId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: new Date().toISOString(),
          total_sessions: totalSessions,
        }),
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

      const response = await fetch(`${BATCHES_URL}/${batchId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          end_date: new Date().toISOString(),
        }),
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

  const handleBatchNameClick = (batch) => {
    navigate(`/manage-batches/${batch.batch_id}`);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Batches</h3>
              <p className="text-sm text-gray-500">Please wait while we fetch your batch data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        
        {/* Main Content Area - BERRY Style */}
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          {/* Top Header Bar - BERRY Style */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                {/* Left: Hamburger Menu & Title */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <button 
                    onClick={toggleMobileMenu}
                    className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                      Manage Batches
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Create and manage course batches efficiently
                    </p>
                  </div>
                </div>

                {/* Right: Notifications, Profile */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Notifications */}
                  {userRole === 'academic' && <AcademicNotificationBell />}
                  {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}

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
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all bg-blue-600 hover:bg-blue-700">
                          {getDisplayName()?.charAt(0).toUpperCase() || getDefaultAvatarLetter()}
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
                          <div className="px-4 py-4 border-b border-gray-200 bg-blue-50">
                            <h3 className="font-bold text-gray-800 text-base">
                              Welcome, {getDisplayName()?.split(' ')[0] || getRoleDisplayName().split(' ')[0]}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{getRoleDisplayName()}</p>
                          </div>
                          
                          {/* Menu Items */}
                          <div className="py-2">
                            {/* Account Settings */}
                            {(userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                              <button
                                onClick={() => {
                                  const settingsPaths = {
                                    'academic': '/academic-coordinator/settings',
                                    'manager': '/manager/account-settings',
                                    'admin': '/manager/account-settings'
                                  };
                                  const path = settingsPaths[userRole] || '/account-settings';
                                  navigate(path);
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
                            )}

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
            <div className="space-y-6">

              {/* Error Message - BERRY Style */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons Section - BERRY Style */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Batch
                </button>
                
                {/* Merge Batches Button - Only for Academic Admin */}
                {userRole === 'academic' && (
                  <button
                    onClick={() => setShowMergeModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Merge Batches
                  </button>
                )}
              </div>

              {/* Search Section - BERRY Style */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search batches by name, center, course, teacher, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Section - BERRY Style */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch Name</th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Name</th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedBatches.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-6 py-20 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No batches found</h3>
                                  {searchTerm ? (
                                    <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
                                  ) : (
                                    <div className="flex flex-col items-center gap-3">
                                      <p className="text-sm text-gray-500 mb-2">Get started by creating your first batch</p>
                                      <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-sm"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Batch
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedBatches.map((batch, index) => (
                            <tr key={batch.batch_id} className="hover:bg-blue-50 transition-colors">
                              {/* Batch Name - Clickable */}
                              <td className="px-4 sm:px-6 py-4">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer hover:text-blue-600"
                                  onClick={() => handleBatchNameClick(batch)}
                                >
                                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-sm">
                                      {batch.batch_name?.charAt(0) || 'B'}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate">
                                      {batch.batch_name || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {batch.duration || 'N/A'} months
                                    </p>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Course Name */}
                              <td className="px-4 sm:px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {batch.course_name || 'N/A'}
                                  </p>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    batch.course_type === "Immersion"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}>
                                    {batch.course_type || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              
                              {/* Status */}
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  batch.status === 'Approved'
                                    ? "bg-blue-100 text-blue-800"
                                    : batch.status === 'Started'
                                    ? "bg-green-100 text-green-800"
                                    : batch.status === 'Completed'
                                    ? "bg-purple-100 text-purple-800"
                                    : batch.status === 'Cancelled'
                                    ? "bg-red-100 text-red-800"
                                    : batch.status === 'Pending'
                                    ? "bg-yellow-100 text-yellow-800"
                                    : batch.status === 'Rejected'
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {batch.status || 'Approved'}
                                </span>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Start Batch Button - For approved batches */}
                                  {batch.status === 'Approved' && (userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                                    <button
                                      onClick={() => handleStartBatchClick(batch.batch_id, batch.batch_name)}
                                      disabled={startingBatch === batch.batch_id}
                                      className="inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                          Start
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Complete Batch Button - For started batches */}
                                  {batch.status === 'Started' && (userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                                    <button
                                      onClick={() => handleCompleteBatch(batch.batch_id)}
                                      disabled={completingBatch === batch.batch_id}
                                      className="inline-flex items-center px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                          Complete
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Edit Button - For approved/started batches or admin/manager */}
                                  {((batch.status === 'Approved' || batch.status === 'Started' || !batch.status) && (userRole === 'admin' || userRole === 'manager' || userRole === 'academic')) && (
                                    <button
                                      onClick={() => setEditingBatch(batch)}
                                      className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-200"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                  )}

                                  {/* Pending Status - For pending batches */}
                                  {batch.status === 'Pending' && (
                                    <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-lg border border-yellow-200">
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

                  {/* Pagination - BERRY Style */}
                  {filteredBatches.length > 0 && (
                    <div className="bg-white px-4 sm:px-6 py-3 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          Showing <span className="font-medium text-gray-700">{startIndex + 1}</span> to{' '}
                          <span className="font-medium text-gray-700">{Math.min(endIndex, filteredBatches.length)}</span> of{' '}
                          <span className="font-medium text-gray-700">{filteredBatches.length}</span> entries
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Page numbers */}
                          {getPageNumbers().map((page, idx) => {
                            if (page === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
