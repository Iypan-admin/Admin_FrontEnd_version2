import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TeacherNotificationBell from "../components/TeacherNotificationBell";
import {
  getMyTutorInfo,
  createTutorInfo,
  updateTutorInfo,
  deleteTutorInfo,
  uploadTutorProfilePhoto,
} from "../services/Api";

function TutorInfoPage() {
  const navigate = useNavigate();
  const [tutorInfo, setTutorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
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

  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
      return tutorInfo.full_name;
    }
    return "Teacher";
  };

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  // Calculate profile completion percentage based on actual form fields
  const calculateProfileCompletion = (info) => {
    if (!info) return 0;
    
    // Only check fields that actually exist in the form
    const fields = [
      'full_name', 'email', 'phone', 'date_of_birth', 'gender',
      'language_taught', 'proficiency_level', 'qualification', 'experience_years', 'teaching_mode',
      'teaching_levels', 'bio', 'certifications', 'profile_photo'
    ];
    
    const filledFields = fields.filter(field => {
      const value = info[field];
      // For arrays (like teaching_levels), check if it has items
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      // For other fields, check if not empty
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion(tutorInfo);

  useEffect(() => {
    fetchTutorInfo();
  }, []);

  const fetchTutorInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching tutor info...");
      const data = await getMyTutorInfo();
      console.log("Tutor info data:", data);
      setTutorInfo(data || null);
      setFormData(data || {});
    } catch (error) {
      console.error("Failed to fetch tutor info:", error);
      setError("Failed to load tutor information");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const values = formData[name] || [];
      if (checked) {
        setFormData({ ...formData, [name]: [...values, value] });
      } else {
        setFormData({
          ...formData,
          [name]: values.filter((v) => v !== value),
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      console.log("Uploading file:", file.name, file.type, file.size);
      const publicUrl = await uploadTutorProfilePhoto(file);
      console.log("Upload successful, public URL:", publicUrl);
      setFormData({ ...formData, profile_photo: publicUrl });
      setSuccessMessage("Profile photo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload profile photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      if (tutorInfo) {
        await updateTutorInfo(formData);
        setSuccessMessage("Tutor information updated successfully!");
      } else {
        try {
          await createTutorInfo(formData);
          setSuccessMessage("Tutor information created successfully!");
        } catch (createError) {
          if (createError.message?.includes("already exists")) {
            await updateTutorInfo(formData);
            setSuccessMessage("Tutor information updated successfully!");
          } else throw createError;
        }
      }
      setEditing(false);
      fetchTutorInfo();
    } catch (error) {
      console.error("Failed to save tutor info:", error);
      setError("Failed to save tutor information.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your tutor info?"))
      return;

    try {
      setError(null);
      await deleteTutorInfo();
      setTutorInfo(null);
      setFormData({});
      setEditing(true);
      setSuccessMessage("Tutor information deleted successfully!");
    } catch (error) {
      console.error("Failed to delete tutor info:", error);
      setError("Failed to delete tutor information.");
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData(tutorInfo || {});
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Welcome Text */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Hamburger Menu Toggle - Light Blue Square (Mobile/Tablet Only) */}
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg transition-all duration-200"
                  style={{ backgroundColor: '#e3f2fd' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
                  title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    My Profile
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage your teaching profile and information
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <TeacherNotificationBell />

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {tutorInfo?.profile_photo ? (
                      <img
                        src={tutorInfo.profile_photo}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all"
                        onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.3)'}
                        onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.3)'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
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
                        <div className="px-4 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(to right, #e3f2fd, #e3f2fd)' }}>
                          <h3 className="font-bold text-gray-800 text-base">
                            Good Morning, {getDisplayName()?.split(' ')[0] || "Teacher"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Teacher</p>
                        </div>
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                              type="text"
                              placeholder="Search profile options"
                              className="bg-transparent border-none outline-none text-sm flex-1 text-gray-600"
                            />
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">Allow Notifications</span>
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ '--tw-ring-color': '#2196f3' }} onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.5)'} onBlur={(e) => e.target.style.boxShadow = 'none'}>
                              <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                            </button>
                          </div>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/teacher/tutor-info');
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
                              navigate('/teacher/tutor-info');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-gray-700">Social Profile</span>
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

        {/* Main Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
              {/* Profile Completion Card - BERRY Style */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Profile Completion</h2>
                    <p className="text-sm text-gray-500 mt-1">Complete your profile to get started</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-bold ${
                    loading 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : profileCompletion >= 80
                      ? 'bg-green-100 text-green-700'
                      : profileCompletion >= 50
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {loading ? '⏳ Loading...' : profileCompletion >= 80 ? '✓ Complete' : profileCompletion >= 50 ? '⚙ In Progress' : '⚠ Setup Required'}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-bold text-gray-800">{profileCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        profileCompletion >= 80 
                          ? 'bg-gradient-to-r from-green-400 to-green-600' 
                          : profileCompletion >= 50 
                          ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`} 
                      style={{ width: `${profileCompletion}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Messages - BERRY Style */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center shadow-sm">
                  <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center shadow-sm">
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Loading State - BERRY Style */}
              {loading ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                  <div className="inline-block">
                    <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mt-6">Loading your profile...</h3>
                  <p className="text-gray-600 text-sm mt-2">Please wait while we fetch your information</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Profile Photo Section - BERRY Style */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 sticky top-24">
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Profile Photo
                        </h3>
                        
                        {formData.profile_photo ? (
                          <div className="relative inline-block group">
                            <div className="relative">
                              <img
                                src={formData.profile_photo}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl ring-4 group-hover:scale-105 transition-all duration-300"
                                style={{ '--tw-ring-color': '#e3f2fd' }}
                              />
                              <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                            {editing && (
                              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm" style={{ backgroundColor: 'rgba(33, 150, 243, 0.8)' }}>
                                <div className="text-center text-white">
                                  <p className="font-bold">Change Photo</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center mx-auto shadow-xl ring-4" style={{ background: 'linear-gradient(to bottom right, #e3f2fd, #bbdefb)', '--tw-ring-color': '#e3f2fd' }}>
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#64b5f6' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        
                        {editing && (
                          <div className="mt-6 space-y-3">
                            <label className="cursor-pointer group block">
                              <div className="text-white px-6 py-3 rounded-lg transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl" style={{ background: 'linear-gradient(to right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.background = 'linear-gradient(to right, #1976d2, #1565c0)'} onMouseLeave={(e) => e.target.style.background = 'linear-gradient(to right, #2196f3, #1976d2)'}>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="font-bold">
                                  {uploading ? "Uploading..." : "Upload Photo"}
                                </span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                              />
                            </label>
                            {uploading && (
                              <div className="flex items-center justify-center space-x-2 rounded-lg p-3" style={{ backgroundColor: '#e3f2fd' }}>
                                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                                <span className="font-medium text-sm" style={{ color: '#1565c0' }}>Processing...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Form Section - BERRY Style */}
                  <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#e3f2fd' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
                        <p className="text-sm text-gray-500">Complete your profile details</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      {editing ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 font-semibold flex items-center justify-center shadow-sm hover:shadow-md text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-semibold shadow-sm hover:shadow-md text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2.5 text-white rounded-lg transition-all duration-300 font-semibold flex items-center justify-center shadow-sm hover:shadow-md text-sm"
                            style={{ backgroundColor: '#2196f3' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                          </button>
                          {tutorInfo && (
                            <button
                              onClick={handleDelete}
                              className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-semibold flex items-center justify-center shadow-sm hover:shadow-md text-sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h3 className="text-base font-bold text-gray-800">Basic Information</h3>
                        </div>

                          {[
                            { label: "Full Name", name: "full_name", type: "text", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", required: true },
                            { label: "Email", name: "email", type: "email", icon: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", required: true },
                            { label: "Phone", name: "phone", type: "tel", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                            { label: "Date of Birth", name: "date_of_birth", type: "date", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          ].map((field) => (
                            <div key={field.name} className="space-y-2">
                              {/* Label above input */}
                              <label className="block text-sm font-medium text-gray-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {/* Input with icon inside */}
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={field.icon} />
                                  </svg>
                                </div>
                                <input
                                  type={field.type}
                                  name={field.name}
                                  value={formData[field.name] || ""}
                                  onChange={handleChange}
                                  disabled={!editing}
                                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg transition-all duration-300 text-sm ${
                                    editing 
                                      ? "border-gray-300 bg-white focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20" 
                                      : "border-gray-200 bg-gray-50"
                                  }`}
                                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Gender Field */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Gender
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <select
                                name="gender"
                                value={formData.gender || ""}
                                onChange={handleChange}
                                disabled={!editing}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg transition-all duration-300 appearance-none text-sm ${
                                  editing 
                                    ? "border-gray-300 bg-white focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20" 
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">👨 Male</option>
                                <option value="Female">👩 Female</option>
                                <option value="Other">🏳️‍⚧️ Other</option>
                                <option value="Prefer not to say">🤐 Prefer not to say</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Teaching Information Section */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <h3 className="text-base font-bold text-gray-800">Teaching Information</h3>
                          </div>

                          {[
                            { label: "Language Taught", name: "language_taught", type: "text", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", required: true },
                            { label: "Proficiency Level", name: "proficiency_level", type: "text", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
                            { label: "Qualification", name: "qualification", type: "text", icon: "M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
                            { label: "Experience Years", name: "experience_years", type: "text", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                          ].map((field) => (
                            <div key={field.name} className="space-y-2">
                              {/* Label above input */}
                              <label className="block text-sm font-medium text-gray-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {/* Input with icon inside */}
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={field.icon} />
                                  </svg>
                                </div>
                                <input
                                  type={field.type}
                                  name={field.name}
                                  value={formData[field.name] || ""}
                                  onChange={handleChange}
                                  disabled={!editing}
                                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg transition-all duration-300 text-sm ${
                                    editing 
                                      ? "border-gray-300 bg-white focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20" 
                                      : "border-gray-200 bg-gray-50"
                                  }`}
                                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Teaching Mode Field */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Teaching Mode
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <select
                                name="teaching_mode"
                                value={formData.teaching_mode || ""}
                                onChange={handleChange}
                                disabled={!editing}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg transition-all duration-300 appearance-none text-sm ${
                                  editing 
                                    ? "border-gray-300 bg-white focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20" 
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <option value="">Select Teaching Mode</option>
                                <option value="Online">🌐 Online</option>
                                <option value="Offline">🏫 Offline</option>
                                <option value="Hybrid">🔄 Hybrid</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teaching Levels */}
                    <div className="mt-6 space-y-3">
                      <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2196f3' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Teaching Levels
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {["Beginner", "Intermediate", "Advanced", "Elementary", "Middle School", "High School"].map((level) => (
                          <label key={level} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            formData.teaching_levels?.includes(level) 
                              ? "" 
                              : "border-gray-200 hover:border-gray-300"
                          } ${!editing ? "opacity-50 cursor-not-allowed" : ""}`}
                          style={formData.teaching_levels?.includes(level) ? { borderColor: '#2196f3', backgroundColor: '#e3f2fd', color: '#1565c0' } : {}}
                          >
                            <input
                              type="checkbox"
                              name="teaching_levels"
                              value={level}
                              checked={formData.teaching_levels?.includes(level) || false}
                              onChange={handleChange}
                              disabled={!editing}
                              className="mr-3 h-4 w-4 border-gray-300 rounded"
                              style={{ accentColor: '#2196f3' }}
                            />
                            <span className="font-medium text-sm">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Bio & Certifications */}
                    <div className="mt-6 space-y-4">
                      <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center">
                        <svg className="w-4 h-4 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Bio & Certifications
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bio
                          </label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <textarea
                              name="bio"
                              value={formData.bio || ""}
                              onChange={handleChange}
                              disabled={!editing}
                              rows={3}
                              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20 transition-colors resize-none text-sm ${
                                editing 
                                  ? "border-gray-300 bg-white" 
                                  : "border-gray-200 bg-gray-50"
                              }`}
                              placeholder="Tell us about yourself, your teaching philosophy, and what makes you unique..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Certifications
                          </label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </div>
                            <textarea
                              name="certifications"
                              value={formData.certifications || ""}
                              onChange={handleChange}
                              disabled={!editing}
                              rows={2}
                              className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:border-[#2196f3] focus:ring-2 focus:ring-[#2196f3]/20 transition-colors resize-none text-sm ${
                                editing 
                                  ? "border-gray-300 bg-white" 
                                  : "border-gray-200 bg-gray-50"
                              }`}
                              placeholder="List your teaching certifications, degrees, and qualifications..."
                            />
                          </div>
                        </div>
                      </div>
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

export default TutorInfoPage;