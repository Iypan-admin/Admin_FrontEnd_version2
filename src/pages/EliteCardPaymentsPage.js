import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CardAdminNotificationBell from "../components/CardAdminNotificationBell";
import {
    getPendingEliteCards,
    getApprovedEliteCards,
    approveEliteCard,
    rejectEliteCard,
    getCurrentUserProfile,
} from "../services/Api";

const EliteCardPaymentsPage = () => {
    const navigate = useNavigate();
    const [allCards, setAllCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [search, setSearch] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [profileInfo, setProfileInfo] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved === 'true' ? '6rem' : '16rem';
        }
        return '16rem';
    });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [slidePanelOpen, setSlidePanelOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [filters, setFilters] = useState({
        status: "all", // all, card_generated, approved, expired
        cardName: "all", // all, or specific card name
        cardNumber: "",
        dateFrom: "",
        dateTo: ""
    });

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

    // Mobile detection & sidebar sync
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleSidebarToggle = () => {
            const saved = localStorage.getItem('sidebarCollapsed');
            setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
        };
        window.addEventListener('sidebarToggle', handleSidebarToggle);
        return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
    }, []);

    // Mobile menu sync
    useEffect(() => {
        const handleMobileMenuStateChange = (event) => {
            setIsMobileMenuOpen(event.detail);
        };
        window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
        return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    }, []);

    // Profile update listener
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUserProfile();
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    const fetchUserProfile = async () => {
        try {
            const profile = await getCurrentUserProfile();
            if (profile && profile.data) {
                setProfileInfo(profile.data);
                if (profile.data.profile_picture) {
                    setProfilePictureUrl(profile.data.profile_picture);
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    // ✅ Filtered cards based on search and filters
    const filteredCards = allCards.filter((card) => {
        // Name search
        const matchesName = card.name_on_the_pass?.toLowerCase().includes(search.toLowerCase());
        
        // Status filter
        const matchesStatus = filters.status === "all" || card.status === filters.status;
        
        // Card name filter
        const matchesCardName = filters.cardName === "all" || card.card_name === filters.cardName;
        
        // Card number filter
        const matchesCardNumber = !filters.cardNumber || 
            card.card_number?.toLowerCase().includes(filters.cardNumber.toLowerCase());
        
        // Date range filters
        const matchesDateFrom = !filters.dateFrom || 
            (card.valid_from && card.valid_from >= filters.dateFrom);
        const matchesDateTo = !filters.dateTo || 
            (card.valid_thru && card.valid_thru <= filters.dateTo);
        
        return matchesName && matchesStatus && matchesCardName && matchesCardNumber && 
               matchesDateFrom && matchesDateTo;
    });

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCards.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCards.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const loadAllCards = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
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

    const handleApprove = async (id) => {
        if (!window.confirm("Approve this card?")) return;
        try {
            setActionLoading(id);
            const token = localStorage.getItem("token");
            await approveEliteCard(id, token);
            alert("✅ Card approved!");
            await loadAllCards();
        } catch (err) {
            console.error("Approval failed:", err);
            alert("❌ Failed to approve.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Reject this card?")) return;
        try {
            setActionLoading(id);
            const token = localStorage.getItem("token");
            await rejectEliteCard(id, token);
            alert("🚫 Card rejected!");
            await loadAllCards();
        } catch (err) {
            console.error("Reject failed:", err);
            alert("❌ Failed to reject.");
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        loadAllCards();
        fetchUserProfile();
    }, []);

        // ✅ Get unique card names for filter dropdown
    const uniqueCardNames = [...new Set(allCards.map(card => card.card_name).filter(Boolean))];

    // Reset filters
    const handleResetFilters = () => {
        setFilters({
            status: "all",
            cardName: "all",
            cardNumber: "",
            dateFrom: "",
            dateTo: ""
        });
        setSearch("");
    };

    return (
      <div className="min-h-screen bg-slate-50 flex">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Berry Style Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            {/* Left: Hamburger Menu & Welcome Text */}
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
                                        Elite Card Payments
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage elite card applications and payments
                                    </p>
                                </div>
                            </div>

                            {/* Right: Profile Dropdown */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <CardAdminNotificationBell />
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                        className="flex items-center focus:outline-none"
                                    >
                                        {profilePictureUrl ? (
                                            <img
                                                src={profilePictureUrl}
                                                alt="Profile"
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                                                {getDisplayName()?.charAt(0).toUpperCase() || "C"}
                                            </div>
                                        )}
                                    </button>

                                    {showProfileDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)}></div>
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                                    <h3 className="font-bold text-gray-800 text-base">
                                                        Welcome, {getDisplayName()?.split(' ')[0] || "Admin"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Card Admin</p>
                                                </div>
                                                <div className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            navigate('/card-admin/account-settings');
                                                            setShowProfileDropdown(false);
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
                                                            navigate("/login");
                                                            setShowProfileDropdown(false);
                                                        }}
                                                        className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
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

                            {/* Enhanced Search Section */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-800">Search & Filter</h2>
                                            <p className="text-sm text-gray-500">Find specific elite card applications</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
                                        </span>
                                    </button>
                                </div>
                                
                                {/* Basic Search */}
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search by cardholder name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Advanced Filters */}
                                {showAdvancedFilters && (
                                    <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Status Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Status
                                                </label>
                                                <select
                                                    value={filters.status}
                                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="card_generated">Pending</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="expired">Expired</option>
                                                </select>
                                            </div>

                                            {/* Card Name Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Type
                                                </label>
                                                <select
                                                    value={filters.cardName}
                                                    onChange={(e) => setFilters({...filters, cardName: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="all">All Card Types</option>
                                                    {uniqueCardNames.map((name) => (
                                                        <option key={name} value={name}>
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Card Number Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Search by card number..."
                                                    value={filters.cardNumber}
                                                    onChange={(e) => setFilters({...filters, cardNumber: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Date From Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valid From (Start Date)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.dateFrom}
                                                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Date To Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valid To (End Date)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.dateTo}
                                                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Reset Filters Button */}
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleResetFilters}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                                            >
                                                Reset All Filters
                                            </button>
                                        </div>

                                        {/* Active Filters Count */}
                                        {(filters.status !== "all" || filters.cardName !== "all" || 
                                          filters.cardNumber || filters.dateFrom || filters.dateTo) && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-sm text-gray-600">
                                                    Showing <span className="font-semibold text-blue-600">{filteredCards.length}</span> of{" "}
                                                    <span className="font-semibold">{allCards.length}</span> cards
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Table Section */}
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">Elite Card Applications</h3>
                                                <p className="text-sm text-gray-500">{filteredCards.length} applications found</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-600 font-medium">Live Data</span>
                                        </div>
                                    </div>
                </div>

                {loading ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Applications</h3>
                                            <p className="text-gray-500">Please wait while we fetch the elite card data...</p>
                                        </div>
                                    </div>
                ) : filteredCards.length === 0 ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Applications Found</h3>
                                            <p className="text-gray-500 mb-6 max-w-md text-center">
                                                {search ? 'No applications match your search criteria.' : 'No elite card applications have been submitted yet.'}
                                            </p>
                                            {search && (
                                                <button
                                                    onClick={() => setSearch('')}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    Clear Search
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                    <div className="overflow-x-auto">
                                        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                            <table className="w-full divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="w-16 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            S.No
                                                        </th>
                                                        <th className="flex-1 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Cardholder
                                                        </th>
                                                        <th className="flex-1 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Card Details
                                                        </th>
                                                        <th className="w-32 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Validity
                                                        </th>
                                                        <th className="w-24 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Pass
                                                        </th>
                                                        <th className="w-28 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="w-32 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                    </tr>
                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {currentItems.map((card, index) => (
                                        <React.Fragment key={card.id}>
                                                            <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group border-b border-gray-100">
                                                                <td className="w-16 px-4 py-4">
                                                                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-xs shadow-lg">
                                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                                    </div>
                                                                </td>
                                                                <td className="flex-1 px-4 py-4">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-lg">
                                                                            {card.name_on_the_pass?.charAt(0)?.toUpperCase() || 'E'}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate">
                                                                                {card.name_on_the_pass}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                Cardholder
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="flex-1 px-4 py-4">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                                </svg>
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate">
                                                                                    {card.card_name}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 group-hover:text-gray-600 truncate">
                                                                                    {card.card_number || 'N/A'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="w-32 px-4 py-4">
                                                                    <div className="text-sm text-gray-600 group-hover:text-gray-800 space-y-1">
                                                                        <div className="whitespace-nowrap">
                                                                            <span className="font-medium text-xs">From:</span> <span className="text-xs">{card.valid_from || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="whitespace-nowrap">
                                                                            <span className="font-medium text-xs">To:</span> <span className="text-xs">{card.valid_thru || 'N/A'}</span>
                                                                        </div>
                                                                    </div>      
                                                                </td>
                                                                <td className="w-24 px-4 py-4">
                                                    {card.pdf_url ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCard(card);
                                                                setSlidePanelOpen(true);
                                                            }}
                                                            className="inline-flex items-center px-2 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">No Pass</span>
                                                    )}
                                                </td>
                                                                                                                                <td className="w-28 px-4 py-4">
                                                                    <div className="flex items-center space-x-1">
                                                                        <div className={`w-2 h-2 rounded-full ${
                                                                            card.status === 'approved' ? 'bg-green-400' : 
                                                                            card.status === 'card_generated' ? 'bg-yellow-400' : 
                                                                            card.status === 'expired' ? 'bg-red-400' :
                                                                            'bg-gray-400'
                                                                        }`}></div>
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                                            card.status === 'approved' 
                                                                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                                                : card.status === 'card_generated'
                                                                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                                                    : card.status === 'expired'
                                                                                        ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                                                        } shadow-sm`}>
                                                                            {card.status}
                                                                        </span>
                                                                    </div>      
                                                                </td>
                                                                <td className="w-32 px-4 py-4">
                                                    {card.status === "card_generated" && (
                                                        <div className="flex flex-col space-y-1">
                                                            <button
                                                                onClick={() => handleApprove(card.id)}
                                                                disabled={actionLoading === card.id}
                                                                className="inline-flex items-center justify-center px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                                            >
                                                                                {actionLoading === card.id ? (
                                                                                    <svg className="w-4 h-4 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                )}
                                                                {actionLoading === card.id ? "Approving..." : "Approve"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(card.id)}
                                                                disabled={actionLoading === card.id}
                                                                                className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                                                            >
                                                                                {actionLoading === card.id ? (
                                                                                    <svg className="w-4 h-4 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                    </svg>
                                                                                )}
                                                                {actionLoading === card.id ? "Rejecting..." : "Reject"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {card.status === "expired" && (
                                                        <span className="text-xs text-red-600 font-medium">Card Expired</span>
                                                    )}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Berry Style Slide Panel */}
                    {slidePanelOpen && selectedCard && (
                        <div className="fixed inset-0 z-50 overflow-hidden">
                            {/* Backdrop */}
                            <div 
                                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                                onClick={() => setSlidePanelOpen(false)}
                            />
                            
                            {/* Slide Panel */}
                            <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
                                slidePanelOpen ? 'translate-x-0' : 'translate-x-full'
                            }`}>
                                {/* Panel Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">Pass Preview</h3>
                                                <p className="text-sm text-blue-100">{selectedCard.name_on_the_pass}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSlidePanelOpen(false)}
                                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Panel Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    {/* Card Info */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
                                        <h4 className="text-sm font-semibold text-gray-600 mb-3">Card Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Cardholder:</span>
                                                <span className="text-sm font-medium text-gray-900">{selectedCard.name_on_the_pass}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Card Name:</span>
                                                <span className="text-sm font-medium text-gray-900">{selectedCard.card_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Card Number:</span>
                                                <span className="text-sm font-medium text-gray-900">{selectedCard.card_number || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Status:</span>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                    selectedCard.status === 'approved' 
                                                        ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                        : selectedCard.status === 'card_generated'
                                                            ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                            : selectedCard.status === 'expired'
                                                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                                }`}>
                                                    {selectedCard.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* PDF Preview */}
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                                            <h4 className="text-sm font-semibold text-gray-600">Pass Document</h4>
                                        </div>
                                        <div className="p-4">
                                            <iframe
                                                src={selectedCard.pdf_url}
                                                title="Pass Preview"
                                                className="w-full h-96 border rounded-lg shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Berry Style Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCards.length)} of {filteredCards.length} entries
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    
                                    {/* Page Numbers */}
                                    <div className="flex items-center space-x-1">
                                        {[...Array(totalPages)].map((_, index) => {
                                            const pageNumber = index + 1;
                                            const isCurrentPage = pageNumber === currentPage;
                                            const isNearCurrent = Math.abs(pageNumber - currentPage) <= 2 || pageNumber === 1 || pageNumber === totalPages;
                                            
                                            if (!isNearCurrent && pageNumber !== 1 && pageNumber !== totalPages) {
                                                if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
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
                                                    onClick={() => paginate(pageNumber)}
                                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                        isCurrentPage
                                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
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
};

export default EliteCardPaymentsPage;
