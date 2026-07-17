import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import AdminNotificationBell from '../components/AdminNotificationBell';
import StateNotificationBell from '../components/StateNotificationBell';
import CenterNotificationBell from '../components/CenterNotificationBell';
import { changePassword, getCurrentUserProfile, updateProfile, uploadProfilePicture, uploadSignature } from '../services/Api';


const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Signature states
  const [signature, setSignature] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState('');
  const [signatureSuccess, setSignatureSuccess] = useState(false);
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
  
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    // Get role from token
    const role = decodedToken?.role || null;
    if (role === 'manager') {
      return "Manager";
    } else if (role === 'academic') {
      return "Academic Coordinator";
    } else if (role === 'admin') {
      return "Administrator";
    } else if (role === 'state') {
      return "State Admin";
    } else if (role === 'center') {
      return "Center Admin";
    } else if (role === 'resource_manager') {
      return "Resource Manager";
    } else if (role === 'teacher') {
      return "Teacher";
    } else if (role === 'cardadmin') {
      return "Card Admin";
    }
    return "User";

  };

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

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

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

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setFullName(response.data.full_name || '');
          setProfilePictureUrl(response.data.profile_picture || null);
          setSignatureUrl(response.data.signature || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setProfileError('Please select an image file');
        return;
      }
      setProfilePicture(file);
      setProfileError('');
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePictureUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!profilePicture) return;

    setUploading(true);
    setProfileError('');

    try {
      const url = await uploadProfilePicture(profilePicture);
      setProfilePictureUrl(url);
      setProfilePicture(null);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSignatureError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setSignatureError('Please select an image file');
        return;
      }
      setSignature(file);
      setSignatureError('');
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSignature = async () => {
    if (!signature) return;

    setUploadingSignature(true);
    setSignatureError('');

    try {
      const url = await uploadSignature(signature);
      setSignatureUrl(url);
      setSignature(null);
      setSignatureSuccess(true);
      setTimeout(() => setSignatureSuccess(false), 3000);
      
      // Refresh profile data to get updated signature
      const response = await getCurrentUserProfile();
      if (response.success && response.data) {
        setSignatureUrl(response.data.signature || null);
      }
    } catch (err) {
      setSignatureError(err.message || 'Failed to upload signature');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!fullName || fullName.trim() === '') {
      setProfileError('Full name is required');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      await updateProfile(fullName.trim());
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
      // Dispatch event to notify other components about profile update
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      // Refresh profile data
      const response = await getCurrentUserProfile();
      if (response.success && response.data) {
        setFullName(response.data.full_name || '');
        setProfilePictureUrl(response.data.profile_picture || null);
        setSignatureUrl(response.data.signature || null);
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setSuccess(true);
      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        {/* Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-1 min-w-0">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Account Settings</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">Manage your account and security settings</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {decodedToken?.role === 'manager' && <ManagerNotificationBell />}
                {decodedToken?.role === 'admin' && <AdminNotificationBell />}
                {decodedToken?.role === 'academic' && <AcademicNotificationBell />}
                {decodedToken?.role === 'state' && <StateNotificationBell />}
                {decodedToken?.role === 'center' && <CenterNotificationBell />}

                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                        {getDisplayName()?.charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                  </button>
                  {isProfileDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h3 className="font-bold text-gray-800 text-base">Welcome, {getDisplayName()?.split(' ')[0] || "Coordinator"}</h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">
                            {decodedToken?.role || 'Academic Coordinator'}
                          </p>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              const role = decodedToken?.role || null;
                              if (role === 'manager') {
                                navigate('/manager/account-settings');
                              } else if (role === 'admin') {
                                navigate('/admin/account-settings');
                              } else if (role === 'academic') {
                                navigate('/academic-coordinator/settings');
                              } else if (role === 'state') {
                                navigate('/state/account-settings');
                              } else if (role === 'center') {
                                navigate('/center-admin/account-settings');
                              } else if (role === 'financial') {
                                navigate('/finance/account-settings');
                              } else if (role === 'resource_manager') {
                                navigate('/resource-manager/account-settings');
                              } else if (role === 'teacher') {
                                navigate('/teacher/account-settings');
                              } else if (role === 'cardadmin') {
                                navigate('/card-admin/account-settings');
                              }

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
                              navigate("/");
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
        <div className="p-2 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
            {/* Profile Picture Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Profile Picture</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your profile picture</p>
                </div>
              </div>

              {profileError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded mb-4">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded mb-4">
                  Profile picture uploaded successfully!
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Profile Picture Display */}
                <div className="flex-shrink-0">
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-gray-200 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                      <span className="text-4xl font-bold text-white">
                        {getDisplayName()?.charAt(0).toUpperCase() || "A"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="flex-1">
                  <input
                    type="file"
                    id="profile-picture-input"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="profile-picture-input"
                    className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ backgroundColor: uploading ? '#9ca3af' : '#2196f3', color: 'white' }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploading ? 'Uploading...' : profilePicture ? 'Change Photo' : 'Upload Photo'}
                  </label>

                  {profilePicture && !uploading && (
                    <button
                      onClick={handleUploadProfilePicture}
                      className="ml-3 inline-flex items-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: '#10b981' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </button>
                  )}

                  {uploading && (
                    <div className="mt-3 flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">JPG, PNG or GIF (Max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Signature Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #8b5cf6, #7c3aed)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Digital Signature</h2>
                  <p className="text-sm text-gray-500 mt-1">Upload your digital signature for official documents</p>
                </div>
              </div>

              {signatureError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded mb-4">
                  {signatureError}
                </div>
              )}

              {signatureSuccess && (
                <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded mb-4">
                  Signature uploaded successfully!
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Signature Display */}
                <div className="flex-shrink-0">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="w-48 h-24 object-contain border-2 border-gray-200 rounded-lg shadow-lg bg-white"
                    />
                  ) : (
                    <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span className="text-xs text-gray-500">No signature</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="flex-1">
                  <input
                    type="file"
                    id="signature-input"
                    accept="image/*"
                    onChange={handleSignatureChange}
                    disabled={uploadingSignature}
                    className="hidden"
                  />
                  <label
                    htmlFor="signature-input"
                    className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                      uploadingSignature ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ backgroundColor: uploadingSignature ? '#9ca3af' : '#8b5cf6', color: 'white' }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadingSignature ? 'Uploading...' : signature ? 'Change Signature' : 'Upload Signature'}
                  </label>

                  {signature && !uploadingSignature && (
                    <button
                      onClick={handleUploadSignature}
                      className="ml-3 inline-flex items-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{ backgroundColor: '#10b981' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Signature
                    </button>
                  )}

                  {uploadingSignature && (
                    <div className="mt-3 flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">JPG, PNG, GIF or any image format (Max 5MB). Background will be removed and converted to transparent PNG for certificate use</p>
                </div>
              </div>
            </div>

            {/* Full Name Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Full Name</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your full name</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileError && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded">
                    Profile updated successfully!
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    placeholder="Enter your full name"
                    required
                    disabled={isUpdatingProfile || loadingProfile}
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#2196f3' }}
                    onMouseEnter={(e) => {
                      if (!isUpdatingProfile) {
                        e.target.style.backgroundColor = '#1976d2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUpdatingProfile) {
                        e.target.style.backgroundColor = '#2196f3';
                      }
                    }}
                    disabled={isUpdatingProfile || loadingProfile}
                  >
                    {isUpdatingProfile ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      'Update Name'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded">
                    Password changed successfully!
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 pr-10"
                      required
                      disabled={isSubmitting || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isSubmitting || success}
                    >
                      {showCurrentPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 pr-10"
                      required
                      disabled={isSubmitting || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isSubmitting || success}
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 pr-10"
                      required
                      disabled={isSubmitting || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isSubmitting || success}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#2196f3' }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && !success) {
                        e.target.style.backgroundColor = '#1976d2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && !success) {
                        e.target.style.backgroundColor = '#2196f3';
                      }
                    }}
                    disabled={isSubmitting || success}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Changing...
                      </span>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;

