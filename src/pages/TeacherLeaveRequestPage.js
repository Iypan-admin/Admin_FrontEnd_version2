import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TeacherNotificationBell from "../components/TeacherNotificationBell";
import { getTeacherBatches, getMyTutorInfo } from "../services/Api";
import { createTeacherLeaveRequest, getMyLeaveRequests, updateTeacherLeaveRequest, deleteTeacherLeaveRequest } from "../services/Api";

function TeacherLeaveRequestPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});
  const [tutorInfo, setTutorInfo] = useState(null);
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get today's date in YYYY-MM-DD format for minimum date restriction
  const today = new Date().toISOString().split('T')[0];

  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
      return tutorInfo.full_name;
    }
    return "Teacher";
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

  useEffect(() => {
    fetchTutorInfo();
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await getTeacherBatches(token);
        setBatches(resp.data || []);
      } catch (e) { console.error(e); }
      await loadRequests();
    })();
    
    // Listen for sidebar toggle
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      // Restore body scroll on unmount
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchTutorInfo = async () => {
    try {
      const data = await getMyTutorInfo();
      setTutorInfo(data);
    } catch (error) {
      console.error("Failed to fetch tutor info:", error);
    }
  };

  const loadRequests = async () => {
    try {
      const resp = await getMyLeaveRequests();
      setRequests(resp.data || []);
    } catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.batch_id || !form.request_type || !form.date_from || !form.date_to) {
      alert("Please fill all required fields including Request Type.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        // Backend only accepts LEAVE/SUB_TEACHER; normalize while preserving selected type
        request_type: 'LEAVE',
        leave_type: form.request_type, // send selected leave type separately
      };
      
      if (editingRequest) {
        // Update existing request
        await updateTeacherLeaveRequest(editingRequest.id, payload);
        alert("Request updated successfully");
      } else {
        // Create new request
        await createTeacherLeaveRequest(payload);
        alert("Request submitted successfully");
      }
      
      setForm({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
      setEditingRequest(null);
      await loadRequests();
      handleCloseModal(); // Close modal on success with animation
      setCurrentPage(1); // Reset to first page after creating/updating
    } catch (err) {
      alert(err.message || (editingRequest ? 'Failed to update request' : 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (request) => {
    if (request.status !== 'PENDING') {
      alert('Only PENDING requests can be edited');
      return;
    }
    setEditingRequest(request);
    setForm({
      batch_id: request.batch_id || request.batch?.batch_id || "",
      request_type: request.leave_type || request.request_type || "LEAVE",
      reason: request.reason || "",
      date_from: request.date_from || "",
      date_to: request.date_to || "",
    });
    setIsModalOpen(true);
    setTimeout(() => setIsModalVisible(true), 10);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    setOpenActionMenu(null);
  };

  const handleDelete = async (request) => {
    if (request.status !== 'PENDING') {
      alert('Only PENDING requests can be deleted');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      await deleteTeacherLeaveRequest(request.id);
      alert('Request deleted successfully');
      await loadRequests();
      setOpenActionMenu(null);
    } catch (err) {
      alert(err.message || 'Failed to delete request');
    }
  };

  const handleNewRequest = () => {
    setEditingRequest(null);
    setForm({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
    setIsModalOpen(true);
    setTimeout(() => setIsModalVisible(true), 10);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setIsModalOpen(false);
      setEditingRequest(null);
      setForm({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }, 300); // Wait for animation to complete
  };

  const startedBatches = (batches || []).filter(b => (b.status === 'Started' || b.status === 'started'));

  // Helper function to extract batch number (first part before first hyphen)
  const getBatchNumber = (batchName) => {
    if (!batchName) return 'N/A';
    const parts = batchName.split('-');
    return parts[0] || batchName;
  };

  // Filter and sort requests by timestamp (newest first)
  const filteredAndSortedRequests = [...requests]
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      const batchName = (r.batch?.batch_name || r.batch_id || '').toLowerCase();
      const batchNumber = getBatchNumber(r.batch?.batch_name || r.batch_id || '').toLowerCase();
      const dateFrom = r.date_from || '';
      const dateTo = r.date_to || '';
      
      // Search by batch number or batch name
      if (batchNumber.includes(query) || batchName.includes(query)) {
        return true;
      }
      
      // Search by date (from or to)
      if (dateFrom.includes(query) || dateTo.includes(query)) {
        return true;
      }
      
      return false;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.date_from || 0);
      const dateB = new Date(b.created_at || b.date_from || 0);
      return dateB - dateA; // Newest first
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredAndSortedRequests.slice(startIndex, endIndex);

  // Reset to page 1 if current page is beyond total pages after filtering/sorting
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedRequests.length, currentPage, totalPages]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Show first 5 pages
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show last 5 pages
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg transition-all duration-200" style={{ backgroundColor: '#e3f2fd' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'} onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                  title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Leave Requests
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Submit and manage your leave requests
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <TeacherNotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {tutorInfo?.profile_photo ? (
                      <img
                        src={tutorInfo.profile_photo}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all" style={{ '--hover-ring': '#2196f3' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
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
                        <div className="px-4 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(to right, #e3f2fd, #e3f2fd)' }}>
                          <h3 className="font-bold text-gray-800 text-base">
                            Good Morning, {getDisplayName()?.split(' ')[0] || "Teacher"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Teacher</p>
                        </div>
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Search profile options"
                              className="bg-transparent border-none outline-none text-sm flex-1 text-gray-600"
                            />
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Allow Notifications</span>
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ '--focus-ring': '#2196f3' }} onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onBlur={(e) => e.target.style.boxShadow = 'none'}>
                              <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                            </button>
                          </div>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/teacher/tutor-info');
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
                              navigate('/teacher/tutor-info');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-gray-700">Social Profile</span>
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

        {/* Main Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={handleNewRequest}
                className="px-6 py-3 text-white rounded-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2" style={{ backgroundColor: '#2196f3' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'} onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>New Request</span>
              </button>
            </div>
            {/* Request Form Modal - Right Side Slide-In */}
            {isModalOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className={`fixed inset-0 bg-black z-50 transition-opacity duration-300 ${
                    isModalVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                  onClick={handleCloseModal}
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                ></div>
                
                {/* Right Side Modal - BERRY Style with Smooth Slide Animation */}
                <div 
                  className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[28rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto z-50 ${
                    isModalVisible ? 'translate-x-0' : 'translate-x-full'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                    {/* Form Header - BERRY Style */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: editingRequest ? 'linear-gradient(to bottom right, #f59e0b, #d97706)' : 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {editingRequest ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                              )}
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">
                              {editingRequest ? 'Edit Leave Request' : 'Create Leave Request'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {editingRequest ? 'Update the details below' : 'Fill in the details below'}
                            </p>
                          </div>
                        </div>
                        {/* Close Button */}
                        <button
                          onClick={handleCloseModal}
                          className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                        >
                          <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Form Content - BERRY Style */}
                    <form onSubmit={submit} className="p-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Batch Selection */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            Batch <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select 
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm appearance-none cursor-pointer"
                              value={form.batch_id} 
                              onChange={e=>setForm(f=>({...f,batch_id:e.target.value}))}
                              required
                            >
                              <option value="">Select batch</option>
                              {startedBatches.map(b => (
                                <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                              </svg>
                            </div>
                          </div>
                          {startedBatches.length === 0 && (
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                              ⚠️ No started batches available for requests.
                            </p>
                          )}
                        </div>

                        {/* Request Type */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                            Request Type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select 
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm appearance-none cursor-pointer"
                              required 
                              value={form.request_type} 
                              onChange={e=>setForm(f=>({...f,request_type:e.target.value}))}
                            >
                              <option value="LEAVE">Leave</option>
                              <option value="PERMANENT_LEAVE">Permanent Leave</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* From Date */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            From Date <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="date" 
                            min={today}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                            value={form.date_from} 
                            onChange={e=>setForm(f=>({...f,date_from:e.target.value}))}
                            required
                          />
                        </div>

                        {/* To Date */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            To Date <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="date" 
                            min={form.date_from || today}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                            value={form.date_to} 
                            onChange={e=>setForm(f=>({...f,date_to:e.target.value}))}
                            required
                          />
                        </div>
                      </div>

                      {/* Reason Textarea */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Reason (Optional)
                        </label>
                        <textarea 
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm resize-none"
                          rows="4" 
                          placeholder="Enter your reason for leave request..."
                          value={form.reason} 
                          onChange={e=>setForm(f=>({...f,reason:e.target.value}))}
                        />
                      </div>

                        {/* Submit Button */}
                      <div className="pt-4 border-t border-gray-200">
                        <button 
                          type="submit"
                          disabled={submitting} 
                          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingRequest ? 'Updating...' : 'Submitting...'}</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                              </svg>
                              <span>{editingRequest ? 'Update Request' : 'Submit Request'}</span>
                            </>
                          )}
                        </button>
                      </div>
              </form>
                </div>
              </>
            )}

            {/* Requests Table - Table Basic Style */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Title and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e3f2fd' }}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">My Requests</h3>
                    <p className="text-sm text-gray-500 mt-1">View and track your leave requests</p>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by batch number or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 text-sm" onFocus={(e) => { e.target.style.borderColor = '#2196f3'; e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)'; }} onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        BATCH
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        TYPE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        FROM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        TO
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        STATUS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((r, index) => (
                      <tr 
                        key={r.id} 
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        {/* Batch with Icon */}
                        <td className="px-6 py-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div className="group relative">
                              <span className="text-sm font-medium text-gray-900 cursor-pointer transition-colors" onMouseEnter={(e) => e.target.style.color = '#2196f3'} onMouseLeave={(e) => e.target.style.color = '#111827'}>
                                {getBatchNumber(r.batch?.batch_name || r.batch_id || 'N/A')}
                              </span>
                              {/* Tooltip on hover - shows full batch name */}
                              {(r.batch?.batch_name || r.batch_id) && (r.batch?.batch_name || r.batch_id) !== getBatchNumber(r.batch?.batch_name || r.batch_id) && (
                                <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[200] pointer-events-none min-w-max">
                                  {r.batch?.batch_name || r.batch_id}
                                  {/* Arrow pointing down */}
                                  <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Type */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {r.request_type === 'PERMANENT_LEAVE' ? 'Permanent Leave' : 'Leave'}
                          </span>
                        </td>
                        
                        {/* From Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{r.date_from || 'N/A'}</span>
                        </td>
                        
                        {/* To Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{r.date_to || 'N/A'}</span>
                        </td>
                        
                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                            r.status === 'APPROVED' 
                              ? '' 
                              : r.status === 'PENDING' 
                              ? 'bg-orange-500' 
                              : 'bg-red-500'
                          }`} style={r.status === 'APPROVED' ? { backgroundColor: '#2196f3' } : {}}>
                            {r.status}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4">
                          {r.status === 'PENDING' ? (
                            <div className="relative">
                              <button 
                                ref={el => actionButtonRefs.current[r.id] = el}
                                onClick={(e) => {
                                  const button = e.currentTarget;
                                  const rect = button.getBoundingClientRect();
                                  setDropdownPosition({
                                    top: rect.bottom + 8,
                                    left: rect.right - 128 // 128px is width of dropdown (w-32 = 8rem = 128px)
                                  });
                                  setOpenActionMenu(openActionMenu === r.id ? null : r.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                              
                              {openActionMenu === r.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-[100]"
                                    onClick={() => setOpenActionMenu(null)}
                                  ></div>
                                  <div 
                                    className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[101] overflow-hidden w-32"
                                    style={{
                                      top: `${dropdownPosition.top}px`,
                                      left: `${dropdownPosition.left}px`
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        handleEdit(r);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                    >
                                      <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDelete(r);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full flex items-center px-4 py-2.5 text-left hover:bg-red-50 transition-colors text-sm text-red-700 border-t border-gray-200"
                                    >
                                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginatedRequests.length === 0 && (
                      <tr>
                        <td className="px-6 py-12 text-center" colSpan="6">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="p-6 bg-gray-100 rounded-xl">
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">No Requests Found</h3>
                            <p className="text-gray-600 text-sm">Submit your first leave request using the button above</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredAndSortedRequests.length > 0 && (
                <div className="flex items-center justify-between mt-6 px-2">
                  {/* Left: Showing entries info */}
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedRequests.length)} of {filteredAndSortedRequests.length} entries
                  </div>

                  {/* Right: Pagination buttons */}
                  <div className="flex items-center gap-2">
                    {/* Previous button */}
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
                              ? 'text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                          style={currentPage === page ? { backgroundColor: '#2196f3' } : {}}
                        >
                          {page}
                        </button>
                      );
                    })}

                    {/* Next button */}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherLeaveRequestPage;


