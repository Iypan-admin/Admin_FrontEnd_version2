import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StateNotificationBell from '../components/StateNotificationBell';
import { getStateNotifications, markStateNotificationAsRead, getCurrentUserProfile } from '../services/Api';

const StateNotificationPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
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
        : (decodedToken?.name || 'State Admin');



    const getDisplayName = () => {
        if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
            return profileInfo.full_name;
        }
        if (userName && userName.trim() !== '') {
            return userName;
        }
        return "State Admin";
    };

    // Fetch profile info
    useEffect(() => {
        const fetchProfileInfo = async () => {
            try {
                const response = await getCurrentUserProfile();
                if (response.success && response.data) {
                    setProfileInfo(response.data);
                    setProfilePictureUrl(response.data.profile_picture || null);
                }
            } catch (error) {
                console.error("Failed to fetch profile info:", error);
            }
        };
        fetchProfileInfo();

        window.addEventListener('profileUpdated', fetchProfileInfo);
        return () => window.removeEventListener('profileUpdated', fetchProfileInfo);
    }, []);


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

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async (isInitialLoad = false) => {
            if (isInitialLoad) setLoading(true);
            try {
                const res = await getStateNotifications(token);
                if (res.success) {
                    setNotifications(res.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            } finally {
                if (isInitialLoad) setLoading(false);
            }
        };

        fetchNotifications(true);
        const interval = setInterval(() => fetchNotifications(false), 5000);
        return () => clearInterval(interval);
    }, [token]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNotificationType = (notif) => {
        const message = (notif.message || '').toLowerCase();
        const type = (notif.type || '').toUpperCase();
        
        if (type.includes('BATCH') || message.includes('batch')) {
            return { label: 'Batch Request', color: 'bg-amber-100 text-amber-800' };
        }
        if (type.includes('CENTER') || message.includes('center')) {
            return { label: 'Center Request', color: 'bg-green-100 text-green-800' };
        }
        if (type.includes('INVOICE') || message.includes('invoice')) {
            return { label: 'Invoice Request', color: 'bg-blue-100 text-blue-800' };
        }
        return { label: 'General', color: 'bg-gray-100 text-gray-800' };
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markStateNotificationAsRead(notificationId, token);
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    // Pagination
    const totalPages = Math.ceil(notifications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                                <button 
                                    onClick={toggleMobileMenu}
                                    className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                                >
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Notifications</h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <StateNotificationBell />
                                
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
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                                                {getDisplayName()?.charAt(0).toUpperCase()}
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
                                                        Welcome, {getDisplayName() || "User"}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1 capitalize">State Admin</p>
                                                </div>


                                                <div className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            navigate('/state/account-settings');
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
                                                        <span className="text-sm text-gray-700 font-medium">Logout</span>
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

                {/* Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="inline-block w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <h3 className="text-lg font-semibold text-gray-800">No notifications</h3>
                                    <p className="text-sm text-gray-500">You don't have any notifications at the moment.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {paginatedNotifications.map((notif) => {
                                                    const type = getNotificationType(notif);
                                                    return (
                                                        <tr key={notif.id} className={!notif.is_read ? 'bg-blue-50/30' : ''}>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                                                                    {type.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-900">
                                                                {notif.message}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(notif.created_at)}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                {notif.is_read ? (
                                                                    <span className="text-gray-400 text-xs">Read</span>
                                                                ) : (
                                                                    <span className="text-blue-600 text-xs font-bold">Unread</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                {!notif.is_read && (
                                                                    <button
                                                                        onClick={() => handleMarkAsRead(notif.id)}
                                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                                    >
                                                                        Mark as Read
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {totalPages > 1 && (
                                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                            <div className="text-sm text-gray-700">
                                                Showing {startIndex + 1} to {Math.min(endIndex, notifications.length)} of {notifications.length}
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => goToPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 border rounded hover:bg-white disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => goToPage(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 border rounded hover:bg-white disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StateNotificationPage;
