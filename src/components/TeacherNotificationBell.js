import React, { useState, useEffect } from 'react';
import { getTeacherNotifications, markTeacherNotificationAsRead } from '../services/Api';

const TeacherNotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Format relative timestamp (e.g., "1h ago", "12hr ago", "1 day ago")
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
    
    // Check notification type first
    if (type.includes('batch_assigned')) {
      return {
        bg: '#3b82f6', // Blue
        icon: '📚',
        text: 'B'
      };
    }
    if (type.includes('batch_approved')) {
      return {
        bg: '#10b981', // Green
        icon: '✓',
        text: '✓'
      };
    }
    if (type.includes('batch_started')) {
      return {
        bg: '#f59e0b', // Orange/Amber
        icon: '🚀',
        text: '▶'
      };
    }
    
    // Check message content
    if (message.includes('started') || message.includes('batch started')) {
      return {
        bg: '#f59e0b', // Orange/Amber
        icon: '🚀',
        text: '▶'
      };
    }
    if (message.includes('approved') && message.includes('leave')) {
      return {
        bg: '#9333ea', // Purple
        icon: '🎉',
        text: '✓'
      };
    }
    if (message.includes('approved') || message.includes('congratulation')) {
      return {
        bg: '#10b981', // Green
        icon: '✓',
        text: '✓'
      };
    }
    if (message.includes('assigned') && message.includes('batch')) {
      return {
        bg: '#3b82f6', // Blue
        icon: '📚',
        text: 'B'
      };
    }
    if (message.includes('rejected') || message.includes('declined')) {
      return {
        bg: '#ef4444', // Red
        icon: '✕',
        text: '✕'
      };
    }
    if (message.includes('message') || message.includes('new message')) {
      return {
        bg: '#8b5cf6', // Purple
        icon: '✉️',
        text: 'M'
      };
    }
    if (message.includes('order') || message.includes('payment')) {
      return {
        bg: '#f59e0b', // Orange
        icon: '🛒',
        text: '$'
      };
    }
    // Default
    return {
      bg: '#6b7280', // Gray
      icon: '🔔',
      text: 'N'
    };
  };

  // Fetch notifications
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    const fetchNotifications = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      }
      try {
        const res = await getTeacherNotifications(token);
        if (res.success) setNotifications(res.data || []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    };

    // Initial load
    fetchNotifications(true);
    
    // Set up polling for real-time updates every 10 seconds (like chat)
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Mark notification as read and remove from list
  const handleMarkAsRead = async (notificationId, e) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      await markTeacherNotificationAsRead(notificationId, token);
      // Remove notification from list (hide it)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };


  // Count only unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="View Notifications"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header - Matching Image Design */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                {/* Left: Title */}
                <h3 className="text-base font-semibold text-gray-800">
                  Notification
                </h3>
                
                {/* Middle: Badge */}
                {unreadCount > 0 && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: '#3b82f6' }}>
                    {unreadCount} New
                  </span>
                )}
                
                {/* Right: Envelope Icon */}
                <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                  <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
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
                    // Extract title and message from notification
                    // Format: "Title\nMessage" or just "Message"
                    const fullMessage = notif.message || '';
                    const messageParts = fullMessage.split('\n');
                    const hasTitle = messageParts.length > 1;
                    const title = hasTitle ? messageParts[0] : '';
                    const message = hasTitle ? messageParts.slice(1).join(' ') : fullMessage;
                    
                    return (
                      <div
                        key={notif.id}
                        className="px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 relative group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar - Circular with colored background */}
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                            style={{ backgroundColor: avatar.bg }}
                          >
                            {avatar.icon || avatar.text}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title/Sender - Bold */}
                            {title && (
                              <p className={`text-sm font-semibold mb-1 leading-tight break-words ${
                                notif.is_read ? 'text-gray-700' : 'text-gray-900'
                              }`}>
                                {title}
                              </p>
                            )}
                            
                            {/* Message - Lighter text below title - Full message with word wrap */}
                            <p className={`text-sm mb-1 leading-tight break-words ${
                              notif.is_read ? 'text-gray-500' : 'text-gray-600'
                            }`}>
                              {message}
                            </p>
                            
                            {/* Timestamp - Small gray text */}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {getRelativeTime(notif.created_at)}
                            </p>
                          </div>
                          
                          {/* Right side: Unread dot (hidden on hover) or X icon (shown on hover) */}
                          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                            {/* Unread Indicator - Blue Dot (hidden when hovering) */}
                            {!notif.is_read && (
                              <div className="w-2 h-2 rounded-full group-hover:hidden" style={{ backgroundColor: '#2196f3' }}></div>
                            )}
                            
                            {/* X Icon - Show on hover to mark as read */}
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Mark as read"
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

export default TeacherNotificationBell;

