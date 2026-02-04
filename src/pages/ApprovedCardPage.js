import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FinanceNotificationBell from "../components/FinanceNotificationBell";
import {
    getPendingElitePayments,
    approveElitePayment,
    declineElitePayment,
    getCurrentUserProfile
} from "../services/Api";

const ApprovedCardPage = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
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
    
    // Revenue breakdown state
    const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
    const [revenueFilterMonth, setRevenueFilterMonth] = useState("all");
    const [revenueFilterCardName, setRevenueFilterCardName] = useState("all");
    const [revenueFilterDateRange, setRevenueFilterDateRange] = useState({ start: "", end: "" });

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

    const loadPendingPayments = async () => {
        try {
            setLoading(true);
            const data = await getPendingElitePayments();
            setPayments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error loading payments:", error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this payment?")) return;
        try {
            setActionLoading(id);
            await approveElitePayment(id);
            alert("✅ Payment approved successfully!");
            await loadPendingPayments();
        } catch (err) {
            console.error("Approval failed:", err);
            alert("❌ Failed to approve payment. Try again.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (id) => {
        if (!window.confirm("Are you sure you want to decline this payment?")) return;
        try {
            setActionLoading(id);
            await declineElitePayment(id);
            alert("🚫 Payment declined successfully!");
            await loadPendingPayments();
        } catch (err) {
            console.error("Decline failed:", err);
            alert("❌ Failed to decline payment. Try again.");
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        loadPendingPayments();
    }, []);

    // Filter & search logic
    const filteredPayments = payments.filter((pay) => {
        const matchesSearch =
            pay.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pay.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pay.bank_rrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pay.card_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === "all" ? true : pay.status.toLowerCase() === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Get unique values for revenue filters
    const uniqueMonths = useMemo(() => {
        const months = [...new Set(payments
            .filter(p => p.payment_date)
            .map(p => new Date(p.payment_date).getMonth() + 1))];
        return months.sort((a, b) => a - b);
    }, [payments]);

    const uniqueCardNames = useMemo(() => {
        const cardNames = [...new Set(payments
            .map(p => p.card_name)
            .filter(Boolean))];
        return cardNames.sort();
    }, [payments]);

    // Extract date range values for dependency tracking
    const revenueDateStart = revenueFilterDateRange?.start || "";
    const revenueDateEnd = revenueFilterDateRange?.end || "";

    // Revenue calculations
    const revenueStats = useMemo(() => {
        let approvedPayments = payments.filter(p => p.status === 'approved');
        
        // Apply revenue breakdown filters
        approvedPayments = approvedPayments.filter((p) => {
            if (!p.payment_date) return false;
            
            const paymentDate = new Date(p.payment_date);
            if (isNaN(paymentDate.getTime())) return false;
            
            // Month filter
            const matchesMonth =
                !revenueFilterMonth || revenueFilterMonth === "all"
                    ? true
                    : paymentDate.getMonth() + 1 === parseInt(revenueFilterMonth, 10);

            // Card name filter
            const matchesCardName =
                !revenueFilterCardName || revenueFilterCardName === "all"
                    ? true
                    : p.card_name === revenueFilterCardName;

            // Date range filter
            let matchesDateRange = true;
            const startDateStr = revenueDateStart;
            const endDateStr = revenueDateEnd;
            
            if (startDateStr && startDateStr.trim() !== "") {
                const startDate = new Date(startDateStr + "T00:00:00");
                if (!isNaN(startDate.getTime())) {
                    const paymentDateStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
                    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    if (paymentDateStart < startDateOnly) {
                        matchesDateRange = false;
                    }
                }
            }
            
            if (endDateStr && endDateStr.trim() !== "") {
                const endDate = new Date(endDateStr + "T23:59:59");
                if (!isNaN(endDate.getTime())) {
                    const paymentDateEnd = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
                    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    if (paymentDateEnd > endDateOnly) {
                        matchesDateRange = false;
                    }
                }
            }

            return matchesMonth && matchesCardName && matchesDateRange;
        });
        
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const cardNameBreakdown = approvedPayments.reduce((acc, p) => {
            const cardName = p.card_name || 'Unknown';
            acc[cardName] = (acc[cardName] || 0) + (parseFloat(p.amount) || 0);
            return acc;
        }, {});

        return {
            totalRevenue,
            cardNameBreakdown,
            totalPayments: approvedPayments.length,
            averagePayment: approvedPayments.length > 0 ? totalRevenue / approvedPayments.length : 0
        };
    }, [payments, revenueFilterMonth, revenueFilterCardName, revenueDateStart, revenueDateEnd]);

    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden">
                <Navbar />
                <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading elite payment data...</p>
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
                                        Elite Card Payments 💳
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage elite card payment approvals
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
                                    title: "Total Payments",
                                    count: loading ? "..." : payments.length,
                                    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
                                    gradient: "from-blue-500 to-blue-600",
                                    error: null
                                },
                                {
                                    title: "Pending",
                                    count: loading ? "..." : payments.filter(p => p.status === 'success').length,
                                    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                                    gradient: "from-orange-500 to-orange-600",
                                    error: null
                                },
                                {
                                    title: "Approved",
                                    count: loading ? "..." : payments.filter(p => p.status === 'approved').length,
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
                                        Search Payments
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                            <input
                                type="text"
                                            placeholder="Search by Name, Payment ID, Bank RRN, Card Name..."
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
                                <option value="success">Success</option>
                                <option value="approved">Approved</option>
                                <option value="declined">Declined</option>
                            </select>
                                </div>
                        </div>
                    </div>

                        {/* Revenue Breakdown Toggle Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowRevenueBreakdown(!showRevenueBreakdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Revenue Breakdown
                                {showRevenueBreakdown ? 
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg> : 
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                }
                            </button>
                        </div>

                        {/* Revenue Breakdown Panel */}
                        {showRevenueBreakdown && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                                {/* Revenue Breakdown Filters */}
                                <div className="mb-6 pb-4 border-b border-green-200">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                        Revenue Filters
                                    </h3>
                                    {/* All Filters in One Row for System View */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Month
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                                value={revenueFilterMonth}
                                                onChange={(e) => setRevenueFilterMonth(e.target.value)}
                                            >
                                                <option value="all">All Months</option>
                                                {uniqueMonths.map(month => (
                                                    <option key={month} value={month}>
                                                        {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Card Name
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                                value={revenueFilterCardName}
                                                onChange={(e) => setRevenueFilterCardName(e.target.value)}
                                            >
                                                <option value="all">All Cards</option>
                                                {uniqueCardNames.map(cardName => (
                                                    <option key={cardName} value={cardName}>{cardName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="lg:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Date Range
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                                    value={revenueFilterDateRange.start}
                                                    onChange={(e) => setRevenueFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                    placeholder="Start Date"
                                                />
                                                <input
                                                    type="date"
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                                    value={revenueFilterDateRange.end}
                                                    onChange={(e) => setRevenueFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                    placeholder="End Date"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => {
                                                setRevenueFilterMonth("all");
                                                setRevenueFilterCardName("all");
                                                setRevenueFilterDateRange({ start: "", end: "" });
                                            }}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm font-medium"
                                        >
                                            Clear Revenue Filters
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">₹{revenueStats.totalRevenue.toLocaleString()}</div>
                                        <div className="text-sm text-gray-600">Total Revenue</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{revenueStats.totalPayments}</div>
                                        <div className="text-sm text-gray-600">Total Payments</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-600">₹{Math.round(revenueStats.averagePayment).toLocaleString()}</div>
                                        <div className="text-sm text-gray-600">Average Payment</div>
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        Revenue by Card Name
                                    </h4>
                                    <div className="space-y-2">
                                        {Object.entries(revenueStats.cardNameBreakdown)
                                            .sort(([,a], [,b]) => b - a)
                                            .map(([cardName, amount]) => (
                                            <div key={cardName} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-gray-200">
                                                <span className="truncate font-medium">{cardName}</span>
                                                <span className="font-bold text-green-600">₹{amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {Object.keys(revenueStats.cardNameBreakdown).length === 0 && (
                                            <div className="text-center text-gray-500 py-4">
                                                No revenue data available for the selected filters
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Table Section */}
                        {filteredPayments.length === 0 ? (
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
                                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {searchTerm || filterStatus !== 'all' ? "No payments found" : "No elite payments"}
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    {searchTerm || filterStatus !== 'all' 
                                        ? `No elite card payments match your current search and filter criteria. Try adjusting your search terms or filters.`
                                        : "No elite card payments have been submitted yet. Payments will appear here once students make their transactions."
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
                                                <h2 className="text-xl font-bold text-gray-800">Elite Card Payments</h2>
                                                <p className="text-sm text-gray-600">{filteredPayments.length} payments found</p>
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
                                                            <span>Full Name</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Payment Date</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Payment ID</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Bank RRN</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Card Name</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Amount</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                                {filteredPayments.map((pay, index) => (
                                                    <tr key={pay.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                                                    {pay.full_name?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                                <span className="font-medium">{pay.full_name || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString("en-GB") : "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                                <span className="text-blue-600">{pay.payment_id || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                                <span className="font-medium">{pay.bank_rrn || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                </svg>
                                                                <span className="font-medium">{pay.card_name || "N/A"}</span>
                                                            </div>
                                                </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span className="font-bold text-green-600">₹{(parseFloat(pay.amount) || 0).toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                                pay.status.toLowerCase() === "approved" 
                                                                    ? "bg-green-100 text-green-800 border border-green-200" 
                                                                    : pay.status.toLowerCase() === "declined"
                                                                    ? "bg-red-100 text-red-800 border border-red-200"
                                                                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                            }`}>
                                                                {pay.status.toLowerCase() === "approved" ? (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Approved
                                                                    </>
                                                                ) : pay.status.toLowerCase() === "declined" ? (
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
                                                                        Success
                                                                    </>
                                                                )}
                                                            </span>
                                                </td>
                                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                            {pay.status.toLowerCase() === "success" ? (
                                                    <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleApprove(pay.id)}
                                                                    disabled={actionLoading === pay.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === pay.id ? (
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
                                                                    onClick={() => handleDecline(pay.id)}
                                                                    disabled={actionLoading === pay.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === pay.id ? (
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
                                                                        {pay.status.toLowerCase() === "approved" ? "Approved" : "Declined"}
                                                            </span>
                                                                </div>
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

export default ApprovedCardPage;
