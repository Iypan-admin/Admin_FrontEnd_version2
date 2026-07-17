import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserProfile } from '../services/Api';
import CenterNotificationBell from './CenterNotificationBell';

const CenterHeader = ({ title, subtitle, icon: Icon }) => {
    const navigate = useNavigate();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [profileInfo, setProfileInfo] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Sync mobile menu state from Navbar
    useEffect(() => {
        const handleMobileMenuStateChange = (event) => {
            setIsMobileMenuOpen(event.detail);
        };
        window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
        return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    }, []);

    // Get current user's name and role from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userRole = decodedToken?.role || null;
    const userName = (decodedToken?.full_name && decodedToken.full_name.trim() !== '') 
        ? decodedToken.full_name 
        : (decodedToken?.name || 'Center Admin');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await getCurrentUserProfile();
                if (response.success && response.data) {
                    setProfileInfo(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err);
            }
        };
        fetchProfile();
    }, []);

    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
                    {/* Left: Mobile Toggle & Icon & Title */}
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                        {/* Mobile Toggle */}
                        <button 
                            onClick={toggleMobileMenu}
                            className="lg:hidden p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200"
                            title="Toggle Menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        
                        {Icon && (
                            <div
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                                style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}
                            >
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                        )}
                        
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate tracking-tight">
                                {title || 'Center Administrator'}
                            </h1>
                            {subtitle && (
                                <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 hidden sm:block truncate opacity-80">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Notifications & Profile */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <CenterNotificationBell />
                        
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center focus:outline-none group"
                            >
                                {profileInfo?.profile_picture ? (
                                    <img
                                        src={profileInfo.profile_picture}
                                        alt="Profile"
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                                    />
                                ) : (
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                                        {userName?.charAt(0).toUpperCase() || "C"}
                                    </div>
                                )}
                            </button>

                            {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden text-left">
                                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                                            <h3 className="font-bold text-gray-800 text-base">
                                                Welcome, {profileInfo?.full_name || userName}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1 capitalize">Center Admin</p>
                                        </div>

                                        <div className="py-2">
                                            <button
                                                onClick={() => {
                                                    navigate('/center-admin/account-settings');
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

                                            {/* Certificate Management - Only for Admin, Manager, Academic Coordinator */}
                                            {(userRole === 'admin' || userRole === 'manager' || userRole === 'academic_coordinator') && (
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
                                            )}

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
        </nav>
    );
};

export default CenterHeader;
