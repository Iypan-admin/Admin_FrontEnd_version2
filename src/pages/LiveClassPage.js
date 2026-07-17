import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import { getTodayLiveClasses, getAllClasses, getBatchById, getEnrolledStudentsByBatch, getCurrentUserProfile } from '../services/Api';
import { Video, ExternalLink, Clock, Users, BookOpen, X, GraduationCap, Search, Filter, Calendar, History, Download } from 'lucide-react';

function LiveClassPage() {
  const [liveClasses, setLiveClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'history'
  
  // Filter states
  const [searchBatchName, setSearchBatchName] = useState('');
  const [searchTeacherName, setSearchTeacherName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Batch details modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // BERRY style states
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
  const token = localStorage.getItem('token');
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    
    // Fallback based on role
    const roleTitles = {
      'admin': 'Super Admin',
      'manager': 'Manager',
      'academic': 'Academic Coordinator'
    };
    return roleTitles[decodedToken?.role] || "User";
  };

  // Get role display title
  const getRoleTitle = () => {
    const roleTitles = {
      'admin': 'Super Admin',
      'manager': 'Manager',
      'academic': 'Academic Coordinator'
    };
    return roleTitles[decodedToken?.role] || "User";
  };

  // Mobile and sidebar handling
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

  // Fetch user profile picture on component mount
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

  // Modal visibility animation
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => setIsModalVisible(true), 10);
    }
  }, [modalOpen]);

  // Body scroll lock when modal is visible
  useEffect(() => {
    if (isModalVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalVisible]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cleanMeetUrl = (url) => {
    try {
      let cleanUrl = url.trim();
      
      // Remove mobile app intent URLs
      if (cleanUrl.includes('intent://')) {
        const urlMatch = cleanUrl.match(/url%3D([^&]+)/);
        if (urlMatch) {
          cleanUrl = decodeURIComponent(urlMatch[1]);
        }
      }
      
      // Extract meeting code and create clean URL
      const patterns = [
        /https:\/\/meet\.google\.com\/([a-z0-9-]+)/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\?.*/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\/.*/i
      ];

      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
          return `https://meet.google.com/${match[1]}`;
        }
      }
      
      return cleanUrl;
    } catch (err) {
      console.error('Error cleaning Meet URL:', err);
      return url;
    }
  };

  const handleBatchClick = async (batchId, batchName) => {
    try {
      setModalOpen(true);
      setIsModalVisible(true);
      setLoadingBatchDetails(true);
      setLoadingStudents(true);
      setSelectedBatch(null);
      setBatchStudents([]);
      
      // Fetch batch details and students in parallel
      const [batchResponse, studentsResponse] = await Promise.all([
        getBatchById(token, batchId).catch(err => {
          console.error('Error fetching batch details:', err);
          return null;
        }),
        getEnrolledStudentsByBatch(batchId).catch(err => {
          console.error('Error fetching students:', err);
          return { data: [] };
        })
      ]);

      // Set batch details
      // Handle both response formats: { success: true, data: {...} } or direct data
      if (batchResponse) {
        const batchData = (batchResponse.success && batchResponse.data) ? batchResponse.data : batchResponse;
        setSelectedBatch(batchData);
      } else {
        // If batch details fail, create minimal batch info from the live class data
        const currentClasses = activeTab === 'today' ? liveClasses : allClasses;
        const classItem = currentClasses.find(item => item.batch_id === batchId);
        if (classItem) {
          setSelectedBatch({
            batch_id: batchId,
            batch_name: batchName,
            course_name: classItem.course_name,
            teacher_name: classItem.tutor_name,
            time_from: classItem.time_from,
            time_to: classItem.time_to
          });
        }
      }

      // Set students - handle both array and wrapped response
      if (studentsResponse) {
        const studentsData = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
        setBatchStudents(studentsData);
      }
    } catch (error) {
      console.error('Error loading batch details:', error);
    } finally {
      setLoadingBatchDetails(false);
      setLoadingStudents(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setModalOpen(false);
      setSelectedBatch(null);
      setBatchStudents([]);
    }, 300);
  };

  const formatPhone = (phone) => {
    return phone ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : "N/A";
  };

  // CSV Download Function
  const downloadCSV = (classes, filename) => {
    if (!classes || classes.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV Headers
    const headers = [
      'S.No',
      'Batch ID',
      'Batch Name',
      'Course Name',
      'Tutor Name',
      'Date',
      'Time',
      'Title',
      'Class Link',
      'Note'
    ];

    // Convert classes to CSV rows
    const csvRows = [
      headers.join(','),
      ...classes.map((classItem, index) => {
        return [
          index + 1,
          `"${classItem.batch_id || ''}"`,
          `"${(classItem.batch_name || '').replace(/"/g, '""')}"`,
          `"${(classItem.course_name || '').replace(/"/g, '""')}"`,
          `"${(classItem.tutor_name || '').replace(/"/g, '""')}"`,
          `"${formatDate(classItem.date)}"`,
          `"${formatTime(classItem.class_time)}"`,
          `"${(classItem.title || '').replace(/"/g, '""')}"`,
          `"${classItem.class_link || ''}"`,
          `"${(classItem.note || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Filter classes by month and year
  const filterClassesByMonth = (classes, month, year) => {
    if (!month || !year) return classes;
    
    return classes.filter(classItem => {
      if (!classItem.date) return false;
      const date = new Date(classItem.date);
      const classMonth = date.toLocaleString('default', { month: 'long' });
      const classYear = date.getFullYear().toString();
      return classMonth === month && classYear === year;
    });
  };

  // Pagination logic
  const getFilteredClasses = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get classes based on active tab
    let classesToFilter = activeTab === 'today' 
      ? liveClasses 
      : allClasses.filter(c => c.date < today);
    
    // Apply search filters
    let filtered = classesToFilter.filter(classItem => {
      const batchMatch = !searchBatchName || 
        (classItem.batch_name && classItem.batch_name.toLowerCase().includes(searchBatchName.toLowerCase()));
      const teacherMatch = !searchTeacherName || 
        (classItem.tutor_name && classItem.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase()));
      
      return batchMatch && teacherMatch;
    });

    // Apply month filter for history tab
    if (activeTab === 'history' && selectedMonth && selectedYear) {
      filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
    }

    return filtered;
  };

  // Calculate history classes count (past dates only, not today)
  const getHistoryClassesCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const historyClasses = allClasses.filter(c => c.date < today);
    return historyClasses.length;
  };

  const filteredClasses = getFilteredClasses();
  const historyClassesCount = getHistoryClassesCount();
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, endIndex);

  // Reset to first page when filters change or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchBatchName, searchTeacherName, selectedMonth, selectedYear, activeTab]);

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
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
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

  // Download handlers
  const handleDownloadAllHistory = () => {
    const today = new Date().toISOString().split('T')[0];
    const historyClasses = allClasses.filter(c => c.date < today);
    downloadCSV(historyClasses, `all_class_history_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByBatchName = () => {
    if (!searchBatchName.trim()) {
      alert('Please enter a batch name to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
    );
    
    if (filtered.length === 0) {
      alert('No classes found for this batch name');
      return;
    }
    
    downloadCSV(filtered, `class_history_batch_${searchBatchName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByTeacherName = () => {
    if (!searchTeacherName.trim()) {
      alert('Please enter a teacher name to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
    );
    
    if (filtered.length === 0) {
      alert('No classes found for this teacher name');
      return;
    }
    
    downloadCSV(filtered, `class_history_teacher_${searchTeacherName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByBatchNameAndMonth = () => {
    if (!searchBatchName.trim()) {
      alert('Please enter a batch name to filter');
      return;
    }
    if (!selectedMonth || !selectedYear) {
      alert('Please select a month and year to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
    );
    filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
    
    if (filtered.length === 0) {
      alert('No classes found for this batch name and month');
      return;
    }
    
    downloadCSV(filtered, `class_history_batch_${searchBatchName.replace(/[^a-z0-9]/gi, '_')}_${selectedMonth}_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByTeacherNameAndMonth = () => {
    if (!searchTeacherName.trim()) {
      alert('Please enter a teacher name to filter');
      return;
    }
    if (!selectedMonth || !selectedYear) {
      alert('Please select a month and year to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
    );
    filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
    
    if (filtered.length === 0) {
      alert('No classes found for this teacher name and month');
      return;
    }
    
    downloadCSV(filtered, `class_history_teacher_${searchTeacherName.replace(/[^a-z0-9]/gi, '_')}_${selectedMonth}_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Fetch classes with background polling
  const fetchClasses = useCallback(async (isInitialLoad = false) => {
      try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
        
        // Fetch both today's classes and all classes
        const [todayData, allData] = await Promise.all([
          getTodayLiveClasses(token).catch(err => {
            console.error('Error fetching today\'s classes:', err);
            return [];
          }),
          getAllClasses(token).catch(err => {
            console.error('Error fetching all classes:', err);
            return [];
          })
        ]);
        
        setLiveClasses(todayData || []);
        setAllClasses(allData || []);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(err.message || 'Failed to load classes');
      } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    // Initial load
    fetchClasses(true);
    
    // Background polling every 5 seconds
    const interval = setInterval(() => {
      fetchClasses(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchClasses]);

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
                {isMobile && (
                  <button
                    onClick={toggleMobileMenu}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                    <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900">Live Classes</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {activeTab === 'today' 
                        ? "Monitor today's active classes"
                        : "View all classes history"}
                      </p>
                  </div>
                    </div>
                  </div>
                  
              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                {decodedToken?.role === 'academic' && <AcademicNotificationBell />}
                {(decodedToken?.role === 'manager' || decodedToken?.role === 'admin') && <ManagerNotificationBell />}

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
                          <p className="text-sm text-gray-500 mt-1">{getRoleTitle()}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              const settingsPaths = {
                                'academic': '/academic-coordinator/settings',
                                'manager': '/manager/account-settings',
                                'admin': '/manager/account-settings' // Admin usually shares manager settings or similar
                              };
                              const path = settingsPaths[decodedToken?.role] || '/account-settings';
                              window.location.href = path;
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
          <div className="max-w-7xl mx-auto">

            {/* Tab Navigation - BERRY Style */}
              <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  <nav className="flex space-x-1" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('today')}
                      className={`${
                        activeTab === 'today'
                        ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    } flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center transition-colors`}
                    style={activeTab === 'today' ? { backgroundColor: '#2196f3' } : {}}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Today's Classes
                      {!loading && liveClasses.length > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                          {liveClasses.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`${
                        activeTab === 'history'
                        ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    } flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center transition-colors`}
                    style={activeTab === 'history' ? { backgroundColor: '#2196f3' } : {}}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                    {!loading && historyClassesCount > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {historyClassesCount}
                        </span>
                      )}
                    </button>
                  </nav>
                </div>
              </div>

            {/* Advanced Filter and Search - BERRY Style */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <Filter className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-base font-semibold text-gray-900">Filter & Search</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Batch Name Search */}
                  <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Search by Batch Name
                    </label>
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Enter batch name..."
                        value={searchBatchName}
                        onChange={(e) => setSearchBatchName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Teacher Name Search */}
                  <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Search by Teacher Name
                    </label>
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Enter teacher name..."
                        value={searchTeacherName}
                        onChange={(e) => setSearchTeacherName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                {(searchBatchName || searchTeacherName || selectedMonth) && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSearchBatchName('');
                        setSearchTeacherName('');
                        setSelectedMonth('');
                        setSelectedYear(new Date().getFullYear().toString());
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {/* CSV Download Section - Only show in History tab */}
              {activeTab === 'history' && (
                <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-100 p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <Download className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">CSV Download Options</h3>
                  </div>
                  
                  {/* Month and Year Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Month
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">All Months</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years = [];
                          for (let year = currentYear; year >= currentYear - 5; year--) {
                            years.push(year);
                          }
                          return years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Download Buttons Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Download All History */}
                    <button
                      onClick={handleDownloadAllHistory}
                      className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All History
                    </button>

                    {/* Download by Batch Name */}
                    <button
                      onClick={handleDownloadByBatchName}
                      disabled={!searchBatchName.trim()}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchBatchName.trim()
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Batch Name
                    </button>

                    {/* Download by Teacher Name */}
                    <button
                      onClick={handleDownloadByTeacherName}
                      disabled={!searchTeacherName.trim()}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchTeacherName.trim()
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Teacher Name
                    </button>

                    {/* Download by Batch Name + Month */}
                    <button
                      onClick={handleDownloadByBatchNameAndMonth}
                      disabled={!searchBatchName.trim() || !selectedMonth}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchBatchName.trim() && selectedMonth
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Batch + Month
                    </button>

                    {/* Download by Teacher Name + Month */}
                    <button
                      onClick={handleDownloadByTeacherNameAndMonth}
                      disabled={!searchTeacherName.trim() || !selectedMonth}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchTeacherName.trim() && selectedMonth
                          ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Teacher + Month
                    </button>

                    {/* Download Current Filtered Results */}
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      let filtered = allClasses.filter(c => c.date < today);
                      
                      if (searchBatchName) {
                        filtered = filtered.filter(c => 
                          c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
                        );
                      }
                      
                      if (searchTeacherName) {
                        filtered = filtered.filter(c => 
                          c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
                        );
                      }
                      
                      if (selectedMonth && selectedYear) {
                        filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
                      }
                      
                      return (
                        <button
                          onClick={() => {
                            if (filtered.length === 0) {
                              alert('No classes match the current filters');
                              return;
                            }
                            downloadCSV(filtered, `class_history_filtered_${new Date().toISOString().split('T')[0]}.csv`);
                          }}
                          disabled={filtered.length === 0}
                          className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                            filtered.length > 0
                              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Filtered ({filtered.length})
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

                    {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              {activeTab === 'today' ? 'Total Live Classes' : 'Total Classes'}
                            </p>
                    <p className="text-2xl font-bold text-gray-900">{filteredClasses.length}</p>
                          </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e3f2fd, #bbdefb)' }}>
                    <Video className="w-6 h-6" style={{ color: '#2196f3' }} />
                          </div>
                        </div>
                      </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unique Batches</p>
                    <p className="text-2xl font-bold text-gray-900">
                              {new Set(filteredClasses.map(c => c.batch_id)).size}
                            </p>
                          </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-50">
                    <Users className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              {activeTab === 'today' ? 'Active Tutors' : 'Total Tutors'}
                            </p>
                    <p className="text-2xl font-bold text-gray-900">
                              {new Set(filteredClasses.map(c => c.tutor_name).filter(Boolean)).size}
                            </p>
                          </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-50">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                  <span className="font-medium text-sm">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium text-sm">Loading classes...</p>
                      </div>
                    ) : filteredClasses.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-gray-400" />
                        </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {activeTab === 'today' ? 'No Live Classes Today' : 'No Classes Found'}
                        </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                          {activeTab === 'today' 
                            ? "There are no scheduled classes for today. Check back later or view the schedule."
                            : (searchBatchName || searchTeacherName)
                            ? "No classes match your search filters. Try adjusting your search criteria."
                            : "There are no classes in history yet."}
                        </p>
                      </div>
                    ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-bold text-gray-900">
                            {activeTab === 'today' ? "Today's Live Classes" : "Class History"}
                          </h2>
                  <p className="text-xs text-gray-500 mt-1">
                            {filteredClasses.length} class{filteredClasses.length > 1 ? 'es' : ''} found
                            {(searchBatchName || searchTeacherName) && ' (filtered)'}
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">S.No</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Batch Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Course Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Tutor Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Date</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Time</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Class Link</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {paginatedClasses.map((classItem, index) => (
                                  <tr key={classItem.meet_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-6 py-4 text-sm">
                                      <button
                                        onClick={() => handleBatchClick(classItem.batch_id, classItem.batch_name)}
                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                                      >
                                        {classItem.batch_name || 'N/A'}
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{classItem.course_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{classItem.tutor_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(classItem.date)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{formatTime(classItem.class_time)}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                      {classItem.class_link ? (
                                        <a
                                          href={cleanMeetUrl(classItem.class_link)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                          {activeTab === 'today' ? 'Join' : 'View'}
                                        </a>
                                      ) : (
                                        <span className="text-gray-400 text-xs">No link</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                {/* Pagination */}
                {filteredClasses.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    {/* Left: Showing entries info */}
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} entries
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
            )}
          </div>
        </div>
      </div>

      {/* Batch Details Modal - BERRY Style Right-Side Slide-In */}
      {modalOpen && (
        <div 
          className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleCloseModal}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Batch Details</h2>
                  {selectedBatch?.batch_name && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedBatch.batch_name}</p>
                  )}
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto">
              {/* Batch Information Cards */}
              {loadingBatchDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedBatch && (
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {/* Batch Name */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Batch Name</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedBatch.batch_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Name */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100">
                        <GraduationCap className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Course</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedBatch.course_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Enrolled Students ({batchStudents.length})
                </h3>
                
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : batchStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {batchStudents.map((student, index) => (
                      <div
                        key={student.student_id || index}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                              {student.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm truncate">{student.name || 'N/A'}</h3>
                              <p className="text-xs text-gray-600 truncate">{student.email || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{formatPhone(student.phone)}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-xs text-gray-500 mb-1">Registration</div>
                            <div className="font-mono text-xs font-semibold text-blue-600">{student.registration_number || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveClassPage;

