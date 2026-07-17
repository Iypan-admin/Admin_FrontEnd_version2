import React, { useState, useEffect } from 'react';
import { getStateNotifications, markStateNotificationAsRead } from '../services/Api';

const StateNotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);

    // Format relative timestamp
    const getRelativeTime = (dateString) => {
        const now = new Date();
        const notificationDate = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return hours === 1 ? '1h ago' : `${hours}hr ago`;
        }
        if (diffInSeconds < 172800) return 'Yesterday';
        const days = Math.floor(diffInSeconds / 86400);
        return days === 1 ? '1 day ago' : `${days} days ago`;
    };

    // Get avatar and color based on notification type
    const getNotificationAvatar = (notif) => {
        const message = notif.message?.toLowerCase() || '';
        const type = notif.type?.toLowerCase() || '';
        
        if (type.includes('batch') || message.includes('batch')) {
            return { bg: '#f59e0b', icon: '📦', text: 'B' };
        }
        if (type.includes('center') || message.includes('center')) {
            return { bg: '#10b981', icon: '🏢', text: 'C' };
        }
        if (type.includes('user') || message.includes('user')) {
            return { bg: '#3b82f6', icon: '👤', text: 'U' };
        }
        if (type.includes('finance') || message.includes('payment') || message.includes('invoice')) {
            return { bg: '#ef4444', icon: '💰', text: 'F' };
        }
        
        return { bg: '#6b7280', icon: '🔔', text: 'N' };
    };

    // Fetch notifications
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const fetchNotifications = async (isInitialLoad = false) => {
            if (isInitialLoad) setLoading(true);
            try {
                const res = await getStateNotifications(token);
                if (res && res.success) {
                    const unreadNotifications = (res.data || []).filter(n => !n.is_read);
                    setNotifications(unreadNotifications);
                }
            } catch (err) {
                if (!err.message?.includes('404') && !err.message?.includes('Not Found')) {
                    console.error("Failed to fetch state notifications:", err);
                }
                setNotifications([]);
            } finally {
                if (isInitialLoad) setLoading(false);
            }
        };

        fetchNotifications(true);
        const interval = setInterval(() => fetchNotifications(false), 5000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (notificationId, e) => {
        if (e) e.stopPropagation();
        const token = localStorage.getItem("token");
        if (!token) return;
        
        try {
            await markStateNotificationAsRead(notificationId, token);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        } catch (err) {
            console.error("Failed to mark state notification as read:", err);
        }
    };

    const unreadCount = notifications.length;

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Notifications"
            >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                            <span className="text-[9px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-200 bg-white">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-gray-800">
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="text-xs font-medium px-3 py-1 rounded-full text-white bg-blue-500">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-blue-50">
                                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1">No notifications</h3>
                                    <p className="text-xs text-gray-500">You're all caught up!</p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((notif) => {
                                        const avatar = getNotificationAvatar(notif);
                                        const [title, ...msgParts] = (notif.message || '').split('\n');
                                        const message = msgParts.join(' ') || title;
                                        const displayTitle = msgParts.length > 0 ? title : '';

                                        return (
                                            <div
                                                key={notif.id}
                                                className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
                                                onClick={() => handleMarkAsRead(notif.id)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div 
                                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
                                                        style={{ backgroundColor: avatar.bg }}
                                                    >
                                                        {avatar.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {displayTitle && <p className="text-sm font-semibold text-gray-900 mb-1 leading-tight">{displayTitle}</p>}
                                                        <p className="text-sm text-gray-600 line-clamp-2 leading-tight">{message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{getRelativeTime(notif.created_at)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:hidden"></div>
                                                        <button
                                                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StateNotificationBell;
