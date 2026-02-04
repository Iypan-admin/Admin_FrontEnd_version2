// src/pages/ResourceManagerPage.js
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import ResourceNotificationBell from "../components/ResourceNotificationBell";
import { getLSRWDashboardStats, getCurrentUserProfile } from "../services/Api";
import { 
    FileText, 
    Mic, 
    Headphones, 
    BookOpen, 
    Clock, 
    Activity,
    FolderOpen,
    Filter,
    Plus,
    ArrowRight
} from "lucide-react";

const ResourceManagerPage = () => {
    const navigate = useNavigate();

    // State
    const [stats, setStats] = useState({
        listening: 0,
        speaking: 0,
        reading: 0,
        writing: 0,
        total: 0
    });
    const [recentUploads, setRecentUploads] = useState([]);
    const [courseDistribution, setCourseDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true' ? '6rem' : '16rem');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [profileInfo, setProfileInfo] = useState(null);

    // User Info
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userName = (decodedToken?.full_name && String(decodedToken.full_name).trim() !== '') 
      ? decodedToken.full_name 
      : (decodedToken?.name || 'Resource Manager');

    const getDisplayName = () => profileInfo?.full_name || userName;

    // --- Effects ---

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleSidebarToggle = () => setSidebarWidth(localStorage.getItem('sidebarCollapsed') === 'true' ? '6rem' : '16rem');
        window.addEventListener('sidebarToggle', handleSidebarToggle);
        return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
    }, []);

    useEffect(() => {
        loadDashboardData();
        fetchProfileInfo();
    }, []);

    // --- Data Fetching ---

    const fetchProfileInfo = async () => {
        try {
            const response = await getCurrentUserProfile();
            if (response.success && response.data) setProfileInfo(response.data);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return;

            // Use the new optimized endpoint
            const data = await getLSRWDashboardStats(token);
            
            if (data && data.success) {
                // Update Stats
                setStats(data.stats || {
                    listening: 0,
                    speaking: 0,
                    reading: 0,
                    writing: 0,
                    total: 0
                });

                // Update Recent Activity
                // Map icons to the response data
                const enrichedUploads = (data.recentUploads || []).slice(0, 3).map(item => ({
                    ...item,
                    icon: item.module_type === 'listening' ? Headphones :
                          item.module_type === 'speaking' ? Mic :
                          item.module_type === 'reading' ? BookOpen : FileText
                }));
                setRecentUploads(enrichedUploads);

                // Update Course Distribution
                setCourseDistribution((data.courseDistribution || []).slice(0, 2));
            } else {
                console.warn("Failed to load dashboard stats or empty response");
            }

        } catch (err) {
            console.error("Dashboard data load failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    // --- Render Helpers ---

    const StatCard = ({ title, count, icon: Icon, colorClass, borderClass, bgClass }) => (
        <div className={`bg-white rounded-2xl p-6 shadow-sm border ${borderClass} relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon size={80} />
            </div>
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgClass}`}>
                    <Icon className={colorClass.replace('text-', 'text-')} size={24} />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">{loading ? '...' : count}</h3>
                <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">{title}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex relative font-sans">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Filter size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
                            <p className="text-sm text-gray-500">Welcome back, {getDisplayName().split(' ')[0]}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ResourceNotificationBell />
                        <div className="relative">
                            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm hover:ring-2 hover:ring-blue-200 transition-all">
                                {profileInfo?.profile_picture ? (
                                    <img src={profileInfo.profile_picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    getDisplayName().charAt(0).toUpperCase()
                                )}
                            </button>
                             {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100 mb-2">
                                            <p className="text-sm font-bold text-gray-800">{getDisplayName()}</p>
                                            <p className="text-xs text-gray-500">Resource Manager</p>
                                        </div>
                                        <button onClick={() => navigate('/resource-manager/account-settings')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Account Settings</button>
                                        <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign Out</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="p-6 max-w-[1600px] mx-auto space-y-8">
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Listening" 
                            count={stats.listening} 
                            icon={Headphones} 
                            colorClass="text-blue-600" 
                            bgClass="bg-blue-50"
                            borderClass="border-blue-100"
                        />
                        <StatCard 
                            title="Speaking" 
                            count={stats.speaking} 
                            icon={Mic} 
                            colorClass="text-purple-600" 
                            bgClass="bg-purple-50"
                            borderClass="border-purple-100"
                        />
                        <StatCard 
                            title="Reading" 
                            count={stats.reading} 
                            icon={BookOpen} 
                            colorClass="text-green-600" 
                            bgClass="bg-green-50"
                            borderClass="border-green-100"
                        />
                        <StatCard 
                            title="Writing" 
                            count={stats.writing} 
                            icon={FileText} 
                            colorClass="text-orange-600" 
                            bgClass="bg-orange-50"
                            borderClass="border-orange-100"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Chart/List Area */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Quick Actions (Horizontal) */}
                            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2">Upload New Content</h2>
                                        <p className="text-blue-100 max-w-md">Quickly add new learning materials including audio, text passages, and writing tasks.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => navigate('/lsrw-upload/listening')} className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all text-sm flex items-center gap-2">
                                            <Headphones size={16} /> Listening
                                        </button>
                                        <button onClick={() => navigate('/lsrw-upload/reading')} className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all text-sm flex items-center gap-2">
                                            <BookOpen size={16} /> Reading
                                        </button>
                                        <button onClick={() => navigate('/lsrw-upload/writing')} className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-all text-sm flex items-center gap-2">
                                            <FileText size={16} /> Writing
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            </div>

                            {/* Recent Activity List */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Clock size={20} className="text-gray-400" /> Recent Uploads
                                    </h3>
                                    <button onClick={() => navigate('/lsrw-file-view')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                        View All <ArrowRight size={16} />
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {loading ? (
                                        <div className="p-8 text-center text-gray-400">Loading activity...</div>
                                    ) : recentUploads.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">No recent activity found.</div>
                                    ) : (
                                        recentUploads.map((item, idx) => (
                                            <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                                    item.module_type === 'listening' ? 'bg-blue-100 text-blue-600' :
                                                    item.module_type === 'speaking' ? 'bg-purple-100 text-purple-600' :
                                                    item.module_type === 'reading' ? 'bg-green-100 text-green-600' :
                                                    'bg-orange-100 text-orange-600'
                                                }`}>
                                                    <item.icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800 truncate">{item.title || 'Untitled Resource'}</h4>
                                                    <p className="text-sm text-gray-500 truncate">{item.course_name}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                         item.module_type === 'listening' ? 'bg-blue-50 text-blue-700' :
                                                         item.module_type === 'speaking' ? 'bg-purple-50 text-purple-700' :
                                                         item.module_type === 'reading' ? 'bg-green-50 text-green-700' :
                                                         'bg-orange-50 text-orange-700'
                                                    }`}>
                                                        {item.module_type}
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                            
                            {/* Course Distribution */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Activity size={20} className="text-gray-400"/> Activity by Course
                                </h3>
                                {loading ? (
                                    <div className="text-center py-4 text-gray-400">Loading stats...</div>
                                ) : (
                                    <div className="space-y-4">
                                        {courseDistribution.map((course, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between text-sm mb-1.5">
                                                    <span className="font-medium text-gray-700 truncate max-w-[180px]" title={course.name}>{course.name}</span>
                                                    <span className="text-gray-500">{course.count} files</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div 
                                                        className="bg-indigo-500 h-2 rounded-full" 
                                                        style={{ width: `${Math.min(100, (course.count / Math.max(...courseDistribution.map(c => c.count))) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                        {courseDistribution.length === 0 && <p className="text-sm text-gray-500 text-center">No data available</p>}
                                    </div>
                                )}
                            </div>

                            {/* Quick Navigation */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FolderOpen size={20} className="text-gray-400"/> Shortcuts
                                </h3>
                                <div className="space-y-2">
                                    <button onClick={() => navigate('/lsrw-file-view')} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors flex justify-between items-center group">
                                        <span className="font-medium">File Repository</span>
                                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                    <button onClick={() => navigate('/lsrw-upload/speaking')} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors flex justify-between items-center group">
                                        <span className="font-medium">New Speaking Task</span>
                                        <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                     <button onClick={() => navigate('/resource-manager/account-settings')} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-indigo-600 transition-colors flex justify-between items-center group">
                                        <span className="font-medium">Settings</span>
                                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default ResourceManagerPage;
