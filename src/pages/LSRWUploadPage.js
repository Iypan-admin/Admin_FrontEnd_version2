import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getAllCourses, uploadLSRWContent, getLSRWByCourse, uploadSpeakingMaterial, uploadReadingMaterial, extractReadingContent, uploadWritingTask, getWritingByCourse } from '../services/Api';
import { Upload, FileAudio, FileText, Loader2, CheckCircle, XCircle, Search, X, Headphones, Mic, Book, PenTool, ExternalLink, Image } from 'lucide-react';

function LSRWUploadPage() {
  const { courseId, module } = useParams();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedCourses, setSelectedCourses] = useState(courseId ? [courseId] : []);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  
  // Determine active tab from URL path or module param
  const getModuleFromPath = () => {
    const path = location.pathname;
    if (path.includes('/listening')) return 'listening';
    if (path.includes('/speaking')) return 'speaking';
    if (path.includes('/reading')) return 'reading';
    if (path.includes('/writing')) return 'writing';
    return module || 'listening'; // Default to listening
  };
  
  const [activeTab, setActiveTab] = useState(getModuleFromPath()); // Track active LSRW module tab
  const [showTabs, setShowTabs] = useState(false); // Hide tabs when on specific module route
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
  const [textFile, setTextFile] = useState(null); // For speaking/reading module
  const [contentText, setContentText] = useState(''); // Direct text input for speaking/reading/writing
  const [writingImage, setWritingImage] = useState(null); // For writing module - image upload
  const [writingDocument, setWritingDocument] = useState(null); // For writing module - document upload
  const [readingQuestions, setReadingQuestions] = useState([]); // For reading module - Dynamic MCQs based on extracted questions
  const [extractingReading, setExtractingReading] = useState(false); // Loading state for extraction
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadedContent, setUploadedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false); // For tab transition animation
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [playingAudio, setPlayingAudio] = useState(null); // Track which audio is currently playing
  const [showUploadPreview, setShowUploadPreview] = useState(false); // Preview modal for upload confirmation
  const [uploadSuccessInModal, setUploadSuccessInModal] = useState(false); // Track success in preview modal

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active tab when route changes
  useEffect(() => {
    const moduleFromPath = getModuleFromPath();
    setActiveTab(moduleFromPath);
    setShowTabs(!location.pathname.includes('/lsrw-upload/listening') && 
                !location.pathname.includes('/lsrw-upload/speaking') && 
                !location.pathname.includes('/lsrw-upload/reading') && 
                !location.pathname.includes('/lsrw-upload/writing'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Set language and course when courseId is provided via URL
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, courses, selectedCourses]); 

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCourseDropdown && !event.target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCourseDropdown]);

  const fetchCourses = async () => {
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
  };

  // Get unique languages from courses
  const availableLanguages = useMemo(() => {
    const languages = [...new Set(courses.map(c => c.language).filter(Boolean))];
    return languages.sort();
  }, [courses]);

  // Filter courses by selected language
  const filteredCourses = useMemo(() => {
    let filtered = courses;
    
    // Filter by language
    if (selectedLanguage) {
      filtered = filtered.filter(c => c.language === selectedLanguage);
    }
    
    // Filter by search term
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

  // Get selected course details
  const selectedCourseDetails = useMemo(() => {
    return courses.filter(c => selectedCourses.includes(c.id));
  }, [courses, selectedCourses]);

  const fetchLSRWContent = async (id) => {
    try {
      const token = localStorage.getItem('token');
      let response;
      if (activeTab === 'writing') {
        response = await getWritingByCourse(id, token);
      } else if (activeTab === 'speaking') {
        response = await getLSRWByCourse(id, token, activeTab);
      } else if (activeTab === 'reading') {
        response = await getLSRWByCourse(id, token, activeTab);
      } else {
        response = await getLSRWByCourse(id, token, activeTab);
      }
      if (response && response.success) {
        setUploadedContent(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching LSRW content:', error);
    }
  };

  // Update module_type when tab changes with animation
  useEffect(() => {
    // Trigger transition animation
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300); // Match CSS transition duration

    setFormData(prev => ({ ...prev, module_type: activeTab }));
    // Refresh content when tab changes
    if (selectedCourses.length > 0) {
      selectedCourses.forEach(courseId => {
        fetchLSRWContent(courseId);
      });
    }

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCourses]);

  // Get active tab configuration
  const activeTabConfig = lsrwTabs.find(tab => tab.id === activeTab) || lsrwTabs[0];



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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      // Clear video and URL when audio is selected (priority: audio > video > URL)
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
      // Only set video if audio is not selected (priority: audio > video > URL)
      if (!audioFile) {
        setVideoFile(file);
        setExternalMediaUrl(''); // Clear URL when video is selected
      } else {
        alert('Audio file has priority. Please remove audio file first if you want to upload video.');
        e.target.value = '';
      }
    } else {
      alert('Please select a video file (MP4, etc.)');
    }
  };

  const handleExternalUrlChange = (e) => {
    const url = e.target.value.trim();
    // Only set URL if audio and video are not selected (priority: audio > video > URL)
    if (!audioFile && !videoFile) {
      setExternalMediaUrl(url);
    } else {
      alert('Audio/Video file has priority. Please remove uploaded files first if you want to use external URL.');
      setExternalMediaUrl('');
    }
  };

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.type === 'application/msword')) {
      setQuestionDoc(file);
    } else {
      alert('Please select a DOCX or DOC file');
    }
  };

  const handleTextFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      
      // PDF files are now supported for reading module extraction
      // The backend will handle PDF extraction if supported, otherwise it will return an error
      
      if (hasValidType || hasValidExtension) {
        setTextFile(file);
        setContentText(''); // Clear direct text if file is selected
        
        // If reading module, extract content automatically
        if (activeTab === 'reading') {
          try {
            setExtractingReading(true);
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('readingFile', file);
            
            const response = await extractReadingContent(formData, token);
            if (response.success && response.data) {
              // Auto-fill paragraph text
              if (response.data.paragraph) {
                setContentText(response.data.paragraph);
              }
              
              // Auto-fill questions - set to exactly the extracted questions (dynamic count)
              if (response.data.questions && Array.isArray(response.data.questions)) {
                // Ensure each question has all required fields
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
                // If no questions extracted, set empty array
                setReadingQuestions([]);
              }
              
              // Show success message
              setSuccess(true);
              setTimeout(() => setSuccess(false), 3000);
            }
          } catch (err) {
            console.error('Error extracting reading content:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to extract content from file';
            setError(`Extraction failed: ${errorMsg}. You can still fill the form manually.`);
            setTimeout(() => setError(null), 5000);
          } finally {
            setExtractingReading(false);
          }
        }
      } else {
        alert('Please select a DOCX, DOC, or TXT file (PDF is not supported)');
        e.target.value = ''; // Clear the file input
      }
    }
  };

  // Handle writing image upload
  const handleWritingImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const validExtensions = ['.jpg', '.jpeg', '.png'];
      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      
      if (hasValidType || hasValidExtension) {
        setWritingImage(file);
        setWritingDocument(null); // Clear document if image is selected
        setContentText(''); // Clear text if image is selected
      } else {
        alert('Please select a JPEG or PNG image file');
        e.target.value = '';
      }
    }
  };

  // Handle writing document upload
  const handleWritingDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const validExtensions = ['.pdf', '.docx'];
      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      
      if (hasValidType || hasValidExtension) {
        setWritingDocument(file);
        setWritingImage(null); // Clear image if document is selected
        setContentText(''); // Clear text if document is selected
      } else {
        alert('Please select a PDF or DOCX file');
        e.target.value = '';
      }
    }
  };

  const handleLanguageChange = (e) => {
    const language = e.target.value;
    setSelectedLanguage(language);
    setSelectedCourses([]); // Clear selected courses when language changes
    setCourseSearchTerm('');
    setShowCourseDropdown(false);
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const removeCourse = (courseId) => {
    setSelectedCourses(prev => prev.filter(id => id !== courseId));
  };

  // Handle reading question changes
  const handleReadingQuestionChange = (index, field, value) => {
    const updatedQuestions = [...readingQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setReadingQuestions(updatedQuestions);
  };

  // Handle form submission - show preview for listening, direct upload for others
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (selectedCourses.length === 0) {
      setError('Please select at least one course');
      return;
    }

    // For listening, speaking, reading, and writing modules, show preview modal instead of uploading directly
    if (activeTab === 'listening' || activeTab === 'speaking' || activeTab === 'reading' || activeTab === 'writing') {
      // Validate listening module fields
      if (activeTab === 'listening') {
        if (!audioFile && !videoFile && !externalMediaUrl.trim()) {
          setError('Please provide at least one media source: Audio file, Video file, or External Media URL');
          return;
        }
        if (!questionDoc) {
          setError('Please select a question document');
          return;
        }
      }
      
      // Validate speaking module fields
      if (activeTab === 'speaking') {
        if (!textFile && !contentText.trim()) {
          setError('Please either upload a text file or enter text content directly');
          return;
        }
      }
      
      // Validate writing module fields
      if (activeTab === 'writing') {
        const contentTypes = [!!writingImage, !!writingDocument, !!contentText.trim()].filter(Boolean);
        if (contentTypes.length !== 1) {
          setError('Please provide exactly one content type: upload an image, upload a document, or enter text content directly');
          return;
        }
      }
      
      // Show preview modal
      setShowUploadPreview(true);
      return;
    }

    // For other modules, proceed with direct upload
    await performUpload();
  };

  // Perform actual upload
  const performUpload = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validation differs for different modules
    if (activeTab === 'speaking') {
      if (!textFile && !contentText.trim()) {
        setError('Please either upload a text file or enter text content directly');
        setSubmitting(false);
        return;
      }
    } else if (activeTab === 'reading') {
      if (!textFile && !contentText.trim()) {
        setError('Please either upload a text file or enter text content directly');
        setSubmitting(false);
        return;
      }
      // Validate questions format if any questions are provided (optional)
      const filledQuestions = readingQuestions.filter(q => q.question || q.optionA || q.optionB || q.optionC || q.optionD || q.correct_answer);
      if (filledQuestions.length > 0) {
        const allQuestionsValid = filledQuestions.every((q, index) => {
          const questionIndex = readingQuestions.indexOf(q);
          if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correct_answer) {
            setError(`Question ${questionIndex + 1} is incomplete. If you provide a question, please fill all fields including the correct answer (A, B, C, or D).`);
            return false;
          }
          if (!['A', 'B', 'C', 'D'].includes(q.correct_answer.toUpperCase())) {
            setError(`Question ${questionIndex + 1}: Correct answer must be A, B, C, or D.`);
            return false;
          }
          return true;
        });
        if (!allQuestionsValid) {
          setSubmitting(false);
          return;
        }
      }
    } else if (activeTab === 'writing') {
      // Writing module: must have exactly one of image, document, or text
      const contentTypes = [!!writingImage, !!writingDocument, !!contentText.trim()].filter(Boolean);
      if (contentTypes.length !== 1) {
        setError('Please provide exactly one content type: upload an image, upload a document, or enter text content directly');
        setSubmitting(false);
        return;
      }
    } else {
      // For listening module: At least one media source is required (audio, video, or URL)
      if (!audioFile && !videoFile && !externalMediaUrl.trim()) {
        setError('Please provide at least one media source: Audio file, Video file, or External Media URL');
        setSubmitting(false);
        return;
      }

      if (!questionDoc) {
        setError('Please select a question document');
        setSubmitting(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      // Debug: Log selected courses
      console.log('📤 Uploading to courses:', selectedCourses);
      console.log('📤 Selected course details:', selectedCourseDetails);
      
      // Upload to all selected courses
      const uploadPromises = selectedCourses.map(async (courseId) => {
        console.log('📤 Uploading to course ID:', courseId);
        
        if (activeTab === 'speaking') {
          // Speaking module: use speaking API
          const formDataToSend = new FormData();
          formDataToSend.append('course_id', courseId);
          formDataToSend.append('title', formData.title);
          formDataToSend.append('instruction', formData.instruction || '');
          formDataToSend.append('max_marks', formData.max_marks || '0');
          if (textFile) {
            formDataToSend.append('textFile', textFile);
          }
          if (contentText.trim()) {
            formDataToSend.append('content_text', contentText.trim());
          }
          
          return uploadSpeakingMaterial(formDataToSend, token);
        } else if (activeTab === 'reading') {
          // Reading module: use reading API
          const formDataToSend = new FormData();
          formDataToSend.append('course_id', courseId);
          formDataToSend.append('title', formData.title);
          formDataToSend.append('instruction', formData.instruction || '');
          formDataToSend.append('max_marks', formData.max_marks || '0');
          if (textFile) {
            formDataToSend.append('readingFile', textFile);
          }
          if (contentText.trim()) {
            formDataToSend.append('content_text', contentText.trim());
          }
          // Append questions as JSON string (filter out empty questions)
          const validQuestions = readingQuestions.filter(q => 
            q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.correct_answer
          );
          if (validQuestions.length > 0) {
            formDataToSend.append('questions', JSON.stringify(validQuestions));
          } else {
            // Send empty array if no questions provided
            formDataToSend.append('questions', JSON.stringify([]));
          }
          
          return uploadReadingMaterial(formDataToSend, token);
        } else if (activeTab === 'writing') {
          // Writing module: use writing API
          const formDataToSend = new FormData();
          formDataToSend.append('course_id', courseId);
          formDataToSend.append('title', formData.title);
          formDataToSend.append('instruction', formData.instruction || '');
          formDataToSend.append('max_marks', formData.max_marks || '0');
          if (writingImage) {
            formDataToSend.append('writingImage', writingImage);
          }
          if (writingDocument) {
            formDataToSend.append('writingDocument', writingDocument);
          }
          if (contentText.trim()) {
            formDataToSend.append('content_text', contentText.trim());
          }
          
          return uploadWritingTask(formDataToSend, token);
        } else {
          // Listening module: use LSRW API
          const formDataToSend = new FormData();
          formDataToSend.append('course_id', courseId);
          formDataToSend.append('title', formData.title);
          formDataToSend.append('instruction', formData.instruction || '');
          formDataToSend.append('max_marks', formData.max_marks || '0');
          formDataToSend.append('module_type', activeTab);
          
          // Add media based on priority: Audio > Video > URL
          if (audioFile) {
            formDataToSend.append('audio', audioFile);
          } else if (videoFile) {
            formDataToSend.append('video', videoFile);
          } else if (externalMediaUrl.trim()) {
            formDataToSend.append('external_media_url', externalMediaUrl.trim());
          }
          
          formDataToSend.append('questionDoc', questionDoc);
          
          return uploadLSRWContent(formDataToSend, token);
        }
      });

      await Promise.all(uploadPromises);

      setSuccess(true);
      setFormData({ title: '', instruction: '', max_marks: '', module_type: activeTab });
      setAudioFile(null);
      setVideoFile(null);
      setExternalMediaUrl('');
      setQuestionDoc(null);
      setTextFile(null);
      setContentText('');
      setWritingImage(null);
      setWritingDocument(null);
      setReadingQuestions([]);
      if (document.getElementById('audio-input')) document.getElementById('audio-input').value = '';
      if (document.getElementById('video-input')) document.getElementById('video-input').value = '';
      if (document.getElementById('doc-input')) document.getElementById('doc-input').value = '';
      if (document.getElementById('text-file-input')) document.getElementById('text-file-input').value = '';

      // Refresh content list for first selected course
      if (selectedCourses.length > 0) {
        fetchLSRWContent(selectedCourses[0]);
      }

      setTimeout(() => setSuccess(false), 5000);
      
      // Show success message in preview modal before closing
      if (showUploadPreview) {
        setUploadSuccessInModal(true);
        // Close modal after showing success message for 2 seconds
        setTimeout(() => {
          setShowUploadPreview(false);
          setUploadSuccessInModal(false);
        }, 2000);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorData = err.response?.data || {};
      const errorMessage = errorData.error || err.message || 'Failed to upload content';
      const errorDetails = errorData.details || errorData.hint || '';
      
      // Format error message more user-friendly
      if (errorDetails) {
        setError(`${errorMessage}\n\n${errorDetails}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle confirm upload from preview modal (for listening module)
  const handleConfirmUpload = async () => {
    await performUpload();
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Content with Transition */}
            <div className={`transition-all duration-300 ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}>
              <>
            {/* LSRW Module Tabs - Only show if not on specific module route */}
            {showTabs && (
            <div className="bg-white rounded-2xl shadow-xl p-2 mb-6">
              <div className="grid grid-cols-4 gap-2">
                {lsrwTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap transform ${
                        isActive
                          ? (tab.color === 'blue' ? 'bg-blue-600 text-white shadow-lg scale-105' :
                             tab.color === 'purple' ? 'bg-purple-600 text-white shadow-lg scale-105' :
                             tab.color === 'green' ? 'bg-green-600 text-white shadow-lg scale-105' :
                             'bg-orange-600 text-white shadow-lg scale-105')
                          : `text-gray-600 hover:bg-gray-100`
                      }`}
                    >
                      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-green-800 font-medium">LSRW content uploaded successfully!</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Dynamic Section Header - Changes based on active tab */}
            <div className={`bg-gradient-to-r rounded-2xl shadow-xl p-6 mb-6 transition-all duration-300 ${
              activeTabConfig.color === 'blue' ? 'from-blue-600 to-indigo-700' :
              activeTabConfig.color === 'purple' ? 'from-purple-600 to-pink-700' :
              activeTabConfig.color === 'green' ? 'from-green-600 to-emerald-700' :
              'from-orange-600 to-amber-700'
            }`}>
              <div className="flex items-center space-x-4 text-white">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  {React.createElement(activeTabConfig.icon, { className: "w-8 h-8" })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{activeTabConfig.name} Module</h2>
                  <p className="text-white/90 mt-1">
                    {activeTab === 'listening' && 'Upload audio files and question documents for listening exercises'}
                    {activeTab === 'speaking' && 'Upload text content for speaking practice and recording tasks'}
                    {activeTab === 'reading' && 'Upload reading passages and comprehension questions'}
                    {activeTab === 'writing' && 'Upload writing tasks, images, or documents for students to respond to'}
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Form with Transition */}
            <div className={`bg-white rounded-2xl shadow-xl p-6 mb-6 transition-all duration-300 ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className={`p-2 rounded-lg ${
                  activeTabConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  activeTabConfig.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  activeTabConfig.color === 'green' ? 'bg-green-100 text-green-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {React.createElement(activeTabConfig.icon, { className: "w-5 h-5" })}
                </div>
                <h2 className="text-xl font-bold text-gray-800">Upload New {activeTabConfig.name} Content</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Language Selection and Course Selection - Same Row (for Listening only) */}
                {activeTab === 'listening' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Language Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Select Language <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedLanguage}
                          onChange={handleLanguageChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">-- Select a language --</option>
                          {availableLanguages.map(language => (
                            <option key={language} value={language}>
                              {language}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Course Selection */}
                      {selectedLanguage ? (
                        <div className="course-dropdown-container relative">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Course(s) <span className="text-red-500">*</span>
                          </label>
                          
                          {/* Selected Courses Display */}
                          {selectedCourses.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {selectedCourseDetails.map(course => (
                                <span
                                  key={course.id}
                                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                                >
                                  {course.course_name} ({course.level})
                                  <button
                                    type="button"
                                    onClick={() => removeCourse(course.id)}
                                    className="ml-2 hover:text-blue-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Search Input */}
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              value={courseSearchTerm}
                              onChange={(e) => {
                                setCourseSearchTerm(e.target.value);
                                setShowCourseDropdown(true);
                              }}
                              onFocus={() => setShowCourseDropdown(true)}
                              placeholder="Type to search courses by name, level, or type..."
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {/* Course Dropdown */}
                          {showCourseDropdown && filteredCourses.length > 0 && (
                            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg z-50 absolute w-full">
                              {filteredCourses.map(course => (
                                <div
                                  key={course.id}
                                  onClick={() => {
                                    handleCourseToggle(course.id);
                                    setCourseSearchTerm('');
                                    setShowCourseDropdown(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                                    selectedCourses.includes(course.id) ? 'bg-blue-100' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-gray-900">{course.course_name}</p>
                                      <p className="text-sm text-gray-500">
                                        {course.type} • {course.level} • {course.mode}
                                      </p>
                                    </div>
                                    {selectedCourses.includes(course.id) && (
                                      <CheckCircle className="w-5 h-5 text-blue-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {showCourseDropdown && filteredCourses.length === 0 && courseSearchTerm && (
                            <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                              No courses found matching "{courseSearchTerm}"
                            </div>
                          )}

                          {showCourseDropdown && filteredCourses.length === 0 && !courseSearchTerm && (
                            <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                              No courses available for {selectedLanguage}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[60px] bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-sm text-gray-500">Select a language first</p>
                        </div>
                      )}
                    </div>

                    {/* Title and Max Marks - Same Row (for Listening only) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., French A1 - Greetings"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Max Marks
                        </label>
                        <input
                          type="number"
                          name="max_marks"
                          value={formData.max_marks}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Instruction - Full Width (for Listening only) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Instruction
                      </label>
                      <textarea
                        name="instruction"
                        value={formData.instruction}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Instructions for students..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Language Selection and Course Selection - Same Row for Speaking, Writing, and Reading */}
                    {activeTab === 'speaking' || activeTab === 'writing' || activeTab === 'reading' ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Language Selection */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Select Language <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedLanguage}
                              onChange={handleLanguageChange}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${
                                activeTab === 'speaking' 
                                  ? 'focus:ring-purple-500 focus:border-purple-500'
                                  : activeTab === 'writing'
                                  ? 'focus:ring-orange-500 focus:border-orange-500'
                                  : 'focus:ring-green-500 focus:border-green-500'
                              }`}
                              required
                            >
                              <option value="">-- Select a language --</option>
                              {availableLanguages.map(language => (
                                <option key={language} value={language}>
                                  {language}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Course Selection - Multi-select with Search */}
                          {selectedLanguage && (
                            <div className="course-dropdown-container relative">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Course(s) <span className="text-red-500">*</span>
                              </label>
                          
                              {/* Selected Courses Display */}
                              {selectedCourses.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {selectedCourseDetails.map(course => (
                                    <span
                                      key={course.id}
                                      className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                                        activeTab === 'speaking' 
                                          ? 'bg-purple-100 text-purple-800'
                                          : activeTab === 'writing'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {course.course_name} ({course.level})
                                      <button
                                        type="button"
                                        onClick={() => removeCourse(course.id)}
                                        className={`ml-2 ${
                                          activeTab === 'speaking' 
                                            ? 'hover:text-purple-600'
                                            : activeTab === 'writing'
                                            ? 'hover:text-orange-600'
                                            : 'hover:text-green-600'
                                        }`}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Search Input */}
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  value={courseSearchTerm}
                                  onChange={(e) => {
                                    setCourseSearchTerm(e.target.value);
                                    setShowCourseDropdown(true);
                                  }}
                                  onFocus={() => setShowCourseDropdown(true)}
                                  placeholder="Type to search courses by name, level, or type..."
                                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${
                                    activeTab === 'speaking' 
                                      ? 'focus:ring-purple-500 focus:border-purple-500'
                                      : activeTab === 'writing'
                                      ? 'focus:ring-orange-500 focus:border-orange-500'
                                      : 'focus:ring-green-500 focus:border-green-500'
                                  }`}
                                />
                              </div>

                              {/* Course Dropdown */}
                              {showCourseDropdown && filteredCourses.length > 0 && (
                                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg z-50 absolute w-full">
                                  {filteredCourses.map(course => (
                                    <div
                                      key={course.id}
                                      onClick={() => {
                                        handleCourseToggle(course.id);
                                        setCourseSearchTerm('');
                                        setShowCourseDropdown(false);
                                      }}
                                      className={`px-4 py-3 cursor-pointer transition-colors ${
                                        activeTab === 'speaking' 
                                          ? `hover:bg-purple-50 ${selectedCourses.includes(course.id) ? 'bg-purple-100' : ''}`
                                          : activeTab === 'writing'
                                          ? `hover:bg-orange-50 ${selectedCourses.includes(course.id) ? 'bg-orange-100' : ''}`
                                          : `hover:bg-green-50 ${selectedCourses.includes(course.id) ? 'bg-green-100' : ''}`
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-gray-900">{course.course_name}</p>
                                          <p className="text-sm text-gray-500">
                                            {course.type} • {course.level} • {course.mode}
                                          </p>
                                        </div>
                                        {selectedCourses.includes(course.id) && (
                                          <CheckCircle className={`w-5 h-5 ${
                                            activeTab === 'speaking' 
                                              ? 'text-purple-600'
                                              : activeTab === 'writing'
                                              ? 'text-orange-600'
                                              : 'text-green-600'
                                          }`} />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {showCourseDropdown && filteredCourses.length === 0 && courseSearchTerm && (
                                <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                                  No courses found matching "{courseSearchTerm}"
                                </div>
                              )}

                              {showCourseDropdown && filteredCourses.length === 0 && !courseSearchTerm && (
                                <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                                  No courses available for {selectedLanguage}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Title and Max Marks - Same Row for Speaking, Writing, and Reading */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Title */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              value={formData.title}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${
                                activeTab === 'speaking' 
                                  ? 'focus:ring-purple-500 focus:border-purple-500'
                                  : activeTab === 'writing'
                                  ? 'focus:ring-orange-500 focus:border-orange-500'
                                  : 'focus:ring-green-500 focus:border-green-500'
                              }`}
                              placeholder="e.g., French A1 - Greetings"
                              required
                            />
                          </div>

                          {/* Max Marks */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Max Marks
                            </label>
                            <input
                              type="number"
                              name="max_marks"
                              value={formData.max_marks}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${
                                activeTab === 'speaking' 
                                  ? 'focus:ring-purple-500 focus:border-purple-500'
                                  : activeTab === 'writing'
                                  ? 'focus:ring-orange-500 focus:border-orange-500'
                                  : 'focus:ring-green-500 focus:border-green-500'
                              }`}
                              placeholder="0"
                              min="0"
                            />
                          </div>
                        </div>

                        {/* Instruction - Full Width for Speaking and Reading, Same Row with Image for Writing */}
                        {activeTab === 'speaking' || activeTab === 'reading' ? (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Instruction
                            </label>
                            <textarea
                              name="instruction"
                              value={formData.instruction}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${
                                activeTab === 'speaking' 
                                  ? 'focus:ring-purple-500 focus:border-purple-500'
                                  : 'focus:ring-green-500 focus:border-green-500'
                              }`}
                              rows="3"
                              placeholder="Instructions for students..."
                            />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {/* Language Selection - Full Width for Listening Module Only */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Language <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">-- Select a language --</option>
                            {availableLanguages.map(language => (
                              <option key={language} value={language}>
                                {language}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Course Selection - Multi-select with Search */}
                        {selectedLanguage && (
                          <div className="course-dropdown-container relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Select Course(s) <span className="text-red-500">*</span>
                            </label>
                            
                            {/* Selected Courses Display */}
                            {selectedCourses.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {selectedCourseDetails.map(course => (
                                  <span
                                    key={course.id}
                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                                  >
                                    {course.course_name} ({course.level})
                                    <button
                                      type="button"
                                      onClick={() => removeCourse(course.id)}
                                      className="ml-2 hover:text-blue-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Search Input */}
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={courseSearchTerm}
                                onChange={(e) => {
                                  setCourseSearchTerm(e.target.value);
                                  setShowCourseDropdown(true);
                                }}
                                onFocus={() => setShowCourseDropdown(true)}
                                placeholder="Type to search courses by name, level, or type..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Course Dropdown */}
                            {showCourseDropdown && filteredCourses.length > 0 && (
                              <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg z-50 absolute w-full">
                                {filteredCourses.map(course => (
                                  <div
                                    key={course.id}
                                    onClick={() => {
                                      handleCourseToggle(course.id);
                                      setCourseSearchTerm('');
                                      setShowCourseDropdown(false);
                                    }}
                                    className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                                      selectedCourses.includes(course.id) ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">{course.course_name}</p>
                                        <p className="text-sm text-gray-500">
                                          {course.type} • {course.level} • {course.mode}
                                        </p>
                                      </div>
                                      {selectedCourses.includes(course.id) && (
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {showCourseDropdown && filteredCourses.length === 0 && courseSearchTerm && (
                              <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                                No courses found matching "{courseSearchTerm}"
                              </div>
                            )}

                            {showCourseDropdown && filteredCourses.length === 0 && !courseSearchTerm && (
                              <div className="mt-2 p-4 text-center text-gray-500 border border-gray-200 rounded-xl bg-white z-50 absolute w-full">
                                No courses available for {selectedLanguage}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., French A1 - Greetings"
                            required
                          />
                        </div>

                        {/* Instruction - Full Width for Listening Module */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Instruction
                          </label>
                          <textarea
                            name="instruction"
                            value={formData.instruction}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                            placeholder="Instructions for students..."
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Module Type - Hidden, controlled by tabs */}
                <input type="hidden" name="module_type" value={activeTab} />

                {/* Writing Module: Image OR Document OR Text Input */}
                {activeTab === 'writing' ? (
                  <>
                    {/* Instruction and Text Content (Option 1) - Same Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Instruction */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Instruction
                        </label>
                        <textarea
                          name="instruction"
                          value={formData.instruction}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          rows="3"
                          placeholder="Instructions for students..."
                        />
                      </div>

                      {/* Direct Text Input (Option 1) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Text Content <span className="text-gray-500 text-xs">(Option 1 - Required if no file uploaded)</span>
                        </label>
                        <textarea
                          value={contentText}
                          onChange={(e) => {
                            setContentText(e.target.value);
                            if (e.target.value.trim()) {
                              setWritingImage(null);
                              setWritingDocument(null);
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          rows="3"
                          placeholder="Enter or paste the writing task content that students should read and write about..."
                        />
                      </div>
                    </div>

                    {/* OR Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OR</span>
                      </div>
                    </div>

                    {/* Document Upload (Option 2) and Image Upload (Option 3) - Same Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Upload (Option 2) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Writing Task Document (PDF, DOCX) <span className="text-gray-500 text-xs">(Option 2)</span>
                        </label>
                        <div className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors">
                          <input
                            id="writing-document-input"
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleWritingDocumentChange}
                            className="hidden"
                          />
                          <label htmlFor="writing-document-input" className="cursor-pointer">
                            <FileText className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">
                              {writingDocument ? writingDocument.name : 'Click to upload writing task document'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">PDF or DOCX format</p>
                          </label>
                        </div>
                      </div>

                      {/* Image Upload (Option 3) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Writing Task Image (JPEG, PNG) <span className="text-gray-500 text-xs">(Option 3)</span>
                        </label>
                        <div className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors">
                          <input
                            id="writing-image-input"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleWritingImageChange}
                            className="hidden"
                          />
                          <label htmlFor="writing-image-input" className="cursor-pointer">
                            <Image className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">
                              {writingImage ? writingImage.name : 'Click to upload writing task image'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">JPEG or PNG format only</p>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeTab === 'speaking' || activeTab === 'reading' ? (
                  <>
                    {/* Text File Upload (Optional) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {activeTab === 'reading' ? 'Reading Document (DOCX, DOC, TXT)' : 'Text File (DOCX, DOC, TXT)'} 
                        <span className="text-gray-500 text-xs">(Optional - PDF not supported)</span>
                        {activeTab === 'reading' && (
                          <span className="text-green-600 text-xs ml-2 font-semibold">• Auto-extracts paragraph and questions</span>
                        )}
                      </label>
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                        extractingReading 
                          ? 'border-green-400 bg-green-50' 
                          : activeTab === 'reading'
                            ? 'border-green-300 hover:border-green-500'
                            : 'border-gray-300 hover:border-purple-500'
                      }`}>
                        <input
                          id="text-file-input"
                          type="file"
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={handleTextFileChange}
                          className="hidden"
                          disabled={extractingReading}
                        />
                        <label htmlFor="text-file-input" className={`cursor-pointer ${extractingReading ? 'opacity-75' : ''}`}>
                          {extractingReading ? (
                            <>
                              <Loader2 className="w-12 h-12 text-green-600 mx-auto mb-2 animate-spin" />
                              <p className="text-green-700 font-semibold">Extracting content from document...</p>
                              <p className="text-xs text-green-600 mt-2">Please wait while we parse the paragraph and questions</p>
                            </>
                          ) : (
                            <>
                              <FileText className={`w-12 h-12 mx-auto mb-2 ${activeTab === 'reading' ? 'text-green-500' : 'text-gray-400'}`} />
                              <p className="text-gray-600">
                                {textFile ? textFile.name : activeTab === 'reading' 
                                  ? 'Click to upload reading document (auto-extracts content)'
                                  : 'Click to upload text file (DOCX/DOC/TXT)'}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {activeTab === 'reading' 
                                  ? 'Document format: Reading passage/paragraph, then questions with options (a), b), c), d) or a., b., c., d.) and answers. Supports PDF, DOCX, DOC, TXT - numbered (Q1., 1.) or unnumbered questions. MCQ sections will auto-adjust based on extracted questions.'
                                  : 'Note: PDF files are not supported. Please convert to DOCX or TXT.'}
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* OR Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OR</span>
                      </div>
                    </div>

                    {/* Direct Text Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Text Content <span className="text-gray-500 text-xs">(Required if no file uploaded)</span>
                      </label>
                      <textarea
                        value={contentText}
                        onChange={(e) => {
                          setContentText(e.target.value);
                          if (e.target.value.trim()) setTextFile(null); // Clear file if text is entered
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        rows="8"
                        placeholder={activeTab === 'speaking' 
                          ? "Enter or paste the text content that students should read and record..."
                          : "Enter or paste the text content that students should read..."}
                      />
                    </div>

                    {/* Reading Module: MCQ Questions (Optional) */}
                    {activeTab === 'reading' && (
                      <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Book className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-bold text-gray-800">MCQ Questions (Optional)</h3>
                          <span className="text-xs text-gray-500">
                            {readingQuestions.length > 0 
                              ? `${readingQuestions.length} question(s) extracted from document` 
                              : 'Upload a document to auto-extract questions, or add manually'}
                          </span>
                        </div>
                        {readingQuestions.length === 0 ? (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-sm text-yellow-800">
                              No questions extracted yet. Upload a document (PDF, DOCX, DOC, TXT) to auto-extract questions, or add questions manually below.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                // Add one empty question
                                setReadingQuestions([{ question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct_answer: '' }]);
                              }}
                              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                            >
                              + Add Question Manually
                            </button>
                          </div>
                        ) : (
                          readingQuestions.map((q, index) => (
                          <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-bold text-green-700">Question {index + 1}</span>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Question <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={q.question}
                                  onChange={(e) => handleReadingQuestionChange(index, 'question', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder={`Enter question ${index + 1}...`}
                                  required
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Option A <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={q.optionA}
                                    onChange={(e) => handleReadingQuestionChange(index, 'optionA', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Option A"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Option B <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={q.optionB}
                                    onChange={(e) => handleReadingQuestionChange(index, 'optionB', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Option B"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Option C <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={q.optionC}
                                    onChange={(e) => handleReadingQuestionChange(index, 'optionC', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Option C"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Option D <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={q.optionD}
                                    onChange={(e) => handleReadingQuestionChange(index, 'optionD', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Option D"
                                    required
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Correct Answer <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={q.correct_answer}
                                  onChange={(e) => handleReadingQuestionChange(index, 'correct_answer', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  required
                                >
                                  <option value="">Select correct answer</option>
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex justify-end mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = readingQuestions.filter((_, i) => i !== index);
                                  setReadingQuestions(updated);
                                }}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Remove Question
                              </button>
                            </div>
                          </div>
                        )))}
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setReadingQuestions([...readingQuestions, { question: '', optionA: '', optionB: '', optionC: '', optionD: '', correct_answer: '' }]);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                          >
                            + Add Another Question
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Media Upload Section - Priority: Audio > Video > URL */}
                    <div className="space-y-4">
                      {/* Section Heading */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Media Upload</h3>
                        <p className="text-sm text-gray-600">Upload audio, video, or provide external URL. Priority: Audio → Video → URL</p>
                      </div>

                      {/* Audio and Video in Same Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Audio File */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Audio File (MP3, WAV) <span className="text-gray-500 text-xs">(Optional - Priority 1)</span>
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                            <input
                              id="audio-input"
                              type="file"
                              accept="audio/*"
                              onChange={handleAudioChange}
                              className="hidden"
                            />
                            <label htmlFor="audio-input" className="cursor-pointer">
                              <FileAudio className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 truncate">
                                {audioFile ? audioFile.name : 'Click to upload audio'}
                              </p>
                              {audioFile && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAudioFile(null);
                                    if (document.getElementById('audio-input')) document.getElementById('audio-input').value = '';
                                  }}
                                  className="mt-2 text-red-600 text-xs hover:text-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Video File */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Video File (MP4) <span className="text-gray-500 text-xs">(Optional - Priority 2)</span>
                          </label>
                          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                            audioFile ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500'
                          }`}>
                            <input
                              id="video-input"
                              type="file"
                              accept="video/*"
                              onChange={handleVideoChange}
                              disabled={!!audioFile}
                              className="hidden"
                            />
                            <label htmlFor="video-input" className={`cursor-pointer ${audioFile ? 'cursor-not-allowed' : ''}`}>
                              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm text-gray-600 truncate">
                                {videoFile ? videoFile.name : 'Click to upload video'}
                              </p>
                              {audioFile && (
                                <p className="text-xs text-gray-500 mt-1">Audio has priority</p>
                              )}
                              {videoFile && !audioFile && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVideoFile(null);
                                    if (document.getElementById('video-input')) document.getElementById('video-input').value = '';
                                  }}
                                  className="mt-2 text-red-600 text-xs hover:text-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Question Document and External URL in Same Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Question Document */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Question Document (DOCX) <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                            <input
                              id="doc-input"
                              type="file"
                              accept=".docx,.doc"
                              onChange={handleDocChange}
                              className="hidden"
                            />
                            <label htmlFor="doc-input" className="cursor-pointer">
                              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 truncate">
                                {questionDoc ? questionDoc.name : 'Click to upload document'}
                              </p>
                            </label>
                          </div>
                        </div>

                        {/* External Media URL */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Audio/Video URL <span className="text-gray-500 text-xs">(Optional - Priority 3)</span>
                          </label>
                          <input
                            type="url"
                            value={externalMediaUrl}
                            onChange={handleExternalUrlChange}
                            disabled={!!audioFile || !!videoFile}
                            placeholder="https://youtube.com/watch?v=..."
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              (audioFile || videoFile) ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-300'
                            }`}
                          />
                          {(audioFile || videoFile) && (
                            <p className="text-xs text-gray-500 mt-1">Uploaded file has priority</p>
                          )}
                          {externalMediaUrl && !audioFile && !videoFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setExternalMediaUrl('');
                              }}
                              className="mt-2 text-red-600 text-sm hover:text-red-700"
                            >
                              Clear URL
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info Message */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> You can upload either Audio, Video, or External URL. Priority: Audio → Video → URL. Only one will be used.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button - Dynamic color based on active tab */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full text-white py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                    activeTabConfig.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' :
                    activeTabConfig.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' :
                    activeTabConfig.color === 'green' ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' :
                    'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>{(activeTab === 'listening' || activeTab === 'speaking' || activeTab === 'reading' || activeTab === 'writing') ? 'Preview & Upload' : 'Upload LSRW Content'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Uploaded Content List with Transition */}
            {selectedCourses.length > 0 && uploadedContent.length > 0 && (
              <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-300 ${
                isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
              }`}>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className={`p-2 rounded-lg ${
                    activeTabConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    activeTabConfig.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    activeTabConfig.color === 'green' ? 'bg-green-100 text-green-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {React.createElement(activeTabConfig.icon, { className: "w-5 h-5" })}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Uploaded {activeTabConfig.name} Content</h2>
                </div>
                <div className="space-y-3">
                  {uploadedContent.map((content) => (
                    <div key={content.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">{content.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{content.instruction || 'No instruction'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activeTab !== 'writing' && activeTab !== 'speaking' && activeTab !== 'reading' && (
                              <>Max Marks: {content.max_marks} | </>
                            )}
                            Type: {content.module_type || activeTab}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(content.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            </div>

            {/* File Preview Modal */}
            {previewFile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                    <h3 className="text-lg font-semibold text-gray-800 truncate flex-1 mr-4">{previewFile.name}</h3>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    {(previewFile.type === 'text' || previewFile.textContent) && !previewFile.url ? (
                      <div className="max-w-4xl mx-auto">
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
                          {/* Display all text content fields */}
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
                            
                            // Check for MCQ questions (for reading module)
                            const questions = textData.questions || textData.reading_questions || null;
                            const hasQuestions = questions && Array.isArray(questions) && questions.length > 0;
                            
                            if (availableFields.length === 0 && !hasQuestions) {
                              return (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Content</h4>
                                  <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed bg-white p-4 rounded border border-gray-200 overflow-auto max-h-[70vh]">
                                    No content available
                                  </pre>
                                </div>
                              );
                            }
                            
                            return (
                              <>
                                {availableFields.map((field, index) => (
                                  <div key={field.key} className={index > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{field.label}</h4>
                                    <div className="prose max-w-none">
                                      <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed bg-white p-4 rounded border border-gray-200 overflow-auto max-h-[70vh]">
                                        {textData[field.key]}
                                      </pre>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Display MCQ Questions for Reading Module */}
                                {hasQuestions && (
                                  <div className={availableFields.length > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                                    <h4 className="text-lg font-semibold text-gray-800 mb-4">MCQ Questions</h4>
                                    <div className="space-y-4">
                                      {questions.map((q, qIndex) => (
                                        <div key={qIndex} className="bg-white p-4 rounded border border-gray-200">
                                          <div className="mb-3">
                                            <span className="font-semibold text-gray-800">Q{qIndex + 1}.</span>
                                            <span className="ml-2 text-gray-700">{q.question || 'No question text'}</span>
                                          </div>
                                          <div className="space-y-2 ml-6">
                                            {q.optionA && (
                                              <div className="text-sm text-gray-600">
                                                <span className="font-medium">A)</span> {q.optionA}
                                              </div>
                                            )}
                                            {q.optionB && (
                                              <div className="text-sm text-gray-600">
                                                <span className="font-medium">B)</span> {q.optionB}
                                              </div>
                                            )}
                                            {q.optionC && (
                                              <div className="text-sm text-gray-600">
                                                <span className="font-medium">C)</span> {q.optionC}
                                              </div>
                                            )}
                                            {q.optionD && (
                                              <div className="text-sm text-gray-600">
                                                <span className="font-medium">D)</span> {q.optionD}
                                              </div>
                                            )}
                                            {q.correct_answer && (
                                              <div className="mt-3 pt-2 border-t border-gray-200">
                                                <span className="text-sm font-semibold text-green-700">Correct Answer: </span>
                                                <span className="text-sm text-green-700">{q.correct_answer.toUpperCase()}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : previewFile.type === 'image' && previewFile.url ? (
                      // For images, show both the image AND text content if available
                      <div className="max-w-4xl mx-auto space-y-4">
                        {/* Display the image */}
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4">Image</h4>
                          <div className="flex items-center justify-center">
                            <img 
                              src={previewFile.url} 
                              alt={previewFile.name || 'Writing task image'} 
                              className="max-w-full h-auto rounded-lg shadow-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div style={{ display: 'none' }} className="text-center py-8">
                              <p className="text-gray-600">Failed to load image</p>
                            </div>
                          </div>
                        </div>
                        {/* Display text content if available */}
                        {previewFile.textContent && (() => {
                          const textData = previewFile.textContent;
                          const fields = [
                            { key: 'title', label: 'Title' },
                            { key: 'instruction', label: 'Instruction' },
                            { key: 'content_text', label: 'Content' }
                          ];
                          const availableFields = fields.filter(field => textData[field.key] && textData[field.key].trim());
                          
                          if (availableFields.length > 0) {
                            return (
                              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
                                {availableFields.map((field, index) => (
                                  <div key={field.key} className={index > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{field.label}</h4>
                                    <div className="prose max-w-none">
                                      <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed bg-white p-4 rounded border border-gray-200 overflow-auto max-h-[50vh]">
                                        {textData[field.key]}
                                      </pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : previewFile.type === 'audio' || previewFile.type === 'audio_url' ? (
                      <div className="flex items-center justify-center">
                        <audio controls className="w-full max-w-2xl" src={previewFile.url} />
                      </div>
                    ) : previewFile.type === 'video' ? (
                      <div className="flex items-center justify-center">
                        <video 
                          controls 
                          className="w-full max-w-4xl rounded-lg" 
                          src={previewFile.url}
                          onPlay={() => {}}
                          onPause={() => {}}
                        />
                      </div>
                    ) : previewFile.type === 'video_url' ? (
                      <div className="flex items-center justify-center">
                        <div className="w-full max-w-4xl">
                          {(() => {
                            // Helper function to convert YouTube/Vimeo URL to embed format
                            const getEmbedUrl = (url) => {
                              if (url.includes('youtube.com/watch?v=')) {
                                const videoId = url.split('v=')[1]?.split('&')[0];
                                return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
                              } else if (url.includes('youtu.be/')) {
                                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                                return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
                              } else if (url.includes('vimeo.com/')) {
                                const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
                                return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
                              }
                              return url;
                            };
                            
                            return (
                              <>
                                <iframe
                                  src={getEmbedUrl(previewFile.url)}
                                  className="w-full aspect-video rounded-lg"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={previewFile.name}
                                />
                                <a
                                  href={previewFile.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                                >
                                  Open in new tab
                                </a>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : previewFile.type === 'image' ? (
                      <div className="flex items-center justify-center">
                        <img src={previewFile.url} alt={previewFile.name} className="max-w-full h-auto rounded-lg shadow-lg" />
                      </div>
                    ) : isPdfFile(previewFile.url) ? (
                      <div className="w-full" style={{ height: 'calc(90vh - 120px)', minHeight: '600px' }}>
                        <iframe 
                          src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=1`} 
                          className="w-full h-full rounded-lg border border-gray-200" 
                          title={previewFile.name}
                        />
                      </div>
                    ) : (getFileExtension(previewFile.url) === 'docx' || getFileExtension(previewFile.url) === 'doc') ? (
                      <div className="w-full" style={{ height: 'calc(90vh - 120px)', minHeight: '600px' }}>
                        <iframe 
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.url)}`}
                          className="w-full h-full rounded-lg border border-gray-200" 
                          title={previewFile.name}
                          frameBorder="0"
                        />
                      </div>
                    ) : previewFile.url ? (
                      <div className="w-full" style={{ height: 'calc(90vh - 120px)', minHeight: '600px' }}>
                        <iframe 
                          src={previewFile.url}
                          className="w-full h-full rounded-lg border border-gray-200" 
                          title={previewFile.name}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No preview available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Preview Modal (Listening, Speaking, Reading & Writing Modules) */}
            {showUploadPreview && (activeTab === 'listening' || activeTab === 'speaking' || activeTab === 'reading' || activeTab === 'writing') && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => !uploadSuccessInModal && setShowUploadPreview(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                  {/* Success Message Overlay - Centered */}
                  {uploadSuccessInModal && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50">
                      <div className="text-center">
                        <div className="mb-4 flex justify-center">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Successful!</h3>
                        <p className="text-gray-600">Your {activeTab} content has been uploaded successfully.</p>
                      </div>
                    </div>
                  )}

                  {/* Modal Header */}
                  <div className={`sticky top-0 text-white p-6 rounded-t-2xl flex items-center justify-between z-10 ${
                    activeTab === 'listening' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                      : activeTab === 'speaking'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                      : activeTab === 'reading'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                      : 'bg-gradient-to-r from-orange-600 to-red-600'
                  }`}>
                    <div>
                      <h3 className="text-xl font-bold">Preview Upload - {activeTab === 'listening' ? 'Listening' : activeTab === 'speaking' ? 'Speaking' : activeTab === 'reading' ? 'Reading' : 'Writing'} Content</h3>
                      <p className={`text-sm mt-1 ${
                        activeTab === 'listening' ? 'text-blue-100' 
                        : activeTab === 'speaking' ? 'text-purple-100'
                        : activeTab === 'reading' ? 'text-green-100'
                        : 'text-orange-100'
                      }`}>Review all details before uploading</p>
                    </div>
                    <button
                      onClick={() => !uploadSuccessInModal && setShowUploadPreview(false)}
                      disabled={uploadSuccessInModal}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Language & Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Language</label>
                        <p className="text-gray-800 font-medium">{selectedLanguage || 'Not selected'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Title</label>
                        <p className="text-gray-800 font-medium">{formData.title || 'Not provided'}</p>
                      </div>
                    </div>

                    {/* Selected Courses */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="text-sm font-semibold text-gray-600 mb-2 block">Selected Courses ({selectedCourses.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedCourseDetails.length > 0 ? (
                          selectedCourseDetails.map(course => (
                            <span key={course.id} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                              {course.course_name} ({course.level})
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No courses selected</p>
                        )}
                      </div>
                    </div>

                    {/* Instruction & Max Marks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Instruction</label>
                        <p className="text-gray-800 whitespace-pre-wrap">{formData.instruction || 'No instruction provided'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Max Marks</label>
                        <p className="text-gray-800 font-medium">{formData.max_marks || '0'}</p>
                      </div>
                    </div>

                    {/* Content Section - Different for Listening, Speaking, and Writing */}
                    {activeTab === 'listening' ? (
                      <>
                        {/* Media Source */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <label className="text-sm font-semibold text-gray-600 mb-2 block">Media Source</label>
                          {audioFile ? (
                            <div className="flex items-center gap-3">
                              <FileAudio className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-gray-800 font-medium">Audio File (Priority 1)</p>
                                <p className="text-sm text-gray-600">{audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                              </div>
                            </div>
                          ) : videoFile ? (
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <p className="text-gray-800 font-medium">Video File (Priority 2)</p>
                                <p className="text-sm text-gray-600">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                              </div>
                            </div>
                          ) : externalMediaUrl ? (
                            <div className="flex items-center gap-3">
                              <ExternalLink className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-gray-800 font-medium">External Media URL (Priority 3)</p>
                                <p className="text-sm text-gray-600 break-all">{externalMediaUrl}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-red-600 text-sm">No media source selected</p>
                          )}
                        </div>

                        {/* Question Document */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <label className="text-sm font-semibold text-gray-600 mb-2 block">Question Document</label>
                          {questionDoc ? (
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-gray-800 font-medium">{questionDoc.name}</p>
                                <p className="text-sm text-gray-600">{(questionDoc.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-red-600 text-sm">No document selected</p>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-2">Upload Summary</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Will upload to {selectedCourses.length} course(s)</li>
                            <li>• Media type: {audioFile ? 'Audio File' : videoFile ? 'Video File' : externalMediaUrl ? 'External URL' : 'None'}</li>
                            <li>• Question document: {questionDoc ? questionDoc.name : 'Missing'}</li>
                          </ul>
                        </div>
                      </>
                    ) : activeTab === 'speaking' ? (
                      <>
                        {/* Text File & Text Content for Speaking */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Text File</label>
                            {textFile ? (
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="text-gray-800 font-medium">{textFile.name}</p>
                                  <p className="text-sm text-gray-600">{(textFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No file uploaded</p>
                            )}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Text Content</label>
                            {contentText.trim() ? (
                              <div className="max-h-40 overflow-y-auto">
                                <p className="text-gray-800 whitespace-pre-wrap text-sm">{contentText.trim().substring(0, 200)}{contentText.trim().length > 200 ? '...' : ''}</p>
                                {contentText.trim().length > 200 && (
                                  <p className="text-xs text-gray-500 mt-1">({contentText.trim().length} characters total)</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No text content entered</p>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <h4 className="font-semibold text-purple-900 mb-2">Upload Summary</h4>
                          <ul className="text-sm text-purple-800 space-y-1">
                            <li>• Will upload to {selectedCourses.length} course(s)</li>
                            <li>• Content source: {textFile ? `Text File (${textFile.name})` : contentText.trim() ? 'Direct Text Input' : 'None'}</li>
                            <li>• Max Marks: {formData.max_marks || '0'}</li>
                          </ul>
                        </div>
                      </>
                    ) : activeTab === 'reading' ? (
                      <>
                        {/* Text File & Text Content for Reading */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Reading Document</label>
                            {textFile ? (
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="text-gray-800 font-medium">{textFile.name}</p>
                                  <p className="text-sm text-gray-600">{(textFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No file uploaded</p>
                            )}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Text Content</label>
                            {contentText.trim() ? (
                              <div className="max-h-40 overflow-y-auto">
                                <p className="text-gray-800 whitespace-pre-wrap text-sm">{contentText.trim().substring(0, 200)}{contentText.trim().length > 200 ? '...' : ''}</p>
                                {contentText.trim().length > 200 && (
                                  <p className="text-xs text-gray-500 mt-1">({contentText.trim().length} characters total)</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No text content entered</p>
                            )}
                          </div>
                        </div>

                        {/* MCQ Questions Preview */}
                        {readingQuestions && readingQuestions.some(q => q.question || q.optionA || q.optionB || q.optionC || q.optionD || q.correct_answer) && (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-3 block">MCQ Questions ({readingQuestions.filter(q => q.question || q.optionA || q.optionB || q.optionC || q.optionD || q.correct_answer).length})</label>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {readingQuestions.map((q, index) => {
                                if (!q.question && !q.optionA && !q.optionB && !q.optionC && !q.optionD && !q.correct_answer) return null;
                                return (
                                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                                    <p className="font-semibold text-gray-800 mb-2">Question {index + 1}: {q.question || 'No question text'}</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <p className={q.correct_answer?.toUpperCase() === 'A' ? 'text-green-600 font-semibold' : 'text-gray-600'}>A. {q.optionA || 'N/A'}</p>
                                      <p className={q.correct_answer?.toUpperCase() === 'B' ? 'text-green-600 font-semibold' : 'text-gray-600'}>B. {q.optionB || 'N/A'}</p>
                                      <p className={q.correct_answer?.toUpperCase() === 'C' ? 'text-green-600 font-semibold' : 'text-gray-600'}>C. {q.optionC || 'N/A'}</p>
                                      <p className={q.correct_answer?.toUpperCase() === 'D' ? 'text-green-600 font-semibold' : 'text-gray-600'}>D. {q.optionD || 'N/A'}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Correct Answer: <span className="font-semibold text-green-600">{q.correct_answer?.toUpperCase() || 'Not set'}</span></p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-2">Upload Summary</h4>
                          <ul className="text-sm text-green-800 space-y-1">
                            <li>• Will upload to {selectedCourses.length} course(s)</li>
                            <li>• Content source: {textFile ? `Reading Document (${textFile.name})` : contentText.trim() ? 'Direct Text Input' : 'None'}</li>
                            <li>• Max Marks: {formData.max_marks || '0'}</li>
                            <li>• MCQ Questions: {readingQuestions.filter(q => q.question || q.optionA || q.optionB || q.optionC || q.optionD || q.correct_answer).length} question(s)</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Writing Module Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Writing Task Image</label>
                            {writingImage ? (
                              <div className="flex items-center gap-3">
                                <Image className="w-5 h-5 text-orange-600" />
                                <div>
                                  <p className="text-gray-800 font-medium">{writingImage.name}</p>
                                  <p className="text-sm text-gray-600">{(writingImage.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No image uploaded</p>
                            )}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="text-sm font-semibold text-gray-600 mb-2 block">Writing Task Document</label>
                            {writingDocument ? (
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-orange-600" />
                                <div>
                                  <p className="text-gray-800 font-medium">{writingDocument.name}</p>
                                  <p className="text-sm text-gray-600">{(writingDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No document uploaded</p>
                            )}
                          </div>
                        </div>

                        {/* Text Content for Writing */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <label className="text-sm font-semibold text-gray-600 mb-2 block">Text Content</label>
                          {contentText.trim() ? (
                            <div className="max-h-40 overflow-y-auto">
                              <p className="text-gray-800 whitespace-pre-wrap text-sm">{contentText.trim().substring(0, 200)}{contentText.trim().length > 200 ? '...' : ''}</p>
                              {contentText.trim().length > 200 && (
                                <p className="text-xs text-gray-500 mt-1">({contentText.trim().length} characters total)</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No text content entered</p>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <h4 className="font-semibold text-orange-900 mb-2">Upload Summary</h4>
                          <ul className="text-sm text-orange-800 space-y-1">
                            <li>• Will upload to {selectedCourses.length} course(s)</li>
                            <li>• Content source: {
                              writingImage ? `Image (${writingImage.name})` 
                              : writingDocument ? `Document (${writingDocument.name})` 
                              : contentText.trim() ? 'Direct Text Input' 
                              : 'None'
                            }</li>
                            <li>• Max Marks: {formData.max_marks || '0'}</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Modal Footer */}
                  {!uploadSuccessInModal && (
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl flex items-center justify-between gap-4">
                      <button
                        onClick={() => setShowUploadPreview(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmUpload}
                        disabled={submitting}
                        className={`px-6 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold ${
                          activeTab === 'listening'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                            : activeTab === 'speaking'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                            : activeTab === 'reading'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                            : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span>Confirm & Upload</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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