import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, XCircle, AlertCircle, Plus, Save, Eye, User, Search } from 'lucide-react';
import { getMyTutorInfo } from '../services/Api';
import { 
    getBatchForAttendance, 
    getBatchAttendanceData, 
    getSessionAttendanceRecords, 
    createAttendanceSession, 
    bulkUpdateAttendanceRecords 
} from '../services/Api';

const TeacherAttendancePage = () => {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [batch, setBatch] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [dateSearch, setDateSearch] = useState('');

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

    // Get today's date in YYYY-MM-DD format for minimum date restriction
    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const today = getTodayDate();

    // Create session form state
    const [newSession, setNewSession] = useState({
        session_date: getTodayDate(),
        notes: ''
    });

    // Attendance marking state
    const [localRecords, setLocalRecords] = useState([]);

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

    useEffect(() => {
        if (batchId) {
            fetchBatchDetails();
            fetchAttendanceData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId]);

    // Filter sessions by date
    const filteredSessions = sessions.filter(session => {
        if (!dateSearch) return true;
        const sessionDate = new Date(session.session_date).toLocaleDateString();
        const searchDate = new Date(dateSearch).toLocaleDateString();
        return sessionDate === searchDate;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

    // Reset to page 1 if current page is beyond total pages or when search changes
    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0 && currentPage > 1) {
            setCurrentPage(1);
        }
    }, [filteredSessions.length, currentPage, totalPages]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [dateSearch]);

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

    const fetchBatchDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await getBatchForAttendance(batchId, token);
            
            // Handle response structure: { success: true, data: {...} } or direct data
            const batchData = response.success ? response.data : response;
            
            if (batchData && batchData.batch_id) {
                setBatch(batchData);
            } else {
                throw new Error(response.error || 'Failed to fetch batch details');
            }
        } catch (err) {
            console.error('Error fetching batch details:', err);
            if (err.message.includes('403') || err.message.includes('Forbidden')) {
                setError('You are not authorized to access this batch. Please contact your administrator.');
            } else {
                setError(err.message);
            }
        }
    };

    const fetchAttendanceData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const data = await getBatchAttendanceData(batchId, token);
            
            if (data.success) {
                setSessions(data.data.sessions);
            } else {
                throw new Error(data.error || 'Failed to fetch attendance data');
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            if (err.message.includes('403') || err.message.includes('Forbidden')) {
                setError('You are not authorized to view attendance for this batch. Please contact your administrator.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionRecords = async (sessionId) => {
        try {
            const token = localStorage.getItem('token');
            const data = await getSessionAttendanceRecords(batchId, sessionId, token);
            
            if (data.success) {
                console.log('🔍 Selected session:', data.session);
                console.log('🔍 Session records:', data.records);
                setLocalRecords(data.records.map(record => ({ ...record })));
                setSelectedSession(data.session);
            } else {
                throw new Error(data.error || 'Failed to fetch session records');
            }
        } catch (err) {
            console.error('Error fetching session records:', err);
            setError(err.message);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const sessionData = {
                batch_id: batchId,
                session_date: newSession.session_date,
                notes: newSession.notes
            };
            
            const data = await createAttendanceSession(sessionData, token);
            
            if (data.success) {
                alert('Session created successfully!');
                setShowCreateModal(false);
                setNewSession({ session_date: getTodayDate(), notes: '' });
                fetchAttendanceData();
            } else {
                throw new Error(data.error || 'Failed to create session');
            }
        } catch (err) {
            console.error('Error creating session:', err);
            setError(err.message);
        }
    };

    const handleStatusChange = (recordId, newStatus) => {
        setLocalRecords(prev => 
            prev.map(record => 
                record.id === recordId 
                    ? { ...record, status: newStatus }
                    : record
            )
        );
        setUnsavedChanges(true);
    };

    const handleSaveAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            
            const data = await bulkUpdateAttendanceRecords(localRecords, token);
            
            if (data.success) {
                alert(data.message);
                setUnsavedChanges(false);
                fetchSessionRecords(selectedSession.id);
            } else {
                throw new Error(data.error || 'Failed to save attendance');
            }
        } catch (err) {
            console.error('Error saving attendance:', err);
            setError(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return 'bg-green-100 text-green-800 border-green-200';
            case 'absent': return 'bg-red-100 text-red-800 border-red-200';
            case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex">
                <Navbar />
                <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
                        <div className="mt-16 lg:mt-0">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                                    </div>
                                    <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Attendance Data</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex">
                <Navbar />
                <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
                        <div className="mt-16 lg:mt-0">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center py-20">
                                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                        <AlertCircle className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h3>
                                    <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                            Attendance Management
                                        </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                            {batch?.batch_name} - {batch?.courses?.course_name}
                                        </p>
                                    </div>
                                </div>
                                
                            {/* Right: Notifications, Profile */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <TeacherNotificationBell />
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
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Batch Status Alert */}
                                {batch?.status !== 'Started' && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-yellow-100 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-yellow-800">Batch Not Started</h4>
                                                <p className="text-sm text-yellow-700">
                                                    Ask Academic Admin to start the batch to enable attendance tracking.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                        {/* Create Session Button - BERRY Style */}
                            {batch?.status === 'Started' && (
                                <div className="mb-4 sm:mb-6">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                    style={{ backgroundColor: '#2196f3' }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                                    >
                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                        <span className="text-sm sm:text-base">Create New Session</span>
                                    </button>
                                </div>
                            )}

                        {/* Sessions Table - BERRY Style */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mb-6">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                        <Calendar className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Class Sessions</h2>
                                        <p className="text-sm text-gray-500">Manage attendance for each session</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="date"
                                            value={dateSearch}
                                            onChange={(e) => setDateSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Search by date"
                                        />
                                    </div>
                                    {dateSearch && (
                                        <button
                                            onClick={() => setDateSearch('')}
                                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                    </div>
                                </div>
                                
                            {filteredSessions.length === 0 ? (
                                    <div className="text-center py-8 sm:py-12">
                                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-6" style={{ backgroundColor: '#e3f2fd' }}>
                                        <Calendar className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#2196f3' }} />
                                        </div>
                                    <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                                        {dateSearch ? 'No Sessions Found' : 'No Sessions Created'}
                                    </h4>
                                    <p className="text-gray-500 text-sm sm:text-base">
                                        {dateSearch ? 'Try searching with a different date' : 'Create your first session to start tracking attendance'}
                                    </p>
                                    </div>
                                ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead style={{ backgroundColor: '#f5f5f5' }}>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {paginatedSessions.map((session, index) => (
                                                    <tr key={session.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                                            {startIndex + index + 1}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                                            {new Date(session.session_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">
                                                            {session.notes || <span className="text-gray-400 italic">No notes</span>}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                onClick={() => {
                                                    fetchSessionRecords(session.id);
                                                    setShowSessionModal(true);
                                                }}
                                                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                                style={{ backgroundColor: '#2196f3' }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Mark Attendance
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                                        </div>

                                    {/* BERRY Style Pagination - Always show below table */}
                                    {filteredSessions.length > 0 && (
                                        <div className="flex items-center justify-between mt-6 px-6 py-4 border-t border-gray-200">
                                            {/* Left: Showing entries info */}
                                            <div className="text-sm text-gray-500">
                                                Showing {startIndex + 1} to {Math.min(endIndex, filteredSessions.length)} of {filteredSessions.length} entries
                                                        </div>

                                            {/* Right: Pagination buttons - Only show when more than 1 page */}
                                            {totalPages > 1 && (
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
                                            )}
                                    </div>
                                    )}
                                </>
                                )}
                            </div>

                        {/* Create Session Modal - BERRY Style */}
                            {showCreateModal && (
                            <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
                                        <div className="p-4 sm:p-6 lg:p-8">
                                            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                            <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                                <Plus className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Create New Session</h3>
                                                <p className="text-sm text-gray-500">Add a new attendance session</p>
                                                </div>
                                            </div>
                                            
                                            <form onSubmit={handleCreateSession} className="space-y-4 sm:space-y-6">
                                                <div className="space-y-2">
                                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                                    <Calendar className="w-4 h-4" style={{ color: '#2196f3' }} />
                                                        <span>Session Date</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        min={today}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                                                        value={newSession.session_date}
                                                        onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                                    <AlertCircle className="w-4 h-4" style={{ color: '#2196f3' }} />
                                                        <span>Notes (Optional)</span>
                                                    </label>
                                                    <textarea
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                                                        rows="3"
                                                        value={newSession.notes}
                                                        onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                                                        placeholder="Add any notes about this session..."
                                                    />
                                                </div>
                                                
                                                <div className="flex justify-end space-x-3 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateModal(false)}
                                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                    className="px-4 py-2 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                                    style={{ backgroundColor: '#2196f3' }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                                                    >
                                                        Create Session
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* Session Details Modal - BERRY Style */}
                            {showSessionModal && selectedSession && (
                            <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                                        <div className="p-4 sm:p-6 lg:p-8">
                                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                                <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                                    <Calendar className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                                                            Session: {new Date(selectedSession.session_date).toLocaleDateString()}
                                                        </h3>
                                                    <p className="text-sm text-gray-500">Mark attendance for students</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowSessionModal(false);
                                                        setUnsavedChanges(false);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {selectedSession.notes && (
                                            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                    <div className="flex items-start space-x-2">
                                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2196f3' }} />
                                                        <div>
                                                        <p className="text-sm font-medium text-gray-800">Session Notes</p>
                                                        <p className="text-sm text-gray-600 mt-1">{selectedSession.notes}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Attendance Records Table - BERRY Style */}
                                            <div className="mb-6 sm:mb-8">
                                                <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                                                <div className="p-2 rounded-lg" style={{ backgroundColor: '#e3f2fd' }}>
                                                    <Users className="w-4 h-4" style={{ color: '#2196f3' }} />
                                                    </div>
                                                <h4 className="text-lg font-bold text-gray-800">Student Attendance</h4>
                                                </div>
                                                
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                                        Student
                                                                    </th>
                                                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                                        Status
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                {localRecords.map((record, index) => (
                                                                <tr key={record.id} className="hover:bg-blue-50 transition-colors duration-200">
                                                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                                            <div className="flex items-center space-x-3">
                                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e3f2fd' }}>
                                                                                <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#2196f3' }} />
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                <div className="text-sm sm:text-base font-medium text-gray-800 truncate">
                                                                                        {record.student_name}
                                                                                    </div>
                                                                                    <div className="text-xs sm:text-sm text-gray-500 truncate">
                                                                                        {record.email}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                                            <select
                                                                                value={record.status}
                                                                                onChange={(e) => handleStatusChange(record.id, e.target.value)}
                                                                            className={`px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${getStatusColor(record.status)}`}
                                                                            >
                                                                                <option value="absent">Absent</option>
                                                                                <option value="present">Present</option>
                                                                                <option value="late">Late</option>
                                                                                <option value="excused">Excused</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>

                                        {/* Save Button - BERRY Style */}
                                            <div className="flex justify-end pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={handleSaveAttendance}
                                                    disabled={!unsavedChanges}
                                                className={`inline-flex items-center px-4 py-3 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-200 ${
                                                        unsavedChanges
                                                        ? 'text-white shadow-sm hover:shadow-md'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                style={unsavedChanges ? { backgroundColor: '#2196f3' } : {}}
                                                onMouseEnter={unsavedChanges ? (e) => e.target.style.backgroundColor = '#1976d2' : undefined}
                                                onMouseLeave={unsavedChanges ? (e) => e.target.style.backgroundColor = '#2196f3' : undefined}
                                                >
                                                    <div className={`p-1 rounded-lg mr-3 ${unsavedChanges ? 'bg-white/20' : 'bg-gray-200'}`}>
                                                        <Save className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm sm:text-base">
                                                        {unsavedChanges ? 'Save Changes' : 'No Changes'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendancePage;