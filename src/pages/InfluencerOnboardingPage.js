import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getInfluencerCount, getAllInfluencers, submitInfluencer, getCurrentUserProfile } from "../services/Api";
import CardAdminNotificationBell from "../components/CardAdminNotificationBell";

// Helper components for consistency
const StatCard = ({ title, count, subtitle, icon, color }) => (
    <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between z-10 relative">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-800">{count}</h3>
                <p className={`text-xs mt-2 font-medium ${color === 'blue' ? 'text-blue-500' : color === 'purple' ? 'text-purple-500' : 'text-pink-500'}`}>
                    {subtitle}
                </p>
            </div>
            <div className={`p-3 rounded-xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600'}`}>
                {icon}
            </div>
        </div>
        
        {/* Background decoration */}
        <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 ${color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : 'bg-pink-500'}`} />
    </div>
);

const InfluencerOnboardingPage = () => {
    const navigate = useNavigate();
    const [totalInfluencers, setTotalInfluencers] = useState(0);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
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
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState('form');
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: '' });
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    // ... existing token/profile logic ...

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = influencers.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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

    // Fetch influencer data
    const fetchInfluencerData = async () => {
        try {
            setPageLoading(true);
            const countResponse = await getInfluencerCount();
            const data = await getAllInfluencers();
            setTotalInfluencers(countResponse.count || 0);
            setInfluencers(data);
        } catch (error) {
            console.error('Error fetching influencer data:', error);
        } finally {
            setPageLoading(false);
        }
    };

    // Fetch user profile
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

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

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

    // Load data on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchInfluencerData();
        fetchUserProfile();
    }, [navigate]);

    // Sync mobile menu state with Navbar
    useEffect(() => {
        const handleMobileMenuStateChange = (event) => {
            setIsMobileMenuOpen(event.detail);
        };
        window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
        return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    }, []);

    // Listen for profile update events
    useEffect(() => {
        const handleProfileUpdate = () => {
            console.log('Profile update event received in InfluencerOnboardingPage');
            fetchUserProfile();
            // Also refresh token-based name in case it was updated
            const token = localStorage.getItem("token");
            if (token) {
                const decodedToken = JSON.parse(atob(token.split(".")[1]));
                const newUserName = (decodedToken?.full_name && 
                                  decodedToken.full_name !== null && 
                                  decodedToken.full_name !== undefined && 
                                  String(decodedToken.full_name).trim() !== '') 
                    ? decodedToken.full_name 
                    : (decodedToken?.name || 'Admin');
                console.log('Updated token name:', newUserName);
                // Force re-render by updating state
                setProfileInfo(prev => prev ? {...prev} : null);
            }
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleConfirm = () => {
        const { name, email, phone, role } = formData;
        if (!name || !email || !phone || !role) {
            alert("⚠️ Please fill all the fields");
            return;
        }
        setStep("confirm");
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await submitInfluencer(formData);
            alert("✅ Mail sent to " + formData.email);
            setFormData({ name: "", email: "", phone: "", role: "" });
            setStep("form");
            setShowModal(false);
            fetchInfluencerData();
        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Header Style matched from CardAdminPage.js */}
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
                                        Influencer Board
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage influencer collaborations
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

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {pageLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* Actions & Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Welcome Card */}
                                <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Manage Influencers</h2>
                                        <p className="text-blue-100 mb-6 max-w-lg">
                                            Streamline your influencer onboarding process and manage your network efficiently.
                                        </p>
                                        <button 
                                            onClick={() => setShowModal(true)}
                                            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2.5 rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add New Influencer
                                        </button>
                                    </div>
                                    {/* Decorative circles */}
                                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                </div>

                                {/* Stat Card */}
                                <StatCard 
                                    title="Total Influencers" 
                                    count={totalInfluencers} 
                                    subtitle="Active Network"
                                    icon={
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    }
                                    color="purple"
                                />
                            </div>

                            {/* Table Section */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                        Influencer Directory
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full border border-blue-100">
                                        {influencers.length} Members
                                    </span>
                                </div>

                                {influencers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    <th className="px-6 py-4">S.No</th>
                                                    <th className="px-6 py-4">Influencer</th>
                                                    <th className="px-6 py-4">Contact Info</th>
                                                    <th className="px-6 py-4">Role</th>
                                                    <th className="px-6 py-4 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {currentItems.map((inf, index) => (
                                                    <tr key={inf.influencer_id || index} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-6 py-4 text-gray-500 font-medium">#{indexOfFirstItem + index + 1}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200">
                                                                    {inf.name?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{inf.name}</p>
                                                                    <p className="text-xs text-gray-500">ID: {inf.influencer_id?.slice(0,8)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                                                    {inf.email}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                                    {inf.phone}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                inf.role === 'Moms' 
                                                                    ? 'bg-pink-100 text-pink-700 border border-pink-200' 
                                                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                                    inf.role === 'Moms' ? 'bg-pink-500' : 'bg-indigo-500'
                                                                }`}></span>
                                                                {inf.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                                Active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center bg-white">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">No influencers found</h3>
                                        <p className="text-gray-500 mb-6">Get started by adding your first influencer.</p>
                                        <button
                                            onClick={() => setShowModal(true)}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                        >
                                            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Influencer
                                        </button>
                                    </div>
                                )}
                                
                                {/* Pagination Footer */}
                                {influencers.length > 0 && (
                                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, influencers.length)}</span> of <span className="font-medium">{influencers.length}</span> results
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => paginate(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    {[...Array(Math.ceil(influencers.length / itemsPerPage)).keys()].map((number) => (
                                                        <button
                                                            key={number + 1}
                                                            onClick={() => paginate(number + 1)}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                                                        >
                                                            {number + 1}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => paginate(currentPage + 1)}
                                                        disabled={currentPage === Math.ceil(influencers.length / itemsPerPage)}
                                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === Math.ceil(influencers.length / itemsPerPage) ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Right Slide Drawer Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Backdrop */}
                        <div 
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
                            onClick={() => setShowModal(false)}
                        ></div>

                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            {/* Slide Panel */}
                            <div className="pointer-events-auto w-screen max-w-md transform transition ease-in-out duration-500 sm:duration-700 translate-x-0 relative">
                                <div className="flex h-full flex-col bg-white shadow-2xl">
                                    {/* Header */}
                                    <div className="px-4 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-white" id="slide-over-title">
                                                {step === "form" ? "Add New Influencer" : "Confirm Details"}
                                            </h2>
                                            <button
                                                type="button"
                                                className="rounded-md text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                                                onClick={() => setShowModal(false)}
                                            >
                                                <span className="sr-only">Close panel</span>
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-blue-100">
                                                {step === "form" ? "Fill in the information below to add a new influencer." : "Please review the details before submitting."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="relative flex-1 px-4 py-6 sm:px-6 overflow-y-auto bg-gray-50">
                                        {step === "form" ? (
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border transition-all"
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border transition-all"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border transition-all"
                                                        placeholder="+91 98765 43210"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div 
                                                            onClick={() => setFormData({...formData, role: 'Moms'})}
                                                            className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all duration-200 ${
                                                                formData.role === 'Moms' 
                                                                ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-md ring-1 ring-pink-500' 
                                                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${formData.role === 'Moms' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                <span className="text-lg">👩</span>
                                                            </div>
                                                            <span className="font-bold">Moms</span>
                                                        </div>
                                                        <div 
                                                            onClick={() => setFormData({...formData, role: 'Ambassador'})}
                                                            className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all duration-200 ${
                                                                formData.role === 'Ambassador' 
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md ring-1 ring-blue-500' 
                                                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${formData.role === 'Ambassador' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                <span className="text-lg">👔</span>
                                                            </div>
                                                            <span className="font-bold">Ambassador</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="px-4 py-5 sm:p-6 space-y-4">
                                                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                                        <span className="text-sm text-gray-500">Name</span>
                                                        <span className="text-sm font-semibold text-gray-900">{formData.name}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                                        <span className="text-sm text-gray-500">Email</span>
                                                        <span className="text-sm font-semibold text-gray-900">{formData.email}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                                        <span className="text-sm text-gray-500">Phone</span>
                                                        <span className="text-sm font-semibold text-gray-900">{formData.phone}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-500">Role</span>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            formData.role === 'Moms' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {formData.role}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                                    <p className="text-xs text-gray-500 text-center">
                                                        By submitting, an email invitation will be sent to the influencer.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="flex flex-shrink-0 justify-end px-4 py-4 border-t border-gray-200 bg-white sm:px-6 gap-3">
                                        <button
                                            type="button"
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                            onClick={() => {
                                                if (step === 'confirm') setStep('form');
                                                else setShowModal(false);
                                            }}
                                        >
                                            {step === 'confirm' ? 'Back' : 'Cancel'}
                                        </button>
                                        
                                        {step === 'form' ? (
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                onClick={handleConfirm}
                                            >
                                                Next Step
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={loading}
                                                className={`inline-flex justify-center rounded-lg border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                                                    loading ? 'opacity-70 cursor-not-allowed' : ''
                                                }`}
                                                onClick={handleSubmit}
                                            >
                                                {loading ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Sending...
                                                    </>
                                                ) : 'Confirm & Invite'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InfluencerOnboardingPage;
