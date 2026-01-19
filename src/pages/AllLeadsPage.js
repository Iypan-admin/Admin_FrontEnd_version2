import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import { getOfflineCenters, getLeadsByCenter, getCurrentUserProfile } from "../services/Api";

const AllLeadsPage = () => {
    const [centers, setCenters] = useState([]);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [centerLeads, setCenterLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [showLeadDetails, setShowLeadDetails] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
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

    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const tokenFullName = decodedToken?.full_name || null;
    
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

    // Modal visibility animation
    useEffect(() => {
        if (showLeadDetails) {
            setTimeout(() => setIsModalVisible(true), 10);
        }
    }, [showLeadDetails]);

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

    const formatDate = (dateString) =>
        dateString
            ? new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
            : "N/A";

    // Fetch offline centers with background polling
    const fetchOfflineCenters = useCallback(async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setLoading(true);
            }
            setError(null);
            const data = await getOfflineCenters(token);
            setCenters(data || []);
        } catch (err) {
            setError(err.message || "Failed to fetch offline centers");
            console.error("Error fetching offline centers:", err);
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    }, [token]);

    // Fetch leads for a center with background polling
    const fetchCenterLeads = useCallback(async (centerId, isInitialLoad = false) => {
        if (!centerId || centerId === "null" || centerId === "undefined") {
            setError("Invalid center ID. Please select a valid center.");
            setCenterLeads([]);
            return;
        }
        try {
            if (isInitialLoad) {
                setLeadsLoading(true);
            }
            setError(null);
            const leads = await getLeadsByCenter(centerId, token);
            setCenterLeads(leads || []);
        } catch (err) {
            setError(err.message || "Failed to fetch leads");
            console.error("Error fetching center leads:", err);
            setCenterLeads([]);
        } finally {
            if (isInitialLoad) {
                setLeadsLoading(false);
            }
        }
    }, [token]);

    // Initial load and polling for centers
    useEffect(() => {
        if (!token) {
            setError("No token found. Please login.");
            return;
        }
        if (!selectedCenter) {
            fetchOfflineCenters(true);
            const interval = setInterval(() => {
                fetchOfflineCenters(false);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [token, fetchOfflineCenters, selectedCenter]);

    // Polling for selected center's leads
    useEffect(() => {
        if (selectedCenter && selectedCenter.center_id) {
            fetchCenterLeads(selectedCenter.center_id, true);
            const interval = setInterval(() => {
                fetchCenterLeads(selectedCenter.center_id, false);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedCenter, fetchCenterLeads]);

    const handleCenterClick = (center) => {
        if (!center || !center.center_id) {
            setError("Invalid center data. Please try again.");
            return;
        }
        setSelectedCenter(center);
        setSearchQuery("");
        setCurrentPage(1);
        fetchCenterLeads(center.center_id, true);
    };

    const handleBackToCenters = () => {
        setSelectedCenter(null);
        setCenterLeads([]);
        setSearchQuery("");
        setSelectedLead(null);
        setShowLeadDetails(false);
        setIsModalVisible(false);
        setCurrentPage(1);
    };

    const handleLeadClick = (lead) => {
        setSelectedLead(lead);
        setShowLeadDetails(true);
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setTimeout(() => {
            setShowLeadDetails(false);
            setSelectedLead(null);
        }, 300);
    };

    const filteredCenters = centers.filter((center) =>
        center.center_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLeads = centerLeads.filter((lead) => {
        const query = searchQuery.toLowerCase();
        return (
            lead.name?.toLowerCase().includes(query) ||
            lead.phone?.toString().includes(query) ||
            lead.email?.toLowerCase().includes(query) ||
            lead.course?.toLowerCase().includes(query) ||
            lead.status?.toLowerCase().includes(query)
        );
    });

    // Pagination for leads
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const getStatusBadgeColor = (status) => {
        const statusColors = {
            data_entry: "bg-gray-100 text-gray-800",
            not_connected_1: "bg-yellow-100 text-yellow-800",
            not_connected_2: "bg-yellow-100 text-yellow-800",
            not_connected_3: "bg-yellow-100 text-yellow-800",
            interested: "bg-blue-100 text-blue-800",
            need_follow: "bg-purple-100 text-purple-800",
            junk_lead: "bg-red-100 text-red-800",
            demo_schedule: "bg-indigo-100 text-indigo-800",
            lost_lead: "bg-orange-100 text-orange-800",
            enrolled: "bg-green-100 text-green-800",
            closed_lead: "bg-gray-100 text-gray-800",
        };
        return statusColors[status] || "bg-gray-100 text-gray-800";
    };

    const formatStatus = (status) => {
        return status
            ?.split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") || "N/A";
    };

    // Center List View
    if (!selectedCenter) {
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
                                            All Leads - Offline Centers
                                        </h1>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                            Total Centers: {centers.length}
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
                            {/* Search Bar */}
                            <div className="mb-6">
                                <div className="relative w-full max-w-md mx-auto">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search centers..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            {/* Centers Grid */}
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                    <p className="mt-4 text-sm text-gray-500">Loading centers...</p>
                                </div>
                            ) : filteredCenters.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No centers found</h3>
                                    <p className="text-sm text-gray-500">
                                        {searchQuery ? `No centers found matching "${searchQuery}"` : "No offline centers found"}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredCenters.map((center) => (
                                        <div
                                            key={center.center_id}
                                            onClick={() => handleCenterClick(center)}
                                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                    {center.center_name?.charAt(0)?.toUpperCase() || "C"}
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                {center.center_name}
                                            </h3>
                                            {center.state_name && (
                                                <p className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {center.state_name}
                                                </p>
                                            )}
                                            {center.center_admin_name && (
                                                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {center.center_admin_name}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Center Leads View
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
                                
                                <button
                                    onClick={handleBackToCenters}
                                    className="hidden sm:flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mr-2"
                                >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                        Leads - {selectedCenter.center_name}
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Total Leads: {centerLeads.length}
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
                        {/* Mobile Back Button */}
                        <button
                            onClick={handleBackToCenters}
                            className="sm:hidden flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Centers
                        </button>

                        {/* Search Bar */}
                        <div className="mb-6">
                            <div className="relative w-full max-w-md mx-auto">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search leads by name, phone, email, course, or status..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Leads Table */}
                        {leadsLoading ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                <p className="mt-4 text-sm text-gray-500">Loading leads...</p>
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No leads found</h3>
                                <p className="text-sm text-gray-500">
                                    {searchQuery ? `No leads found matching "${searchQuery}"` : "No leads found for this center"}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {paginatedLeads.map((lead, index) => (
                                                <tr key={lead.lead_id} className="hover:bg-gray-50 transition-colors duration-200">
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {startIndex + index + 1}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                {lead.name?.charAt(0)?.toUpperCase() || "L"}
                                                            </div>
                                                            <span className="font-semibold text-gray-900 text-sm">{lead.name || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {lead.email || "N/A"}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {lead.phone || "N/A"}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                            {lead.course || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {lead.source || "-"}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(lead.created_at)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(lead.status)}`}>
                                                            {formatStatus(lead.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleLeadClick(lead)}
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

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                                <span className="font-medium">{Math.min(endIndex, filteredLeads.length)}</span> of{' '}
                                                <span className="font-medium">{filteredLeads.length}</span> entries
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => goToPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <div className="flex items-center space-x-1">
                                                    {getPageNumbers().map((page, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => typeof page === 'number' && goToPage(page)}
                                                            disabled={page === '...'}
                                                            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                                                                page === currentPage
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
                                                    onClick={() => goToPage(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lead Details Modal - BERRY Style Right-Side Slide-In */}
            {showLeadDetails && selectedLead && (
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
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Lead Details</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">View complete information</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
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
                                    Name
                                </label>
                                <p className="text-sm font-medium text-gray-900">{selectedLead.name || "N/A"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Phone
                                </label>
                                <p className="text-sm font-medium text-gray-900">{selectedLead.phone || "N/A"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Email
                                </label>
                                <p className="text-sm font-medium text-gray-900">{selectedLead.email || "N/A"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Course
                                </label>
                                <p className="text-sm font-medium text-gray-900">{selectedLead.course || "N/A"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Source
                                </label>
                                <p className="text-sm font-medium text-gray-900">{selectedLead.source || "N/A"}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Status
                                </label>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedLead.status)}`}>
                                    {formatStatus(selectedLead.status)}
                                </span>
                            </div>

                            {selectedLead.remark && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Remark
                                    </label>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedLead.remark}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Created At
                                </label>
                                <p className="text-sm font-medium text-gray-900">{formatDate(selectedLead.created_at)}</p>
                            </div>

                            {selectedLead.updated_at && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Last Updated
                                    </label>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedLead.updated_at)}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                            <button
                                onClick={handleCloseModal}
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

export default AllLeadsPage;
