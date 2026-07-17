import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { getBatchStudentsWithMarks, saveBatchMarks, submitBatchMarks, setBatchAssessmentDate, getCurrentUserProfile } from '../services/Api';



// Total marks configuration for each language
const LANGUAGE_TOTALS = {
  'German': { totalKey: 'german_total_marks', totalMaxMarks: 100 },
  'French': { totalKey: 'french_total_marks', totalMaxMarks: 100 },
  'Japanese': { totalKey: 'japanese_total_marks', totalMaxMarks: 180 }
};

const TeacherAssessmentMarksPage = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [courseLanguage, setCourseLanguage] = useState('Unknown');
  const [languageColumns, setLanguageColumns] = useState([]);
  const [assessmentDate, setAssessmentDate] = useState(null);
  const [showAssessmentDateModal, setShowAssessmentDateModal] = useState(false);
  const [tempAssessmentDate, setTempAssessmentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
  const [tutorInfo, setTutorInfo] = useState(null);


  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Helper function to check if a name is a full name (has spaces) vs username
  const isFullName = (name) => {
    if (!name || name.trim() === '') return false;
    return name.trim().includes(' ');
  };
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '' && isFullName(tokenFullName)) {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '' && isFullName(tutorInfo.full_name)) {
      return tutorInfo.full_name;
    }
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Teacher";
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchTutorInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setTutorInfo(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch tutor info:', err);
      }
    };
    fetchTutorInfo();
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
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  // Fetch batch students and marks
  const fetchBatchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getBatchStudentsWithMarks(batchId, token);
      
      if (data.success) {
        setBatch(data.data.batch);
        setStudents(data.data.students);
        setCourseLanguage(data.data.courseLanguage);
        setLanguageColumns(data.data.languageColumns || []);
        setAssessmentDate(data.data.assessmentDate);
        
        // Check if any marks are already submitted
        const hasSubmittedMarks = data.data.students.some(student => 
          student.status === 'submitted' || student.status === 'approved'
        );
        setIsSubmitted(hasSubmittedMarks);
        
        // Show assessment date modal if no assessment date is set
        if (!data.data.assessmentDate) {
          setShowAssessmentDateModal(true);
        }
      } else {
        throw new Error(data.error || 'Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching batch data:', error);
      alert('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) {
      fetchBatchData();
    }
  }, [batchId, fetchBatchData]);

  // Handle mark input change
  const handleMarkChange = (studentIndex, columnKey, value) => {
    const updatedStudents = [...students];
    const student = updatedStudents[studentIndex];
    
    // Validate input
    const numValue = parseInt(value) || 0;
    const column = languageColumns.find(col => col.key === columnKey);
    const maxMarks = column?.maxMarks || 100;
    
    if (numValue >= 0 && numValue <= maxMarks) {
      student[columnKey] = numValue;
      
      // Calculate total
      const lang = courseLanguage?.toLowerCase().trim();
      if (lang === 'german') {
        student.german_total_marks = (student.german_lesen_marks || 0) + 
                                    (student.german_schreiben_marks || 0) + 
                                    (student.german_horen_marks || 0) + 
                                    (student.german_sprechen_marks || 0);
      } else if (lang === 'french') {
        student.french_total_marks = (student.french_comprehension_orale_marks || 0) + 
                                   (student.french_comprehension_ecrite_marks || 0) + 
                                   (student.french_production_orale_marks || 0) + 
                                   (student.french_production_ecrite_marks || 0);
      } else if (lang === 'japanese') {
        student.japanese_total_marks = (student.japanese_vocabulary_grammar_marks || 0) + 
                                     (student.japanese_reading_marks || 0) + 
                                     (student.japanese_listening_marks || 0);
      }
      
      setStudents(updatedStudents);
      setHasChanges(true);
    }
  };

  // Handle assessment date setting
  const handleSetAssessmentDate = async () => {
    if (!tempAssessmentDate) {
      alert('Please select an assessment date');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const result = await setBatchAssessmentDate(batchId, tempAssessmentDate, token);
      
      if (result.success) {
        setAssessmentDate(tempAssessmentDate);
        setShowAssessmentDateModal(false);
        setTempAssessmentDate('');
        alert('Assessment date set successfully');
      } else {
        throw new Error(result.error || 'Failed to set assessment date');
      }
    } catch (error) {
      console.error('Error setting assessment date:', error);
      alert(error.message || 'Failed to set assessment date');
    }
  };

  // Save marks
  const handleSaveMarks = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const marksData = students.map(student => {
        const marks = {
          studentId: student.student_id,
          marksData: {
            status: student.status || 'draft'
          }
        };

        // Add language-specific marks to marksData
        const lang = courseLanguage?.toLowerCase().trim();
        if (lang === 'german') {
          marks.marksData.german_lesen_marks = student.german_lesen_marks || 0;
          marks.marksData.german_schreiben_marks = student.german_schreiben_marks || 0;
          marks.marksData.german_horen_marks = student.german_horen_marks || 0;
          marks.marksData.german_sprechen_marks = student.german_sprechen_marks || 0;
        } else if (lang === 'french') {
          marks.marksData.french_comprehension_orale_marks = student.french_comprehension_orale_marks || 0;
          marks.marksData.french_comprehension_ecrite_marks = student.french_comprehension_ecrite_marks || 0;
          marks.marksData.french_production_orale_marks = student.french_production_orale_marks || 0;
          marks.marksData.french_production_ecrite_marks = student.french_production_ecrite_marks || 0;
        } else if (lang === 'japanese') {
          marks.marksData.japanese_vocabulary_grammar_marks = student.japanese_vocabulary_grammar_marks || 0;
          marks.marksData.japanese_reading_marks = student.japanese_reading_marks || 0;
          marks.marksData.japanese_listening_marks = student.japanese_listening_marks || 0;
        }

        return marks;
      });

      const result = await saveBatchMarks(batchId, marksData, assessmentDate, token);
      
      if (result.success) {
        alert('Marks saved successfully');
        setHasChanges(false);
        // Update students with returned data
        setStudents(result.data);
      } else {
        throw new Error(result.error || 'Failed to save marks');
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  // Submit final marks
  const handleSubmitMarks = async () => {
    if (!window.confirm('Are you sure you want to submit the final marks? This will complete the batch assessment.')) {
      return;
    }

    setSubmitting(true);
    
    try {
      // First save any pending changes
      if (hasChanges) {
        await handleSaveMarks();
      }

      const token = localStorage.getItem('token');
      const result = await submitBatchMarks(batchId, token);
      
      if (result.success) {
        alert('Assessment marks submitted successfully');
        setIsSubmitted(true); // Disable further editing and submission
        setHasChanges(false);
        navigate('/teacher/classes');
      } else {
        throw new Error(result.error || 'Failed to submit marks');
      }
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert('Failed to submit marks');
    } finally {
      setSubmitting(false);
    }
  };

  // Get total marks for a student
  const getTotalMarks = (student) => {
    const lang = courseLanguage?.toLowerCase().trim();
    if (lang === 'german') return student.german_total_marks || 0;
    if (lang === 'french') return student.french_total_marks || 0;
    if (lang === 'japanese') return student.japanese_total_marks || 0;
    return 0;
  };

  // Get max total marks for the language
  const getMaxTotalMarks = () => {
    const totals = LANGUAGE_TOTALS[courseLanguage];
    return totals ? totals.totalMaxMarks : 0;
  };



  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarWidth('0');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
              <h3 className="text-lg font-bold text-gray-800 mt-6">Loading assessment data...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg transition-all duration-200" style={{ backgroundColor: '#e3f2fd' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#bbdefb'} onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
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
                    Assessment Marks
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      {batch ? `${batch.batch_name} - ${batch.course_name}` : 'Loading...'}
                    </p>
                    {batch && (
                      <>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          batch?.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {batch?.status || 'Loading...'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          courseLanguage === 'German' ? 'bg-purple-100 text-purple-800' :
                          courseLanguage === 'French' ? 'bg-blue-100 text-blue-800' :
                          courseLanguage === 'Japanese' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {courseLanguage}
                        </span>
                        {assessmentDate && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            📅 {new Date(assessmentDate).toLocaleDateString()}
                          </span>
                        )}
                        {batch?.status === 'completed' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Assessment Completed
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <TeacherNotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {tutorInfo?.profile_photo ? (
                      <img
                        src={tutorInfo.profile_photo}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer transition-all" onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }} onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onMouseLeave={(e) => e.target.style.boxShadow = 'none'}>
                        {getDisplayName()?.charAt(0).toUpperCase() || "T"}
                      </div>
                    )}
                  </button>

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
                            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ '--focus-ring': '#2196f3' }} onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #2196f3'} onBlur={(e) => e.target.style.boxShadow = 'none'}>
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
                            <span className="text-sm text-gray-700">Tutor Info</span>
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem('token');
                              navigate('/login');
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors text-red-600"
                          >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4 4m4-4H3m3 4v1a3 3 0 003 3h1v-1M6 3v1a3 3 0 003 3h1V6M6 3L3 6m14-4v1a3 3 0 00-3 3h-1V3" />
                            </svg>
                            <span className="text-sm">Logout</span>
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

        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Batch Information Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Batch Name</p>
                  <p className="font-semibold text-gray-800">{batch?.batch_name || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Course Name</p>
                  <p className="font-semibold text-gray-800">{batch?.course_name || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Course Language</p>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      courseLanguage === 'German' ? 'bg-purple-100 text-purple-800' :
                      courseLanguage === 'French' ? 'bg-blue-100 text-blue-800' :
                      courseLanguage === 'Japanese' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {courseLanguage || 'Loading...'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Batch Status</p>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      batch?.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {batch?.status || 'Loading...'}
                    </span>
                    {batch?.status === 'completed' && (
                      <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Assessment Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer for Completed Batches */}
            {batch?.status === 'completed' && (
              <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
                  </svg>
                  <p className="text-xs text-yellow-700">
                    <strong>Notice:</strong> Batch completed - Assessment data entry is not available.
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Table */}
            <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${batch?.status === 'completed' ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      {languageColumns.map((column) => (
                        <th key={column.key} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {column.label}
                          <br />
                          <span className="text-xs text-gray-400">(Max: {column.maxMarks})</span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                        <br />
                        <span className="text-xs text-gray-400">(Max: {getMaxTotalMarks()})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, index) => {
                      const uniqueKey = student.student_id ? `student-${student.student_id}` : `student-index-${index}`;
                      return (
                        <tr key={uniqueKey} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.registration_number || student.reg_number || student.reg_no || student.roll_number || student.roll_no || 'N/A'}
                              </div>
                            </div>
                          </td>
                          {languageColumns.map((column) => (
                            <td key={`${uniqueKey}-${column.key}`} className="px-4 py-4 whitespace-nowrap">
                              <input
                                key={`${uniqueKey}-${column.key}-input`}
                                type="number"
                                min="0"
                                max={column.maxMarks}
                                value={student[column.key] || 0}
                                onChange={(e) => handleMarkChange(index, column.key, e.target.value)}
                                disabled={isSubmitted || batch?.status === 'completed'}
                                className={`w-20 px-2 py-1 text-center border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  isSubmitted || batch?.status === 'completed'
                                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
                                    : 'border-gray-300'
                                }`}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="font-semibold text-gray-900">
                              {getTotalMarks(student)}
                            </div>
                            <div className="text-xs text-gray-500">
                              / {getMaxTotalMarks()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex space-x-4">
                {!assessmentDate && (
                  <button
                    onClick={() => setShowAssessmentDateModal(true)}
                    disabled={isSubmitted || batch?.status === 'completed'}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                      isSubmitted || batch?.status === 'completed'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Set Assessment Date
                  </button>
                )}
                <button
                  onClick={handleSaveMarks}
                  disabled={saving || !hasChanges || isSubmitted || batch?.status === 'completed'}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                    saving || !hasChanges || isSubmitted || batch?.status === 'completed'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                      </svg>
                      Save Marks
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleSubmitMarks}
                  disabled={submitting || isSubmitted || batch?.status === 'completed'}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                    submitting || isSubmitted || batch?.status === 'completed'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isSubmitted || batch?.status === 'completed' ? 'Already Submitted' : 'Submit Final Marks'}
                    </>
                  )}
                </button>
              </div>
              
              {(isSubmitted || batch?.status === 'completed') && (
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Assessment marks have been {batch?.status === 'completed' ? 'completed and finalized' : 'submitted'}
                </div>
              )}
            </div>

            {students.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200 mt-6">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800 mb-2">No Students Found</h3>
                <p className="text-gray-600">There are no active students enrolled in this batch.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Date Modal */}
      {showAssessmentDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Assessment Date</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please select the assessment date for this batch. This date will be used for all students in this batch.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Date
              </label>
              <input
                type="date"
                value={tempAssessmentDate}
                onChange={(e) => setTempAssessmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAssessmentDateModal(false);
                  setTempAssessmentDate('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetAssessmentDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssessmentMarksPage;
