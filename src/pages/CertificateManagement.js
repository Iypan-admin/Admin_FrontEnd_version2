import React, { useState, useEffect } from 'react';
import { FileText, Upload, Globe, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import AdminNotificationBell from '../components/AdminNotificationBell';
import StateNotificationBell from '../components/StateNotificationBell';
import CenterNotificationBell from '../components/CenterNotificationBell';
import { getAllCertificates, uploadCertificate, deleteCertificate, getCurrentUserProfile, updateCertificateAlignment, reuploadCertificate } from '../services/Api';

const CertificateManagement = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
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
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [page1File, setPage1File] = useState(null);
  const [page2File, setPage2File] = useState(null);
  const [isReupload, setIsReupload] = useState(false);
  const [formData, setFormData] = useState({
    language: 'french'
  });
  const [showViewPanel, setShowViewPanel] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isEditingAlignment, setIsEditingAlignment] = useState(false);
  const [alignmentFormData, setAlignmentFormData] = useState({});
  const [savingAlignment, setSavingAlignment] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [activeDraggable, setActiveDraggable] = useState(null); // Tracking field being dragged

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.name;

  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && tokenFullName.trim() !== tokenFullName) {
      return tokenFullName;
    }
    return decodedToken?.name || 'User';
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

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  const languages = [
    { value: 'french', label: 'FRENCH' },
    { value: 'german', label: 'GERMAN' },
    { value: 'japanese', label: 'JAPANESE' }
  ];

  // Fetch certificates
  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const result = await getAllCertificates(token);
      
      if (result.success) {
        setCertificates(result.data);
      } else {
        alert('Failed to fetch certificates');
      }
    } catch (error) {
      alert('Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Fetch user profile picture
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };

    fetchProfile();
  }, []);

  // Handle certificate upload
  const handleUpload = async (formData) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const result = isReupload 
        ? await reuploadCertificate(formData, token)
        : await uploadCertificate(formData, token);
      
      if (result.success) {
        alert(`Certificate ${isReupload ? 're-uploaded' : 'uploaded'} successfully`);
        setShowUploadModal(false);
        setPage1File(null);
        setPage2File(null);
        setIsReupload(false);
        setFormData({ language: 'french' });
        fetchCertificates();
        
        // Automatically open visual editor for the new certificate
        handleViewCertificate(result.data);
        setIsEditingAlignment(true);
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setIsEditingAlignment(false);

    // Default configuration for a 1 or 2-page certificate
    // Default configuration for a 2-page certificate layout
    // Page 1 is TOP (Y: 842-1684), Page 2 is BOTTOM (Y: 0-842)
    const defaults = {
      // Page 1 (Top Page)
      studentName: { x: 297, y: 1400, size: 26 }, // Center aligned (595/2 = 297.5)
      courseLevel: { x: 200, y: 1360, size: 18 },
      startDate: { x: 200, y: 1320, size: 14 },
      endDate: { x: 400, y: 1320, size: 14 },
      adminName: { x: 100, y: 1050, size: 12 },
      adminSignature: { x: 100, y: 1100, size: 12 },
      tutorName: { x: 400, y: 1050, size: 12 },
      tutorSignature: { x: 400, y: 1100, size: 12 },
      // Page 2 (Bottom Page)
      studentNamePage2: { x: 200, y: 700, size: 22 },
      regNo: { x: 200, y: 660, size: 14 },
      dob: { x: 200, y: 620, size: 14 },
      assessmentDate: { x: 200, y: 580, size: 14 },
      section1Mark: { x: 200, y: 450, size: 14 },
      section2Mark: { x: 280, y: 450, size: 14 },
      section3Mark: { x: 360, y: 450, size: 14 },
      section4Mark: { x: 440, y: 450, size: 14 },
      totalMarks: { x: 200, y: 350, size: 18 },
      adminNamePage2: { x: 100, y: 200, size: 12 },
      adminSignaturePage2: { x: 100, y: 250, size: 12 },
      tutorNamePage2: { x: 400, y: 200, size: 12 },
      tutorSignaturePage2: { x: 400, y: 250, size: 12 }
    };

    // Merge existing config with defaults to ensure all fields are available
    let config = { ...defaults };
    if (certificate.alignment_config) {
      // Ensure config is an object
      const savedConfig = typeof certificate.alignment_config === 'string' 
        ? JSON.parse(certificate.alignment_config) 
        : certificate.alignment_config;
      config = { ...defaults, ...savedConfig };
    }

    // CRITICAL: Remove the obsolete marksTable field to avoid redundant markers
    delete config.marksTable;
    
    setAlignmentFormData(config);

    // Auto-detect number of pages needed (highest Y / 842 rounded up)
    let maxPageNeeded = 1;
    Object.values(config).forEach(pos => {
      const y = typeof pos.y !== 'undefined' ? pos.y : pos.startY;
      if (y > 0) {
        const needed = Math.ceil(y / 842);
        if (needed > maxPageNeeded) maxPageNeeded = needed;
      }
    });
    setNumPages(Math.max(1, Math.min(5, maxPageNeeded)));

    setShowViewPanel(true);
  };

  const handleUpdateAlignment = async () => {
    setSavingAlignment(true);
    try {
      const token = localStorage.getItem('token');
      const result = await updateCertificateAlignment(selectedCertificate.upload_id, alignmentFormData, token);
      
      if (result.success) {
        alert('Alignment configuration updated successfully');
        setIsEditingAlignment(false);
        fetchCertificates();
        setSelectedCertificate({ ...selectedCertificate, alignment_config: alignmentFormData });
      } else {
        alert(result.error || 'Failed to update alignment');
      }
    } catch (error) {
      alert(error.message || 'Failed to update alignment');
    } finally {
      setSavingAlignment(false);
    }
  };

  const handleAlignmentChange = (field, key, value) => {
    setAlignmentFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: parseInt(value) || 0
      }
    }));
  };

  // Real-time Smooth Dragging Logic
  const handleMarkerMouseDown = (e, field) => {
    e.preventDefault();
    setActiveDraggable(field);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!activeDraggable || !canvasRef) return;

      const rect = canvasRef.getBoundingClientRect();
      const totalHeight = 842 * numPages;
      
      const xFromLeft = e.clientX - rect.left;
      const yFromTop = e.clientY - rect.top;

      const newX = Math.round(xFromLeft);
      const newY = Math.round(totalHeight - yFromTop);

      const clampedX = Math.max(0, Math.min(595, newX));
      const clampedY = Math.max(0, Math.min(totalHeight, newY));

      const pos = alignmentFormData[activeDraggable];
      const xKey = typeof pos.x !== 'undefined' ? 'x' : 'startX';
      const yKey = typeof pos.y !== 'undefined' ? 'y' : 'startY';

      setAlignmentFormData(prev => ({
        ...prev,
        [activeDraggable]: {
          ...prev[activeDraggable],
          [xKey]: clampedX,
          [yKey]: clampedY
        }
      }));
    };

    const handleGlobalMouseUp = () => {
      setActiveDraggable(null);
    };

    if (activeDraggable) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeDraggable, numPages, alignmentFormData, canvasRef]);

  // Handle certificate delete
  const handleDelete = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const result = await deleteCertificate(uploadId, token);
      
      if (result.success) {
        alert('Certificate deleted successfully');
        fetchCertificates();
      } else {
        alert('Failed to delete certificate');
      }
    } catch (error) {
      alert('Failed to delete certificate');
    }
  };

  const getLanguageDisplay = (language) => {
    const lang = languages.find(l => l.value === language);
    return lang ? lang.label : language;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        {/* Header Bar - Same as AccountSettings */}
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
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Certificate Management</h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">Upload and manage course completion certificates</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                {decodedToken?.role === 'manager' && <ManagerNotificationBell />}
                {decodedToken?.role === 'admin' && <AdminNotificationBell />}
                {decodedToken?.role === 'academic' && <AcademicNotificationBell />}
                {decodedToken?.role === 'state' && <StateNotificationBell />}
                {decodedToken?.role === 'center' && <CenterNotificationBell />}

                {/* Profile Dropdown */}
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

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      {/* Dropdown Box */}
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      {/* Header Section */}
                      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                        <h3 className="font-bold text-gray-800 text-base">
                          Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 capitalize">
                          {decodedToken?.role === 'academic' ? 'Academic Coordinator' : decodedToken?.role || 'User'}
                        </p>
                      </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/settings');
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
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            {/* Upload Section - Only for Academic Users */}
            {decodedToken?.role === 'academic' && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsReupload(false);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Certificate
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates uploaded yet</h3>
                <p className="text-gray-500 mb-4">Upload your first course completion certificate to get started</p>
                {decodedToken?.role === 'academic' && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload Certificate
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((certificate) => (
                  <div 
                    key={certificate.upload_id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => window.open(certificate.certificate_file_path, '_blank')}
                  >
                    {/* Certificate Preview */}
                    <div className="relative h-48 bg-gray-100">
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Certificate Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 capitalize">
                        {getLanguageDisplay(certificate.language)} Certificate
                      </h3>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          {getLanguageDisplay(certificate.language)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 mb-4">
                        <div>File: {certificate.file_name}</div>
                        <div>Size: {(certificate.file_size / 1024 / 1024).toFixed(2)} MB</div>
                        <div>Uploaded: {new Date(certificate.uploaded_at).toLocaleDateString()}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCertificate(certificate);
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {decodedToken?.role === 'academic' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsReupload(true);
                                setFormData({ language: certificate.language });
                                setShowUploadModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Re-upload"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {decodedToken?.role === 'academic' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(certificate.upload_id);
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Slide Panel - Berry Style */}
        <div className={`fixed inset-0 z-50 ${showUploadModal ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowUploadModal(false)}
          ></div>
          
          {/* Slide Panel */}
          <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            showUploadModal ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Upload Certificate</h2>
                    <p className="text-sm text-blue-100">Add a new certificate</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                
                if (!page1File || !page2File) {
                  alert('Please select both Page 1 and Page 2 images');
                  return;
                }

                if (!formData.language) {
                  alert('Please select a language');
                  return;
                }

                const uploadFormData = new FormData();
                uploadFormData.append('page1', page1File);
                uploadFormData.append('page2', page2File);
                uploadFormData.append('language', formData.language);

                handleUpload(uploadFormData);
              }}>
                <div className="space-y-6">
                  {/* Page 1 Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page 1 Template (Front)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPage1File(e.target.files[0])}
                        className="hidden"
                        id="page1-upload"
                      />
                      <label htmlFor="page1-upload" className="cursor-pointer">
                        {page1File ? (
                          <div className="space-y-1">
                            <FileText className="w-8 h-8 text-blue-600 mx-auto" />
                            <p className="text-xs font-medium text-gray-900 truncate">{page1File.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-400">
                            <Upload className="w-8 h-8 mx-auto" />
                            <p className="text-xs font-medium">Upload Page 1 Image</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Page 2 Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page 2 Template (Marks)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPage2File(e.target.files[0])}
                        className="hidden"
                        id="page2-upload"
                      />
                      <label htmlFor="page2-upload" className="cursor-pointer">
                        {page2File ? (
                          <div className="space-y-1">
                            <FileText className="w-8 h-8 text-blue-600 mx-auto" />
                            <p className="text-xs font-medium text-gray-900 truncate">{page2File.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-400">
                            <Upload className="w-8 h-8 mx-auto" />
                            <p className="text-xs font-medium">Upload Page 2 Image</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {languages.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Certificate'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* View Certificate Slide Panel - Berry Style */}
        <div className={`fixed inset-0 z-50 ${showViewPanel ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              if (isEditingAlignment && !window.confirm('Discard unsaved alignment changes?')) return;
              setIsEditingAlignment(false);
              setShowViewPanel(false);
            }}
          ></div>
          
          {/* Main Panel - Wider when editing */}
          <div className={`absolute right-0 top-0 h-full bg-white shadow-xl transform transition-all duration-300 ease-in-out ${
            showViewPanel ? 'translate-x-0' : 'translate-x-full'
          } ${isEditingAlignment ? 'w-full' : 'w-full max-w-2xl'}`}>
            
            {isEditingAlignment ? (
              /* VISUAL EDITOR MODE */
              <div className="h-full flex flex-col">
                {/* Editor Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Visual Alignment Configurator</h2>
                        <p className="text-sm text-green-100">Drag the markers to position text on the certificate</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center bg-white bg-opacity-10 px-3 py-1.5 rounded-lg border border-white border-opacity-20">
                        <span className="text-xs text-white text-opacity-80 mr-2">Pages:</span>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setNumPages(prev => Math.max(1, prev - 1))}
                            className="w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-white"
                          >-</button>
                          <span className="text-xs font-bold text-white w-4 text-center">{numPages}</span>
                          <button 
                            onClick={() => setNumPages(prev => Math.min(5, prev + 1))}
                            className="w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded hover:bg-opacity-30 text-white"
                          >+</button>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsEditingAlignment(false)}
                        className="text-white hover:text-blue-200 transition-colors bg-white bg-opacity-10 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Back to View
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingAlignment(false);
                          setShowViewPanel(false);
                        }}
                        className="text-white hover:text-blue-200 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Canvas Area */}
                  <div className="flex-1 bg-slate-200 overflow-auto p-12 flex items-start justify-center custom-scrollbar">
                    <div 
                      ref={setCanvasRef}
                      className="relative shadow-2xl bg-white select-none"
                      style={{ width: '595px', height: `${842 * numPages}px`, minWidth: '595px' }}
                    >
                      <div className="w-full h-full flex flex-col pointer-events-none select-none">
                        <img 
                          src={selectedCertificate.page1_url || selectedCertificate.certificate_file_path} 
                          className="w-full h-[842px] object-fill"
                          alt="Page 1 Template"
                        />
                        {numPages > 1 && (
                          <img 
                            src={selectedCertificate.page2_url} 
                            className="w-full h-[842px] object-fill"
                            alt="Page 2 Template"
                          />
                        )}
                      </div>
                      
                      {/* Drag Layer */}
                      <div className="absolute inset-0 z-10 cursor-crosshair">
                        {Object.keys(alignmentFormData).filter(field => {
                          // Japanese only has 3 sections, hide section4mark
                          if (selectedCertificate.language?.toLowerCase() === 'japanese' && field === 'section4Mark') {
                            return false;
                          }
                          return true;
                        }).map((field) => {
                          const pos = alignmentFormData[field];
                          if (!pos || (typeof pos.x === 'undefined' && typeof pos.startX === 'undefined')) return null;

                          const fieldColors = {
                            studentName: 'from-rose-500 to-rose-600',
                            courseLevel: 'from-blue-500 to-blue-600',
                            startDate: 'from-emerald-500 to-emerald-600',
                            endDate: 'from-teal-500 to-teal-600',
                            adminName: 'from-indigo-400 to-indigo-500',
                            adminSignature: 'from-indigo-600 to-indigo-700',
                            tutorName: 'from-pink-400 to-pink-500',
                            tutorSignature: 'from-pink-600 to-pink-700',
                            // Page 2
                            studentNamePage2: 'from-red-600 to-red-700',
                            regNo: 'from-purple-500 to-purple-600',
                            dob: 'from-orange-500 to-orange-600',
                            assessmentDate: 'from-teal-500 to-teal-600',
                            section1Mark: 'from-amber-400 to-amber-500',
                            section2Mark: 'from-yellow-400 to-yellow-500',
                            section3Mark: 'from-orange-400 to-orange-500',
                            section4Mark: 'from-lime-400 to-lime-500',
                            totalMarks: 'from-slate-700 to-slate-900',
                            adminNamePage2: 'from-indigo-800 to-indigo-900',
                            adminSignaturePage2: 'from-blue-800 to-blue-900',
                            tutorNamePage2: 'from-pink-800 to-pink-900',
                            tutorSignaturePage2: 'from-fuchsia-800 to-fuchsia-900'
                          };

                          const x = typeof pos.x !== 'undefined' ? pos.x : pos.startX;
                          const y = typeof pos.y !== 'undefined' ? pos.y : pos.startY;
                          
                          // Dynamic Labeling based on Language
                          let label = field.replace(/([A-Z])/g, ' $1').trim();
                          const lang = selectedCertificate.language?.toLowerCase();
                          
                          if (field === 'section1Mark') {
                            if (lang === 'german') label = 'Lesen';
                            else if (lang === 'french') label = 'Compréhension Orale';
                            else if (lang === 'japanese') label = 'Vocabulary & Grammar';
                          } else if (field === 'section2Mark') {
                            if (lang === 'german') label = 'Schreiben';
                            else if (lang === 'french') label = 'Compréhension Écrite';
                            else if (lang === 'japanese') label = 'Reading';
                          } else if (field === 'section3Mark') {
                            if (lang === 'german') label = 'Hören';
                            else if (lang === 'french') label = 'Production Orale';
                            else if (lang === 'japanese') label = 'Listening';
                          } else if (field === 'section4Mark') {
                            if (lang === 'german') label = 'Sprechen';
                            else if (lang === 'french') label = 'Production Écrite';
                          }

                          return (
                            <div
                              key={field}
                              onMouseDown={(e) => handleMarkerMouseDown(e, field)}
                              className={`absolute cursor-grab active:cursor-grabbing select-none z-20 group transition-shadow ${activeDraggable === field ? 'shadow-2xl scale-105 z-30' : 'hover:shadow-xl'}`}
                              style={{
                                left: `${x}px`,
                                top: `${(842 * numPages) - y}px`,
                                // Position tag directly so its left edge is the X-point
                                transform: 'translate(0, -50%)',
                                transition: activeDraggable === field ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            >
                               {/* Simplified Realistic Text Preview Tag */}
                               <div className={`px-2 py-1 rounded border-l-4 shadow-xl bg-white bg-opacity-90 backdrop-blur-sm ${field.toLowerCase().includes('page2') ? 'border-purple-600' : 'border-blue-600'} flex items-center gap-2 whitespace-nowrap border border-gray-100 hover:scale-105 transition-transform`}>
                                 <span className="text-[11px] font-bold text-gray-800 tracking-tight flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${fieldColors[field] || 'from-gray-500 to-gray-600'}`}></div>
                                   {label} 
                                   <span className="ml-2 text-[9px] text-gray-400 font-normal bg-gray-50 px-1 rounded">
                                     X: {Math.round(x)} Y: {Math.round(y)}
                                   </span>
                                 </span>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Controls */}
                  <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
                    <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Precision Controls</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 custom-scrollbar">
                      {/* Page 1 Group */}
                      <div className="border-b-2 border-slate-100 pb-2 mb-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Page 1 Elements</span>
                      </div>
                      {Object.keys(alignmentFormData).filter(f => !f.toLowerCase().includes('page2') && !['regNo', 'dob', 'assessmentDate', 'marksTable', 'totalMarks'].includes(f)).map((field) => {
                        const pos = alignmentFormData[field];
                        return (
                          <div key={field} className="p-3 border rounded-lg hover:border-blue-300 bg-white shadow-sm transition-all">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-2">{field.replace(/([A-Z])/g, ' $1')}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-400 block">X Pos</label>
                                <input 
                                  type="number" 
                                  value={typeof pos.x !== 'undefined' ? pos.x : pos.startX}
                                  onChange={(e) => handleAlignmentChange(field, typeof pos.x !== 'undefined' ? 'x' : 'startX', e.target.value)}
                                  className="w-full text-xs p-1 border rounded"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-gray-400 block">Y Pos</label>
                                <input 
                                  type="number" 
                                  value={typeof pos.y !== 'undefined' ? pos.y : pos.startY}
                                  onChange={(e) => handleAlignmentChange(field, typeof pos.y !== 'undefined' ? 'y' : 'startY', e.target.value)}
                                  className="w-full text-xs p-1 border rounded"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Page 2 Group */}
                      <div className="border-b-2 border-slate-100 pb-2 mb-4 mt-8">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Page 2 Elements</span>
                      </div>
                      {Object.keys(alignmentFormData).filter(f => f.toLowerCase().includes('page2') || ['regNo', 'dob', 'assessmentDate', 'marksTable', 'totalMarks'].includes(f)).map((field) => {
                        const pos = alignmentFormData[field];
                        return (
                          <div key={field} className="p-3 border rounded-lg hover:border-purple-300 bg-white shadow-sm transition-all">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-2">{field.replace(/([A-Z])/g, ' $1')}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-400 block">X Pos</label>
                                <input 
                                  type="number" 
                                  value={typeof pos.x !== 'undefined' ? pos.x : pos.startX}
                                  onChange={(e) => handleAlignmentChange(field, typeof pos.x !== 'undefined' ? 'x' : 'startX', e.target.value)}
                                  className="w-full text-xs p-1 border rounded"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-gray-400 block">Y Pos</label>
                                <input 
                                  type="number" 
                                  value={typeof pos.y !== 'undefined' ? pos.y : pos.startY}
                                  onChange={(e) => handleAlignmentChange(field, typeof pos.y !== 'undefined' ? 'y' : 'startY', e.target.value)}
                                  className="w-full text-xs p-1 border rounded"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Fixed Footer */}
                    <div className="absolute bottom-0 right-0 w-80 p-4 border-t bg-white shadow-up flex space-x-2">
                      <button onClick={() => setIsEditingAlignment(false)} className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50">Cancel</button>
                      <button onClick={handleUpdateAlignment} disabled={savingAlignment} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700">
                        {savingAlignment ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD VIEW MODE */
              <div className="flex flex-col h-full">
                {/* Panel Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Certificate Details</h2>
                        <p className="text-sm text-green-100">View certificate information</p>
                      </div>
                    </div>
                    <button onClick={() => setShowViewPanel(false)} className="text-white hover:text-green-200 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedCertificate && (
                    <>
                      {/* Preview Card */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Preview</h3>
                        <div className="relative group border-4 border-gray-100 rounded-xl overflow-hidden shadow-sm shadow-inner aspect-[210/297] bg-gray-50">
                          <div className="w-full space-y-2">
                            <img 
                              src={selectedCertificate.page1_url || selectedCertificate.certificate_file_path} 
                              className="w-full h-auto border border-gray-200 rounded shadow-sm"
                              alt="Page 1 Preview"
                            />
                            {selectedCertificate.page2_url && (
                              <img 
                                src={selectedCertificate.page2_url} 
                                className="w-full h-auto border border-gray-200 rounded shadow-sm"
                                alt="Page 2 Preview"
                              />
                            )}
                          </div>
                          {decodedToken?.role === 'academic' && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                              <button 
                                onClick={() => setIsEditingAlignment(true)}
                                className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all flex items-center"
                              >
                                <RefreshCw className="w-5 h-5 mr-3 animate-spin-slow" /> Modify Positions (Drag & Drop)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Template ID</span>
                          <span className="text-sm font-mono font-bold text-slate-700">#{selectedCertificate.upload_id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Language</span>
                            <span className="text-sm font-bold text-slate-800 capitalize">{selectedCertificate.language}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Created On</span>
                            <span className="text-sm font-bold text-slate-800">{new Date(selectedCertificate.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {decodedToken?.role === 'academic' && (
                        <div className="grid grid-cols-2 gap-3 pb-8">
                          <button 
                             onClick={() => handleDelete(selectedCertificate.upload_id)}
                             className="flex items-center justify-center p-3 border-2 border-red-50 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-bold"
                          >
                            <Trash2 className="w-5 h-5 mr-2" /> Delete Template
                          </button>
                          <button 
                             onClick={() => {
                               setShowViewPanel(false);
                               setShowUploadModal(true);
                             }}
                             className="flex items-center justify-center p-3 border-2 border-blue-50 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold"
                          >
                            <Upload className="w-5 h-5 mr-2" /> Replace File
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateManagement;
