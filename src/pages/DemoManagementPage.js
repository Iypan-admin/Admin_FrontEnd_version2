import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import {
    getDemoRequests,
    getDemoBatches,
    createDemoBatch,
    getDemoBatchById,
    getCurrentUserProfile,
} from "../services/Api";
import { getAllTeachers } from "../services/Api";

const DemoManagementPage = () => {
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const tokenFullName = decodedToken?.full_name || null;
    const [activeTab, setActiveTab] = useState("requests"); // "requests" or "batches"
    
    // Demo Requests State
    const [demoRequests, setDemoRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    
    // Demo Batches State
    const [demoBatches, setDemoBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(true);
    
    // Teachers for dropdown
    const [teachers, setTeachers] = useState([]);
    
    // Filter States
    const [batchFilter, setBatchFilter] = useState("all"); // "all", "scheduled", "completed", "cancelled"
    const [courseFilter, setCourseFilter] = useState("all"); // "all", "French", "German", "Japanese"
    
    // Search States
    const [requestSearch, setRequestSearch] = useState("");
    const [batchSearch, setBatchSearch] = useState("");
    
    // Modal States
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
    const [showViewBatchModal, setShowViewBatchModal] = useState(false);
    
    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedBatchName, setSelectedBatchName] = useState("");
    
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [batchFormData, setBatchFormData] = useState({
        demo_name: "",
        course: "",
        demo_date: "",
        start_time: "",
        end_time: "",
        tutor_id: "",
        notes: "",
    });
    const [viewBatch, setViewBatch] = useState(null);
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
    const [requestCurrentPage, setRequestCurrentPage] = useState(1);
    const [batchCurrentPage, setBatchCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [isModalVisible] = useState(false);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);

    // Helper function to check if a name is a full name (has spaces) vs username
    const isFullName = (name) => {
        if (!name || name.trim() === '') return false;
        return name.trim().includes(' ');
    };
    
    // Get display name
    const getDisplayName = () => {
        if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
            return tokenFullName;
        }
        if (tokenFullName && tokenFullName.trim() !== '') {
            return tokenFullName;
        }
        return "Academic Coordinator";
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

    // Body scroll lock when modal is visible
    useEffect(() => {
        if (isModalVisible || isCreateModalVisible || isViewModalVisible || isStudentModalVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalVisible, isCreateModalVisible, isViewModalVisible, isStudentModalVisible]);

    // Fetch demo requests with background polling
    const fetchDemoRequests = useCallback(async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setRequestsLoading(true);
            }
            const data = await getDemoRequests("pending", null, token);
            setDemoRequests(data || []);
        } catch (err) {
            console.error("Error fetching demo requests:", err);
        } finally {
            if (isInitialLoad) {
                setRequestsLoading(false);
            }
        }
    }, [token]);

    // Fetch demo batches with background polling
    const fetchDemoBatches = useCallback(async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setBatchesLoading(true);
            }
            const data = await getDemoBatches(null, null, null, null, token);
            setDemoBatches(data || []);
        } catch (err) {
            console.error("Error fetching demo batches:", err);
        } finally {
            if (isInitialLoad) {
                setBatchesLoading(false);
            }
        }
    }, [token]);

    // Fetch teachers
    const fetchTeachers = useCallback(async () => {
        try {
            const data = await getAllTeachers();
            setTeachers(data || []);
        } catch (err) {
            console.error("Error fetching teachers:", err);
        }
    }, []);

    useEffect(() => {
        if (!token) {
            alert("No token found. Please login.");
            return;
        }
        // Initial load
        fetchDemoRequests(true);
        fetchDemoBatches(true);
        fetchTeachers();
        
        // Set up 5-second background polling
        const interval = setInterval(() => {
            fetchDemoRequests(false);
            fetchDemoBatches(false);
        }, 5000);
        
        return () => clearInterval(interval);
    }, [token, fetchDemoRequests, fetchDemoBatches, fetchTeachers]);

    // Handle request selection
    const toggleRequestSelection = (request_id) => {
        setSelectedRequests(prev =>
            prev.includes(request_id)
                ? prev.filter(id => id !== request_id)
                : [...prev, request_id]
        );
    };

    // Handle create batch modal open
    const handleCreateBatchFromRequests = () => {
        if (selectedRequests.length === 0) {
            alert("Please select at least one demo request to create a batch");
            return;
        }
        
        // Group selected requests by course
        const selectedData = demoRequests.filter(r => selectedRequests.includes(r.demo_request_id));
        const firstRequest = selectedData[0];
        
        setBatchFormData({
            demo_name: `${firstRequest.leads.course} Demo Batch`,
            course: firstRequest.leads.course,
            demo_date: "",
            start_time: "",
            end_time: "",
            tutor_id: "",
            notes: "",
        });
        setShowCreateBatchModal(true);
        setIsCreateModalVisible(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalVisible(false);
        setTimeout(() => {
            setShowCreateBatchModal(false);
            setBatchFormData({
                demo_name: "",
                course: "",
                demo_date: "",
                start_time: "",
                end_time: "",
                tutor_id: "",
                notes: "",
            });
        }, 300);
    };

    const handleCloseViewModal = () => {
        setIsViewModalVisible(false);
        setTimeout(() => {
            setShowViewBatchModal(false);
            setViewBatch(null);
        }, 300);
    };

    const handleCloseStudentModal = () => {
        setIsStudentModalVisible(false);
        setTimeout(() => {
            setShowStudentListModal(false);
            setSelectedStudents([]);
            setSelectedBatchName("");
        }, 300);
    };

    // Handle create batch form submit
    const handleCreateBatch = async (e) => {
        e.preventDefault();
        try {
            const lead_ids = demoRequests
                .filter(r => selectedRequests.includes(r.demo_request_id))
                .map(r => r.lead_id);

            await createDemoBatch(
                {
                    ...batchFormData,
                    lead_ids,
                },
                token
            );
            
            alert("Demo batch created successfully!");
            handleCloseCreateModal();
            setSelectedRequests([]);
            
            // Refresh data
            await fetchDemoRequests(true);
            await fetchDemoBatches(true);
        } catch (err) {
            console.error("Error creating demo batch:", err);
            alert(err.message || "Failed to create demo batch");
        }
    };

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

    // Filter functions
    const filteredBatches = demoBatches.filter(batch => {
        const matchesStatus = batchFilter === "all" || batch.status === batchFilter;
        const matchesCourse = courseFilter === "all" || batch.course === courseFilter;
        return matchesStatus && matchesCourse;
    });

    // Search filtering
    const displayedRequests = demoRequests.filter((request) => {
        const query = requestSearch.trim().toLowerCase();
        if (!query) return true;
        const fields = [
            request.leads?.name,
            request.leads?.email,
            request.leads?.phone,
            request.leads?.course,
            request.centers?.center_name,
            request.notes,
        ].map(v => (v || "").toString().toLowerCase());
        return fields.some(f => f.includes(query));
    });

    const displayedBatches = filteredBatches.filter((batch) => {
        const query = batchSearch.trim().toLowerCase();
        if (!query) return true;
        const tutorName = batch.tutors?.users?.name || batch.tutors?.users?.full_name || "";
        const fields = [
            batch.demo_name,
            batch.course,
            tutorName,
            batch.status,
        ].map(v => (v || "").toString().toLowerCase());
        return fields.some(f => f.includes(query));
    });

    // Get course flag emoji
    const getCourseFlag = (course) => {
        const flags = {
            "French": "🇫🇷",
            "German": "🇩🇪",
            "Japanese": "🇯🇵"
        };
        return flags[course] || "📚";
    };

    // View batch details
    const handleViewBatch = async (batch_id) => {
        try {
            const batch = await getDemoBatchById(batch_id, token);
            setViewBatch(batch);
            setShowViewBatchModal(true);
            setIsViewModalVisible(true);
        } catch (err) {
            console.error("Error fetching batch details:", err);
            alert("Failed to fetch batch details");
        }
    };

    // Pagination for requests
    const requestTotalPages = Math.ceil(displayedRequests.length / itemsPerPage);
    const requestStartIndex = (requestCurrentPage - 1) * itemsPerPage;
    const requestEndIndex = requestStartIndex + itemsPerPage;
    const paginatedRequests = displayedRequests.slice(requestStartIndex, requestEndIndex);

    const goToRequestPage = (page) => {
        if (page >= 1 && page <= requestTotalPages) {
            setRequestCurrentPage(page);
        }
    };

    const getRequestPageNumbers = () => {
        const pages = [];
        if (requestTotalPages <= 7) {
            for (let i = 1; i <= requestTotalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (requestCurrentPage > 3) pages.push('...');
            for (let i = Math.max(2, requestCurrentPage - 1); i <= Math.min(requestTotalPages - 1, requestCurrentPage + 1); i++) {
                pages.push(i);
            }
            if (requestCurrentPage < requestTotalPages - 2) pages.push('...');
            pages.push(requestTotalPages);
        }
        return pages;
    };

    // Pagination for batches
    const batchTotalPages = Math.ceil(displayedBatches.length / itemsPerPage);
    const batchStartIndex = (batchCurrentPage - 1) * itemsPerPage;
    const batchEndIndex = batchStartIndex + itemsPerPage;
    const paginatedBatches = displayedBatches.slice(batchStartIndex, batchEndIndex);

    const goToBatchPage = (page) => {
        if (page >= 1 && page <= batchTotalPages) {
            setBatchCurrentPage(page);
        }
    };

    const getBatchPageNumbers = () => {
        const pages = [];
        if (batchTotalPages <= 7) {
            for (let i = 1; i <= batchTotalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (batchCurrentPage > 3) pages.push('...');
            for (let i = Math.max(2, batchCurrentPage - 1); i <= Math.min(batchTotalPages - 1, batchCurrentPage + 1); i++) {
                pages.push(i);
            }
            if (batchCurrentPage < batchTotalPages - 2) pages.push('...');
            pages.push(batchTotalPages);
        }
        return pages;
    };

    // Modal visibility animations
    useEffect(() => {
        if (showCreateBatchModal) {
            setTimeout(() => setIsCreateModalVisible(true), 10);
        }
    }, [showCreateBatchModal]);

    useEffect(() => {
        if (showViewBatchModal) {
            setTimeout(() => setIsViewModalVisible(true), 10);
        }
    }, [showViewBatchModal]);

    useEffect(() => {
        if (showStudentListModal) {
            setTimeout(() => setIsStudentModalVisible(true), 10);
        }
    }, [showStudentListModal]);

    return (
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
                                        Demo Schedule
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage requests from centers and organize demo batches
                                    </p>
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
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsProfileDropdownOpen(false)}
                                            ></div>
                                            
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                                                    <h3 className="font-bold text-gray-800 text-base">
                                                        Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}
                                                    </h3>
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
                                                            setIsProfileDropdownOpen(false);
                                                            window.location.href = "/login";
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

                        {/* Tabs */}
                        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => {
                                        setActiveTab("requests");
                                        setRequestCurrentPage(1);
                                    }}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                                        activeTab === "requests"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2 justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Demo Requests
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            activeTab === "requests" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                                        }`}>
                                            {demoRequests.length}
                                        </span>
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab("batches");
                                        setBatchCurrentPage(1);
                                    }}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                                        activeTab === "batches"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2 justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Demo Batches
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            activeTab === "batches" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                                        }`}>
                                            {demoBatches.length}
                                        </span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Demo Requests Tab */}
                        {activeTab === "requests" && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center">
                                    <h2 className="text-lg font-semibold text-gray-800 flex-1">Demo Requests</h2>
                                    <div className="relative flex-1 max-w-md">
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={requestSearch}
                                            onChange={(e) => {
                                                setRequestSearch(e.target.value);
                                                setRequestCurrentPage(1);
                                            }}
                                            placeholder="Search requests..."
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        />
                                    </div>
                                    {selectedRequests.length > 0 && (
                                        <button
                                            onClick={handleCreateBatchFromRequests}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-sm whitespace-nowrap"
                                        >
                                            Create Batch ({selectedRequests.length})
                                        </button>
                                    )}
                                </div>

                                {requestsLoading ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                        <p className="mt-4 text-sm text-gray-500">Loading demo requests...</p>
                                    </div>
                                ) : displayedRequests.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No demo requests found</h3>
                                        <p className="text-sm text-gray-500">
                                            {requestSearch ? `No requests found matching "${requestSearch}"` : "No demo requests available"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRequests.length === paginatedRequests.length && paginatedRequests.length > 0 && paginatedRequests.every(r => selectedRequests.includes(r.demo_request_id))}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        const newSelected = [...new Set([...selectedRequests, ...paginatedRequests.map(r => r.demo_request_id)])];
                                                                        setSelectedRequests(newSelected);
                                                                    } else {
                                                                        const paginatedIds = paginatedRequests.map(r => r.demo_request_id);
                                                                        setSelectedRequests(selectedRequests.filter(id => !paginatedIds.includes(id)));
                                                                    }
                                                                }}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Requested</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {paginatedRequests.map((request, index) => (
                                                        <tr key={request.demo_request_id} className="hover:bg-gray-50 transition-colors duration-200">
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRequests.includes(request.demo_request_id)}
                                                                    onChange={() => toggleRequestSelection(request.demo_request_id)}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {requestStartIndex + index + 1}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                        {(request.leads?.name || "-").charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900 text-sm">{request.leads?.name || "-"}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {request.leads?.email || "-"}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {request.leads?.phone || "-"}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    <span className="text-base">{getCourseFlag(request.leads?.course)}</span>
                                                                    {request.leads?.course || "-"}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {request.centers?.center_name || "-"}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(request.requested_at)}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                {request.notes ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                        {request.notes}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination for Requests */}
                                        {requestTotalPages > 1 && (
                                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{requestStartIndex + 1}</span> to{' '}
                                                        <span className="font-medium">{Math.min(requestEndIndex, displayedRequests.length)}</span> of{' '}
                                                        <span className="font-medium">{displayedRequests.length}</span> entries
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => goToRequestPage(requestCurrentPage - 1)}
                                                            disabled={requestCurrentPage === 1}
                                                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Previous
                                                        </button>
                                                        <div className="flex items-center space-x-1">
                                                            {getRequestPageNumbers().map((page, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => typeof page === 'number' && goToRequestPage(page)}
                                                                    disabled={page === '...'}
                                                                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                                                                        page === requestCurrentPage
                                                                            ? 'bg-blue-600 text-white'
                                                                            : page === '...'
                                                                            ? 'text-gray-500 cursor-default'
                                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={() => goToRequestPage(requestCurrentPage + 1)}
                                                            disabled={requestCurrentPage === requestTotalPages}
                                                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        )}

                        {/* Demo Batches Tab */}
                        {activeTab === "batches" && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h2 className="text-lg font-semibold text-gray-800 flex-1">Demo Batches</h2>
                                        <div className="relative flex-1 max-w-md">
                                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={batchSearch}
                                                onChange={(e) => {
                                                    setBatchSearch(e.target.value);
                                                    setBatchCurrentPage(1);
                                                }}
                                                placeholder="Search batches..."
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Filter Options */}
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                Status
                                            </span>
                                            <select
                                                value={batchFilter}
                                                onChange={(e) => {
                                                    setBatchFilter(e.target.value);
                                                    setBatchCurrentPage(1);
                                                }}
                                                className="bg-white border border-blue-200 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ml-2"
                                            >
                                                <option value="all">All</option>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6l-2 4H6l3.5 2.5L8 17l4-2.5L16 17l-1.5-4.5L18 10h-4l-2-4z"/></svg>
                                                Course
                                            </span>
                                            <select
                                                value={courseFilter}
                                                onChange={(e) => {
                                                    setCourseFilter(e.target.value);
                                                    setBatchCurrentPage(1);
                                                }}
                                                className="bg-white border border-purple-200 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 ml-2"
                                            >
                                                <option value="all">All</option>
                                                <option value="French">🇫🇷 French</option>
                                                <option value="German">🇩🇪 German</option>
                                                <option value="Japanese">🇯🇵 Japanese</option>
                                            </select>
                                        </div>
                                        <div className="text-sm text-gray-600 ml-auto">
                                            Showing {displayedBatches.length} of {filteredBatches.length} filtered ({demoBatches.length} total)
                                        </div>
                                    </div>
                                </div>

                                {batchesLoading ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                        <p className="mt-4 text-sm text-gray-500">Loading demo batches...</p>
                                    </div>
                                ) : displayedBatches.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No demo batches found</h3>
                                        <p className="text-sm text-gray-500">
                                            {batchSearch || batchFilter !== 'all' || courseFilter !== 'all' ? "No batches found matching filters" : "No demo batches available"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Demo Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tutor</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Students</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {paginatedBatches.map((batch, index) => (
                                                        <tr key={batch.demo_batch_id} className="hover:bg-gray-50 transition-colors duration-200">
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {batchStartIndex + index + 1}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-1.5 rounded-lg bg-blue-100">
                                                                        <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900 text-sm">{batch.demo_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    <span className="text-base">{getCourseFlag(batch.course)}</span>
                                                                    {batch.course}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(batch.demo_date)}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {formatTime(batch.start_time)}
                                                                {batch.end_time && ` - ${formatTime(batch.end_time)}`}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {batch.tutors?.users?.name || batch.tutors?.users?.full_name || "Not assigned"}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedStudents(batch.demo_batch_students || []);
                                                                        setSelectedBatchName(batch.demo_name);
                                                                        setShowStudentListModal(true);
                                                                        setIsStudentModalVisible(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors text-xs"
                                                                    title="Click to view students"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                                    {batch.demo_batch_students?.length || 0}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    batch.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                                                                    batch.status === "completed" ? "bg-green-100 text-green-800" :
                                                                    "bg-gray-100 text-gray-800"
                                                                }`}>
                                                                    {batch.status?.charAt(0).toUpperCase() + batch.status?.slice(1) || "N/A"}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                <button
                                                                    onClick={() => handleViewBatch(batch.demo_batch_id)}
                                                                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                                                >
                                                                    View Details
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination for Batches */}
                                        {batchTotalPages > 1 && (
                                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{batchStartIndex + 1}</span> to{' '}
                                                        <span className="font-medium">{Math.min(batchEndIndex, displayedBatches.length)}</span> of{' '}
                                                        <span className="font-medium">{displayedBatches.length}</span> entries
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => goToBatchPage(batchCurrentPage - 1)}
                                                            disabled={batchCurrentPage === 1}
                                                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Previous
                                                        </button>
                                                        <div className="flex items-center space-x-1">
                                                            {getBatchPageNumbers().map((page, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => typeof page === 'number' && goToBatchPage(page)}
                                                                    disabled={page === '...'}
                                                                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                                                                        page === batchCurrentPage
                                                                            ? 'bg-blue-600 text-white'
                                                                            : page === '...'
                                                                            ? 'text-gray-500 cursor-default'
                                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={() => goToBatchPage(batchCurrentPage + 1)}
                                                            disabled={batchCurrentPage === batchTotalPages}
                                                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        )}
                    </div>
                </div>
            </div>

            {/* Create Batch Modal - BERRY Style Right-Side Slide-In */}
            {showCreateBatchModal && (
                <div 
                    className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isCreateModalVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleCloseCreateModal}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div 
                        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isCreateModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #10b981, #059669)' }}>
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Create Demo Batch</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Create a new demo batch from selected requests</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseCreateModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleCreateBatch} className="px-6 py-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Demo Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., French Demo Batch"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    value={batchFormData.demo_name}
                                    onChange={(e) => setBatchFormData({ ...batchFormData, demo_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Course <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., French, German, Japanese"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    value={batchFormData.course}
                                    onChange={(e) => setBatchFormData({ ...batchFormData, course: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Demo Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    value={batchFormData.demo_date}
                                    onChange={(e) => setBatchFormData({ ...batchFormData, demo_date: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        value={batchFormData.start_time}
                                        onChange={(e) => setBatchFormData({ ...batchFormData, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        End Time <span className="text-gray-400 text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        value={batchFormData.end_time}
                                        onChange={(e) => setBatchFormData({ ...batchFormData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Tutor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    value={batchFormData.tutor_id}
                                    onChange={(e) => setBatchFormData({ ...batchFormData, tutor_id: e.target.value })}
                                >
                                    <option value="">Select Tutor</option>
                                    {teachers.map((teacher) => (
                                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                                            {teacher.teacher_name || teacher.name || "Unknown"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Notes <span className="text-gray-400 text-xs">(Optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Add any additional notes..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm resize-none"
                                    value={batchFormData.notes}
                                    onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                                />
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 mt-6">
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseCreateModal}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                    >
                                        Create Batch
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Batch Modal - BERRY Style Right-Side Slide-In */}
            {showViewBatchModal && viewBatch && (
                <div 
                    className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isViewModalVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleCloseViewModal}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div 
                        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isViewModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
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
                                        <p className="text-xs text-gray-500 mt-0.5">View batch details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseViewModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Course
                                </label>
                                <p className="text-sm font-medium text-gray-900">{viewBatch.course}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Date
                                </label>
                                <p className="text-sm font-medium text-gray-900">{formatDate(viewBatch.demo_date)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Time
                                </label>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatTime(viewBatch.start_time)}
                                    {viewBatch.end_time && ` - ${formatTime(viewBatch.end_time)}`}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Tutor
                                </label>
                                <p className="text-sm font-medium text-gray-900">{viewBatch.tutors?.users?.name || viewBatch.tutors?.users?.full_name || "Not assigned"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Status
                                </label>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    viewBatch.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                                    viewBatch.status === "completed" ? "bg-green-100 text-green-800" :
                                    "bg-gray-100 text-gray-800"
                                }`}>
                                    {viewBatch.status?.charAt(0).toUpperCase() + viewBatch.status?.slice(1) || "N/A"}
                                </span>
                            </div>

                            {viewBatch.class_link && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Class Link
                                    </label>
                                    <a
                                        href={viewBatch.class_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                                    >
                                        {viewBatch.class_link}
                                    </a>
                                </div>
                            )}

                            {viewBatch.notes && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Notes
                                    </label>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{viewBatch.notes}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Students ({viewBatch.demo_batch_students?.length || 0})
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {viewBatch.demo_batch_students && viewBatch.demo_batch_students.length > 0 ? (
                                        viewBatch.demo_batch_students.map((student, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="font-semibold text-sm text-gray-900 mb-1">{student.leads?.name || "N/A"}</div>
                                                <div className="text-xs text-gray-600 mb-1">
                                                    {student.leads?.email || "N/A"} | {student.leads?.phone || "N/A"}
                                                </div>
                                                <div className="text-xs mt-2">
                                                    <span className="font-medium text-gray-700">Attendance: </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        student.attendance_status === "present" ? "bg-green-100 text-green-700" :
                                                        student.attendance_status === "absent" ? "bg-red-100 text-red-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                        {student.attendance_status?.toUpperCase() || "PENDING"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No students in this batch</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 mt-6">
                            <button
                                onClick={handleCloseViewModal}
                                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student List Modal - BERRY Style Right-Side Slide-In */}
            {showStudentListModal && (
                <div 
                    className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${isStudentModalVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleCloseStudentModal}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div 
                        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${isStudentModalVisible ? 'translate-x-0' : 'translate-x-full'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)' }}>
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedBatchName}</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Students ({selectedStudents.length})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseStudentModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 space-y-4">
                            {selectedStudents.length > 0 ? (
                                selectedStudents.map((student, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                                        <div className="space-y-2">
                                            <div className="font-semibold text-sm text-gray-900">
                                                {student.leads?.name || "N/A"}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                <span className="mr-4">📧 {student.leads?.email || "N/A"}</span>
                                                <span>📱 {student.leads?.phone || "N/A"}</span>
                                            </div>
                                            {student.leads?.course && (
                                                <div className="text-xs text-gray-600">
                                                    📚 Course: {student.leads.course}
                                                </div>
                                            )}
                                            {student.leads?.centers?.center_name && (
                                                <div className="text-xs text-gray-600">
                                                    📍 Center: {student.leads.centers.center_name}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div>
                                                    <span className="text-xs font-medium text-gray-700">Attendance: </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        student.attendance_status === "present"
                                                            ? "bg-green-100 text-green-700"
                                                            : student.attendance_status === "absent"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                        {student.attendance_status?.toUpperCase() || "PENDING"}
                                                    </span>
                                                </div>
                                            </div>
                                            {student.note && (
                                                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                                                    <span className="font-medium">Note:</span> {student.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">No students found</h3>
                                    <p className="text-xs text-gray-500">No students found in this batch.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 mt-6">
                            <button
                                onClick={handleCloseStudentModal}
                                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemoManagementPage;
