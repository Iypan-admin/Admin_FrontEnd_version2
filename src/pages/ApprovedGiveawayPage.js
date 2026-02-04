import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FinanceNotificationBell from "../components/FinanceNotificationBell";
import {
    getPendingGiveaways,
    approveGiveaway,
    declineGiveaway,
    getCurrentUserProfile
} from "../services/Api";

const GiveawayApprovalPage = () => {
    const navigate = useNavigate();
    const [giveaways, setGiveaways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    
    // Berry style state variables
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

    // Get current user's name from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'Finance Admin');

    const getDisplayName = () => {
        return userName;
    };

    // Search & filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // all | success | approved | declined
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const loadPendingGiveaways = async () => {
        try {
            setLoading(true);
            const data = await getPendingGiveaways();
            setGiveaways(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error loading giveaways:", error);
            setGiveaways([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this giveaway?")) return;
        try {
            setActionLoading(id);
            const response = await approveGiveaway(id);
            alert(`✅ ${response?.message || "Giveaway approved successfully!"}`);
            await loadPendingGiveaways();
        } catch (err) {
            console.error(`Approval failed [ID: ${id}]:`, err);
            alert(`❌ Failed to approve giveaway: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (id) => {
        if (!window.confirm("Are you sure you want to decline this giveaway?")) return;
        try {
            setActionLoading(id);
            const response = await declineGiveaway(id);
            alert(`🚫 ${response?.message || "Giveaway declined successfully!"}`);
            await loadPendingGiveaways();
        } catch (err) {
            console.error(`Decline failed [ID: ${id}]:`, err);
            alert(`❌ Failed to decline giveaway: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    // Sync mobile menu state with Navbar
    useEffect(() => {
        const handleMobileMenuStateChange = (event) => {
            setIsMobileMenuOpen(event.detail);
        };
        window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
        return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    }, []);

    // Fetch profile info
    useEffect(() => {
        const fetchProfileInfo = async () => {
            try {
                const response = await getCurrentUserProfile();
                if (response.success && response.data) {
                    setProfilePictureUrl(response.data.profile_picture || null);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfileInfo();

        window.addEventListener('profileUpdated', fetchProfileInfo);
        return () => {
            window.removeEventListener('profileUpdated', fetchProfileInfo);
        };
    }, []);

    // Berry style mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    useEffect(() => {
        loadPendingGiveaways();
    }, []);


    // Filter & search logic
    const filteredGiveaways = giveaways.filter((g) => {
        const matchesSearch =
            g.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.name_on_the_pass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === "all"
                ? true
                : filterStatus === g.status;

        return matchesSearch && matchesStatus;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredGiveaways.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedGiveaways = filteredGiveaways.slice(startIndex, endIndex);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden">
                <Navbar />
                <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading giveaway data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex relative">
            <Navbar />
            
            {/* Main Content Area - BERRY Style */}
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Top Header Bar - BERRY Style */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            {/* Left: Hamburger Menu & Welcome Text */}
                            <div className="flex items-center space-x-3 sm:space-x-4">
                                {/* Hamburger Menu Toggle */}
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
                                        Giveaway Approvals 🎁
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage giveaway entries and approvals
                                    </p>
                                </div>
                            </div>

                            {/* Right: Notifications & Profile Dropdown */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <FinanceNotificationBell />

                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                        className="flex items-center focus:outline-none"
                                    >
                                        {profilePictureUrl ? (
                                            <img
                                                src={profilePictureUrl}
                                                alt="Profile"
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                                                {getDisplayName()?.charAt(0).toUpperCase() || "F"}
                                            </div>
                                        )}
                                    </button>

                                    {/* Profile Dropdown Menu */}
                                    {isProfileDropdownOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                                            
                                            {/* Dropdown Box - BERRY Style */}
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                {/* Header Section */}
                                                <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                                                    <h3 className="font-bold text-gray-800 text-base">
                                                        Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Finance Admin</p>
                                                </div>

                                                {/* Menu Items */}
                                                <div className="py-2">
                                                    {/* Account Settings */}
                                                    <button
                                                        onClick={() => {
                                                            navigate('/finance/account-settings');
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

                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Statistics Cards - BERRY Style */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {[
                                {
                                    title: "Total Giveaway",
                                    count: loading ? "..." : giveaways.length,
                                    icon: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
                                    gradient: "from-blue-500 to-blue-600",
                                    error: null
                                },
                                {
                                    title: "Pending",
                                    count: loading ? "..." : giveaways.filter(g => g.status === 'success').length,
                                    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                                    gradient: "from-orange-500 to-orange-600",
                                    error: null
                                },
                                {
                                    title: "Approved",
                                    count: loading ? "..." : giveaways.filter(g => g.status === 'approved').length,
                                    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                                    gradient: "from-green-500 to-green-600",
                                    error: null
                                }
                            ].map((stat, index) => (
                                <div 
                                    key={index} 
                                    className="bg-gradient-to-br bg-white rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200"
                                    style={{ background: `linear-gradient(to bottom right, ${stat.gradient.includes('blue') ? '#2196f3' : stat.gradient.includes('green') ? '#4caf50' : stat.gradient.includes('orange') ? '#ff9800' : '#9c27b0'}, ${stat.gradient.includes('blue') ? '#1976d2' : stat.gradient.includes('green') ? '#388e3c' : stat.gradient.includes('orange') ? '#f57c00' : '#7b1fa2'})` }}
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-10 sm:translate-x-10"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">{stat.title}</p>
                                        <div className="text-white text-3xl sm:text-4xl font-bold">
                                            {loading ? (
                                                <span className="inline-block animate-pulse bg-white/30 h-10 w-20 rounded"></span>
                                            ) : (
                                                stat.count
                                            )}
                                        </div>
                                        {stat.error && (
                                            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                                                <p className="text-red-600 text-sm">{stat.error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Enhanced Search and Filter Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Search Giveaways
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                            <input
                                type="text"
                                            placeholder="Search by Reference ID, Name, Card, City, Email, Contact..."
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                                    </div>
                                </div>
                                <div className="lg:w-64">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Filter by Status
                                    </label>
                            <select
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                        <option value="all">All Status</option>
                                <option value="success">Pending Approval</option>
                                <option value="approved">Approved</option>
                                <option value="declined">Declined</option>
                            </select>
                                </div>
                        </div>
                    </div>

                        {/* Enhanced Table Section */}
                        {filteredGiveaways.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                                    <svg
                                        className="w-12 h-12 text-blue-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {searchTerm || filterStatus !== 'all' ? "No giveaways found" : "No giveaway entries"}
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    {searchTerm || filterStatus !== 'all' 
                                        ? `No giveaway entries match your current search and filter criteria. Try adjusting your search terms or filters.`
                                        : "No giveaway entries have been submitted yet. Entries will appear here once students submit their applications."
                                    }
                                </p>
                                {(searchTerm || filterStatus !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm("");
                                            setFilterStatus("all");
                                        }}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-800">Giveaway Entries</h2>
                                                <p className="text-sm text-gray-600">{filteredGiveaways.length} entries found</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <div className="max-h-[500px] overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Reference ID</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Name</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Card</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>City</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Email</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Contact</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.949.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Status</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Actions</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                        </tr>
                                    </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {paginatedGiveaways.map((g, index) => (
                                                    <tr key={g.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                                        <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                                <span className="text-blue-600">{g.reference_id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                                                    {g.name_on_the_pass?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                                <span className="font-medium">{g.name_on_the_pass || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                                <span className="font-medium">{g.card_name || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span>{g.city || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                <span className="truncate max-w-[200px]">{g.customer_email || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.949.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                <span>{g.customer_phone || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                                g.status.toLowerCase() === "approved" 
                                                                    ? "bg-green-100 text-green-800 border border-green-200" 
                                                                    : g.status.toLowerCase() === "declined"
                                                                    ? "bg-red-100 text-red-800 border border-red-200"
                                                                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                            }`}>
                                                                {g.status.toLowerCase() === "approved" ? (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Approved
                                                                    </>
                                                                ) : g.status.toLowerCase() === "declined" ? (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Declined
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Pending
                                                                    </>
                                                                )}
                                                            </span>
                                                </td>
                                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                            {g.status.toLowerCase() === "success" ? (
                                                    <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleApprove(g.id)}
                                                                    disabled={actionLoading === g.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === g.id ? (
                                                                            <>
                                                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Approving...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                Approve
                                                                            </>
                                                                        )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDecline(g.id)}
                                                                    disabled={actionLoading === g.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === g.id ? (
                                                                            <>
                                                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Declining...
                                                            </>
                                                        ) : (
                                                                            <>
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                                Decline
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center text-gray-500">
                                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    <span className="text-sm font-medium">
                                                                        {g.status.toLowerCase() === "approved" ? "Approved" : "Declined"}
                                                            </span>
                                                                </div>
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                    </div>
                                    
                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-gray-700">
                                                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                                    <span className="font-medium">
                                                        {Math.min(endIndex, filteredGiveaways.length)}
                                                    </span>{' '}
                                                    of <span className="font-medium">{filteredGiveaways.length}</span> results
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    {/* Previous Button */}
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {/* Page Numbers */}
                                                    <div className="flex items-center space-x-1">
                                                        {[...Array(totalPages)].map((_, index) => {
                                                            const pageNumber = index + 1;
                                                            const isActive = currentPage === pageNumber;
                                                            const isNearCurrent = Math.abs(pageNumber - currentPage) <= 2 || pageNumber === 1 || pageNumber === totalPages;
                                                            
                                                            if (!isNearCurrent && pageNumber !== 1 && pageNumber !== totalPages) {
                                                                if (Math.abs(pageNumber - currentPage) === 3) {
                                                                    return (
                                                                        <span key={pageNumber} className="px-3 py-2 text-sm text-gray-500">
                                                                            ...
                                                                        </span>
                                                                    );
                                                                }
                                                                return null;
                                                            }
                                                            
                                                            return (
                                                                <button
                                                                    key={pageNumber}
                                                                    onClick={() => setCurrentPage(pageNumber)}
                                                                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                                                        isActive
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {pageNumber}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {/* Next Button */}
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                        disabled={currentPage === totalPages}
                                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GiveawayApprovalPage;
