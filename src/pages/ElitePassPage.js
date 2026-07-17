import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
    getPendingEliteCards,
    getApprovedEliteCards,
    getCardStats,
    getCurrentUserProfile
} from "../services/Api";
import AdminNotificationBell from "../components/AdminNotificationBell";
import ViewElitePassSlidePanel from "../components/ViewElitePassSlidePanel";

const ElitePassPage = () => {
    const navigate = useNavigate();
    const [allCards, setAllCards] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isPassPanelOpen, setIsPassPanelOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all"); 
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
    const [profileInfo, setProfileInfo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    // Get current user's name from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userName = (decodedToken?.full_name && 
                      decodedToken.full_name !== null && 
                      decodedToken.full_name !== undefined && 
                      String(decodedToken.full_name).trim() !== '') 
        ? decodedToken.full_name 
        : (decodedToken?.name || 'Admin');

    const getDisplayName = () => {
        if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
            return profileInfo.full_name;
        }
        return userName;
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

    // Fetch profile info
    useEffect(() => {
        const fetchProfileInfo = async () => {
            try {
                const response = await getCurrentUserProfile();
                if (response.success && response.data) {
                    setProfileInfo(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch profile info:", error);
            }
        };
        fetchProfileInfo();

        window.addEventListener('profileUpdated', fetchProfileInfo);
        return () => {
            window.removeEventListener('profileUpdated', fetchProfileInfo);
        };
    }, []);

    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    const loadAllCards = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            
            // Load stats
            const cardStats = await getCardStats();
            setStats(cardStats);
            
            // Load all cards
            const pending = await getPendingEliteCards(token);
            const approved = await getApprovedEliteCards(token);
            setAllCards([...(pending || []), ...(approved || [])]);
        } catch (error) {
            console.error("Error loading cards:", error);
            setAllCards([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllCards();
    }, []);

    // Filter cards based on search and status
    const filteredCards = allCards.filter((card) => {
        const matchesSearch =
            card.name_on_the_pass?.toLowerCase().includes(search.toLowerCase()) ||
            card.card_number?.toLowerCase().includes(search.toLowerCase()) ||
            card.email?.toLowerCase().includes(search.toLowerCase()) ||
            card.card_name?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "pending" && card.status === "card_generated") ||
            (statusFilter === "active" && card.status === "approved");

        return matchesSearch && matchesStatus;
    });

    // Reset pagination when search or status filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    // Pagination logic
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredCards.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredCards.length / rowsPerPage);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
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
                                        Elite Pass
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage and monitor all elite cards
                                    </p>
                                </div>
                            </div>

                            {/* Right: Notifications & Profile Dropdown */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <AdminNotificationBell />

                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                        className="flex items-center focus:outline-none"
                                    >
                                        {profileInfo?.profile_picture ? (
                                            <img
                                                src={profileInfo.profile_picture}
                                                alt="Profile"
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
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
                                            
                                            {/* Dropdown Box - BERRY Style */}
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                {/* Header Section */}
                                                <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                                    <h3 className="font-bold text-gray-800 text-base">
                                                        Welcome, {getDisplayName()?.split(' ')[0] || "Admin"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Administrator</p>
                                                </div>

                                                {/* Menu Items */}
                                                <div className="py-2">
                                                    {/* Account Settings */}
                                                    <button
                                                        onClick={() => {
                                                            navigate('/admin/account-settings');
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
                                        title: "Total Elite Cards",
                                        count: stats.total,
                                        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                                        gradient: "from-blue-500 to-blue-600",
                                        color1: "#2196f3",
                                        color2: "#1976d2"
                                    },
                                    {
                                        title: "Active Elite Cards",
                                        count: stats.active,
                                        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                                        gradient: "from-green-500 to-green-600",
                                        color1: "#4caf50",
                                        color2: "#388e3c"
                                    },
                                    {
                                        title: "Pending Elite Cards",
                                        count: stats.pending,
                                        icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                                        gradient: "from-purple-500 to-purple-600",
                                        color1: "#9c27b0",
                                        color2: "#7b1fa2"
                                    }
                                ].map((stat, index) => (
                                    <div 
                                        key={index} 
                                        className="rounded-xl shadow-lg p-4 sm:p-6 relative overflow-hidden border border-gray-200"
                                        style={{ background: `linear-gradient(to bottom right, ${stat.color1}, ${stat.color2})` }}
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
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Search and Filter Section - BERRY Style */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Search & Filter</h2>
                                            <p className="text-xs sm:text-sm text-gray-500">Find specific elite cards by multiple criteria</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
                                        <button
                                            onClick={() => setStatusFilter("all")}
                                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("active")}
                                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === "active" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter("pending")}
                                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === "pending" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            Pending
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Search Input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by name, card number, email, or card type..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Elite Pass Table - BERRY Style */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Elite Cards List</h3>
                                                <p className="text-xs sm:text-sm text-gray-500">
                                                    Showing {filteredCards.length} record{filteredCards.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] sm:text-xs text-green-700 font-bold uppercase tracking-wider">Live Data</span>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                                                <svg
                                                    className="w-8 h-8 text-blue-600 animate-spin"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Cards</h3>
                                            <p className="text-gray-500">Please wait while we fetch the elite card data...</p>
                                        </div>
                                    </div>
                                ) : filteredCards.length === 0 ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                <svg
                                                    className="w-10 h-10 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Cards Found</h3>
                                            <p className="text-gray-500 mb-6 max-w-md text-center">
                                                {search || statusFilter !== "all"
                                                    ? "No cards match your search or filter criteria."
                                                    : "No elite cards have been created yet."}
                                            </p>
                                            {(search || statusFilter !== "all") && (
                                                <button
                                                    onClick={() => {
                                                        setSearch("");
                                                        setStatusFilter("all");
                                                    }}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <div className="max-h-[600px] overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            S.No
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Cardholder
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Card Details
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Validity
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Email
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Pass
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {currentRows.map((card, index) => (
                                                        <React.Fragment key={card.id}>
                                                            <tr className="hover:bg-gray-50 transition-colors duration-200 group">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white font-semibold text-xs shadow-sm">
                                                                        {indexOfFirstRow + index + 1}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold border border-blue-200">
                                                                            {card.name_on_the_pass?.charAt(0)?.toUpperCase() || "E"}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">
                                                                                {card.name_on_the_pass || "N/A"}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Cardholder</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                            </svg>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">
                                                                                {card.card_name || "N/A"}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 font-mono">
                                                                                {card.card_number || "N/A"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="space-y-1">
                                                                        <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                                                            <span className="font-medium">From:</span> {formatDate(card.valid_from)}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                                                            <span className="font-medium">To:</span> {formatDate(card.valid_thru)}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                                    {card.email || "N/A"}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    {card.pdf_url ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedCard(card);
                                                                                setIsPassPanelOpen(true);
                                                                            }}
                                                                            className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            View
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-xs font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 italic">No Pass</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        <div className={`w-2 h-2 rounded-full mr-2 ${card.status === "approved" ? "bg-green-500 animate-pulse" : card.status === "card_generated" ? "bg-yellow-500" : "bg-gray-400"}`}></div>
                                                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${card.status === "approved" ? "bg-green-50 text-green-700 border border-green-100" : card.status === "card_generated" ? "bg-yellow-50 text-yellow-700 border border-yellow-100" : "bg-gray-50 text-gray-700 border border-gray-100"}`}>
                                                                            {card.status === "approved" ? "Active" : card.status === "card_generated" ? "Pending" : card.status}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Pagination Section - BERRY Style */}
                                {filteredCards.length > 0 && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-gray-500">
                                            Showing <span className="font-semibold text-gray-900">{indexOfFirstRow + 1}</span> to{" "}
                                            <span className="font-semibold text-gray-900">
                                                {Math.min(indexOfLastRow, filteredCards.length)}
                                            </span>{" "}
                                            of <span className="font-semibold text-gray-900">{filteredCards.length}</span> entries
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className={`p-2 rounded-lg border ${
                                                    currentPage === 1
                                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                                        : "bg-white text-blue-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>

                                            {/* Page Numbers */}
                                            <div className="flex items-center space-x-1">
                                                {[...Array(totalPages)].map((_, i) => {
                                                    const pageNum = i + 1;
                                                    // Only show first page, last page, and pages around current page
                                                    if (
                                                        pageNum === 1 ||
                                                        pageNum === totalPages ||
                                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setCurrentPage(pageNum)}
                                                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                                                                    currentPage === pageNum
                                                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-110 z-10"
                                                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                                                }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    } else if (
                                                        (pageNum === 2 && currentPage > 3) ||
                                                        (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                                    ) {
                                                        return <span key={pageNum} className="px-1 text-gray-400">...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>

                                            {/* Next Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className={`p-2 rounded-lg border ${
                                                    currentPage === totalPages
                                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                                        : "bg-white text-blue-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                                                }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                
                {/* View Pass Slide Panel */}
                <ViewElitePassSlidePanel
                    isOpen={isPassPanelOpen}
                    onClose={() => {
                        setIsPassPanelOpen(false);
                        setSelectedCard(null);
                    }}
                    card={selectedCard}
                />
            </div>
    );
};

export default ElitePassPage;

