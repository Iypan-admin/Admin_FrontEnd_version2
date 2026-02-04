import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RejectionModal from "../components/RejectionModal";
import EditBatchModal from "../components/EditBatchModal";
import CreateBatchModal from "../components/CreateBatchModal";
import EnrolledStudentsModal from "../components/EnrolledStudentsModal";
import StartBatchModal from "../components/StartBatchModal";
import { getBatches, approveBatch, rejectBatch, updateBatch, createBatch, deleteBatch, getCurrentUserProfile, BATCHES_URL } from "../services/Api";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import AdminNotificationBell from "../components/AdminNotificationBell";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [startingBatch, setStartingBatch] = useState(null);
  const [completingBatch, setCompletingBatch] = useState(null);
  const [startBatchModal, setStartBatchModal] = useState({ isOpen: false, batchId: null, batchName: '' });
  const [profileInfo, setProfileInfo] = useState(null);
  const itemsPerPage = 8;
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

  // Pagination Logic
  const tabBatches = getTabBatches();
  const totalPages = Math.ceil(tabBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBatches = tabBatches.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  const fetchAllBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 15000);
      });
      
      const fetchPromise = getBatches(token);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log("🔄 Frontend: Fetched batches response:", response);
      
      if (response?.success && Array.isArray(response.data)) {
        console.log("🔄 Frontend: Setting batches data:", response.data);
        setAllBatches(response.data);
      } else {
        throw new Error(response?.error || "Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setError(error.message || "Failed to load batches");
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;



  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return userRole?.charAt(0).toUpperCase() + userRole?.slice(1) || "User";
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

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
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
    return () => window.removeEventListener('profileUpdated', fetchProfileInfo);
  }, []);

  useEffect(() => {
    fetchAllBatches();
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  const handleApprove = async (batchId) => {
    try {
      setActionLoading(prev => ({ ...prev, [batchId]: 'approving' }));
      const token = localStorage.getItem("token");
      
      // Add retry mechanism
      const maxRetries = 2;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          const response = await approveBatch(token, batchId);
          
          if (response?.success) {
            alert("Batch approved successfully!");
            setActionLoading(prev => ({ ...prev, [batchId]: false }));
            await fetchAllBatches();
            return;
          } else {
            lastError = response?.message || "Failed to approve batch";
            retryCount++;
            
            if (retryCount < maxRetries) {
              const currentDelay = 1000 * retryCount;
              console.log(`Retry ${retryCount}/${maxRetries} for batch ${batchId}`);
              await new Promise(resolve => {
                const timer = setTimeout(resolve, currentDelay);
                return () => clearTimeout(timer);
              });
            }
          }
        } catch (fetchError) {
          lastError = fetchError.message || "Network error";
          retryCount++;
          
          if (retryCount < maxRetries) {
            const currentDelay = 1000 * retryCount;
            console.log(`Retry ${retryCount}/${maxRetries} for batch ${batchId} - Network error`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
          }
        }
      }
      
      // All retries failed
      throw new Error(lastError);
    } catch (error) {
      console.error("Approve batch error:", error);
      alert(`Failed to approve batch: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [batchId]: false }));
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

  const handleBatchNameClick = (batch) => {
    navigate(`/manage-batches/${batch.batch_id}`);
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
        await fetchAllBatches();
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
        await fetchAllBatches();
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



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 flex items-center justify-center" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
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
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />

      {/* Main Content Area - BERRY Style */}
      <div 
        className="flex-1 overflow-y-auto transition-all duration-300" 
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        {/* Navbar - BERRY Style (Matching ManagerEventCalendarPage) */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 lg:z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                {/* Left: Mobile Toggle & Title */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                    style={{
                      background: "linear-gradient(to bottom right, #2196f3, #1976d2)",
                    }}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate">
                      Batch Approval
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                      Review and manage batch lifecycle
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

                {/* Notifications */}
                {userRole === 'manager' && <ManagerNotificationBell />}
                {userRole === 'academic' && <AcademicNotificationBell />}
                {userRole === 'admin' && <AdminNotificationBell />}

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
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

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
                            Welcome, {getDisplayName() || "User"}
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
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 hover:text-red-700 transition-all duration-200 border-t border-gray-200"
                          >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </nav>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Quick Stats Grid - Matching ManageStatesPage Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Pending Stats Card */}
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-yellow-100 text-xs sm:text-sm font-medium mb-1 uppercase tracking-wider">Pending Batches</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums">{pendingBatches.length}</p>
                </div>
              </div>

              {/* Approved Stats Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium mb-1 uppercase tracking-wider">Approved Batches</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums">{approvedBatches.length}</p>
                </div>
              </div>

              {/* Completed Stats Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1 uppercase tracking-wider">Completed Batches</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums">{completedBatches.length}</p>
                </div>
              </div>

              {/* Rejected Stats Card */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-red-100 text-xs sm:text-sm font-medium mb-1 uppercase tracking-wider">Rejected Batches</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums">{rejectedBatches.length}</p>
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

            {/* Search Section - BERRY Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-800">Search & Filter Batches</h2>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Find batches by name, course, center, or teacher</p>
                  </div>
                </div>
                
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search batches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation & Create Batch Button - BERRY Style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-2 p-1.5 bg-gray-200/50 rounded-2xl max-w-fit overflow-x-auto shadow-sm">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'pending'
                      ? 'bg-white text-yellow-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">Pending</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${
                    activeTab === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pendingBatches.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'approved'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">Approved</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${
                    activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {approvedBatches.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'completed'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">Completed</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${
                    activeTab === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {completedBatches.length}
                  </span>
                </button>
              </div>

              {canCreate() && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Batch
                </button>
              )}
            </div>

            {/* Table Area - EXACTLY MATCHES ManageBatchesPage Style */}
            {tabBatches.length > 0 ? (
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
                      {paginatedBatches.map((batch) => (
                        <tr key={batch.batch_id} className="hover:bg-blue-50 transition-colors">
                          {/* Batch Name - Clickable (Consistent with ManageBatchesPage) */}
                          <td className="px-4 sm:px-6 py-4">
                            <div 
                              className="flex items-center gap-3 cursor-pointer hover:text-blue-600 group/name"
                              onClick={() => handleBatchNameClick(batch)}
                            >
                              <div className={`w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover/name:scale-105 transition-transform`}>
                                <span className="text-white font-bold text-sm">
                                  {batch.batch_name?.charAt(0) || 'B'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 group-hover/name:text-blue-600 truncate">
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
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={batch.course_name}>
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
                              {batch.status || 'N/A'}
                            </span>
                          </td>
                          
                          {/* Actions - Stylized like ManageBatchesPage */}
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Start Batch Button - For approved batches */}
                              {batch.status === 'Approved' && (userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                                <button
                                  onClick={() => handleStartBatchClick(batch.batch_id, batch.batch_name)}
                                  disabled={startingBatch === batch.batch_id}
                                  className="inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {startingBatch === batch.batch_id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                      Starting...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                  className="inline-flex items-center px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {completingBatch === batch.batch_id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Complete
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Approve Button - If Pending and canApprove */}
                              {batch.status === 'Pending' && canApprove() && (
                                <button
                                  onClick={() => handleApprove(batch.batch_id)}
                                  disabled={actionLoading[batch.batch_id] === 'approving'}
                                  className="inline-flex items-center px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm"
                                >
                                  {actionLoading[batch.batch_id] === 'approving' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                      </svg>
                                      Approve
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Reject Button - If Pending and canApprove */}
                              {batch.status === 'Pending' && canApprove() && (
                                <button
                                  onClick={() => handleRejectClick(batch.batch_id, batch.batch_name)}
                                  disabled={actionLoading[batch.batch_id] === 'rejecting'}
                                  className="inline-flex items-center px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm"
                                >
                                  {actionLoading[batch.batch_id] === 'rejecting' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                      Rejecting...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Reject
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Edit Button - If authorized */}
                              {canEdit() && (
                                <button
                                  onClick={() => setEditingBatch(batch)}
                                  className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              )}

                              {/* Delete Button - Only for Admin */}
                              {canDelete() && (
                                <button
                                  onClick={() => handleDeleteBatch(batch.batch_id)}
                                  disabled={actionLoading[batch.batch_id] === 'deleting'}
                                  className="inline-flex items-center px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm"
                                >
                                  {actionLoading[batch.batch_id] === 'deleting' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 mr-1 border border-white border-t-transparent"></div>
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - BERRY Style */}
                {tabBatches.length > itemsPerPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                    <div className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-0">
                      Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to{' '}
                      <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, tabBatches.length)}</span> of{' '}
                      <span className="font-bold text-gray-800">{tabBatches.length}</span> batches
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                        title="Previous Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>

                      <div className="flex items-center px-1.5 py-1 bg-white border border-gray-200 rounded-xl space-x-1 shadow-sm">
                        {getPageNumbers().map(page => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                              currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                        title="Next Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State - BERRY Style */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No batches found</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto">
                  We couldn't find any batches in the <span className="text-blue-600 font-bold capitalize">{activeTab}</span> category.
                </p>
              </div>
            )}
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
      <StartBatchModal
        isOpen={startBatchModal.isOpen}
        onClose={() => setStartBatchModal({ isOpen: false, batchId: null, batchName: '' })}
        onConfirm={handleStartBatchConfirm}
        batchName={startBatchModal.batchName}
        isLoading={startingBatch === startBatchModal.batchId}
      />
    </div>
  );
};

export default BatchApprovalPage;
