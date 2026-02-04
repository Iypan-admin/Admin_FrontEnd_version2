import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ResourceNotificationBell from "../components/ResourceNotificationBell";
import { getAllLSRWContent, getCurrentUserProfile } from '../services/Api';
import { FolderOpen, Loader2, Search, X, Headphones, Mic, Book, PenTool, Eye, Download, FileText, Image, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useNavigate } from "react-router-dom";

function LSRWFileViewPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileViewTab, setFileViewTab] = useState('listening'); // 'listening', 'speaking', 'reading', 'writing'
  const [allFiles, setAllFiles] = useState([]); // All LSRW files grouped by course
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [playingAudio, setPlayingAudio] = useState(null); // Track which audio is currently playing
  const [filesFetched, setFilesFetched] = useState(false); // Track if files have been fetched
  const [fileViewSearchTerm, setFileViewSearchTerm] = useState(''); // Search term for filtering courses in file view
  const [expandedCourses, setExpandedCourses] = useState(new Set()); // Track which courses are expanded

  // Common Berry Style States
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
  const [error, setError] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());

  // Get current user details from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'Resource Manager');

  const getDisplayName = () => {
      if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
          return profileInfo.full_name;
      }
      return userName;
  };

  // LSRW Module tabs configuration
  const lsrwTabs = [
    { id: 'listening', name: 'Listening', icon: Headphones, color: 'blue' },
    { id: 'speaking', name: 'Speaking', icon: Mic, color: 'purple' },
    { id: 'reading', name: 'Reading', icon: Book, color: 'green' },
    { id: 'writing', name: 'Writing', icon: PenTool, color: 'orange' },
  ];

  useEffect(() => {
    // Only fetch profile initially, files will be fetched via primary useEffect
    const fetchProfileInfo = async () => {
        try {
            const response = await getCurrentUserProfile();
            if (response.success && response.data) {
                setProfileInfo(response.data);
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

  // Responsive and Sidebar handlers
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
        setIsMobileMenuOpen(event.detail);
    };
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
    
    return () => {
        window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  // Fetch all LSRW files grouped by course (Optimized)
  const fetchAllFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError(null);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use the new optimized endpoint that returns everything at once
      const response = await getAllLSRWContent(token);
      
      if (response && response.success && Array.isArray(response.data)) {
        setAllFiles(response.data);
        // Extract courses from the response data itself since we might not have fetched them separately
        if (response.data.length > 0 && (!courses || courses.length === 0)) {
            const extractedCourses = response.data.map(item => ({
                id: item.courseId,
                course_name: item.courseName,
                language: item.language,
                level: item.level
            }));
            setCourses(extractedCourses);
        }
      } else {
        setAllFiles([]);
      }
      
      setFilesFetched(true);
    } catch (error) {
      console.error('Error fetching all files:', error);
      setError('Failed to fetch files');
      setAllFiles([]);
    } finally {
      setLoadingFiles(false);
      setLoading(false);
    }
  }, [courses]);

  // Fetch files when component mounts - optimized single call
  useEffect(() => {
    if (!filesFetched) {
      fetchAllFiles();
    }
  }, [filesFetched, fetchAllFiles]);

  // Handle file preview
  const handlePreview = (fileUrl, fileName, fileType, textContent = null) => {
    if (fileType === 'audio' || (fileUrl && isAudioFile(fileUrl))) {
      setPlayingAudio(playingAudio === fileUrl ? null : fileUrl);
      return;
    }
    setPreviewFile({ url: fileUrl, name: fileName, type: fileType, textContent: textContent });
  };

  // Handle file download
  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get file name from URL
  const getFileName = (url) => {
    if (!url) return 'No file';
    const parts = url.split('/');
    return parts[parts.length - 1] || 'file';
  };


  // Get file extension
  const getFileExtension = (url) => {
    if (!url) return '';
    const fileName = getFileName(url);
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  // Check if file is PDF
  const isPdfFile = (url) => {
    return getFileExtension(url) === 'pdf';
  };

  // Check if file is audio
  const isAudioFile = (url) => {
    const ext = getFileExtension(url);
    return ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                                Resource Manager
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                File Management System
                            </p>
                        </div>
                    </div>

                    {/* Right: Profile Dropdown */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <ResourceNotificationBell />
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
                                        {getDisplayName()?.charAt(0).toUpperCase() || "R"}
                                    </div>
                                )}
                            </button>

                            {/* Profile Dropdown Menu */}
                            {isProfileDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsProfileDropdownOpen(false)}
                                    ></div>
                                    
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <h3 className="font-bold text-gray-800 text-base">
                                                Welcome, {getDisplayName()?.split(' ')[0] || "Manager"}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider">Resource Manager</p>
                                        </div>

                                        <div className="py-2">
                                            <button
                                                onClick={() => {
                                                    navigate('/resource-manager/account-settings');
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with Title and Search */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <FolderOpen className="w-6 h-6 text-white" />
                        </div>
                        LSRW File View
                    </h2>
                    <p className="text-gray-600 mt-2 ml-14">
                        View and manage all uploaded file resources across courses
                    </p>
                </div>

                {/* Module Tabs - Berry Style */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {lsrwTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = fileViewTab === tab.id;
                            let activeClass = '';
                            let textClass = 'text-gray-600 hover:bg-gray-50';
                            
                            if (isActive) {
                                if (tab.color === 'blue') activeClass = 'bg-blue-600 text-white shadow-md';
                                else if (tab.color === 'purple') activeClass = 'bg-purple-600 text-white shadow-md';
                                else if (tab.color === 'green') activeClass = 'bg-green-600 text-white shadow-md';
                                else activeClass = 'bg-orange-600 text-white shadow-md';
                                textClass = 'text-white';
                            }

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setFileViewTab(tab.id)}
                                    className={`
                                        flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200
                                        ${activeClass || textClass}
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search Bar - Berry Style */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by course name, language, or level..."
                            value={fileViewSearchTerm}
                            onChange={(e) => setFileViewSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        {fileViewSearchTerm && (
                            <button
                                onClick={() => setFileViewSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center shadow-sm">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Error Fetching Resources</h3>
                  <p className="text-xs text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* File List Content */}
            {loadingFiles ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800">Loading Resources</h3>
                <p className="text-gray-500 mt-2">Fetching course materials...</p>
              </div>
            ) : (
                <div className="grid gap-6">
                {(() => {
                  if (courses.length === 0) {
                    return (
                      <div className="bg-white rounded-xl shadow-md p-10 text-center border-2 border-dashed border-gray-300">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Courses Available</h3>
                        <p className="text-gray-500">Please add courses to the system first.</p>
                      </div>
                    );
                  }

                  if (allFiles.length === 0 && courses.length > 0 && !loadingFiles && filesFetched) {
                    return (
                      <div className="bg-white rounded-xl shadow-md p-10 text-center border-2 border-dashed border-gray-300">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Files Uploaded</h3>
                        <p className="text-gray-500">No matching resources found for any course.</p>
                      </div>
                    );
                  }

                  const filteredCourses = fileViewSearchTerm.trim() === '' 
                    ? allFiles 
                    : allFiles.filter(course => 
                        course.courseName.toLowerCase().includes(fileViewSearchTerm.toLowerCase()) ||
                        course.language?.toLowerCase().includes(fileViewSearchTerm.toLowerCase()) ||
                        course.level?.toLowerCase().includes(fileViewSearchTerm.toLowerCase())
                      );

                  if (filteredCourses.length === 0 && fileViewSearchTerm.trim() !== '') {
                    return (
                      <div className="bg-white rounded-xl shadow-md p-10 text-center">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Matches Found</h3>
                        <p className="text-gray-500 mb-4">No courses matching "{fileViewSearchTerm}"</p>
                        <button
                          onClick={() => setFileViewSearchTerm('')}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                        >
                          Clear Search
                        </button>
                      </div>
                    );
                  }

                  return filteredCourses.map((course) => {
                    const moduleFiles = course.modules[fileViewTab] || [];
                    const isExpanded = expandedCourses.has(course.courseId);
                    
                    const toggleCourse = () => {
                      const newExpanded = new Set(expandedCourses);
                      if (isExpanded) {
                        newExpanded.delete(course.courseId);
                      } else {
                        newExpanded.add(course.courseId);
                      }
                      setExpandedCourses(newExpanded);
                    };
                    
                    return (
                      <div 
                        key={course.courseId} 
                        className={`bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}
                      >
                        <button
                          onClick={toggleCourse}
                          className="w-full px-6 py-5 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'} transition-all`}>
                                <Book className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                    {course.courseName}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                        {course.language}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                        {course.level}
                                    </span>
                                    <span className="text-xs text-gray-400 mx-1">•</span>
                                    <span className="text-xs text-gray-500">
                                        {moduleFiles.length} {moduleFiles.length === 1 ? 'Session' : 'Sessions'}
                                    </span>
                                </div>
                            </div>
                          </div>
                          <div className={`p-2 rounded-full ${isExpanded ? 'bg-gray-100 rotate-180' : 'bg-white'} transition-all duration-300`}>
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50/50">
                            {moduleFiles.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {moduleFiles.map((session, sessionIndex) => {
                                    const sessionKey = `${course.courseId}_session_${session.sessionNumber || sessionIndex + 1}`;
                                    const isSessionExpanded = expandedSessions.has(sessionKey);
                                    
                                    const toggleSession = () => {
                                        const newExpanded = new Set(expandedSessions);
                                        if (isSessionExpanded) {
                                            newExpanded.delete(sessionKey);
                                        } else {
                                            newExpanded.add(sessionKey);
                                        }
                                        setExpandedSessions(newExpanded);
                                    };

                                    return (
                                        <div key={sessionIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                            <div 
                                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={toggleSession}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="cursor-grab text-gray-300 hover:text-gray-500 p-1">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-gray-700">
                                                        Session {session.sessionNumber || sessionIndex + 1}
                                                    </span>
                                                    {(session.title && session.title !== `Session ${session.sessionNumber}`) && (
                                                        <span className="text-sm text-gray-500 border-l border-gray-300 pl-3">
                                                            {session.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                        {session.files?.length || 0} Files
                                                    </span>
                                                    {isSessionExpanded ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                                                </div>
                                            </div>

                                            {isSessionExpanded && (
                                                <div className="border-t border-gray-100 p-3 bg-gray-50">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {session.files && session.files.map((file, fIndex) => (
                                                            <div key={fIndex} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow group relative">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                                                                        file.file_type === 'audio' ? 'bg-blue-100 text-blue-600' :
                                                                        file.file_type === 'video' ? 'bg-purple-100 text-purple-600' :
                                                                        file.file_type === 'image' ? 'bg-green-100 text-green-600' :
                                                                        file.file_type === 'document' ? 'bg-orange-100 text-orange-600' :
                                                                        'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {file.file_type === 'audio' && <Headphones className="w-5 h-5" />}
                                                                        {file.file_type === 'video' && <Eye className="w-5 h-5" />}
                                                                        {file.file_type === 'image' && <Image className="w-5 h-5" />}
                                                                        {file.file_type === 'document' && <FileText className="w-5 h-5" />}
                                                                        {file.file_type === 'text' && <FileText className="w-5 h-5" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-gray-800 truncate" title={file.file_name}>
                                                                            {file.file_name || 'Untitled File'}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handlePreview(file.file_url, file.file_name, file.file_type, file);
                                                                                }}
                                                                                className="p-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                                            >
                                                                                Preview
                                                                            </button>
                                                                            {file.file_url && !file.is_external_url && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDownload(file.file_url, file.file_name);
                                                                                    }}
                                                                                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                                                                                    title="Download"
                                                                                >
                                                                                    <Download className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-gray-500 italic">No sessions found for this module yet.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* File Preview Modal */}
            {previewFile && (
              <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewFile(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 truncate pr-4">
                        {previewFile.name || 'File Preview'}
                    </h3>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-gray-100">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-full p-4 flex items-center justify-center">
                        {(previewFile.type === 'text' || previewFile.textContent) && !previewFile.url ? (
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="prose max-w-none">
                                {(() => {
                                const textData = previewFile.textContent || {};
                                const fields = [
                                    { key: 'title', label: 'Title' },
                                    { key: 'instruction', label: 'Instruction' },
                                    { key: 'passage', label: 'Passage' },
                                    { key: 'content_text', label: 'Content' },
                                    { key: 'text_content', label: 'Text Content' },
                                    { key: 'question', label: 'Question' },
                                    { key: 'description', label: 'Description' },
                                    { key: 'content', label: 'Content' }
                                ];
                                
                                const availableFields = fields.filter(field => textData[field.key] && textData[field.key].trim());
                                const questions = textData.questions || textData.reading_questions || null;
                                const hasQuestions = questions && Array.isArray(questions) && questions.length > 0;
                                
                                return (
                                    <div className="space-y-6">
                                        {availableFields.map((field) => (
                                            <div key={field.key} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{field.label}</h4>
                                                <div className="text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
                                                    {textData[field.key]}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {hasQuestions && (
                                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                                                <h4 className="text-lg font-bold text-blue-800 mb-4">Questions</h4>
                                                <div className="space-y-4">
                                                    {questions.map((q, qIndex) => (
                                                        <div key={qIndex} className="bg-white p-4 rounded border border-blue-100 shadow-sm">
                                                            <p className="font-semibold text-gray-800 mb-3"><span className="text-blue-600 mr-2">{qIndex + 1}.</span>{q.question}</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6 text-sm">
                                                                {q.optionA && <div className="p-2 bg-gray-50 rounded text-gray-700">A) {q.optionA}</div>}
                                                                {q.optionB && <div className="p-2 bg-gray-50 rounded text-gray-700">B) {q.optionB}</div>}
                                                                {q.optionC && <div className="p-2 bg-gray-50 rounded text-gray-700">C) {q.optionC}</div>}
                                                                {q.optionD && <div className="p-2 bg-gray-50 rounded text-gray-700">D) {q.optionD}</div>}
                                                            </div>
                                                            {q.correct_answer && (
                                                                <div className="mt-3 pt-2 border-t border-dashed border-gray-200 text-right">
                                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Answer: {q.correct_answer.toUpperCase()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                                })()}
                            </div>
                        </div>
                        ) : previewFile.type === 'image' && previewFile.url ? (
                        <div className="text-center">
                            <img 
                                src={previewFile.url} 
                                alt={previewFile.name} 
                                className="max-w-full max-h-[80vh] rounded-lg shadow-lg object-contain"
                            />
                        </div>
                        ) : previewFile.type === 'audio' || previewFile.type === 'audio_url' ? (
                        <div className="p-12 text-center w-full max-w-2xl bg-gray-50 rounded-2xl">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Headphones className="w-10 h-10 text-blue-600" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800 mb-6">{previewFile.name}</h4>
                            <audio controls className="w-full" src={previewFile.url} />
                        </div>
                        ) : previewFile.type === 'video' || previewFile.type === 'video_url' ? (
                        <div className="w-full h-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            {previewFile.url && (previewFile.url.includes('youtube.com') || previewFile.url.includes('vimeo.com')) ? (
                                <iframe
                                    src={previewFile.url.includes('youtube.com') ? previewFile.url.replace('watch?v=', 'embed/') : previewFile.url}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={previewFile.name}
                                />
                            ) : (
                                <video controls className="w-full h-full" src={previewFile.url} />
                            )}
                        </div>
                        ) : isPdfFile(previewFile.url) ? (
                        <iframe
                            src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=1`}
                            className="w-full h-[80vh] rounded-lg border border-gray-200"
                            title={previewFile.name}
                        />
                        ) : (
                        <div className="text-center p-12">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Preview Not Available</h4>
                            <p className="text-gray-500 mb-6">This file type allows downloading only.</p>
                            <a
                                href={previewFile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download File
                            </a>
                        </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LSRWFileViewPage;
