import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Edit, Trash2, Save, AlertCircle, CheckCircle, XCircle, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { createGMeet, getGMeetsByBatch, deleteGMeet, updateGMeet, getBatchById, getMyTutorInfo } from '../services/Api';

function TakeClassPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batch, setBatch] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [savingSession, setSavingSession] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null); // session_number or null
  const [cancelReason, setCancelReason] = useState('');
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
  const [tutorInfo, setTutorInfo] = useState(null);

  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Helper function to check if a name is a full name (has spaces) vs username
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '' && isFullName(tutorInfo.full_name)) {
      return tutorInfo.full_name;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
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

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Fetch tutor info
  useEffect(() => {
    const fetchTutorInfo = async () => {
      try {
        const data = await getMyTutorInfo();
        setTutorInfo(data);
      } catch (error) {
        console.error("Failed to fetch tutor info:", error);
      }
    };
    fetchTutorInfo();
  }, []);

  // Fetch batch details
  useEffect(() => {
    const fetchBatchDetails = async () => {
    try {
      const token = localStorage.getItem('token');
        const response = await getBatchById(token, batchId);
        if (response && response.success && response.data) {
          setBatch(response.data);
        }
    } catch (error) {
        console.error('Error fetching batch details:', error);
    }
  };
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const fetchSessions = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await getGMeetsByBatch(batchId, token);

      // If batch has total_sessions, organize by session_number
      if (batch && batch.total_sessions) {
        const sessionsMap = {};
        // Initialize all sessions
        for (let i = 1; i <= batch.total_sessions; i++) {
          sessionsMap[i] = null;
        }
        // Fill in existing sessions
        response.forEach(session => {
          if (session.session_number) {
            sessionsMap[session.session_number] = session;
          }
        });
        // Convert to array
        const sessionsArray = [];
        for (let i = 1; i <= batch.total_sessions; i++) {
          sessionsArray.push({
            session_number: i,
            ...sessionsMap[i],
            meet_id: sessionsMap[i]?.meet_id || null,
            date: sessionsMap[i]?.date || null,
            time: sessionsMap[i]?.time || null,
            title: sessionsMap[i]?.title || `Session ${i}`,
            meet_link: sessionsMap[i]?.meet_link || null,
            note: sessionsMap[i]?.note || null,
            status: sessionsMap[i]?.status || 'Scheduled',
            cancellation_reason: sessionsMap[i]?.cancellation_reason || null
          });
        }
        setSessions(sessionsArray);
      } else {
        // If no total_sessions, show all existing sessions in table format
        const sortedSessions = response
          .sort((a, b) => {
            if (a.session_number && b.session_number) {
              return a.session_number - b.session_number;
            }
            if (a.date && b.date) {
              return new Date(a.date) - new Date(b.date);
            }
            return 0;
          })
          .map((session, index) => ({
            session_number: session.session_number || index + 1,
            ...session
          }));
        setSessions(sortedSessions);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [batchId, batch]);

  useEffect(() => {
    if (batch) {
      fetchSessions();
    }
  }, [batch, fetchSessions]);

  const handleSessionEdit = (sessionNumber) => {
    setEditingSession(sessionNumber);
  };

  const handleSessionSave = async (sessionNumber) => {
    try {
      setSavingSession(sessionNumber);
      const token = localStorage.getItem('token');
      const session = sessions.find(s => s.session_number === sessionNumber);
      
      if (!session || !session.meet_id) {
        // Create new session
        const newSession = {
          batch_id: batchId,
          session_number: sessionNumber,
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: session.status || 'Scheduled',
          cancellation_reason: session.cancellation_reason || null,
          current: false
        };
        await createGMeet(newSession, token);
      } else {
        // Update existing session
        const updates = {
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: session.status || 'Scheduled',
          cancellation_reason: session.cancellation_reason || null
        };
        await updateGMeet(session.meet_id, updates, token);
      }
      
      setEditingSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session: ' + error.message);
    } finally {
      setSavingSession(null);
    }
  };

  const handleSessionCancel = () => {
    setEditingSession(null);
    fetchSessions(); // Reload to reset changes
  };

  const handleSessionChange = (sessionNumber, field, value) => {
    setSessions(prev => prev.map(s => 
      s.session_number === sessionNumber 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const handleStatusChange = async (sessionNumber, newStatus) => {
    if (newStatus === 'Cancelled') {
      setShowCancelModal(sessionNumber);
      setCancelReason('');
      return;
    }
    
    await updateSessionStatus(sessionNumber, newStatus, null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }
    
    await updateSessionStatus(showCancelModal, 'Cancelled', cancelReason);
    setShowCancelModal(null);
    setCancelReason('');
  };

  const updateSessionStatus = async (sessionNumber, status, cancellationReason) => {
    try {
      const token = localStorage.getItem('token');
      const session = sessions.find(s => s.session_number === sessionNumber);
      
      if (!session || !session.meet_id) {
        // If no meet_id, create session first
        const newSession = {
          batch_id: batchId,
          session_number: sessionNumber,
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: status,
          cancellation_reason: cancellationReason || null,
          current: false
        };
        const result = await createGMeet(newSession, token);
        if (result && result.data && result.data[0]) {
          setSessions(prev => prev.map(s => 
            s.session_number === sessionNumber 
              ? { ...s, meet_id: result.data[0].meet_id, status, cancellation_reason: cancellationReason }
              : s
          ));
        }
      } else {
        // Update existing session
        const updates = {
          status: status,
          cancellation_reason: cancellationReason || null
        };
        await updateGMeet(session.meet_id, updates, token);
        setSessions(prev => prev.map(s => 
          s.session_number === sessionNumber 
            ? { ...s, status, cancellation_reason: cancellationReason }
            : s
        ));
      }
      
      fetchSessions();
    } catch (error) {
      console.error('Error updating session status:', error);
      alert('Failed to update session status: ' + error.message);
    }
  };

  const handleDeleteSession = async (meetId) => {
    if (!meetId) return;
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const token = localStorage.getItem('token');
        await deleteGMeet(meetId, token);
        fetchSessions();
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session: ' + error.message);
      }
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes, seconds] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || '0', 10));
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting time:", timeString, e);
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = sessions.slice(startIndex, endIndex);

  // Reset to page 1 if current page is beyond total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [sessions.length, currentPage, totalPages]);

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

  // CSV Upload Handler
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const sNoIndex = header.findIndex(h => h === 's.no' || h === 'sno' || h === 'session_number' || h === 'session number');
      const titleIndex = header.findIndex(h => h === 'title');

      if (sNoIndex === -1 || titleIndex === -1) {
        alert('CSV must have "S.No" (or SNo/Session Number) and "Title" columns');
        return;
      }

      // Parse data rows
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const sNo = parseInt(values[sNoIndex]);
        const title = values[titleIndex];

        if (!isNaN(sNo) && title) {
          csvData.push({ session_number: sNo, title });
        }
      }

      if (csvData.length === 0) {
        alert('No valid data found in CSV file');
        return;
      }

      // Update sessions state and save to backend
      const token = localStorage.getItem('token');
      let updatedCount = 0;
      let createdCount = 0;

      for (const csvRow of csvData) {
        const session = sessions.find(s => s.session_number === csvRow.session_number);
        
        if (session) {
          if (session.meet_id) {
            // Update existing session
            try {
              await updateGMeet(session.meet_id, { title: csvRow.title }, token);
              updatedCount++;
            } catch (error) {
              console.error(`Error updating session ${csvRow.session_number}:`, error);
            }
          } else {
            // Create new session if doesn't exist
            try {
              const newSession = {
                batch_id: batchId,
                session_number: csvRow.session_number,
                title: csvRow.title,
                date: null,
                time: null,
                meet_link: null,
                note: null,
                status: 'Scheduled',
                cancellation_reason: null,
                current: false
              };
              await createGMeet(newSession, token);
              createdCount++;
            } catch (error) {
              console.error(`Error creating session ${csvRow.session_number}:`, error);
            }
          }
        }
      }

      // Refresh sessions from backend
      await fetchSessions();

      alert(`Successfully processed ${csvData.length} session(s): ${updatedCount} updated, ${createdCount} created!`);
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file: ' + error.message);
    }
  };

  // Download CSV Template
  const downloadCSVTemplate = () => {
    const header = 'S.No,Title\n';
    let rows = '';
    for (let i = 1; i <= (batch?.total_sessions || sessions.length); i++) {
      rows += `${i},Session ${i}\n`;
    }
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session_titles_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
                      Take Class
                    </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Schedule and manage your teaching sessions
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
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all" onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
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
                              navigate('/teacher');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-sm text-gray-700">Dashboard</span>
                          </button>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              localStorage.removeItem('token');
                              window.dispatchEvent(new Event('storage'));
                              navigate('/');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium">Logout</span>
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

        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto">

              {/* BERRY Style Table Container */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Session Management</h2>
                    {batch?.total_sessions && (
                      <p className="text-sm text-gray-600 mt-1">Total Sessions: {batch.total_sessions}</p>
                    )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={downloadCSVTemplate}
                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Download Template</span>
                      </button>
                      <label className="px-4 py-2 text-sm font-medium text-white rounded-lg cursor-pointer transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md" style={{ backgroundColor: '#2196f3' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'} onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}>
                        <Upload className="w-4 h-4" />
                        <span>Upload CSV</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                    </div>
                  )}
                  
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading sessions...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead style={{ backgroundColor: '#f5f5f5' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google Meet Link</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sessions.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-gray-600">
                              No sessions found. {batch?.total_sessions ? `Expected ${batch.total_sessions} sessions.` : 'Create sessions to get started.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedSessions.map((session) => {
                            const isEditing = editingSession === session.session_number;
                            const isSaving = savingSession === session.session_number;
                            
                            return (
                              <tr key={session.session_number || session.meet_id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                  {session.session_number}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {isEditing ? (
                          <input
                            type="date"
                                      value={session.date || ''}
                                      onChange={(e) => handleSessionChange(session.session_number, 'date', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  ) : (
                                    session.date ? formatDate(session.date) : '-'
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {isEditing ? (
                          <input
                            type="time"
                                      value={session.time || ''}
                                      onChange={(e) => handleSessionChange(session.session_number, 'time', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  ) : (
                                    session.time ? formatTime(session.time) : '-'
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {isEditing ? (
                          <input
                            type="text"
                                      value={session.title || ''}
                                      onChange={(e) => handleSessionChange(session.session_number, 'title', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  ) : (
                                    session.title || '-'
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {isEditing ? (
                          <input
                            type="url"
                                      value={session.meet_link || ''}
                                      onChange={(e) => handleSessionChange(session.session_number, 'meet_link', e.target.value)}
                            placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  ) : session.meet_link ? (
                                    <a href={session.meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center transition-colors" style={{ color: '#2196f3' }}>
                                      <Video className="w-4 h-4 mr-1" /> Join
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {isEditing ? (
                          <textarea
                                      value={session.note || ''}
                                      onChange={(e) => handleSessionChange(session.session_number, 'note', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                      rows="2"
                                    />
                                  ) : (
                                    session.note || '-'
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {session.attendance && session.attendance.marked ? (
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium">
                                        <span className="text-green-600">P: {session.attendance.present_count || 0}</span>
                                        {' / '}
                                        <span className="text-red-600">A: {session.attendance.absent_count || 0}</span>
                                        {session.attendance.late_count > 0 && (
                                          <>
                                            {' / '}
                                            <span className="text-orange-600">L: {session.attendance.late_count}</span>
                                          </>
                                        )}
                                        {session.attendance.excused_count > 0 && (
                                          <>
                                            {' / '}
                                            <span className="text-blue-600">E: {session.attendance.excused_count}</span>
                                          </>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Total: {session.attendance.total_students || 0} students
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Not marked</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                  {isEditing ? (
                                    <select
                                      value={session.status || 'Scheduled'}
                                      onChange={(e) => handleStatusChange(session.session_number, e.target.value)}
                                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="Scheduled">Scheduled</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span className={`px-3 py-1 text-xs font-medium rounded-lg ${
                                        session.status === 'Completed' 
                                          ? 'bg-green-50 text-green-700 border border-green-200' 
                                          : session.status === 'Cancelled'
                                          ? 'bg-red-50 text-red-700 border border-red-200'
                                          : 'text-blue-700 border border-blue-200'
                                      }`} style={session.status === 'Scheduled' ? { backgroundColor: '#e3f2fd' } : {}}>
                                        {session.status === 'Completed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                        {session.status === 'Cancelled' && <XCircle className="w-3 h-3 inline mr-1" />}
                                        {session.status || 'Scheduled'}
                                      </span>
                                      {session.status === 'Cancelled' && session.cancellation_reason && (
                                        <span className="text-xs text-gray-500" title={session.cancellation_reason}>
                                          ({session.cancellation_reason.substring(0, 20)}...)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                  {isEditing ? (
                                    <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleSessionSave(session.session_number)}
                                        disabled={isSaving}
                                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 disabled:opacity-50 flex items-center transition-colors"
                                        title="Save"
                                      >
                                        {isSaving ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                        ) : (
                                          <Save className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleSessionCancel}
                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center transition-colors"
                                        title="Cancel"
                                      >
                                        Cancel
                                    </button>
                                    </div>
                                  ) : (
                                    <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleSessionEdit(session.session_number)}
                                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                                        title="Edit"
                                        style={{ color: '#2196f3' }}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                      {session.meet_id && (
                                    <button
                                          onClick={() => handleDeleteSession(session.meet_id)}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center transition-colors"
                                          title="Delete"
                                    >
                                          <Trash2 className="w-4 h-4" />
                                    </button>
                                      )}
                                  </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* BERRY Style Pagination */}
                {sessions.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-6 py-4 border-t border-gray-200">
                    {/* Left: Showing entries info */}
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, sessions.length)} of {sessions.length} entries
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

      {/* BERRY Style Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Cancel Session {showCancelModal}</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for cancellation:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-sm"
              rows="4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                style={{ backgroundColor: '#f44336' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TakeClassPage;
