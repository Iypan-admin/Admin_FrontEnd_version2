import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import { listSubTutorRequests, approveSubTutorRequest, rejectSubTutorRequest, getCurrentUserProfile } from "../services/Api";
import { getTeachersByCenter } from "../services/Api";

function AcademicSubTutorRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [centerTeachers, setCenterTeachers] = useState({}); // centerId -> teachers
  const [selectedSubs, setSelectedSubs] = useState({}); // requestId -> teacherId
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Academic Coordinator";
  };

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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

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

  useEffect(() => {
    load();
    setCurrentPage(1); // Reset to first page when filter changes
    
    // Background polling every 5 seconds (no loading indicator)
    const interval = setInterval(() => {
      backgroundRefresh();
    }, 5000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Manual load with loading indicator
  const load = async () => {
    setLoading(true);
    try {
      const resp = await listSubTutorRequests(statusFilter);
      setRequests(resp.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Background refresh without loading indicator
  const backgroundRefresh = async () => {
    try {
      const resp = await listSubTutorRequests(statusFilter);
      setRequests(resp.data || []);
    } catch (e) { 
      // Silent error - don't show anything, just log
      console.error('Background refresh error:', e); 
    }
  };

  const ensureCenterTeachers = async (centerId) => {
    if (centerTeachers[centerId]) return;
    try {
      const token = localStorage.getItem('token');
      const data = await getTeachersByCenter(centerId, token);
      setCenterTeachers(prev => ({ ...prev, [centerId]: data.data || [] }));
    } catch (e) { console.error(e); }
  };

  const approve = async (req) => {
    const subId = selectedSubs[req.id];
    if (!subId) {
      alert('Please select a sub teacher first');
      setOpenActionMenu(null);
      return;
    }
    try {
      await approveSubTutorRequest(req.id, subId);
      await load();
      setOpenActionMenu(null);
    } catch (e) { 
      alert(e.message || 'Failed');
      setOpenActionMenu(null);
    }
  };

  const reject = async (req) => {
    if (!window.confirm('Are you sure you want to reject this request?')) {
      setOpenActionMenu(null);
      return;
    }
    try {
      await rejectSubTutorRequest(req.id);
      await load();
      setOpenActionMenu(null);
    } catch (e) { 
      alert(e.message || 'Failed');
      setOpenActionMenu(null);
    }
  };

  // Extract batch number from full batch name (e.g., "B118" from "B118-ON-GR-ML-A1-08:00PM-10:00PM")
  const getBatchNumber = (batchName) => {
    if (!batchName) return 'N/A';
    // Extract first part before first hyphen (batch number)
    const parts = batchName.split('-');
    return parts[0] || batchName;
  };

  // Filter requests based on search
  const getFilteredRequests = () => {
    return requests.filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const batch = (r.batch?.batch_name || r.batch?.batch_id || '').toLowerCase();
      const mainName = (r.main_teacher?.teacher_info?.full_name || r.main_teacher?.teacher_info?.name || '').toLowerCase();
      const subName = (r.sub_teacher?.teacher_info?.full_name || r.sub_teacher?.teacher_info?.name || '').toLowerCase();
      return batch.includes(q) || mainName.includes(q) || subName.includes(q);
    });
  };

  // Pagination calculations
  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : sidebarWidth }}>
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
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Sub-Tutor Requests</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Review pending approvals, assign sub teachers, and track approved requests</p>
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

                  {isProfileDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}</h3>
                          <p className="text-sm text-gray-500 mt-1">Academic Coordinator</p>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
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
                              window.location.href = "/login";
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
          {/* Filter and Search Section - BERRY Style */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Status Filter Toggle */}
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-lg p-0.5 inline-flex">
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      statusFilter === 'PENDING'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setStatusFilter('PENDING')}
                  >
                    Pending
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      statusFilter === 'APPROVED'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setStatusFilter('APPROVED')}
                  >
                    Approved
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      statusFilter === 'REJECTED'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setStatusFilter('REJECTED')}
                  >
                    Rejected
                  </button>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  statusFilter === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                  statusFilter === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {statusFilter === 'PENDING' ? 'Pending' : 
                   statusFilter === 'APPROVED' ? 'Approved' : 
                   'Rejected'}
                </span>
              </div>

              {/* Search Bar */}
              <div className="flex-1 sm:flex-initial sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by batch or teacher..."
                    className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {/* Table Section - BERRY Style */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
                <p className="text-gray-500 text-sm">Loading requests...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Requesting Teacher</th>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">From</th>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">To</th>
                        <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {statusFilter === 'PENDING' ? 'Select Sub Teacher' : 
                           statusFilter === 'APPROVED' ? 'Assigned Sub Teacher' : 
                           'Status'}
                        </th>
                        {statusFilter === 'PENDING' && (
                          <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={statusFilter === 'PENDING' ? 7 : 6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">No {statusFilter.toLowerCase()} requests found</h3>
                              {searchQuery && (
                                <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map(r => (
                          <tr key={r.id} className="hover:bg-blue-50 transition-colors duration-150">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div 
                                  className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                  title={r.batch?.batch_name || r.batch?.batch_id || 'N/A'}
                                >
                                  {getBatchNumber(r.batch?.batch_name || r.batch?.batch_id || 'N/A')}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="text-sm text-gray-900">{r.main_teacher?.teacher_info?.full_name || r.main_teacher?.teacher_info?.name || r.main_teacher?.teacher_id || 'N/A'}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {r.request_type || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                {r.date_from || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                {r.date_to || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              {statusFilter === 'PENDING' ? (
                                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                  <button
                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 whitespace-nowrap shadow-sm"
                                    onClick={() => ensureCenterTeachers(r.batch?.center)}
                                  >
                                    Load Teachers
                                  </button>
                                  <select
                                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 shadow-sm hover:border-gray-400"
                                    value={selectedSubs[r.id] || ''}
                                    onChange={e => setSelectedSubs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  >
                                    <option value="">Select Teacher</option>
                                    {(centerTeachers[r.batch?.center] || [])
                                      .filter(t => {
                                        // Get list of teacher IDs to exclude
                                        const excludedTeacherIds = [
                                          r.main_teacher_id,              // Requesting teacher (main teacher who created the request)
                                          r.batch?.teacher,              // Batch's main teacher
                                          r.batch?.assistant_tutor       // Batch's assistant tutor (if any)
                                        ].filter(Boolean); // Remove null/undefined values
                                        
                                        // Filter out if teacher_id matches any excluded teacher
                                        return !excludedTeacherIds.includes(t.teacher_id);
                                      })
                                      .map(t => (
                                        <option key={t.teacher_id} value={t.teacher_id}>
                                          {t.teacher_full_name || t.teacher_name || t.teacher_id}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              ) : statusFilter === 'APPROVED' ? (
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900">
                                    {r.sub_teacher?.teacher_info?.full_name ||
                                      r.sub_teacher?.teacher_info?.name ||
                                      r.sub_teacher?.teacher_id ||
                                      '—'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    Rejected
                                  </span>
                                </div>
                              )}
                            </td>
                            {statusFilter === 'PENDING' && (
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className="relative">
                                  {/* 3-Dot Menu Button */}
                                  <button 
                                    ref={el => actionButtonRefs.current[r.id] = el}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const button = e.currentTarget;
                                      const rect = button.getBoundingClientRect();
                                      setDropdownPosition({
                                        top: rect.bottom + 8,
                                        left: rect.right - 180 // Adjust based on dropdown width
                                      });
                                      setOpenActionMenu(openActionMenu === r.id ? null : r.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Action Dropdown Menu */}
                                  {openActionMenu === r.id && (
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
                                        {/* Approve Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            approve(r);
                                            setOpenActionMenu(null);
                                          }}
                                          className="w-full flex items-center px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm text-gray-700"
                                        >
                                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Approve
                                        </button>
                                        
                                        {/* Reject Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            reject(r);
                                            setOpenActionMenu(null);
                                          }}
                                          className="w-full flex items-center px-4 py-2.5 text-left hover:bg-red-50 transition-colors text-sm text-gray-700 border-t border-gray-200"
                                        >
                                          <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Reject
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - BERRY Style */}
                {filteredRequests.length > 0 && (
                  <div className="bg-white px-4 sm:px-6 py-3 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-sm text-gray-600">
                        Showing <span className="font-medium text-gray-700">{startIndex + 1}</span> to{' '}
                        <span className="font-medium text-gray-700">{Math.min(endIndex, filteredRequests.length)}</span> of{' '}
                        <span className="font-medium text-gray-700">{filteredRequests.length}</span> entries
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition duration-200"
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-1.5 text-sm font-medium rounded transition duration-200 ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition duration-200"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcademicSubTutorRequestsPage;


