import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ResourceNotificationBell from '../components/ResourceNotificationBell';
import { getAllCourses, uploadLSRWContent, getLSRWByCourse, uploadSpeakingMaterial, uploadReadingMaterial, extractReadingContent, uploadWritingTask, getWritingByCourse, getCurrentUserProfile } from '../services/Api';
import { Upload, FileAudio, FileText, Loader2, CheckCircle, XCircle, Search, X, Headphones, Mic, Book, PenTool, Image } from 'lucide-react';

function LSRWUploadPage() {
  const { courseId, module } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Berry Style States
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
  
  // Existing Logic States
  const [courses, setCourses] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedCourses, setSelectedCourses] = useState(courseId ? [courseId] : []);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  
  // Determine active tab from URL path or module param
  const getModuleFromPath = useCallback(() => {
    const path = location.pathname;
    if (path.includes('/listening')) return 'listening';
    if (path.includes('/speaking')) return 'speaking';
    if (path.includes('/reading')) return 'reading';
    if (path.includes('/writing')) return 'writing';
    return module || 'listening'; // Default to listening
  }, [location.pathname, module]);

  const [activeTab, setActiveTab] = useState(getModuleFromPath()); 
  const [showTabs, setShowTabs] = useState(false); 
  const [formData, setFormData] = useState({
    title: '',
    instruction: '',
    max_marks: '',
    module_type: 'listening'
  });

  // LSRW Module tabs configuration
  const lsrwTabs = [
    { id: 'listening', name: 'Listening', icon: Headphones, color: 'blue' },
    { id: 'speaking', name: 'Speaking', icon: Mic, color: 'purple' },
    { id: 'reading', name: 'Reading', icon: Book, color: 'green' },
    { id: 'writing', name: 'Writing', icon: PenTool, color: 'orange' },
  ];
  
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [externalMediaUrl, setExternalMediaUrl] = useState('');
  const [questionDoc, setQuestionDoc] = useState(null);
  const [textFile, setTextFile] = useState(null); 
  const [contentText, setContentText] = useState(''); 
  const [writingImage, setWritingImage] = useState(null); 
  const [writingDocument, setWritingDocument] = useState(null); 
  const [readingQuestions, setReadingQuestions] = useState([]); 
  const [extractingReading, setExtractingReading] = useState(false); 
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadedContent, setUploadedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false); 
  const [showUploadPreview, setShowUploadPreview] = useState(false); 
  const [uploadSuccessInModal, setUploadSuccessInModal] = useState(false);

  // User Profile Name
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && String(decodedToken.full_name).trim() !== '') ? decodedToken.full_name : (decodedToken?.name || 'Resource Manager');

  const getDisplayName = () => {
      if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
          return profileInfo.full_name;
      }
      return userName;
  };

  // --- Helper Functions ---

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  const fetchCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getAllCourses(token);
      if (response && response.success && Array.isArray(response.data)) {
        setCourses(response.data);
        if (courseId && selectedCourses.length === 0) {
          setSelectedCourses([courseId]);
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedCourses.length]);

  const fetchLSRWContent = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      let response;
      if (activeTab === 'writing') response = await getWritingByCourse(id, token);
      else response = await getLSRWByCourse(id, token, activeTab);
      
      if (response && response.success) {
        setUploadedContent(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching LSRW content:', error);
    }
  }, [activeTab]);

  const availableLanguages = useMemo(() => {
    const languages = [...new Set(courses.map(c => c.language).filter(Boolean))];
    return languages.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let filtered = courses;
    if (selectedLanguage) filtered = filtered.filter(c => c.language === selectedLanguage);
    if (courseSearchTerm) {
      const searchLower = courseSearchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.course_name?.toLowerCase().includes(searchLower) ||
        c.level?.toLowerCase().includes(searchLower) ||
        c.type?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [courses, selectedLanguage, courseSearchTerm]);

  const selectedCourseDetails = useMemo(() => {
    return courses.filter(c => selectedCourses.includes(c.id));
  }, [courses, selectedCourses]);

  const activeTabConfig = lsrwTabs.find(tab => tab.id === activeTab) || lsrwTabs[0];





  // --- Effect Hooks --- 

  useEffect(() => {
    fetchCourses();
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
    return () => window.removeEventListener('profileUpdated', fetchProfileInfo);
  }, [fetchCourses]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  useEffect(() => {
    const moduleFromPath = getModuleFromPath();
    setActiveTab(moduleFromPath);
    setShowTabs(!location.pathname.includes('/lsrw-upload/listening') && 
                !location.pathname.includes('/lsrw-upload/speaking') && 
                !location.pathname.includes('/lsrw-upload/reading') && 
                !location.pathname.includes('/lsrw-upload/writing'));
  }, [location.pathname, getModuleFromPath]);

  useEffect(() => {
    if (courseId && courses.length > 0) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setSelectedLanguage(course.language || '');
        if (!selectedCourses.includes(courseId)) {
          setSelectedCourses([courseId]);
        }
        fetchLSRWContent(courseId);
      }
    }
  }, [courseId, courses, selectedCourses, fetchLSRWContent]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCourseDropdown && !event.target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCourseDropdown]);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    setFormData(prev => ({ ...prev, module_type: activeTab }));
    if (selectedCourses.length > 0) {
      selectedCourses.forEach(courseId => fetchLSRWContent(courseId));
    }
    return () => clearTimeout(timer);
  }, [activeTab, selectedCourses, fetchLSRWContent]);


  // --- Helper Functions ---





  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setVideoFile(null);
      setExternalMediaUrl('');
      if (document.getElementById('video-input')) document.getElementById('video-input').value = '';
    } else {
      alert('Please select an audio file (MP3, WAV, etc.)');
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      if (!audioFile) {
        setVideoFile(file);
        setExternalMediaUrl('');
      } else {
        alert('Audio file has priority. Please remove audio file first.');
        e.target.value = '';
      }
    } else {
      alert('Please select a video file (MP4, etc.)');
    }
  };

  const handleExternalUrlChange = (e) => {
    const url = e.target.value.trim();
    if (!audioFile && !videoFile) {
      setExternalMediaUrl(url);
    } else {
      alert('File upload has priority. Please remove files first.');
      setExternalMediaUrl('');
    }
  };

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword')) {
      setQuestionDoc(file);
    } else {
      alert('Please select a DOCX or DOC file');
    }
  };

  const handleTextFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));
      
      if (hasValidType || hasValidExtension) {
        setTextFile(file);
        setContentText(''); 
        
        if (activeTab === 'reading') {
          try {
            setExtractingReading(true);
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('readingFile', file);
            
            const response = await extractReadingContent(data, token);
            if (response.success && response.data) {
              if (response.data.paragraph) setContentText(response.data.paragraph);
              if (response.data.questions && Array.isArray(response.data.questions)) {
                const formattedQuestions = response.data.questions.map(q => ({
                  question: q.question || '',
                  optionA: q.optionA || '',
                  optionB: q.optionB || '',
                  optionC: q.optionC || '',
                  optionD: q.optionD || '',
                  correct_answer: q.correct_answer || ''
                }));
                setReadingQuestions(formattedQuestions);
              } else {
                setReadingQuestions([]);
              }
              setSuccess(true);
              setTimeout(() => setSuccess(false), 3000);
            }
          } catch (err) {
            console.error('Error extracting reading content:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to extract content';
            setError(`Extraction failed: ${errorMsg}. You can still fill the form manually.`);
            setTimeout(() => setError(null), 5000);
          } finally {
            setExtractingReading(false);
          }
        }
      } else {
        alert('Please select a valid document file');
        e.target.value = '';
      }
    }
  };

  const handleWritingImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
       setWritingImage(file);
       setWritingDocument(null);
       setContentText('');
    } else {
       alert('Please select a valid image');
    }
  };

  const handleWritingDocumentChange = (e) => {
     const file = e.target.files[0];
     if (file) {
       setWritingDocument(file);
       setWritingImage(null);
       setContentText('');
     }
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
    setSelectedCourses([]);
    setCourseSearchTerm('');
    setShowCourseDropdown(false);
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const removeCourse = (courseId) => setSelectedCourses(prev => prev.filter(id => id !== courseId));

  const handleReadingQuestionChange = (index, field, value) => {
    const updatedQuestions = [...readingQuestions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setReadingQuestions(updatedQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (selectedCourses.length === 0) {
      setError('Please select at least one course');
      return;
    }

    if (activeTab === 'listening' || activeTab === 'speaking' || activeTab === 'reading' || activeTab === 'writing') {
       if (activeTab === 'listening') {
         if (!audioFile && !videoFile && !externalMediaUrl.trim()) {
           setError('Please provide at least one media source');
           return;
         }
         if (!questionDoc) {
           setError('Please select a question document');
           return;
         }
       }
       if (activeTab === 'speaking' && !textFile && !contentText.trim()) {
          setError('Please provide text content');
          return;
       }
       if (activeTab === 'writing') {
         const contentTypes = [!!writingImage, !!writingDocument, !!contentText.trim()].filter(Boolean);
         if (contentTypes.length !== 1) {
           setError('Please provide exactly one content type');
           return;
         }
       }
       setShowUploadPreview(true);
       return;
    }
    await performUpload();
  };

  const performUpload = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validation logic (simplified repeat of submit check for direct calls)
    try {
      const token = localStorage.getItem('token');
      const uploadPromises = selectedCourses.map(async (courseId) => {
        const formDataToSend = new FormData();
        formDataToSend.append('course_id', courseId);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('instruction', formData.instruction || '');
        formDataToSend.append('max_marks', formData.max_marks || '0');

        if (activeTab === 'speaking') {
           if (textFile) formDataToSend.append('textFile', textFile);
           if (contentText.trim()) formDataToSend.append('content_text', contentText.trim());
           return uploadSpeakingMaterial(formDataToSend, token);
        } else if (activeTab === 'reading') {
           if (textFile) formDataToSend.append('readingFile', textFile);
           if (contentText.trim()) formDataToSend.append('content_text', contentText.trim());
           const validQuestions = readingQuestions.filter(q => q.question && q.correct_answer);
           formDataToSend.append('questions', JSON.stringify(validQuestions.length > 0 ? validQuestions : []));
           return uploadReadingMaterial(formDataToSend, token);
        } else if (activeTab === 'writing') {
           if (writingImage) formDataToSend.append('writingImage', writingImage);
           if (writingDocument) formDataToSend.append('writingDocument', writingDocument);
           if (contentText.trim()) formDataToSend.append('content_text', contentText.trim());
           return uploadWritingTask(formDataToSend, token);
        } else {
           formDataToSend.append('module_type', activeTab);
           if (audioFile) formDataToSend.append('audio', audioFile);
           else if (videoFile) formDataToSend.append('video', videoFile);
           else if (externalMediaUrl.trim()) formDataToSend.append('external_media_url', externalMediaUrl.trim());
           formDataToSend.append('questionDoc', questionDoc);
           return uploadLSRWContent(formDataToSend, token);
        }
      });

      await Promise.all(uploadPromises);

      setSuccess(true);
      setFormData({ title: '', instruction: '', max_marks: '', module_type: activeTab });
      setAudioFile(null); setVideoFile(null); setExternalMediaUrl('');
      setQuestionDoc(null); setTextFile(null); setContentText('');
      setWritingImage(null); setWritingDocument(null); setReadingQuestions([]);
      
      // Reset inputs
      ['audio-input', 'video-input', 'doc-input', 'text-file-input', 'writing-image-input', 'writing-document-input'].forEach(id => {
         const el = document.getElementById(id);
         if(el) el.value = '';
      });

      if (selectedCourses.length > 0) fetchLSRWContent(selectedCourses[0]);
      
      setTimeout(() => setSuccess(false), 5000);
      if (showUploadPreview) {
        setUploadSuccessInModal(true);
        setTimeout(() => { setShowUploadPreview(false); setUploadSuccessInModal(false); }, 2000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorData = err.response?.data || {};
      setError(errorData.error || err.message || 'Failed to upload content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmUpload = async () => {
    await performUpload();
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
        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <button 
                            onClick={toggleMobileMenu}
                            className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                        >
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Resource Manager</h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Content Upload Center</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <ResourceNotificationBell />
                        <div className="relative">
                            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center focus:outline-none">
                                {profileInfo?.profile_picture ? (
                                    <img src={profileInfo.profile_picture} alt="Profile" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{getDisplayName()?.charAt(0).toUpperCase()}</div>
                                )}
                            </button>
                            {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <h3 className="font-bold text-gray-800">{getDisplayName()}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Resource Manager</p>
                                        </div>
                                        <div className="py-2">
                                            <button onClick={() => { navigate('/resource-manager/account-settings'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">Account Settings</button>
                                            <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm border-t">Logout</button>
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
            
            {/* Header Card */}
            <div className={`rounded-2xl shadow-lg p-8 text-white transition-all duration-300 relative overflow-hidden ${
                 activeTabConfig.color === 'blue' ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                 activeTabConfig.color === 'purple' ? 'bg-gradient-to-br from-purple-600 to-purple-800' :
                 activeTabConfig.color === 'green' ? 'bg-gradient-to-br from-green-600 to-green-800' :
                 'bg-gradient-to-br from-orange-600 to-orange-800'
            }`}>
               <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  {React.createElement(activeTabConfig.icon, { className: "w-64 h-64" })}
               </div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Upload {activeTabConfig.name} Content</h2>
                    <p className="text-white/80 max-w-2xl text-lg">
                        {activeTab === 'listening' && 'Add new audio/video listening tasks and questions.'}
                        {activeTab === 'speaking' && 'Provide text prompts for student recording exercises.'}
                        {activeTab === 'reading' && 'Upload reading passages with comprehension questions.'}
                        {activeTab === 'writing' && 'Create writing assignments with images or instructions.'}
                    </p>
                  </div>
                  
                  {/* Module Switcher Tabs */}
                  {showTabs && (
                    <div className="flex bg-white/20 backdrop-blur-sm p-1.5 rounded-xl">
                        {lsrwTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                                        isActive ? 'bg-white text-gray-900 shadow-md' : 'text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="hidden sm:inline">{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                  )}
               </div>
            </div>

            {/* Error/Success Messages */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-green-800 font-medium">Content uploaded successfully!</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                <XCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-medium whitespace-pre-wrap">{error}</p>
              </div>
            )}

            {/* Upload Form Card */}
            <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-8 transition-all duration-300 ${isTransitioning ? 'opacity-50 translate-y-2' : 'opacity-100'}`}>
                <form onSubmit={handleSubmit} className="space-y-8">
                   
                   {/* Language & Course Selection */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="space-y-4">
                           <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Select Language <span className="text-red-500">*</span></label>
                           <select
                               value={selectedLanguage}
                               onChange={handleLanguageChange}
                               className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                               required
                           >
                               <option value="">-- Choose Language --</option>
                               {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                           </select>
                       </div>

                       <div className="space-y-4 relative course-dropdown-container">
                           <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Assign to Courses <span className="text-red-500">*</span></label>
                           {selectedLanguage ? (
                               <>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input 
                                        type="text" 
                                        placeholder="Search courses..." 
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                        value={courseSearchTerm}
                                        onChange={(e) => { setCourseSearchTerm(e.target.value); setShowCourseDropdown(true); }}
                                        onFocus={() => setShowCourseDropdown(true)}
                                    />
                                </div>
                                {selectedCourses.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedCourseDetails.map(c => (
                                            <span key={c.id} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                                                {c.course_name}
                                                <button type="button" onClick={() => removeCourse(c.id)} className="ml-2 hover:text-blue-900"><X className="w-3 h-3"/></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {showCourseDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-64 overflow-y-auto z-50">
                                        {filteredCourses.length > 0 ? filteredCourses.map(course => (
                                            <div key={course.id} onClick={() => handleCourseToggle(course.id)} className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{course.course_name}</p>
                                                    <p className="text-xs text-gray-500">{course.level} • {course.mode}</p>
                                                </div>
                                                {selectedCourses.includes(course.id) && <CheckCircle className="w-5 h-5 text-green-500" />}
                                            </div>
                                        )) : <p className="p-4 text-center text-gray-500">No courses found.</p>}
                                    </div>
                                )}
                               </>
                           ) : (
                               <div className="p-3 bg-gray-50 rounded-xl text-gray-400 text-sm border border-gray-200 text-center">Select a language first</div>
                           )}
                       </div>
                   </div>

                   {/* Title, Marks & Instruction */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                placeholder="e.g. Activity 1 - Intro"
                                required
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Max Marks</label>
                            <input
                                type="number"
                                name="max_marks"
                                value={formData.max_marks}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                placeholder="0"
                            />
                        </div>
                   </div>
                   
                   <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Instruction</label>
                        <textarea
                            name="instruction"
                            value={formData.instruction}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                            placeholder="Instructions for the students..."
                        />
                   </div>

                   <hr className="border-gray-100" />

                   {/* Specific Module Inputs */}
                   
                   {/* LISTENING */}
                   {activeTab === 'listening' && (
                       <div className="space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Media Source <span className="text-red-500">*</span></label>
                                    <div className="grid gap-4">
                                        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${audioFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                            <input id="audio-input" type="file" accept="audio/*" onChange={handleAudioChange} className="hidden" />
                                            <label htmlFor="audio-input" className="cursor-pointer block">
                                                <FileAudio className={`w-10 h-10 mx-auto mb-2 ${audioFile ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <span className="text-sm font-medium text-gray-600">{audioFile ? audioFile.name : 'Upload Audio (MP3)'}</span>
                                            </label>
                                        </div>
                                        <div className="text-center text-sm text-gray-400 font-medium">- OR -</div>
                                        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${videoFile ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}>
                                            <input id="video-input" type="file" accept="video/*" onChange={handleVideoChange} disabled={!!audioFile} className="hidden" />
                                            <label htmlFor="video-input" className={`cursor-pointer block ${audioFile && 'opacity-50 cursor-not-allowed'}`}>
                                                <div className="mx-auto w-10 h-10 mb-2 flex items-center justify-center text-gray-400"><svg className={`w-8 h-8 ${videoFile ? 'text-purple-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>
                                                <span className="text-sm font-medium text-gray-600">{videoFile ? videoFile.name : 'Upload Video (MP4)'}</span>
                                            </label>
                                        </div>
                                        <div className="text-center text-sm text-gray-400 font-medium">- OR -</div>
                                        <input 
                                            type="url" 
                                            placeholder="Paste External URL (YouTube/Vimeo)"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={externalMediaUrl}
                                            onChange={handleExternalUrlChange}
                                            disabled={!!audioFile || !!videoFile}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Question Doc <span className="text-red-500">*</span></label>
                                     <div className={`border-2 border-dashed rounded-xl p-8 text-center h-full flex flex-col items-center justify-center transition-all ${questionDoc ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}>
                                         <input id="doc-input" type="file" accept=".docx,.doc" onChange={handleDocChange} className="hidden" />
                                         <label htmlFor="doc-input" className="cursor-pointer">
                                             <FileText className={`w-12 h-12 mx-auto mb-3 ${questionDoc ? 'text-green-600' : 'text-gray-400'}`} />
                                             <span className="block text-sm font-medium text-gray-600">{questionDoc ? questionDoc.name : 'Upload Question DOCX'}</span>
                                         </label>
                                     </div>
                                </div>
                           </div>
                       </div>
                   )}

                   {/* SPEAKING & READING */}
                   {(activeTab === 'speaking' || activeTab === 'reading') && (
                       <div className="space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                     <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">File Upload <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
                                     <div className={`border-2 border-dashed rounded-xl p-8 text-center h-full flex flex-col items-center justify-center transition-all ${textFile ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'} ${extractingReading ? 'animate-pulse' : ''}`}>
                                         <input id="text-file-input" type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleTextFileChange} disabled={extractingReading} className="hidden" />
                                         <label htmlFor="text-file-input" className="cursor-pointer">
                                             {extractingReading ? <Loader2 className="w-10 h-10 mx-auto text-purple-600 animate-spin mb-2"/> : <FileText className={`w-12 h-12 mx-auto mb-3 ${textFile ? 'text-purple-600' : 'text-gray-400'}`} />}
                                             <span className="block text-sm font-medium text-gray-600">{extractingReading ? 'Extracting...' : (textFile ? textFile.name : 'Upload Document')}</span>
                                             {activeTab === 'reading' && <p className="text-xs text-green-600 mt-2 font-medium">Auto-extracts Questions</p>}
                                         </label>
                                     </div>
                                </div>
                                <div className="space-y-4">
                                     <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Text Content</label>
                                     <textarea
                                         value={contentText}
                                         onChange={(e) => { setContentText(e.target.value); if(e.target.value) setTextFile(null); }}
                                         rows="8"
                                         placeholder="Enter content here..."
                                         className="w-full h-full min-h-[160px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none"
                                     />
                                </div>
                           </div>
                           
                           {/* Reading - MCQs */}
                           {activeTab === 'reading' && (
                               <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                   <div className="flex items-center justify-between mb-6">
                                       <h3 className="font-bold text-gray-800 flex items-center gap-2"><Book className="w-5 h-5 text-green-600"/> MCQ Questions</h3>
                                       <button type="button" onClick={() => setReadingQuestions([...readingQuestions, { question:'', optionA:'', optionB:'', optionC:'', optionD:'', correct_answer:''}])} className="text-sm font-semibold text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-200">+ Add Question</button>
                                   </div>
                                   {readingQuestions.length === 0 ? (
                                       <div className="text-center py-6 text-gray-500 text-sm">No formatted questions extracted or added yet.</div>
                                   ) : (
                                       <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                           {readingQuestions.map((q, idx) => (
                                               <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                   <div className="flex justify-between items-start mb-3">
                                                       <span className="font-bold text-gray-500 text-sm">Q{idx+1}</span>
                                                       <button type="button" onClick={() => setReadingQuestions(readingQuestions.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                                                   </div>
                                                   <input type="text" placeholder="Question Text" className="w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-green-500 outline-none" value={q.question} onChange={(e) => handleReadingQuestionChange(idx, 'question', e.target.value)}/>
                                                   <div className="grid grid-cols-2 gap-3 mb-3">
                                                       {['A','B','C','D'].map((opt) => (
                                                           <input key={opt} type="text" placeholder={`Option ${opt}`} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-green-500 outline-none" value={q[`option${opt}`]} onChange={(e) => handleReadingQuestionChange(idx, `option${opt}`, e.target.value)}/>
                                                       ))}
                                                   </div>
                                                   <select value={q.correct_answer} onChange={(e) => handleReadingQuestionChange(idx, 'correct_answer', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-1 focus:ring-green-500 outline-none">
                                                       <option value="">Select Correct Answer</option>
                                                       {['A','B','C','D'].map(opt => <option key={opt} value={opt}>Option {opt}</option>)}
                                                   </select>
                                               </div>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                   )}

                   {/* WRITING */}
                   {activeTab === 'writing' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`col-span-1 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col justify-center items-center h-48 ${writingImage ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}`}>
                                <input id="writing-image-input" type="file" accept="image/*" onChange={handleWritingImageChange} className="hidden" />
                                <label htmlFor="writing-image-input" className="cursor-pointer">
                                    <Image className={`w-10 h-10 mx-auto mb-2 ${writingImage ? 'text-orange-600' : 'text-gray-400'}`}/>
                                    <span className="text-sm font-medium text-gray-600">{writingImage ? writingImage.name : 'Upload Image'}</span>
                                </label>
                            </div>
                            <div className={`col-span-1 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col justify-center items-center h-48 ${writingDocument ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}`}>
                                <input id="writing-document-input" type="file" accept=".pdf,.docx" onChange={handleWritingDocumentChange} className="hidden" />
                                <label htmlFor="writing-document-input" className="cursor-pointer">
                                    <FileText className={`w-10 h-10 mx-auto mb-2 ${writingDocument ? 'text-orange-600' : 'text-gray-400'}`}/>
                                    <span className="text-sm font-medium text-gray-600">{writingDocument ? writingDocument.name : 'Upload Doc'}</span>
                                </label>
                            </div>
                            <div className="col-span-1 h-48">
                                <textarea
                                    value={contentText}
                                    onChange={(e) => { setContentText(e.target.value); if(e.target.value) { setWritingImage(null); setWritingDocument(null); } }}
                                    placeholder="Or enter text..."
                                    className="w-full h-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none resize-none"
                                />
                            </div>
                       </div>
                   )}

                   {/* Submit Btn */}
                   <button
                       type="submit"
                       disabled={submitting}
                       className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transform transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                           activeTabConfig.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' :
                           activeTabConfig.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                           activeTabConfig.color === 'green' ? 'bg-gradient-to-r from-green-600 to-teal-600' :
                           'bg-gradient-to-r from-orange-600 to-red-600'
                       }`}
                   >
                       {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                       {submitting ? 'Uploading...' : 'Review & Upload'}
                   </button>
                    
                </form>
            </div>

            {/* Uploaded List Card */}
            {selectedCourses.length > 0 && uploadedContent.length > 0 && (
                <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Recently Uploaded ({uploadedContent.length})
                    </h3>
                    <div className="space-y-3">
                        {uploadedContent.map(content => (
                            <div key={content.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition flex justify-between items-center group">
                                <div>
                                    <p className="font-semibold text-gray-800">{content.title}</p>
                                    <p className="text-sm text-gray-500 truncate max-w-md">{content.instruction}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                                    content.module_type === 'listening' ? 'bg-blue-100 text-blue-700' :
                                    content.module_type === 'speaking' ? 'bg-purple-100 text-purple-700' :
                                    content.module_type === 'reading' ? 'bg-green-100 text-green-700' :
                                    'bg-orange-100 text-orange-700'
                                }`}>{content.module_type || activeTab}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showUploadPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !uploadSuccessInModal && setShowUploadPreview(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
                        {uploadSuccessInModal && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-10 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-600" /></div>
                                <h3 className="text-2xl font-bold text-gray-800">Uploaded Successfully!</h3>
                            </div>
                        )}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Confirm Upload</h3>
                            <button onClick={() => setShowUploadPreview(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="p-3 border rounded-lg">
                                     <p className="text-xs text-gray-500 uppercase font-bold">Language</p>
                                     <p className="font-medium">{selectedLanguage}</p>
                                 </div>
                                 <div className="p-3 border rounded-lg">
                                     <p className="text-xs text-gray-500 uppercase font-bold">Courses</p>
                                     <p className="font-medium">{selectedCourses.length} Selected</p>
                                 </div>
                             </div>
                             <div className="p-3 border rounded-lg bg-gray-50">
                                 <p className="text-xs text-gray-500 uppercase font-bold mb-1">Title</p>
                                 <p className="font-medium text-lg">{formData.title}</p>
                                 <p className="text-gray-600 text-sm mt-1">{formData.instruction}</p>
                             </div>
                             {/* Module Specific Preview Info */}
                             <div className="space-y-2">
                                 <p className="text-xs text-gray-500 uppercase font-bold">Files & Content</p>
                                 {activeTab === 'listening' && (
                                     <ul className="text-sm list-disc pl-5 space-y-1">
                                         <li>Media: {audioFile ? `Audio (${audioFile.name})` : videoFile ? `Video (${videoFile.name})` : externalMediaUrl ? 'External URL' : 'None'}</li>
                                         <li>Questions: {questionDoc ? questionDoc.name : 'None'}</li>
                                     </ul>
                                 )}
                                 {(activeTab === 'speaking' || activeTab === 'reading') && (
                                     <ul className="text-sm list-disc pl-5 space-y-1">
                                         <li>Document: {textFile ? textFile.name : 'None'}</li>
                                         <li>Text Content: {contentText ? 'Yes' : 'No'}</li>
                                         {activeTab === 'reading' && <li>MCQ Questions: {readingQuestions.length}</li>}
                                     </ul>
                                 )}
                                 {activeTab === 'writing' && (
                                     <ul className="text-sm list-disc pl-5 space-y-1">
                                         <li>Image: {writingImage ? writingImage.name : 'None'}</li>
                                         <li>Document: {writingDocument ? writingDocument.name : 'None'}</li>
                                         <li>Text: {contentText ? 'Yes' : 'None'}</li>
                                     </ul>
                                 )}
                             </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex gap-4 bg-gray-50">
                            <button onClick={() => setShowUploadPreview(false)} className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-100">Cancel</button>
                            <button onClick={handleConfirmUpload} disabled={submitting} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50">
                                {submitting ? 'Uploading...' : 'Confirm Upload'}
                            </button>
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

export default LSRWUploadPage;