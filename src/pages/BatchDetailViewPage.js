import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AcademicNotificationBell from '../components/AcademicNotificationBell';
import ManagerNotificationBell from '../components/ManagerNotificationBell';
import { getBatchById, getUserById, getEnrolledStudentsByBatch, getGMeetsByBatch, createGMeet, updateGMeet, deleteGMeet, getStudentPaymentDetails, getCurrentUserProfile, getBatchStudentsWithMarks, saveBatchMarks, submitBatchMarks, generateCertificate, approveGeneratedCertificate, deleteGeneratedCertificate } from '../services/Api';
import { Trash2, Upload } from 'lucide-react';

const BatchDetailViewPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [assessmentData, setAssessmentData] = useState([]);
  const [assessmentDate, setAssessmentDate] = useState(null);
  const [courseLanguage, setCourseLanguage] = useState('Unknown');
  const [languageColumns, setLanguageColumns] = useState([]);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState([]);
  const [generatedCertificates, setGeneratedCertificates] = useState({});
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState(null);
  const [rightView, setRightView] = useState('student'); // 'student', 'session', or 'assessment'

  const [userRole, setUserRole] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const paymentItemsPerPage = 5;
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

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
    // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "User";
  };

  // Get role display name (can accept a role parameter or use current userRole)
  const getRoleDisplayName = (role = null) => {
    // If role parameter is provided, use it; otherwise use current userRole
    // If role is explicitly null/undefined when passed, return "Creator" for creator role display
    const roleToUse = role !== null ? (role || 'Creator') : (userRole || 'User');
    
    if (!roleToUse || roleToUse === 'User') return role !== null ? 'Creator' : 'User';
    
    const roleLower = roleToUse.toLowerCase();
    if (roleLower === 'academic') {
      return "Academic Coordinator";
    } else if (roleLower === 'manager') {
      return "Manager";
    } else if (roleLower === 'admin') {
      return "Admin";
    } else if (roleLower === 'teacher') {
      return "Teacher";
    } else if (roleLower === 'financial') {
      return "Financial Partner";
    }
    return roleToUse.charAt(0).toUpperCase() + roleToUse.slice(1).toLowerCase();
  };

  // Get default avatar letter based on role
  const getDefaultAvatarLetter = () => {
    if (!userRole) return "U";
    const roleLower = userRole.toLowerCase();
    if (roleLower === 'academic') {
      return "A";
    } else if (roleLower === 'manager') {
      return "M";
    } else if (roleLower === 'admin') {
      return "A";
    } else if (roleLower === 'teacher') {
      return "T";
    } else if (roleLower === 'financial') {
      return "F";
    }
    return userRole.charAt(0).toUpperCase();
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
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Get user role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setUserRole(decodedToken.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
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

  // Fetch batch details
  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        
        if (!token) throw new Error('Authentication token not found');
        
        // Fetch batch details using API service
        const batchResponse = await getBatchById(token, batchId);
        
        console.log('📥 Raw batch response from API:', {
          success: batchResponse?.success,
          has_data: !!batchResponse?.data,
          full_response: batchResponse
        });
        
        if (batchResponse && batchResponse.success && batchResponse.data) {
          // Transform the data to match expected format
          const batchData = batchResponse.data;
          
          // Debug: Log the received data to verify backend response
          console.log('📦 Batch data received from backend:', {
            batch_id: batchData.batch_id,
            batch_name: batchData.batch_name,
            created_by: batchData.created_by,
            creator_role: batchData.creator_role,
            creator_id: batchData.creator_id,
            merge_info: batchData.merge_info,
            has_merge_info: !!batchData.merge_info,
            is_merged: batchData.merge_info?.is_merged,
            merged_batches_count: batchData.merge_info?.merged_batches?.length,
            merge_info_type: typeof batchData.merge_info,
            merge_info_keys: batchData.merge_info ? Object.keys(batchData.merge_info) : null
          });
          
          // Check if created_by is still a UUID (contains dashes and long string)
          const isUUID = batchData.created_by && 
                        typeof batchData.created_by === 'string' && 
                        batchData.created_by.includes('-') && 
                        batchData.created_by.length > 30;
          
          // If backend returned UUID, fetch creator name from backend API
          let finalCreatedBy = batchData.created_by;
          let finalCreatorRole = batchData.creator_role;
          
          if (isUUID) {
            // Backend didn't transform it, fetch creator name using Api.js function
            // Use created_by (UUID) or creator_id to fetch user details
            const creatorUUID = batchData.created_by || batchData.creator_id;
            
            if (creatorUUID) {
              try {
                console.log('🔄 Fetching creator name for UUID:', creatorUUID);
                const creatorData = await getUserById(creatorUUID);
                
                if (creatorData && creatorData.success && creatorData.data) {
                  finalCreatedBy = creatorData.data.full_name || creatorData.data.name || 'Unknown';
                  finalCreatorRole = creatorData.data.role || null;
                  console.log('✅ Creator name fetched separately:', { name: finalCreatedBy, role: finalCreatorRole });
                }
              } catch (err) {
                console.error('❌ Error fetching creator name separately:', err);
              }
            }
          }
          
          setBatch({
            ...batchData,
            batch_name: batchData.batch_name,
            course_name: batchData.course_name,
            course_type: batchData.course_type,
            center_name: batchData.center_name,
            teacher_name: batchData.teacher_name,
            assistant_tutor_name: batchData.assistant_tutor_name,
            status: batchData.status || 'Approved',
            student_count: batchData.student_count || 0,
            // Use transformed created_by (name, not UUID)
            created_by: isUUID ? finalCreatedBy : (batchData.created_by || 'Unknown'),
            creator_role: finalCreatorRole || batchData.creator_role || null,
            max_students: batchData.max_students,
            duration: batchData.duration,
            start_date: batchData.start_date,
            end_date: batchData.end_date,
            // Include merge information
            merge_info: batchData.merge_info || null
          });
          
          // Fetch enrolled students for this batch
          await fetchEnrolledStudents(batchId);
        } else {
          throw new Error(batchResponse?.error || batchResponse?.message || 'Failed to load batch details');
        }
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const fetchEnrolledStudents = async (batchId) => {
    try {
      setLoadingStudents(true);
      const data = await getEnrolledStudentsByBatch(batchId);
      setStudents(data.data || []);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchSessions = async (batchId) => {
    try {
      setLoadingSessions(true);
      const token = localStorage.getItem('token');
      const response = await getGMeetsByBatch(batchId, token);
      
      // Handle different response formats (array or object with data property)
      let sessionsData = Array.isArray(response) ? response : (response?.data || response || []);
      
      // Organize sessions by session_number if total_sessions exists
      if (batch && batch.total_sessions) {
        const sessionsMap = {};
        for (let i = 1; i <= batch.total_sessions; i++) {
          sessionsMap[i] = null;
        }
        
        if (Array.isArray(sessionsData)) {
          sessionsData.forEach(session => {
            if (session.session_number) {
              sessionsMap[session.session_number] = session;
            }
          });
        }
        
        const sessionsArray = [];
        for (let i = 1; i <= batch.total_sessions; i++) {
          sessionsArray.push({
            session_number: i,
            ...sessionsMap[i],
            meet_id: sessionsMap[i]?.meet_id || null,
            date: sessionsMap[i]?.date || null,
            time: sessionsMap[i]?.time || null,
            title: sessionsMap[i]?.title || `Session ${i}`,
            meet_link: sessionsMap[i]?.meet_link || null,
            note: sessionsMap[i]?.note || null,
            status: sessionsMap[i]?.status || 'Scheduled',
            cancellation_reason: sessionsMap[i]?.cancellation_reason || null
          });
        }
        setSessions(sessionsArray);
      } else {
        // If no total_sessions, show all existing sessions
        const sortedSessions = Array.isArray(sessionsData) ? sessionsData.sort((a, b) => {
          if (a.session_number && b.session_number) {
            return a.session_number - b.session_number;
          }
          if (a.date && b.date) {
            return new Date(a.date) - new Date(b.date);
          }
          return 0;
        }) : [];
        setSessions(sortedSessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchAssessmentData = async (batchId) => {
    try {
      setLoadingAssessment(true);
      const token = localStorage.getItem('token');
      const data = await getBatchStudentsWithMarks(batchId, token);
      
      if (data.success) {
        const studentList = data.data.students || [];
        setAssessmentData(studentList);
        setCourseLanguage(data.data.courseLanguage || 'Unknown');
        setLanguageColumns(data.data.languageColumns || []);
        setAssessmentDate(data.data.assessmentDate);

        // Populate generated certificates state from student data
        const certs = {};
        studentList.forEach(student => {
          if (student.certificate) {
            certs[student.student_id] = student.certificate;
          }
        });
        setGeneratedCertificates(certs);
        
        // Check if any marks are already submitted
        const hasSubmittedMarks = data.data.students.some(student => 
          student.status === 'submitted' || student.status === 'approved'
        );
        
        // More robust check: only consider submitted if ALL students have submitted status
        const allStudentsSubmitted = data.data.students.length > 0 && 
          data.data.students.every(student => 
            student.status === 'submitted' || student.status === 'approved'
          );
        
        // Use allStudentsSubmitted instead of hasSubmittedMarks for better UX
        const shouldDisableEdit = allStudentsSubmitted || batch?.status === 'completed';
        setIsSubmitted(shouldDisableEdit);
        
        // Debug logging
        console.log('Assessment data loaded:', {
          hasSubmittedMarks,
          allStudentsSubmitted,
          batchStatus: batch?.status,
          shouldDisableEdit,
          isSubmitted: shouldDisableEdit,
          studentsCount: data.data.students?.length
        });
        
        // Log first student data to see all available fields
        if (data.data.students && data.data.students.length > 0) {
          console.log('First student data:', data.data.students[0]);
          console.log('All student fields:', Object.keys(data.data.students[0]));
        }
      } else {
        throw new Error(data.error || 'Failed to load assessment data');
      }
    } catch (error) {
      console.error('Error fetching assessment data:', error);
      setAssessmentData([]);
      setCourseLanguage('Unknown');
      setLanguageColumns([]);
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Handle mark changes
  const handleMarkChange = (studentIndex, field, value) => {
    const updatedAssessmentData = [...assessmentData];
    updatedAssessmentData[studentIndex][field] = parseInt(value) || 0;
    setAssessmentData(updatedAssessmentData);
    setHasChanges(true);
  };

  // Start editing
  const handleStartEdit = () => {
    // Prevent editing if marks are already submitted or batch is completed
    if (isSubmitted || batch?.status === 'completed') {
      console.log('Edit blocked:', {
        isSubmitted,
        batchStatus: batch?.status,
        reason: isSubmitted ? 'All students marks already submitted' : 'Batch completed'
      });
      return;
    }
    
    console.log('Starting edit mode');
    setOriginalData(JSON.parse(JSON.stringify(assessmentData)));
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setAssessmentData(originalData);
    setIsEditing(false);
    setHasChanges(false);
  };

  // Reset submitted state for testing
  const resetSubmittedState = () => {
    console.log('Resetting submitted state to false');
    setIsSubmitted(false);
  };

  // Generate certificate for a student
  const handleGenerateCertificate = async (studentIndex) => {
    const student = assessmentData[studentIndex];
    const studentId = student.student_id;
    
    setGeneratingCertificate(true);
    
    try {
      const token = localStorage.getItem('token');
      const result = await generateCertificate(studentId, batchId, token);
      
      if (result.success) {
        // Open certificate in new tab
        window.open(result.data.certificateUrl, '_blank');
        
        // Update state
        setGeneratedCertificates(prev => ({
          ...prev,
          [studentId]: {
            url: result.data.certificateUrl,
            generatedAt: new Date(),
            certificateId: result.data.certificateId
          }
        }));
        
        alert('Certificate generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate certificate');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert(error.message || 'Failed to generate certificate');
    } finally {
      setGeneratingCertificate(false);
    }
  };

  // View certificate
  const viewCertificate = (studentId) => {
    const certificate = generatedCertificates[studentId];
    if (certificate && certificate.url) {
      window.open(certificate.url, '_blank');
    }
  };

  // Approve certificate
  const handleApproveCertificate = async (certificateId, studentId) => {
    if (!window.confirm('Are you sure you want to approve this certificate?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const result = await approveGeneratedCertificate(certificateId, token);
      
      if (result.success) {
        alert('Certificate approved successfully');
        // Update local state to show as completed
        setGeneratedCertificates(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            status: 'completed'
          }
        }));
        // Optional: Refresh assessment data
        await fetchAssessmentData(batchId);
      }
    } catch (error) {
      console.error('Error approving certificate:', error);
      alert(error.message || 'Failed to approve certificate');
    }
  };

  // Delete generated certificate
  const handleDeleteGeneratedCertificate = async (certificateId, studentId) => {
    if (!window.confirm('Are you sure you want to delete this generated certificate? This will allow you to generate a new one.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const result = await deleteGeneratedCertificate(certificateId, token);
      
      if (result.success) {
        alert('Certificate deleted successfully');
        // Remove from local state
        setGeneratedCertificates(prev => {
          const newState = { ...prev };
          delete newState[studentId];
          return newState;
        });
        // Optional: Refresh assessment data
        await fetchAssessmentData(batchId);
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      alert(error.message || 'Failed to delete certificate');
    }
  };

  // Save marks
  const handleSaveMarks = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const marksData = assessmentData.map(student => {
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
        setIsEditing(false);
        // Update assessmentData with returned data
        setAssessmentData(result.data);
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
        setIsEditing(false); // Exit edit mode
        // Remove automatic navigation to prevent logout
        // navigate('/teacher/classes');
        
        // Refresh the data to show updated status
        await fetchAssessmentData(batchId);
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
    const lang = courseLanguage?.toLowerCase().trim();
    if (lang === 'german') return 100;
    if (lang === 'french') return 100;
    if (lang === 'japanese') return 180;
    return 0;
  };

  // Fetch data when rightView changes
  useEffect(() => {
    if (batchId && batch) {
      if (rightView === 'session') {
        fetchSessions(batchId);
      } else if (rightView === 'assessment') {
        fetchAssessmentData(batchId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, rightView, batch]);









  const handleDeleteSession = async (meetId) => {
    if (!meetId) return;
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const token = localStorage.getItem('token');
        await deleteGMeet(meetId, token);
        fetchSessions(batchId);
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session: ' + error.message);
      }
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes, seconds] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || '0', 10));
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting time:", timeString, e);
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle student click to view payment details
  const handleStudentClick = async (student) => {
    try {
      setSelectedStudent(student);
      setShowPaymentModal(true);
      setLoadingPayment(true);
      setError(null);
      setPaymentCurrentPage(1); // Reset pagination when opening modal
      // Trigger slide-in animation after modal is shown
      setTimeout(() => setIsPaymentModalVisible(true), 10);
      
      const registrationNumber = student.registration_number;
      if (!registrationNumber || !batchId) {
        setError('Registration number or batch ID missing');
        setLoadingPayment(false);
        return;
      }

      const response = await getStudentPaymentDetails(registrationNumber, batchId);
      if (response && response.success) {
        setPaymentDetails(response.data);
      } else {
        setError('Failed to load payment details');
        setPaymentDetails(null);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setError(error.message || 'Failed to load payment details');
      setPaymentDetails(null);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Handle payment modal close with animation
  const handleClosePaymentModal = () => {
    setIsPaymentModalVisible(false);
    setTimeout(() => {
      setShowPaymentModal(false);
      setSelectedStudent(null);
      setPaymentDetails(null);
      setError(null);
      setPaymentCurrentPage(1); // Reset pagination
    }, 300); // Wait for animation to complete
  };

  // Payment history pagination calculations
  const paymentHistory = paymentDetails?.payment_history || [];
  const paymentTotalPages = Math.ceil(paymentHistory.length / paymentItemsPerPage);
  const paymentStartIndex = (paymentCurrentPage - 1) * paymentItemsPerPage;
  const paymentEndIndex = paymentStartIndex + paymentItemsPerPage;
  const paginatedPaymentHistory = paymentHistory.slice(paymentStartIndex, paymentEndIndex);

  // Payment pagination helper functions
  const goToPaymentPage = (page) => {
    if (page >= 1 && page <= paymentTotalPages) {
      setPaymentCurrentPage(page);
    }
  };

  const getPaymentPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (paymentTotalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= paymentTotalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (paymentCurrentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(paymentTotalPages);
      } else if (paymentCurrentPage >= paymentTotalPages - 2) {
        // Near the end
        pages.push('...');
        for (let i = paymentTotalPages - 3; i <= paymentTotalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = paymentCurrentPage - 1; i <= paymentCurrentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(paymentTotalPages);
      }
    }
    
    return pages;
  };

  // Reset pagination when payment details change
  useEffect(() => {
    if (paymentDetails?.payment_history) {
      setPaymentCurrentPage(1);
    }
  }, [paymentDetails?.payment_history]);

  // Prevent body scroll when payment modal is open
  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPaymentModal]);

  // CSV Upload Handler
  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const sNoIndex = header.findIndex(h => h === 's.no' || h === 'sno' || h === 'session_number' || h === 'session number');
      const titleIndex = header.findIndex(h => h === 'title');

      if (sNoIndex === -1 || titleIndex === -1) {
        alert('CSV must have "S.No" (or SNo/Session Number) and "Title" columns');
        return;
      }

      // Parse data rows
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const sNo = parseInt(values[sNoIndex]);
        const title = values[titleIndex];

        if (!isNaN(sNo) && title) {
          csvData.push({ session_number: sNo, title });
        }
      }

      if (csvData.length === 0) {
        alert('No valid data found in CSV file');
        return;
      }

      // Update sessions state and save to backend
      const token = localStorage.getItem('token');
      let updatedCount = 0;
      let createdCount = 0;

      for (const csvRow of csvData) {
        const session = sessions.find(s => s.session_number === csvRow.session_number);
        
        if (session) {
          if (session.meet_id) {
            // Update existing session
            try {
              await updateGMeet(session.meet_id, { title: csvRow.title }, token);
              updatedCount++;
            } catch (error) {
              console.error(`Error updating session ${csvRow.session_number}:`, error);
            }
          } else {
            // Create new session if doesn't exist
            try {
              const newSession = {
                batch_id: batchId,
                session_number: csvRow.session_number,
                title: csvRow.title,
                date: null,
                time: null,
                meet_link: null,
                note: null,
                status: 'Scheduled',
                cancellation_reason: null,
                current: false
              };
              await createGMeet(newSession, token);
              createdCount++;
            } catch (error) {
              console.error(`Error creating session ${csvRow.session_number}:`, error);
            }
          }
        } else {
          // Create new session if not found in sessions array
          try {
            const newSession = {
              batch_id: batchId,
              session_number: csvRow.session_number,
              title: csvRow.title,
              date: null,
              time: null,
              meet_link: null,
              note: null,
              status: 'Scheduled',
              cancellation_reason: null,
              current: false
            };
            await createGMeet(newSession, token);
            createdCount++;
          } catch (error) {
            console.error(`Error creating session ${csvRow.session_number}:`, error);
          }
        }
      }

      // Refresh sessions from backend
      await fetchSessions(batchId);

      alert(`Successfully processed ${csvData.length} session(s): ${updatedCount} updated, ${createdCount} created!`);
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file: ' + error.message);
    }
  };

  // Download CSV Template
  const downloadCSVTemplate = () => {
    const header = 'S.No,Title\n';
    let rows = '';
    const totalSessions = batch?.total_sessions || sessions.length || 1;
    for (let i = 1; i <= totalSessions; i++) {
      rows += `${i},Session ${i}\n`;
    }
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${batchId}_session_titles_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Batch Details</h3>
            <p className="text-sm text-gray-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p className="font-semibold">{error || 'Batch not found'}</p>
              <button
                onClick={() => navigate('/manage-batches')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Back to Manage Batches
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Back Button */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const backPath = userRole === 'manager' || userRole === 'admin' 
                      ? '/batch-approval' 
                      : '/manage-batches';
                    navigate(backPath);
                  }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title={userRole === 'manager' || userRole === 'admin' ? "Back to Batch Approvals" : "Back to Manage Batches"}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Batch Details
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    View complete batch information
                  </p>
                </div>
              </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                {userRole === 'academic' && <AcademicNotificationBell />}
                {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}

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
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer transition-all bg-blue-600 hover:bg-blue-700">
                        {getDisplayName()?.charAt(0).toUpperCase() || getDefaultAvatarLetter()}
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
                        <div className="px-4 py-4 border-b border-gray-200 bg-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || getRoleDisplayName().split(' ')[0]}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{getRoleDisplayName()}</p>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          {(userRole === 'academic' || userRole === 'manager' || userRole === 'admin') && (
                            <button
                              onClick={() => {
                                const settingsPaths = {
                                  'academic': '/academic-coordinator/settings',
                                  'manager': '/manager/account-settings',
                                  'admin': '/manager/account-settings'
                                };
                                const path = settingsPaths[userRole] || '/account-settings';
                                navigate(path);
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
                          )}

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
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
            {/* Left Side - Batch Details (30%) */}
            <div className="space-y-4">
              {/* Batch Profile Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {batch.batch_name?.charAt(0) || 'B'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-800 mb-1.5 break-all leading-tight">
                      {batch.batch_name || 'N/A'}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      batch.status === 'Approved'
                        ? "bg-blue-100 text-blue-800"
                        : batch.status === 'Started'
                        ? "bg-green-100 text-green-800"
                        : batch.status === 'Completed'
                        ? "bg-purple-100 text-purple-800"
                        : batch.status === 'Cancelled'
                        ? "bg-red-100 text-red-800"
                        : batch.status === 'Pending'
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {batch.status || 'Approved'}
                    </span>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Students</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{batch.student_count || students.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{batch.duration || 0} months</p>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div>
                  <h4 className="text-base font-semibold text-gray-800 mb-3">Details</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500 mb-1">Course Name</span>
                      <span className="text-xs font-medium text-gray-800 break-words">{batch.course_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Course Type</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.course_type === "Immersion"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {batch.course_type || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Duration</span>
                      <span className="text-xs font-medium text-gray-800">{batch.duration || 'N/A'} months</span>
                    </div>
                    <div className="flex flex-col py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500 mb-1">Center</span>
                      <span className="text-xs font-medium text-gray-800 break-words">{batch.center_name || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500 mb-1">Teacher</span>
                      <span className="text-xs font-medium text-gray-800 break-words">{batch.teacher_name || 'N/A'}</span>
                    </div>
                    {batch.assistant_tutor_name && (
                      <div className="flex flex-col py-1.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500 mb-1">Assistant Tutor</span>
                        <span className="text-xs font-medium text-gray-800 break-words">{batch.assistant_tutor_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Capacity</span>
                      <span className="text-xs font-medium text-gray-800">
                        {batch.student_count || students.length || 0} / {batch.max_students || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Status</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === 'Approved'
                          ? "bg-blue-100 text-blue-800"
                          : batch.status === 'Started'
                          ? "bg-green-100 text-green-800"
                          : batch.status === 'Completed'
                          ? "bg-purple-100 text-purple-800"
                          : batch.status === 'Cancelled'
                          ? "bg-red-100 text-red-800"
                          : batch.status === 'Pending'
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {batch.status || 'Approved'}
                      </span>
                    </div>
                    {batch.start_date && (
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500">Start Date</span>
                        <span className="text-xs font-medium text-gray-800">
                          {new Date(batch.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {batch.end_date && (
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500">End Date</span>
                        <span className="text-xs font-medium text-gray-800">
                          {new Date(batch.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Created By Section - Moved to Left Side */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-base font-semibold text-gray-800 mb-3">Created By</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(() => {
                        // Check if created_by is a UUID (contains dashes and long string)
                        const isUUID = batch.created_by && 
                                      typeof batch.created_by === 'string' && 
                                      batch.created_by.includes('-') && 
                                      batch.created_by.length > 30;
                        // If it's a UUID or unknown, use first letter from creator_role or default
                        if (isUUID || !batch.created_by || batch.created_by === 'Unknown') {
                          return batch.creator_role?.charAt(0).toUpperCase() || 'U';
                        }
                        // Otherwise use first letter of the name
                        return batch.created_by.charAt(0).toUpperCase();
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {(() => {
                          // Check if created_by is still a UUID (backend didn't transform it properly)
                          const isUUID = batch.created_by && 
                                        typeof batch.created_by === 'string' && 
                                        batch.created_by.includes('-') && 
                                        batch.created_by.length > 30;
                          if (isUUID) {
                            console.warn('⚠️ Backend returned UUID instead of name for created_by:', batch.created_by);
                            // Show "Unknown" or try to use creator_id to fetch name
                            return batch.creator_id ? 'Unknown' : 'Unknown';
                          }
                          return batch.created_by || 'Unknown';
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {batch.creator_role ? getRoleDisplayName(batch.creator_role) : 'Creator'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Merge Information Section */}
                {(() => {
                  console.log('🔍 Checking merge info display condition:', {
                    has_merge_info: !!batch.merge_info,
                    merge_info: batch.merge_info,
                    is_merged: batch.merge_info?.is_merged,
                    has_merged_batches: !!batch.merge_info?.merged_batches,
                    merged_batches_length: batch.merge_info?.merged_batches?.length,
                    merged_batches: batch.merge_info?.merged_batches,
                    merge_group_id: batch.merge_info?.merge_group_id,
                    merge_name: batch.merge_info?.merge_name
                  });
                  
                  // Simplified condition: Show if merge_info exists and has merged batches OR if is_merged is true
                  const hasMergedBatches = batch.merge_info && 
                                          Array.isArray(batch.merge_info.merged_batches) && 
                                          batch.merge_info.merged_batches.length > 0;
                  
                  const isMerged = batch.merge_info && batch.merge_info.is_merged === true;
                  
                  const shouldShow = hasMergedBatches || (isMerged && batch.merge_info.merge_group_id);
                  
                  console.log('🔍 Display decision:', {
                    hasMergedBatches,
                    isMerged,
                    shouldShow,
                    merge_group_id: batch.merge_info?.merge_group_id
                  });
                  
                  if (!shouldShow) {
                    return null;
                  }
                  
                  const mergedBatchesList = batch.merge_info.merged_batches || [];
                  
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Merged Batches
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        {batch.merge_info.merge_name && (
                          <p className="text-xs text-blue-800 font-medium mb-2">
                            Merge Group: <span className="font-bold">{batch.merge_info.merge_name}</span>
                          </p>
                        )}
                        {mergedBatchesList.length > 0 ? (
                          <>
                            <p className="text-xs text-blue-800 font-medium mb-1">
                              This batch is merged with:
                            </p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {mergedBatchesList.map((mergedBatch, index) => (
                                <div 
                                  key={mergedBatch.batch_id || index}
                                  className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/manage-batches/${mergedBatch.batch_id}`)}
                                >
                                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-xs">
                                      {mergedBatch.batch_name?.charAt(0) || 'B'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">
                                      {mergedBatch.batch_name || 'Unknown Batch'}
                                    </p>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                                      mergedBatch.status === 'Approved'
                                        ? "bg-blue-100 text-blue-800"
                                        : mergedBatch.status === 'Started'
                                        ? "bg-green-100 text-green-800"
                                        : mergedBatch.status === 'Completed'
                                        ? "bg-purple-100 text-purple-800"
                                        : mergedBatch.status === 'Cancelled'
                                        ? "bg-red-100 text-red-800"
                                        : mergedBatch.status === 'Pending'
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      {mergedBatch.status || 'N/A'}
                                    </span>
                                  </div>
                                  <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-blue-700 italic">
                            This batch is part of a merge group, but no other batches are currently available.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Side - Student/Session View (70%) */}
            <div className="space-y-6">
              {/* Buttons on Top */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex gap-3">
                  <button
                    onClick={() => setRightView('student')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                      rightView === 'student'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => setRightView('session')}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                      rightView === 'session'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sessions
                  </button>
                  {(userRole === 'academic' || userRole === 'teacher' || userRole === 'student' || userRole === 'manager' || userRole === 'admin') && (
                    <button
                      onClick={() => setRightView('assessment')}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                        rightView === 'assessment'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Certificates
                    </button>
                  )}
                </div>
              </div>

              {rightView === 'student' ? (
                /* Students List Section */
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Students List</h4>
                    <span className="text-sm text-gray-500">
                      {students.length} / {batch.max_students || 'N/A'}
                    </span>
                  </div>

                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                    </div>
                  ) : students.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {students.map((student, index) => (
                        <div 
                          key={student.student_id || index} 
                          onClick={() => handleStudentClick(student)}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {student.name?.charAt(0).toUpperCase() || student.registration_number?.charAt(0) || 'S'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate hover:text-blue-600">
                              {student.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {student.registration_number || student.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No students enrolled</p>
                    </div>
                  )}
                </div>
              ) : rightView === 'session' ? (
                /* Sessions Table Section */
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">Session Management</h4>
                      <p className="text-sm text-gray-500">
                        Total Sessions: {batch.total_sessions !== null && batch.total_sessions !== undefined ? batch.total_sessions : sessions.length || '-'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={downloadCSVTemplate}
                        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Download Template</span>
                      </button>
                      <label className="px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg cursor-pointer transition-colors flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload CSV</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {loadingSessions ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading sessions...</p>
                    </div>
                  ) : sessions.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meet Link</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sessions.map((session, index) => (
                            <tr key={session.session_number || session.meet_id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {session.session_number}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {session.date ? formatDate(session.date) : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {session.time ? formatTime(session.time) : '-'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                {session.title || '-'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                {session.meet_link ? (
                                  <a 
                                    href={session.meet_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    Join Meet
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  session.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                  session.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  session.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {session.status || 'Scheduled'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">

                                  {session.meet_id && (
                                    <button
                                      onClick={() => handleDeleteSession(session.meet_id)}
                                      className="text-red-600 hover:text-red-900 flex items-center"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Sessions Found</h3>
                      <p className="text-xs text-gray-500">No sessions have been scheduled for this batch yet.</p>
                    </div>
                  )}
                </div>
              ) : rightView === 'assessment' ? (
                /* Assessment Marks Entry Section */
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-800">Assessment Marks Entry</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {assessmentDate && (
                        <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                          📅 {new Date(assessmentDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                        courseLanguage === 'German' ? 'bg-purple-100 text-purple-800' :
                        courseLanguage === 'French' ? 'bg-blue-100 text-blue-800' :
                        courseLanguage === 'Japanese' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {courseLanguage}
                      </span>
                      {loadingAssessment && (
                        <span className="text-[10px] text-gray-500 animate-pulse">Loading...</span>
                      )}
                      {/* Temporary reset button for testing */}
                      <button
                        onClick={resetSubmittedState}
                        className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Reset submitted state (testing only)"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  
                  {loadingAssessment ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
                    </div>
                  ) : assessmentData.length > 0 ? (
                    <>
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
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Certificate
                                </th>
                                {(userRole?.toLowerCase() === 'academic' || userRole?.toLowerCase() === 'academic_coordinator' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager') && (
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {assessmentData.map((student, index) => {
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
                                        {isEditing ? (
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
                                        ) : (
                                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                            student[column.key] >= (column.maxMarks * 0.8)
                                              ? 'bg-green-100 text-green-800'
                                              : student[column.key] >= (column.maxMarks * 0.6)
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {student[column.key] || 0}
                                          </span>
                                        )}
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
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      {generatedCertificates[student.student_id] ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <button
                                            onClick={() => viewCertificate(student.student_id)}
                                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center justify-center underline"
                                            title="View Certificate"
                                          >
                                            View Certificate
                                          </button>
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                            generatedCertificates[student.student_id].status === 'completed'
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {generatedCertificates[student.student_id].status || 'pending'}
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleGenerateCertificate(index)}
                                          disabled={generatingCertificate || getTotalMarks(student) === 0}
                                          className={`text-sm font-medium flex items-center justify-center px-3 py-1 rounded ${
                                            generatingCertificate
                                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                              : getTotalMarks(student) === 0
                                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                              : 'bg-blue-600 text-white hover:bg-blue-700'
                                          }`}
                                          title={getTotalMarks(student) === 0 ? 'No marks available for certificate' : 'Generate Certificate'}
                                        >
                                          {generatingCertificate ? (
                                            <>
                                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Generating...
                                            </>
                                          ) : (
                                            'Generate'
                                          )}
                                        </button>
                                      )}
                                    </td>
                                    {(userRole?.toLowerCase() === 'academic' || userRole?.toLowerCase() === 'academic_coordinator' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager') && (
                                      <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {generatedCertificates[student.student_id] && (
                                          <div className="flex items-center justify-center gap-2">
                                            {generatedCertificates[student.student_id].status !== 'completed' && (
                                              <button
                                                onClick={() => handleApproveCertificate(generatedCertificates[student.student_id].certificateId || generatedCertificates[student.student_id].certificate_id, student.student_id)}
                                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 font-medium"
                                              >
                                                Approve
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteGeneratedCertificate(generatedCertificates[student.student_id].certificateId || generatedCertificates[student.student_id].certificate_id, student.student_id)}
                                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 font-medium"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8">
                        <div className="flex flex-wrap gap-3">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveMarks}
                                disabled={saving || !hasChanges || isSubmitted || batch?.status === 'completed'}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  saving || !hasChanges || isSubmitted || batch?.status === 'completed'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
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
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Changes
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  saving
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleStartEdit}
                                disabled={isSubmitted || batch?.status === 'completed'}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  isSubmitted || batch?.status === 'completed'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={isSubmitted ? 'Marks already submitted - editing not allowed' : batch?.status === 'completed' ? 'Batch completed - editing not allowed' : 'Edit assessment marks'}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Marks
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
                              
                              <button
                                onClick={async () => {
                                  // Generate certificates for ALL students in the batch
                                  const confirmGenerate = window.confirm(
                                    `Are you sure you want to generate certificates for all ${assessmentData.length} students in this batch?`
                                  );
                                  if (!confirmGenerate) return;
                                  
                                  for (let index = 0; index < assessmentData.length; index++) {
                                    try {
                                      await handleGenerateCertificate(index);
                                      // Small delay between generations to avoid overwhelming the server
                                      await new Promise(resolve => setTimeout(resolve, 500));
                                    } catch (error) {
                                      console.error(`Failed to generate certificate for student at index ${index}:`, error);
                                      // Continue with next student even if one fails
                                    }
                                  }
                                  
                                  alert(`Certificate generation completed for ${assessmentData.length} students!`);
                                }}
                                disabled={generatingCertificate || assessmentData.length === 0}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  generatingCertificate || assessmentData.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                                title={assessmentData.length === 0 ? 'No students available' : `Generate certificates for all ${assessmentData.length} students`}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generate All
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Students Found</h3>
                      <p className="text-xs text-gray-500">There are no active students enrolled in this batch.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      {showPaymentModal && (
        <div 
          className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
            isPaymentModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClosePaymentModal}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          {/* Right Side Modal - BERRY Style with Smooth Slide Animation */}
          <div 
            className={`fixed right-0 top-0 h-full w-full sm:w-[600px] md:w-[700px] lg:w-[800px] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
              isPaymentModalVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - BERRY Style */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Payment Details</h2>
                    {selectedStudent && (
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedStudent.name} - {selectedStudent.registration_number}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClosePaymentModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingPayment ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="mt-4 text-gray-600 font-medium">Loading payment details...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <p className="font-semibold">{error}</p>
                </div>
              ) : paymentDetails ? (
                <div className="space-y-6">
                  {/* Payment Type & EMI Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Payment Type Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">Payment Type</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          paymentDetails.payment_type === 'emi'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {paymentDetails.payment_type === 'emi' ? 'EMI' : paymentDetails.payment_type === 'full' ? 'Full Payment' : 'Not Set'}
                        </span>
                      </div>
                      {paymentDetails.locked_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Locked at: {new Date(paymentDetails.locked_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* EMI Summary Card (if EMI) */}
                    {paymentDetails.emi_summary && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">EMI Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total EMIs:</span>
                            <span className="font-semibold text-gray-800">{paymentDetails.emi_summary.total_emis}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Paid EMIs:</span>
                            <span className="font-semibold text-green-600">{paymentDetails.emi_summary.paid_emis}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Remaining EMIs:</span>
                            <span className="font-semibold text-orange-600">{paymentDetails.emi_summary.remaining_emis}</span>
                          </div>
                          {paymentDetails.emi_summary.next_due_date && (
                            <div className="flex justify-between pt-2 border-t border-green-200">
                              <span className="text-gray-600 font-semibold">Next Due Date:</span>
                              <span className="font-bold text-red-600">
                                {new Date(paymentDetails.emi_summary.next_due_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment History Table */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h4>
                    {paymentHistory.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Fees</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                {paymentHistory.some(p => p.payment_type === 'emi') && (
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment Date</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {paginatedPaymentHistory.map((payment, index) => (
                                <tr key={payment.id || index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-mono">
                                    {payment.payment_id || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">₹{payment.final_fees?.toLocaleString('en-IN') || '0'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                    {payment.created_at
                                      ? new Date(payment.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      payment.status
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {payment.status ? 'Approved' : 'Pending'}
                                    </span>
                                  </td>
                                  {paymentHistory.some(p => p.payment_type === 'emi') && (
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-800">
                                      {payment.payment_type === 'emi' && payment.next_emi_due_date
                                        ? new Date(payment.next_emi_due_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })
                                        : '-'}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination - BERRY Style */}
                        {paymentHistory.length > 0 && (
                          <div className="flex items-center justify-between mt-6 px-4 py-4 border-t border-gray-200">
                            {/* Left: Showing entries info */}
                            <div className="text-sm text-gray-500">
                              Showing {paymentStartIndex + 1} to {Math.min(paymentEndIndex, paymentHistory.length)} of {paymentHistory.length} entries
                            </div>

                            {/* Right: Pagination buttons - Only show when more than 1 page */}
                            {paymentTotalPages > 1 && (
                              <div className="flex items-center gap-2">
                                {/* Previous button */}
                                <button
                                  onClick={() => goToPaymentPage(paymentCurrentPage - 1)}
                                  disabled={paymentCurrentPage === 1}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    paymentCurrentPage === 1
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>

                                {/* Page numbers */}
                                {getPaymentPageNumbers().map((page, idx) => {
                                  if (page === '...') {
                                    return (
                                      <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
                                        ...
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => goToPaymentPage(page)}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        paymentCurrentPage === page
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}

                                {/* Next button */}
                                <button
                                  onClick={() => goToPaymentPage(paymentCurrentPage + 1)}
                                  disabled={paymentCurrentPage === paymentTotalPages}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    paymentCurrentPage === paymentTotalPages
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">No payment history found</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : rightView === 'assessment' ? (
                /* Assessment Marks Entry Section */
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-800">Assessment Marks Entry</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {assessmentDate && (
                        <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                          📅 {new Date(assessmentDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                        courseLanguage === 'German' ? 'bg-purple-100 text-purple-800' :
                        courseLanguage === 'French' ? 'bg-blue-100 text-blue-800' :
                        courseLanguage === 'Japanese' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {courseLanguage}
                      </span>
                      {loadingAssessment && (
                        <span className="text-[10px] text-gray-500 animate-pulse">Loading...</span>
                      )}
                      {/* Temporary reset button for testing */}
                      <button
                        onClick={resetSubmittedState}
                        className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Reset submitted state (testing only)"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {loadingAssessment ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#f3f4f6', borderTopColor: '#3b82f6' }}></div>
                    </div>
                  ) : assessmentData.length > 0 ? (
                    <>
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
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Certificate
                                </th>
                                {(userRole?.toLowerCase() === 'academic' || userRole?.toLowerCase() === 'academic_coordinator' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager') && (
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {assessmentData.map((student, index) => {
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
                                        {isEditing ? (
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
                                        ) : (
                                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                            student[column.key] >= (column.maxMarks * 0.8)
                                              ? 'bg-green-100 text-green-800'
                                              : student[column.key] >= (column.maxMarks * 0.6)
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {student[column.key] || 0}
                                          </span>
                                        )}
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
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      {generatedCertificates[student.student_id] ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <button
                                            onClick={() => viewCertificate(student.student_id)}
                                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center justify-center underline"
                                            title="View Certificate"
                                          >
                                            View Certificate
                                          </button>
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                            generatedCertificates[student.student_id].status === 'completed'
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {generatedCertificates[student.student_id].status || 'pending'}
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleGenerateCertificate(index)}
                                          disabled={generatingCertificate || getTotalMarks(student) === 0}
                                          className={`text-sm font-medium flex items-center justify-center px-3 py-1 rounded ${
                                            generatingCertificate
                                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                              : getTotalMarks(student) === 0
                                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                              : 'bg-blue-600 text-white hover:bg-blue-700'
                                          }`}
                                          title={getTotalMarks(student) === 0 ? 'No marks available for certificate' : 'Generate Certificate'}
                                        >
                                          {generatingCertificate ? (
                                            <>
                                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Generating...
                                            </>
                                          ) : (
                                            'Generate'
                                          )}
                                        </button>
                                      )}
                                    </td>
                                    {(userRole?.toLowerCase() === 'academic' || userRole?.toLowerCase() === 'academic_coordinator' || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'manager') && (
                                      <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {generatedCertificates[student.student_id] && (
                                          <div className="flex items-center justify-center gap-2">
                                            {generatedCertificates[student.student_id].status !== 'completed' && (
                                              <button
                                                onClick={() => handleApproveCertificate(generatedCertificates[student.student_id].certificateId || generatedCertificates[student.student_id].certificate_id, student.student_id)}
                                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 font-medium"
                                              >
                                                Approve
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteGeneratedCertificate(generatedCertificates[student.student_id].certificate_id || generatedCertificates[student.student_id].certificateId, student.student_id)}
                                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 font-medium"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8">
                        <div className="flex flex-wrap gap-3">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveMarks}
                                disabled={saving || !hasChanges || isSubmitted || batch?.status === 'completed'}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  saving || !hasChanges || isSubmitted || batch?.status === 'completed'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
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
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Changes
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  saving
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleStartEdit}
                                disabled={isSubmitted || batch?.status === 'completed'}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  isSubmitted || batch?.status === 'completed'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={isSubmitted ? 'Marks already submitted - editing not allowed' : batch?.status === 'completed' ? 'Batch completed - editing not allowed' : 'Edit assessment marks'}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Marks
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
                              
                              <button
                                onClick={async () => {
                                  // Generate certificates for ALL students in the batch
                                  const confirmGenerate = window.confirm(
                                    `Are you sure you want to generate certificates for all ${assessmentData.length} students in this batch?`
                                  );
                                  if (!confirmGenerate) return;
                                  
                                  for (let index = 0; index < assessmentData.length; index++) {
                                    try {
                                      await handleGenerateCertificate(index);
                                      // Small delay between generations to avoid overwhelming the server
                                      await new Promise(resolve => setTimeout(resolve, 500));
                                    } catch (error) {
                                      console.error(`Failed to generate certificate for student at index ${index}:`, error);
                                      // Continue with next student even if one fails
                                    }
                                  }
                                  
                                  alert(`Certificate generation completed for ${assessmentData.length} students!`);
                                }}
                                disabled={generatingCertificate || assessmentData.length === 0}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center ${
                                  generatingCertificate || assessmentData.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                                title={assessmentData.length === 0 ? 'No students available' : `Generate certificates for all ${assessmentData.length} students`}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generate All
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Students Found</h3>
                      <p className="text-xs text-gray-500">There are no active students enrolled in this batch.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchDetailViewPage;

