import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TeacherNotificationBell from "../components/TeacherNotificationBell";
import {
    getDemoBatches,
    getDemoBatchById,
    updateDemoBatchClassLink,
    updateDemoBatch,
    updateDemoAttendance,
} from "../services/Api";
import { getMyTeacherId, getMyTutorInfo } from "../services/Api";

const TeacherDemoClassesPage = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [demoBatches, setDemoBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teacherId, setTeacherId] = useState(null);
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
    
    const [showClassLinkModal, setShowClassLinkModal] = useState(false);
    const [isClassLinkModalVisible, setIsClassLinkModalVisible] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [classLink, setClassLink] = useState("");
    
    const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
    const [isBatchDetailsModalVisible, setIsBatchDetailsModalVisible] = useState(false);
    const [viewBatch, setViewBatch] = useState(null);

    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [isStudentListModalVisible, setIsStudentListModalVisible] = useState(false);
    const [selectedStudents] = useState([]);
    const [selectedBatchName] = useState("");

    // Get full name from token
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

    // Fetch tutor info
    const fetchTutorInfo = async () => {
        try {
            const data = await getMyTutorInfo();
            setTutorInfo(data);
        } catch (error) {
            console.error("Failed to fetch tutor info:", error);
        }
    };

    // Fetch teacher_id
    const fetchTeacherId = useCallback(async () => {
        try {
            const id = await getMyTeacherId(token);
            setTeacherId(id);
        } catch (err) {
            console.error("Error fetching teacher ID:", err);
            setError("Failed to fetch teacher information");
        }
    }, [token]);

    // Fetch demo batches for current teacher
    const fetchDemoBatches = useCallback(async () => {
        try {
            setLoading(true);
            if (teacherId) {
                const data = await getDemoBatches(
                    null, // status
                    teacherId, // tutor_id
                    null, // date_from
                    null, // date_to
                    token
                );
                setDemoBatches(data || []);
            }
        } catch (err) {
            console.error("Error fetching demo batches:", err);
            setError(err.message || "Failed to load demo classes");
        } finally {
            setLoading(false);
        }
    }, [teacherId, token]);

    useEffect(() => {
        if (!token) {
            alert("No token found. Please login.");
            return;
        }
        fetchTutorInfo();
        fetchTeacherId();
        
        // Listen for sidebar toggle
        const handleSidebarToggle = () => {
            const saved = localStorage.getItem('sidebarCollapsed');
            setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
        };
        
        window.addEventListener('sidebarToggle', handleSidebarToggle);
        handleSidebarToggle(); // Initial check
        
        return () => {
            window.removeEventListener('sidebarToggle', handleSidebarToggle);
        };
    }, [token, fetchTeacherId]);

    useEffect(() => {
        if (teacherId) {
            fetchDemoBatches();
        }
    }, [teacherId, fetchDemoBatches]);

    // Format date
    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    // Format time
    const formatTime = (timeString) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Get course flag emoji
    const getCourseFlag = (course) => {
        const flags = {
            "French": "🇫🇷",
            "German": "🇩🇪",
            "Japanese": "🇯🇵"
        };
        return flags[course] || "📚";
    };

    // Modal visibility animations
    useEffect(() => {
        if (showClassLinkModal) {
            setTimeout(() => setIsClassLinkModalVisible(true), 10);
        }
    }, [showClassLinkModal]);

    useEffect(() => {
        if (showBatchDetailsModal) {
            setTimeout(() => setIsBatchDetailsModalVisible(true), 10);
        }
    }, [showBatchDetailsModal]);

    useEffect(() => {
        if (showStudentListModal) {
            setTimeout(() => setIsStudentListModalVisible(true), 10);
        }
    }, [showStudentListModal]);

    // Body scroll lock when modal is visible
    useEffect(() => {
        if (isClassLinkModalVisible || isBatchDetailsModalVisible || isStudentListModalVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isClassLinkModalVisible, isBatchDetailsModalVisible, isStudentListModalVisible]);

    // Handle class link modal open
    const handleOpenClassLinkModal = (batch) => {
        setSelectedBatch(batch);
        setClassLink(batch.class_link || "");
        setShowClassLinkModal(true);
        setIsClassLinkModalVisible(true);
    };

    const handleCloseClassLinkModal = () => {
        setIsClassLinkModalVisible(false);
        setTimeout(() => {
            setShowClassLinkModal(false);
            setSelectedBatch(null);
            setClassLink("");
        }, 300);
    };

    // Handle class link update
    const handleUpdateClassLink = async () => {
        try {
            await updateDemoBatchClassLink(selectedBatch.demo_batch_id, classLink, token);
            alert("Class link updated successfully!");
            handleCloseClassLinkModal();
            await fetchDemoBatches();
        } catch (err) {
            console.error("Error updating class link:", err);
            alert(err.message || "Failed to update class link");
        }
    };

    // Handle view batch details
    const handleViewBatchDetails = async (batch_id) => {
        try {
            const batch = await getDemoBatchById(batch_id, token);
            setViewBatch(batch);
            setShowBatchDetailsModal(true);
            setIsBatchDetailsModalVisible(true);
        } catch (err) {
            console.error("Error fetching batch details:", err);
            alert("Failed to fetch batch details");
        }
    };

    const handleCloseBatchDetailsModal = () => {
        setIsBatchDetailsModalVisible(false);
        setTimeout(() => {
            setShowBatchDetailsModal(false);
            setViewBatch(null);
        }, 300);
    };


    // Handle attendance update
    const handleUpdateAttendance = async (batch_id, lead_id, attendance_status) => {
        try {
            await updateDemoAttendance(
                {
                    demo_batch_id: batch_id,
                    lead_id: lead_id,
                    attendance_status: attendance_status,
                },
                token
            );
            alert("Attendance updated successfully!");
            await fetchDemoBatches();
        } catch (err) {
            console.error("Error updating attendance:", err);
            alert("Failed to update attendance");
        }
    };

    // Handle status update
    const handleUpdateStatus = async (batch_id, new_status) => {
        try {
            await updateDemoBatch(batch_id, { status: new_status }, token);
            alert(`Demo batch status updated to ${new_status}!`);
            await fetchDemoBatches();
            // Close modal if open
            if (showBatchDetailsModal) {
                handleCloseBatchDetailsModal();
            }
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update demo batch status");
        }
    };

    // Filter state
    const [selectedFilter, setSelectedFilter] = useState("all");

    // Filter batches by status
    const scheduledBatches = demoBatches.filter(b => b.status === "scheduled");
    const completedBatches = demoBatches.filter(b => b.status === "completed");
    const cancelledBatches = demoBatches.filter(b => b.status === "cancelled");

    // Get filtered batches based on selected filter
    const getFilteredBatches = () => {
        switch (selectedFilter) {
            case "scheduled":
                return scheduledBatches;
            case "completed":
                return completedBatches;
            case "cancelled":
                return cancelledBatches;
            default:
                return demoBatches;
        }
    };

    const filteredBatches = getFilteredBatches();

    // Filter by search query
    const searchFilteredBatches = filteredBatches.filter((batch) => {
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase().trim();
        const demoName = (batch.demo_name || '').toLowerCase();
        const course = (batch.course || '').toLowerCase();
        const date = formatDate(batch.demo_date || '').toLowerCase();
        
        return demoName.includes(query) || course.includes(query) || date.includes(query);
    });

    // Sort batches by date (newest first)
    const sortedBatches = [...searchFilteredBatches].sort((a, b) => {
        const dateA = new Date(a.demo_date || 0);
        const dateB = new Date(b.demo_date || 0);
        return dateB - dateA; // Newest first
    });

    // Pagination calculations
    const totalPages = Math.ceil(sortedBatches.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBatches = sortedBatches.slice(startIndex, endIndex);

    // Reset to page 1 if current page is beyond total pages after filtering
    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0 && currentPage > 1) {
            setCurrentPage(1);
        }
    }, [sortedBatches.length, currentPage, totalPages]);

    // Reset to page 1 when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedFilter, searchQuery]);

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
                                <div className="flex items-center gap-3">
                                    {/* <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e3f2fd' }}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div> */}
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                            Demo Classes
                                        </h1>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                            Manage your scheduled demo sessions and track student attendance
                                        </p>
                                    </div>
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

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center shadow-sm">
                                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        {/* Stats Cards - BERRY Style */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {/* Total Demos Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Total Demos</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{demoBatches.length}</p>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#e3f2fd' }}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Scheduled</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{scheduledBatches.length}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-cyan-50">
                                        <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Completed Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Completed</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{completedBatches.length}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-green-50">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Cancelled Card */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Cancelled</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{cancelledBatches.length}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-100">
                                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Loading */}
                        {loading ? (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                <div className="inline-block">
                                    <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mt-6">Loading demo classes...</h3>
                                <p className="text-gray-600 text-sm mt-2">Please wait while we fetch your information</p>
                            </div>
                        ) : demoBatches.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-6 bg-gray-100 rounded-xl">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">No Demo Classes Found</h3>
                                    <p className="text-gray-600 text-sm">Demo classes will appear here once scheduled by Academic Admin</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {/* Title Section with Filters and Search - Matching Leave Request Page */}
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        {/* Left: Title */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e3f2fd' }}>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800">Demo Classes</h3>
                                                <p className="text-sm text-gray-500 mt-1">Manage your scheduled demo sessions</p>
                                            </div>
                                        </div>
                                        
                                        {/* Right: Search Bar and Filter Buttons */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            {/* Search Bar */}
                                            <div className="relative w-full sm:w-64">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, course, date..."
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
                                            
                                            {/* Filter Dropdown */}
                                            <div className="relative">
                                                <select
                                                    value={selectedFilter}
                                                    onChange={(e) => setSelectedFilter(e.target.value)}
                                                    className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 text-sm appearance-none cursor-pointer bg-white font-medium" 
                                                    style={{ 
                                                        borderColor: selectedFilter !== 'all' ? '#2196f3' : '#d1d5db',
                                                        color: selectedFilter !== 'all' ? '#2196f3' : '#374151'
                                                    }}
                                                    onFocus={(e) => { 
                                                        e.target.style.borderColor = '#2196f3'; 
                                                        e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)'; 
                                                    }} 
                                                    onBlur={(e) => { 
                                                        e.target.style.borderColor = selectedFilter !== 'all' ? '#2196f3' : '#d1d5db'; 
                                                        e.target.style.boxShadow = 'none'; 
                                                    }}
                                                >
                                                    <option value="all">All ({demoBatches.length})</option>
                                                    <option value="scheduled">Scheduled ({scheduledBatches.length})</option>
                                                    <option value="completed">Completed ({completedBatches.length})</option>
                                                    <option value="cancelled">Cancelled ({cancelledBatches.length})</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto overflow-y-visible">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Demo Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Course</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Time</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Students</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Class Link</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedBatches.map((batch) => (
                                                <tr
                                                    key={batch.demo_batch_id}
                                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                                >
                                                    {/* Demo Name with Icon */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2196f3' }}>
                                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {batch.demo_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* Course */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-gray-900">
                                                            {getCourseFlag(batch.course)} {batch.course}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Date */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-gray-900">
                                                            {formatDate(batch.demo_date)}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Time */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-gray-900">
                                                            {formatTime(batch.start_time)}
                                                            {batch.end_time && ` - ${formatTime(batch.end_time)}`}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Students */}
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-gray-900">
                                                            {batch.demo_batch_students?.length || 0}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Class Link */}
                                                    <td className="px-6 py-4">
                                                        {batch.class_link ? (
                                                            <a
                                                                href={batch.class_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                Join Class
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    
                                                    {/* Status Badge */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white`} style={
                                                            batch.status === "scheduled" ? { backgroundColor: '#2196f3' } :
                                                            batch.status === "completed" ? { backgroundColor: '#4caf50' } :
                                                            { backgroundColor: '#757575' }
                                                        }>
                                                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* Actions */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleViewBatchDetails(batch.demo_batch_id)}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                                title="View Details"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenClassLinkModal(batch)}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                                title={batch.class_link ? "Edit Link" : "Add Link"}
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {paginatedBatches.length === 0 && (
                                                <tr>
                                                    <td className="px-6 py-12 text-center" colSpan="8">
                                                        <div className="flex flex-col items-center justify-center gap-3">
                                                            <div className="p-6 bg-gray-100 rounded-xl">
                                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-xl font-bold text-gray-800">No Demo Classes Found</h3>
                                                            <p className="text-gray-600 text-sm">Demo classes will appear here once scheduled</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {sortedBatches.length > 0 && (
                                    <div className="flex items-center justify-between mt-6 px-6 py-4 border-t border-gray-200">
                                        {/* Left: Showing entries info */}
                                        <div className="text-sm text-gray-500">
                                            Showing {startIndex + 1} to {Math.min(endIndex, sortedBatches.length)} of {sortedBatches.length} entries
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

                {/* Class Link Modal - BERRY Style Right-Side Slide-In */}
                        {showClassLinkModal && selectedBatch && (
                <div 
                    className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isClassLinkModalVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleCloseClassLinkModal}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div 
                        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isClassLinkModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {selectedBatch.class_link ? "Update Class Link" : "Add Class Link"}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Enter your class meeting link</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseClassLinkModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateClassLink(); }} className="px-6 py-6 space-y-5">
                                        <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Class Link <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="url"
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                placeholder="https://meet.google.com/..."
                                                value={classLink}
                                                onChange={(e) => setClassLink(e.target.value)}
                                            />
                                <p className="text-xs text-gray-500 mt-1.5">Google Meet, Zoom, or any other meeting platform link</p>
                                        </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 mt-6">
                                <div className="flex justify-end gap-3">
                                            <button
                                        type="button"
                                        onClick={handleCloseClassLinkModal}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                        type="submit"
                                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                            >
                                        {selectedBatch.class_link ? "Update Link" : "Add Link"}
                                            </button>
                                        </div>
                                    </div>
                        </form>
                                </div>
                            </div>
                        )}

                {/* Batch Details Modal - BERRY Style Right-Side Slide-In */}
                {showBatchDetailsModal && viewBatch && (
                    <div 
                        className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isBatchDetailsModalVisible ? 'opacity-100' : 'opacity-0'}`}
                        onClick={handleCloseBatchDetailsModal}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    >
                        <div 
                            className={`fixed right-0 top-0 h-full w-full sm:w-[32rem] md:w-[36rem] lg:w-[42rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isBatchDetailsModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">{viewBatch.demo_name}</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Demo Batch Details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCloseBatchDetailsModal}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="px-6 py-6 overflow-y-auto">
                                {/* Batch Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                    <div className="rounded-xl p-4 border" style={{ background: 'linear-gradient(to bottom right, #e3f2fd, #bbdefb)', borderColor: '#90caf9' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">{getCourseFlag(viewBatch.course)}</span>
                                            <span className="text-xs font-semibold uppercase" style={{ color: '#2196f3' }}>Course</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{viewBatch.course}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-blue-600 uppercase">Date</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{formatDate(viewBatch.demo_date)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-green-600 uppercase">Time</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatTime(viewBatch.start_time)}
                                            {viewBatch.end_time && ` - ${formatTime(viewBatch.end_time)}`}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-cyan-600 uppercase">Status</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 capitalize">{viewBatch.status}</p>
                                    </div>
                                </div>

                                {/* Status Update Buttons - Only show for scheduled batches */}
                                {viewBatch.status === "scheduled" && (
                                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                        <button
                                            onClick={() => handleUpdateStatus(viewBatch.demo_batch_id, "completed")}
                                            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Mark as Completed
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(viewBatch.demo_batch_id, "cancelled")}
                                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Mark as Cancelled
                                        </button>
                                    </div>
                                )}

                                {/* Class Link */}
                                {viewBatch.class_link && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Class Link</p>
                                                <a
                                                    href={viewBatch.class_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-700 font-semibold hover:text-green-800 hover:underline block truncate"
                                                >
                                                    {viewBatch.class_link}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {viewBatch.notes && (
                                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200 mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-yellow-100 rounded-lg">
                                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">Notes</p>
                                                <p className="text-gray-800">{viewBatch.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Students List */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900">
                                            Students ({viewBatch.demo_batch_students?.length || 0})
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {viewBatch.demo_batch_students?.map((student, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                                                                {student.leads?.name?.charAt(0).toUpperCase() || '?'}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-semibold text-gray-900 truncate">{student.leads?.name || 'N/A'}</div>
                                                                <div className="text-xs text-gray-600 space-y-1 mt-1">
                                                                    <div className="flex items-center gap-1 truncate">
                                                                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <span className="truncate">{student.leads?.email || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 truncate">
                                                                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                        <span className="truncate">{student.leads?.phone || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {student.note && (
                                                            <div className="text-xs text-gray-600 mt-2 pl-2 border-l-2 border-yellow-300">
                                                                {student.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-full sm:w-auto flex-shrink-0">
                                                        <select
                                                            value={student.attendance_status}
                                                            onChange={(e) =>
                                                                handleUpdateAttendance(
                                                                    viewBatch.demo_batch_id,
                                                                    student.lead_id,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className={`w-full sm:w-auto text-xs px-3 py-2 rounded-lg border-2 font-medium transition-colors ${
                                                                student.attendance_status === "present" ? "bg-green-50 border-green-300 text-green-700" :
                                                                student.attendance_status === "absent" ? "bg-red-50 border-red-300 text-red-700" :
                                                                "bg-yellow-50 border-yellow-300 text-yellow-700"
                                                            }`}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="present">Present</option>
                                                            <option value="absent">Absent</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 mt-6">
                                <div className="flex justify-end">
                                <button
                                        onClick={handleCloseBatchDetailsModal}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Close
                                </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student List Modal */}
                {showStudentListModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">{selectedBatchName}</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Students ({selectedStudents.length})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowStudentListModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {selectedStudents.length > 0 ? (
                                    selectedStudents.map((student, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border hover:bg-gray-100 transition">
                                            <div className="font-medium text-base">
                                                {student.leads?.name || "N/A"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No students found in this batch.
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowStudentListModal(false)}
                                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDemoClassesPage;
