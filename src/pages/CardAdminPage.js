// src/pages/CardAdminPage.js
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import CardAdminNotificationBell from "../components/CardAdminNotificationBell";
import { getCardStats, getRecentPendingCards, getCurrentUserProfile } from "../services/Api";

const CardAdminPage = () => {
    const navigate = useNavigate();

    const [pendingCount, setPendingCount] = useState(0);
    const [activeCount, setActiveCount] = useState(0);
    const [expiredCount, setExpiredCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [recentCards, setRecentCards] = useState([]);
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
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);

    // Get current user's name from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userName = (decodedToken?.full_name && 
                      decodedToken.full_name !== null && 
                      decodedToken.full_name !== undefined && 
                      String(decodedToken.full_name).trim() !== '') 
      ? decodedToken.full_name 
      : (decodedToken?.name || 'Card Admin');

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

    // Fetch profile info
    useEffect(() => {
        const fetchProfileInfo = async () => {
            try {
                const response = await getCurrentUserProfile();
                if (response.success && response.data) {
                    setProfileInfo(response.data);
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

    // Helper function to get color classes
    const getColorClasses = (color) => {
        switch (color) {
            case "green":
                return {
                    bgGradient: "from-green-50 to-green-100",
                    iconGradient: "from-green-500 to-green-600",
                    dot: "bg-green-400",
                    textValue: "text-green-700",
                    textValueHover: "group-hover:text-green-800",
                    textTitle: "text-green-600",
                    textTitleHover: "group-hover:text-green-700"
                };
            case "yellow":
                return {
                    bgGradient: "from-yellow-50 to-yellow-100",
                    iconGradient: "from-yellow-500 to-yellow-600",
                    dot: "bg-yellow-400",
                    textValue: "text-yellow-700",
                    textValueHover: "group-hover:text-yellow-800",
                    textTitle: "text-yellow-600",
                    textTitleHover: "group-hover:text-yellow-700"
                };
            case "red":
                return {
                    bgGradient: "from-red-50 to-red-100",
                    iconGradient: "from-red-500 to-red-600",
                    dot: "bg-red-400",
                    textValue: "text-red-700",
                    textValueHover: "group-hover:text-red-800",
                    textTitle: "text-red-600",
                    textTitleHover: "group-hover:text-red-700"
                };
            case "blue":
                return {
                    bgGradient: "from-blue-50 to-blue-100",
                    iconGradient: "from-blue-500 to-blue-600",
                    dot: "bg-blue-400",
                    textValue: "text-blue-700",
                    textValueHover: "group-hover:text-blue-800",
                    textTitle: "text-blue-600",
                    textTitleHover: "group-hover:text-blue-700"
                };
            default:
                return {
                    bgGradient: "from-gray-50 to-gray-100",
                    iconGradient: "from-gray-500 to-gray-600",
                    dot: "bg-gray-400",
                    textValue: "text-gray-700",
                    textValueHover: "group-hover:text-gray-800",
                    textTitle: "text-gray-600",
                    textTitleHover: "group-hover:text-gray-700"
                };
        }
    };

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await getCardStats();
                setPendingCount(res.pending || 0);
                setActiveCount(res.active || 0);
                setExpiredCount(res.expired || 0);
                setTotalCount(res.total || 0);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            }
        };

        const loadRecent = async () => {
            try {
                const data = await getRecentPendingCards();
                setRecentCards(data);
            } catch (err) {
                console.error("Failed to fetch recent cards:", err);
            }
        };

        loadStats();
        loadRecent();
    }, []);

    return (
      <div className="min-h-screen bg-gray-50 flex">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Top Header Bar - BERRY Style */}
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
                                        Welcome back, {getDisplayName()}! 👋
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Card Administrator Dashboard
                                    </p>
                                </div>
                            </div>

                            {/* Right: Profile Dropdown */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <CardAdminNotificationBell />
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
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                                                {getDisplayName()?.charAt(0).toUpperCase() || "C"}
                                            </div>
                                        )}
                                    </button>

                                    {isProfileDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
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
                {/* Professional Welcome Section - Modern Design */}
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="relative p-5 sm:p-6 lg:p-7">
                    <div className="flex items-start space-x-5">
                      {/* Icon Container with Enhanced Design */}
                      <div className="relative group flex-shrink-0">
                        <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <div className="relative p-4 bg-white/25 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                          <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" 
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>

                      {/* Content Section with Professional Typography */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-1.5">
                          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
                            <span className="text-white">Welcome back, </span>
                            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent font-black drop-shadow-lg">
                              {userName}
                            </span>
                            <span className="text-white">!</span>
                          </h1>
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95 leading-tight tracking-tight">
                            Dashboard
                          </h2>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-blue-50 text-sm sm:text-base font-medium leading-relaxed">
                            Manage elite card applications and payments efficiently
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      title: "Active Cards",
                      value: activeCount,
                      color: "green",
                      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                      description: "Currently active cards",
                    },
                    {
                      title: "Pending Cards",
                      value: pendingCount,
                      color: "yellow",
                      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                      description: "Awaiting approval",
                    },
                    {
                      title: "Inactive Cards",
                      value: expiredCount,
                      color: "red",
                      icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
                      description: "Expired cards",
                    },
                    {
                      title: "Total Cards",
                      value: totalCount,
                      color: "blue",
                      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                      description: "All time total",
                    },
                                                        ].map((stat, idx) => {
                                const colors = getColorClasses(stat.color);
                                return (
                                <div
                                    key={idx}
                      className="group relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
                    >
                      {/* Background gradient */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${colors.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
                      ></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`p-3 bg-gradient-to-br ${colors.iconGradient} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300`}
                          >
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d={stat.icon}
                              />
                            </svg>
                          </div>
                          <div
                            className={`w-3 h-3 ${colors.dot} rounded-full animate-pulse`}
                          ></div>
                        </div>

                        <div className="space-y-2">
                          <h3
                            className={`text-3xl font-bold ${colors.textValue} ${colors.textValueHover} transition-colors duration-300`}
                          >
                            {stat.value}
                          </h3>
                          <p
                            className={`${colors.textTitle} ${colors.textTitleHover} font-semibold text-sm transition-colors duration-300`}        
                          >
                                            {stat.title}
                                        </p>
                          <p className="text-gray-500 text-xs group-hover:text-gray-600 transition-colors duration-300">
                            {stat.description}
                          </p>
                        </div>
                      </div>
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%]"></div>
                    </div>
                                );
                            })}
                </div>

                {/* Enhanced Recent Pending Cards Table */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                        </div>
                                <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            Recent Pending Cards
                          </h3>
                          <p className="text-sm text-gray-500">
                            {recentCards.length} pending requests
                          </p>
                        </div>
                                </div>
                                <button
                                    onClick={() => navigate("/elite-card-payments")}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                                    View All
                                </button>
                    </div>
                            </div>

                  <div className="overflow-x-auto">
                    <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <table className="min-w-[1000px] divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              S.No
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Card Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Card Number
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Card Holder
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Contact Info
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {recentCards.length > 0 ? (
                                            recentCards.map((card, index) => (
                              <tr
                                key={card.id}
                                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                              >
                                <td className="px-6 py-6">
                                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg">
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                      <svg
                                        className="w-4 h-4 text-white"
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
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                        {card.card_name}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                                    <p className="text-sm font-mono text-gray-700 group-hover:text-gray-800">
                                      {card.card_number}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                      <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                       <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                         {card.name_on_the_pass || card.full_name || "N/A"}
                                       </p>
                                      <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                        Card Holder
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                      {card.email?.charAt(0)?.toUpperCase() ||
                                        "U"}
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600 group-hover:text-gray-800 font-medium">
                                        {card.email}
                                      </p>
                                      <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                        Card Applicant
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-6">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 shadow-sm">
                                      {card.status}
                                    </span>
                                  </div>
                                </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr key="empty-state">
                              <td
                                colSpan="6"
                                className="px-6 py-20 text-center"
                              >
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
                                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                      />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    No Pending Cards
                                  </h3>
                                  <p className="text-gray-500 mb-6 max-w-md text-center">
                                    All card applications have been processed.
                                    Great job!
                                  </p>
                                  <div className="flex items-center space-x-2 text-green-600">
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="text-sm font-medium">
                                      All caught up!
                                    </span>
                                  </div>
                                </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                  </div>
                </div>
            </div>
        </div>
    </div>
</div>
    );
};

export default CardAdminPage;
