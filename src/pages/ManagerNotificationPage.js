import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import { getManagerNotifications, markManagerNotificationAsRead } from '../services/Api';

const ManagerNotificationPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Manager";
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

  // Fetch notifications - show ALL notifications (both read and unread)
  useEffect(() => {
    const fetchNotifications = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      }
      try {
        const res = await getManagerNotifications(token);
        if (res.success) {
          // Show ALL notifications (both read and unread)
          setNotifications(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    };

    // Initial load with loading indicator
    fetchNotifications(true);
    
    // Set up background polling for real-time updates every 5 seconds (no loading indicator)
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [token]);

  // Format date
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

  // Get notification type badge
  const getNotificationType = (notif) => {
    const message = (notif.message || '').toLowerCase();
    const type = (notif.type || '').toUpperCase();
    
    if (type.includes('BATCH') || message.includes('batch')) {
      if (message.includes('pending') || message.includes('approval')) {
        return { label: 'Batch Approval', color: 'bg-amber-100 text-amber-800' };
      }
      return { label: 'Batch', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (type.includes('CENTER') || message.includes('center')) {
      return { label: 'Center', color: 'bg-green-100 text-green-800' };
    }
    
    if (type.includes('EVENT') || type.includes('MEETING') || message.includes('event')) {
      return { label: 'Event', color: 'bg-purple-100 text-purple-800' };
    }
    
    return { label: 'General', color: 'bg-gray-100 text-gray-800' };
  };

  // Mark notification as read (keep it in the list, just update status)
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markManagerNotificationAsRead(notificationId, token);
      // Update notification status to read (don't remove from list)
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
                    Notifications
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <ManagerNotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                      {getDisplayName()?.charAt(0).toUpperCase() || "M"}
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "Manager"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Manager</p>
                        </div>

                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/manager/account-settings');
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

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Table Container - BERRY Style */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                  <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No notifications</h3>
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedNotifications.map((notif, index) => {
                          const type = getNotificationType(notif);
                          const fullMessage = notif.message || '';
                          const messageParts = fullMessage.split('\n');
                          const hasTitle = messageParts.length > 1;
                          const title = hasTitle ? messageParts[0] : '';
                          const message = hasTitle ? messageParts.slice(1).join(' ') : fullMessage;
                          
                          return (
                            <tr key={notif.id} className={`hover:bg-gray-50 transition-colors duration-200 ${!notif.is_read ? 'bg-blue-50/30' : 'bg-white'}`}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {startIndex + index + 1}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                                  {type.label}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-900">
                                  {title && (
                                    <p className="font-semibold mb-1">{title}</p>
                                  )}
                                  <p className="text-gray-600">{message}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(notif.created_at)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {notif.is_read ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Read
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Unread
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                {!notif.is_read ? (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                  >
                                    Mark as Read
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-sm">Already read</span>
                                )}

                                {/* Specific action for batch approval */}
                                {message.toLowerCase().includes('batch') && (message.toLowerCase().includes('pending') || message.toLowerCase().includes('approval')) && (
                                  <button
                                    onClick={() => navigate('/batch-approval')}
                                    className="ml-4 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                  >
                                    Review Batch
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(endIndex, notifications.length)}</span> of{' '}
                          <span className="font-medium">{notifications.length}</span> entries
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerNotificationPage;
