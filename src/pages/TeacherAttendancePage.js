import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Calendar, 
    Users, 
    XCircle, 
    AlertCircle, 
    Plus, 
    Save, 
    Eye, 
    User, 
    Search, 
    CheckCircle,
    ArrowLeft,
    Edit3,
    Clock,
    Check,
    X,
    Sparkles,
    Loader2
} from 'lucide-react';
import { getMyTutorInfo, getTeacherBatches } from '../services/Api';
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
    const [availableBatches, setAvailableBatches] = useState([]);
    const [activeBatchId, setActiveBatchId] = useState(batchId || '');
    const [batch, setBatch] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [isTodayMarked, setIsTodayMarked] = useState(false);
    const [todaySession, setTodaySession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
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

    // Custom responsive modal feedback state (replaces native alert/confirm)
    const [modalFeedback, setModalFeedback] = useState({
        isOpen: false,
        type: 'info', // 'success' | 'error' | 'warning' | 'info'
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'OK',
        cancelText: 'Cancel'
    });

    // Helper to format ISO timestamp to IST 12-hour format
    const formatISTTime = (isoString) => {
        if (!isoString) return '';
        try {
            const s = String(isoString);
            const timePart = s.split('T')[1] || s.split(' ')[1] || '';
            const withZ = (timePart.endsWith('Z') || timePart.includes('+') || timePart.includes('-')) 
                ? s 
                : `${s.replace(' ', 'T')}Z`;
            return new Date(withZ).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) + ' IST';
        } catch (_) {
            return isoString || '';
        }
    };

    // Get full name from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const tokenFullName = decodedToken?.full_name || null;
    
    const getDisplayName = () => {
        if (tokenFullName && tokenFullName.trim() !== '') {
            return tokenFullName;
        }
        if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
            return tutorInfo.full_name;
        }
        return "Teacher";
    };

    // Get today's date in YYYY-MM-DD format
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
        handleSidebarToggle();
        
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

    // Load all teacher batches for switcher
    useEffect(() => {
        const loadBatches = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await getTeacherBatches(token);
                const list = res?.data || (Array.isArray(res) ? res : []);
                setAvailableBatches(list);
                if (!batchId && list.length > 0) {
                    setActiveBatchId(list[0].batch_id);
                }
            } catch (err) {
                console.error("Failed to load teacher batches:", err);
            }
        };
        loadBatches();
    }, [batchId]);

    useEffect(() => {
        if (batchId) {
            setActiveBatchId(batchId);
        }
    }, [batchId]);

    useEffect(() => {
        if (activeBatchId) {
            fetchBatchDetails(activeBatchId);
            fetchAttendanceData(activeBatchId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBatchId]);

    // Filter sessions by date (Only sessions on or after feature start date 2026-10-07)
    const filteredSessions = sessions.filter(session => {
        const sDate = session.session_date ? session.session_date.split('T')[0] : '';
        if (sDate < '2026-10-07') return false;
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

    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0 && currentPage > 1) {
            setCurrentPage(1);
        }
    }, [filteredSessions.length, currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateSearch]);

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

    const fetchBatchDetails = async (targetId = activeBatchId) => {
        if (!targetId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await getBatchForAttendance(targetId, token);
            const batchData = response.success ? response.data : response;
            
            if (batchData && batchData.batch_id) {
                setBatch(batchData);
                setError(null);
            }
        } catch (err) {
            console.warn('Direct batch details fetch notice:', err.message);
        }
    };

    const fetchAttendanceData = async (targetId = activeBatchId) => {
        if (!targetId) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const data = await getBatchAttendanceData(targetId, token);
            
            if (data.success) {
                if (data.data?.batch) {
                    setBatch(data.data.batch);
                }
                const sessionList = data.data.sessions || [];
                setSessions(sessionList);
                setIsTodayMarked(Boolean(data.data.is_today_marked));
                const todayStr = getTodayDate();
                const found = sessionList.find(s => s.session_date === todayStr);
                setTodaySession(found || null);
                setError(null);
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
            const data = await getSessionAttendanceRecords(activeBatchId, sessionId, token);
            
            if (data.success) {
                setLocalRecords(data.records.map(record => ({ ...record })));
                setSelectedSession(data.session);
                setUnsavedChanges(false);
            } else {
                throw new Error(data.error || 'Failed to fetch session records');
            }
        } catch (err) {
            console.error('Error fetching session records:', err);
            setModalFeedback({
                isOpen: true,
                type: 'error',
                title: 'Unable to Load Records',
                message: err.message || 'Failed to retrieve attendance session records.',
                confirmText: 'Dismiss'
            });
        }
    };

    const handleQuickMarkToday = async () => {
        if (!activeBatchId) return;
        try {
            const token = localStorage.getItem('token');
            if (todaySession) {
                await fetchSessionRecords(todaySession.id);
                setIsEditMode(false);
                return;
            }
            const sessionData = {
                batch_id: activeBatchId,
                session_date: getTodayDate(),
                notes: 'Regular Class Attendance'
            };
            const data = await createAttendanceSession(sessionData, token);
            if (data.success && data.session) {
                await fetchAttendanceData(activeBatchId);
                await fetchSessionRecords(data.session.id);
                setIsEditMode(true);
                setModalFeedback({
                    isOpen: true,
                    type: 'success',
                    title: "Today's Session Ready",
                    message: "Session created for today. You can now mark student attendance and tap Save Changes.",
                    confirmText: "Start Marking"
                });
            }
        } catch (err) {
            console.error('Error quick marking today:', err);
            setModalFeedback({
                isOpen: true,
                type: 'error',
                title: 'Error Starting Session',
                message: err.message || 'Failed to initialize today attendance',
                confirmText: 'Dismiss'
            });
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const sessionData = {
                batch_id: activeBatchId,
                session_date: newSession.session_date,
                notes: newSession.notes
            };
            
            const data = await createAttendanceSession(sessionData, token);
            
            if (data.success) {
                setShowCreateModal(false);
                setNewSession({ session_date: getTodayDate(), notes: '' });
                await fetchAttendanceData(activeBatchId);
                if (data.session?.id) {
                    await fetchSessionRecords(data.session.id);
                    setIsEditMode(true);
                }
                setModalFeedback({
                    isOpen: true,
                    type: 'success',
                    title: 'Session Created!',
                    message: `Attendance session for ${newSession.session_date} was created successfully. You can now mark student attendance.`,
                    confirmText: 'Start Marking'
                });
            } else {
                throw new Error(data.error || 'Failed to create session');
            }
        } catch (err) {
            console.error('Error creating session:', err);
            setModalFeedback({
                isOpen: true,
                type: 'error',
                title: 'Session Creation Failed',
                message: err.message || 'Could not create session.',
                confirmText: 'Dismiss'
            });
        }
    };

    const handleMarkAll = (status) => {
        const now = new Date().toISOString();
        setLocalRecords(prev => prev.map(record => ({ ...record, status, marked_at: now })));
        setUnsavedChanges(true);
    };

    const handleClearAll = () => {
        setLocalRecords(prev => prev.map(record => ({ ...record, status: null, marked_at: null })));
        setUnsavedChanges(true);
    };

    const handleStatusChange = (recordId, newStatus) => {
        setLocalRecords(prev => 
            prev.map(record => {
                if (record.id === recordId || record.student_id === recordId) {
                    const nextStatus = record.status === newStatus ? null : newStatus;
                    return {
                        ...record,
                        status: nextStatus,
                        marked_at: nextStatus ? new Date().toISOString() : null
                    };
                }
                return record;
            })
        );
        setUnsavedChanges(true);
    };

    const handleSaveAttendance = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const data = await bulkUpdateAttendanceRecords(localRecords, token);
            
            if (data.success) {
                setUnsavedChanges(false);
                setIsEditMode(false);
                await fetchAttendanceData(activeBatchId);
                if (selectedSession) {
                    await fetchSessionRecords(selectedSession.id);
                }
                setModalFeedback({
                    isOpen: true,
                    type: 'success',
                    title: 'Attendance Saved!',
                    message: data.message || 'Student attendance has been recorded and updated successfully.',
                    confirmText: 'Great!'
                });
            } else {
                throw new Error(data.error || 'Failed to save attendance');
            }
        } catch (err) {
            console.error('Error saving attendance:', err);
            setModalFeedback({
                isOpen: true,
                type: 'error',
                title: 'Save Failed',
                message: err.message || 'An error occurred while saving attendance records.',
                confirmText: 'Dismiss'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleBackToSessions = () => {
        if (unsavedChanges) {
            setModalFeedback({
                isOpen: true,
                type: 'warning',
                title: 'Unsaved Changes',
                message: 'You have modified attendance records that have not been saved yet. Do you want to discard your changes and go back?',
                confirmText: 'Discard Changes',
                cancelText: 'Keep Editing',
                onConfirm: () => {
                    setUnsavedChanges(false);
                    setIsEditMode(false);
                    setSelectedSession(null);
                    setModalFeedback(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            setIsEditMode(false);
            setSelectedSession(null);
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

    // Filter local records by student search query
    const filteredLocalRecords = localRecords.filter(r => {
        if (!studentSearch.trim()) return true;
        const q = studentSearch.toLowerCase();
        return (
            (r.student_name && r.student_name.toLowerCase().includes(q)) ||
            (r.student_email && r.student_email.toLowerCase().includes(q)) ||
            (r.student_reg_no && r.student_reg_no.toLowerCase().includes(q))
        );
    });

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
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                            Attendance Management
                                        </h1>
                                        {availableBatches.length > 1 && !selectedSession && (
                                            <select
                                                value={activeBatchId}
                                                onChange={(e) => {
                                                    const bId = e.target.value;
                                                    setActiveBatchId(bId);
                                                    navigate(`/teacher/batch/${bId}/attendance`);
                                                }}
                                                className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[140px] sm:max-w-xs truncate"
                                            >
                                                {availableBatches.map(b => (
                                                    <option key={b.batch_id} value={b.batch_id}>
                                                        {b.batch_name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        {batch?.batch_name || "Select Batch"} {batch?.courses?.course_name ? `- ${batch.courses.course_name}` : ''}
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
                                                <div className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            navigate('/teacher/tutor-info');
                                                            setIsProfileDropdownOpen(false);
                                                        }}
                                                        className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                                    >
                                                        <User className="w-5 h-5 text-gray-600 mr-3" />
                                                        <span className="text-sm text-gray-700">Account Settings</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigate('/teacher');
                                                            setIsProfileDropdownOpen(false);
                                                        }}
                                                        className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Calendar className="w-5 h-5 text-gray-600 mr-3" />
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
                                                        <XCircle className="w-5 h-5 mr-3" />
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
                        {/* CONDITIONAL RENDER: Full Screen Session Workspace VS Batch Overview */}
                        {selectedSession ? (
                            /* FULL SCREEN RESPONSIVE SESSION ATTENDANCE PAGE */
                            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                                {/* Top Navigation Bar */}
                                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleBackToSessions}
                                            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                            title="Back to Sessions"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                    {batch?.batch_name}
                                                </span>
                                                <span className="text-xs text-gray-400">&bull;</span>
                                                <span className="text-xs font-medium text-gray-600">
                                                    {batch?.courses?.course_name || 'Class Session'}
                                                </span>
                                            </div>
                                            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                                                <span>{new Date(selectedSession.session_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                {selectedSession.session_date === today && (
                                                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                                        Today
                                                    </span>
                                                )}
                                            </h2>
                                            {selectedSession.notes && (
                                                <p className="text-xs text-gray-500 mt-0.5">Notes: {selectedSession.notes}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit Mode Toggle & Controls */}
                                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 w-full sm:w-auto justify-end">
                                        {!isEditMode ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditMode(true)}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                <span>✏️ Edit Attendance</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (unsavedChanges) {
                                                            setModalFeedback({
                                                                isOpen: true,
                                                                type: 'warning',
                                                                title: 'Cancel Editing?',
                                                                message: 'You have unsaved changes. Do you want to cancel and revert?',
                                                                confirmText: 'Discard Changes',
                                                                cancelText: 'Keep Editing',
                                                                onConfirm: () => {
                                                                    fetchSessionRecords(selectedSession.id);
                                                                    setUnsavedChanges(false);
                                                                    setIsEditMode(false);
                                                                    setModalFeedback(prev => ({ ...prev, isOpen: false }));
                                                                }
                                                            });
                                                        } else {
                                                            setIsEditMode(false);
                                                        }
                                                    }}
                                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveAttendance}
                                                    disabled={saving}
                                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Saving...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4" />
                                                            <span>Save Changes</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Metrics Summary Bar */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase">Enrolled</p>
                                            <p className="text-xl sm:text-2xl font-black text-gray-800 mt-0.5">{localRecords.length}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                            <Users className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-emerald-700 uppercase">Present</p>
                                            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                                                {localRecords.filter(r => r.status === 'present').length}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-red-700 uppercase">Absent</p>
                                            <p className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                                                {localRecords.filter(r => r.status === 'absent').length}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                            <X className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-amber-700 uppercase">Late</p>
                                            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                                                {localRecords.filter(r => r.status === 'late').length}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-purple-700 uppercase">Attendance Rate</p>
                                            <p className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">
                                                {localRecords.length > 0
                                                    ? Math.round((localRecords.filter(r => r.status === 'present').length / localRecords.length) * 100)
                                                    : 0}%
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Mode Active Helper & Quick Actions Banner */}
                                {isEditMode && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                                <Edit3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-900 text-sm sm:text-base">
                                                    ✏️ Editing Mode Active
                                                </h4>
                                                <p className="text-xs text-blue-700 mt-0.5">
                                                    Tap any student's status button below to change attendance. Click "Save Changes" when done.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAll('present')}
                                                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                            >
                                                ⚡ Mark All Present
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAll('absent')}
                                                className="flex-1 sm:flex-initial px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                            >
                                                Mark All Absent
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleClearAll}
                                                className="flex-1 sm:flex-initial px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-200 cursor-pointer"
                                                title="Reset all students to unmarked default state"
                                            >
                                                Clear / Unmark
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Search Filter for Students */}
                                <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="relative w-full sm:w-80">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            placeholder="Search student name or reg no..."
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                        {studentSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setStudentSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-500 self-end sm:self-center font-medium">
                                        Showing {filteredLocalRecords.length} of {localRecords.length} students
                                    </div>
                                </div>

                                {/* Responsive Student Records: Mobile Cards vs Desktop Table */}
                                {/* 1. Mobile Cards Layout (< 768px) */}
                                <div className="block md:hidden space-y-3 pb-16">
                                    {filteredLocalRecords.map((record, index) => {
                                        return (
                                            <div
                                                key={record.id || `${record.student_id}-${index}`}
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    record.status === 'present'
                                                        ? 'bg-emerald-50/40 border-emerald-200'
                                                        : record.status === 'absent'
                                                        ? 'bg-red-50/40 border-red-200'
                                                        : record.status === 'late'
                                                        ? 'bg-amber-50/40 border-amber-200'
                                                        : 'bg-white border-gray-200'
                                                }`}
                                            >
                                                {/* Card Top: Avatar, Name, Reg No */}
                                                <div className="flex items-center justify-between gap-3 mb-2.5">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                                                            {record.student_name ? record.student_name.charAt(0).toUpperCase() : 'S'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                {record.student_name || 'Student'}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {record.student_reg_no ? `Reg: ${record.student_reg_no}` : (record.student_email || '')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {!isEditMode && (
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${getStatusColor(record.status)}`}>
                                                            {record.status ? record.status.toUpperCase() : 'UNMARKED'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Card Time Info */}
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5 pt-2 border-t border-gray-100">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>Marked:</span>
                                                        <span className="font-semibold text-gray-700">
                                                            {record.marked_at ? formatISTTime(record.marked_at) : 'Not marked yet'}
                                                        </span>
                                                    </span>
                                                </div>

                                                {/* Card Status Buttons in Edit Mode */}
                                                {isEditMode && (
                                                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(record.id || record.student_id, 'present')}
                                                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                record.status === 'present'
                                                                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
                                                            }`}
                                                        >
                                                            [P] Present
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(record.id || record.student_id, 'absent')}
                                                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                record.status === 'absent'
                                                                    ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-red-50'
                                                            }`}
                                                        >
                                                            [A] Absent
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(record.id || record.student_id, 'late')}
                                                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                record.status === 'late'
                                                                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-amber-50'
                                                            }`}
                                                        >
                                                            [L] Late
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(record.id || record.student_id, 'excused')}
                                                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                                record.status === 'excused'
                                                                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                                                            }`}
                                                        >
                                                            [E] Excused
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 2. Desktop Table Layout (>= 768px) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 text-left">
                                        <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3.5">S.No</th>
                                                <th className="px-5 py-3.5">Student Details</th>
                                                <th className="px-5 py-3.5">Marked At (IST)</th>
                                                <th className="px-5 py-3.5 text-right">Status / Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {filteredLocalRecords.map((record, index) => (
                                                <tr key={record.id || `${record.student_id}-${index}`} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-5 py-4 font-semibold text-gray-500 text-xs">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                                                                {record.student_name ? record.student_name.charAt(0).toUpperCase() : 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{record.student_name || 'Student'}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {record.student_reg_no ? `Reg: ${record.student_reg_no}` : (record.student_email || '')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-gray-600">
                                                        {record.marked_at ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold">
                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                {formatISTTime(record.marked_at)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Not marked yet</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        {!isEditMode ? (
                                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(record.status)}`}>
                                                                {record.status ? record.status.toUpperCase() : 'UNMARKED'}
                                                            </span>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusChange(record.id || record.student_id, 'present')}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                        record.status === 'present'
                                                                            ? 'bg-emerald-600 text-white shadow-xs'
                                                                            : 'text-gray-600 hover:text-emerald-700'
                                                                    }`}
                                                                >
                                                                    Present
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusChange(record.id || record.student_id, 'absent')}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                        record.status === 'absent'
                                                                            ? 'bg-red-600 text-white shadow-xs'
                                                                            : 'text-gray-600 hover:text-red-700'
                                                                    }`}
                                                                >
                                                                    Absent
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusChange(record.id || record.student_id, 'late')}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                        record.status === 'late'
                                                                            ? 'bg-amber-600 text-white shadow-xs'
                                                                            : 'text-gray-600 hover:text-amber-700'
                                                                    }`}
                                                                >
                                                                    Late
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStatusChange(record.id || record.student_id, 'excused')}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                        record.status === 'excused'
                                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                                            : 'text-gray-600 hover:text-blue-700'
                                                                    }`}
                                                                >
                                                                    Excused
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Sticky Bottom Save Bar on Mobile in Edit Mode */}
                                {isEditMode && (
                                    <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl z-40 flex items-center justify-between gap-3 md:hidden">
                                        <span className="text-xs font-medium text-gray-700">
                                            {unsavedChanges ? '⚠️ Unsaved adjustments' : 'All saved'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditMode(false)}
                                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveAttendance}
                                                disabled={saving}
                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                <span>Save</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* SESSIONS OVERVIEW VIEW */
                            <>
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

                                {/* Today's Attendance Status Banner */}
                                {batch?.status === 'Started' && (
                                    isTodayMarked ? (
                                        <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                            <div className="flex items-center space-x-3.5">
                                                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-600 shrink-0 font-bold">
                                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-emerald-900 text-sm sm:text-base">Today's Attendance is Marked!</h4>
                                                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                                            Completed ✅
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-emerald-700 mt-0.5">
                                                        Attendance recorded for today ({today}). Visible in Student &amp; Academic portals.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {todaySession && (
                                                    <button
                                                        onClick={() => {
                                                            fetchSessionRecords(todaySession.id);
                                                            setIsEditMode(false);
                                                        }}
                                                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View / Edit Today
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Other Date
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                            <div className="flex items-center space-x-3.5">
                                                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-600 shrink-0 font-bold">
                                                    <AlertCircle className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-amber-900 text-sm sm:text-base">Today's Attendance is Pending!</h4>
                                                        <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                                                            Action Required ⚠️
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        No attendance session marked for today ({today}) yet. Click to mark now.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={handleQuickMarkToday}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Mark Today's Attendance Now ⚡
                                                </button>
                                                <button
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    Custom Date
                                                </button>
                                            </div>
                                        </div>
                                    )
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
                                            {/* 1. Mobile Sessions Cards Layout (< 768px) */}
                                            <div className="block md:hidden divide-y divide-gray-100 p-2">
                                                {paginatedSessions.map((session, index) => (
                                                    <div key={session.id} className="p-3.5 space-y-2.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                                    {startIndex + index + 1}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                                                                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                                                                    <span>{new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-500">
                                                            {session.notes ? session.notes : <span className="text-gray-400 italic">No notes recorded</span>}
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                fetchSessionRecords(session.id);
                                                                setIsEditMode(false);
                                                            }}
                                                            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span>Mark Attendance</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 2. Desktop Sessions Table (>= 768px) */}
                                            <div className="hidden md:block overflow-x-auto">
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
                                                                            setIsEditMode(false);
                                                                        }}
                                                                        className="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                                                        style={{ backgroundColor: '#2196f3' }}
                                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                                                                    >
                                                                        <Eye className="w-4 h-4 mr-1.5" />
                                                                        Mark Attendance
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* BERRY Style Pagination */}
                                            {filteredSessions.length > 0 && (
                                                <div className="flex items-center justify-between mt-6 px-6 py-4 border-t border-gray-200">
                                                    <div className="text-sm text-gray-500">
                                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSessions.length)} of {filteredSessions.length} entries
                                                    </div>

                                                    {totalPages > 1 && (
                                                        <div className="flex items-center gap-2">
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
                            </>
                        )}

                        {/* Create Session Modal */}
                        {showCreateModal && (
                            <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
                                    <div className="p-4 sm:p-6 lg:p-8">
                                        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
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
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
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
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
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
                                                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-5 py-2.5 text-white rounded-xl transition-all duration-200 font-bold shadow-sm hover:shadow-md cursor-pointer"
                                                    style={{ backgroundColor: '#2196f3' }}
                                                >
                                                    Create Session
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Responsive Custom Feedback & Confirmation Modal (Replaces browser alerts/confirms) */}
                        {modalFeedback.isOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                                <div className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
                                    <div 
                                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                                        style={{
                                            backgroundColor: modalFeedback.type === 'success' ? '#ecfdf5' :
                                                             modalFeedback.type === 'error' ? '#fef2f2' : '#fffbeb'
                                        }}
                                    >
                                        {modalFeedback.type === 'success' ? (
                                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                                        ) : modalFeedback.type === 'error' ? (
                                            <XCircle className="w-8 h-8 text-red-600" />
                                        ) : (
                                            <AlertCircle className="w-8 h-8 text-amber-600" />
                                        )}
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                                        {modalFeedback.title}
                                    </h3>

                                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                        {modalFeedback.message}
                                    </p>

                                    <div className="flex items-center justify-center gap-3">
                                        {modalFeedback.onConfirm && modalFeedback.type === 'warning' && (
                                            <button
                                                type="button"
                                                onClick={() => setModalFeedback(prev => ({ ...prev, isOpen: false }))}
                                                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                                            >
                                                {modalFeedback.cancelText || 'Cancel'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (modalFeedback.onConfirm) {
                                                    modalFeedback.onConfirm();
                                                } else {
                                                    setModalFeedback(prev => ({ ...prev, isOpen: false }));
                                                }
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                                                modalFeedback.type === 'error'
                                                    ? 'bg-red-600 hover:bg-red-700'
                                                    : modalFeedback.type === 'warning'
                                                    ? 'bg-amber-600 hover:bg-amber-700'
                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                        >
                                            {modalFeedback.confirmText || 'OK'}
                                        </button>
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