import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AdminNotificationBell from '../components/AdminNotificationBell';
import { getAdminNotifications, markAdminNotificationAsRead, getCurrentUserProfile } from '../services/Api';

const AdminNotificationPage = () => {
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

  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = decodedToken?.full_name || decodedToken?.name || 'Admin';

  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    return userName;
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (event) => setIsMobileMenuOpen(event.detail);
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
  }, []);

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
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
  }, []);

  const fetchNotifications = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const res = await getAdminNotifications(token);
      if (res.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAdminNotificationAsRead(id, token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const paginatedNotifications = notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button onClick={toggleMobileMenu} className="lg:hidden p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Notifications</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{unreadCount} unread messages</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
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

                        {/* Certificates */}
                        <button
                          onClick={() => {
                            navigate('/certificates');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">Certificates</span>
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

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-20 text-center"><div className="inline-block w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div></div>
            ) : notifications.length === 0 ? (
              <div className="p-20 text-center text-gray-500">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800">No notifications found</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Message</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedNotifications.map(n => (
                      <tr key={n.id} className={`hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${n.is_read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                            {n.is_read ? 'Read' : 'New'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-bold text-gray-900">{n.message.split('\n')[0]}</p>
                            <p className="text-gray-500 mt-0.5">{n.message.split('\n').slice(1).join(' ')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(n.created_at)}</td>
                        <td className="px-6 py-4">
                          {!n.is_read && (
                            <button onClick={() => handleMarkAsRead(n.id)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Mark Read</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                <div className="flex space-x-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-white border border-gray-200 rounded text-sm disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPage;
