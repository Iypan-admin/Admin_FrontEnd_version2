import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getLSRWByBatch, markLSRWComplete, getTeacherBatches, getBatchById, getLSRWStudentSubmissions, verifyLSRWSubmission, getSpeakingByBatch, markSpeakingComplete, getSpeakingSubmissions, addSpeakingFeedback, getReadingByBatch, markReadingComplete, getReadingSubmissions, addReadingFeedback, verifyReadingAttempt, getWritingByBatch, markWritingComplete, getWritingSubmissions, addWritingFeedback } from '../services/Api';
import { Headphones, Play, FileText, CheckCircle, Loader2, BookOpen, Users, Calendar, AlertCircle, Mic, Book, PenTool, RefreshCw, UserCheck, Clock, ChevronDown, ChevronUp, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

function TeacherLSRWPage() {
  const { batchId } = useParams(); // Get batchId from URL if present
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lsrwContent, setLsrwContent] = useState([]);
  const [tabCounts, setTabCounts] = useState({ listening: 0, speaking: 0, reading: 0, writing: 0 }); // Store counts for each tab
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingLSRW, setLoadingLSRW] = useState(false);
  const [error, setError] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null); // Track which audio is currently playing
  const [activeTab, setActiveTab] = useState('listening'); // Track active LSRW module tab
  const [expandedLessons, setExpandedLessons] = useState(new Set()); // Track which lessons are expanded
  const [viewingDocument, setViewingDocument] = useState(null); // Track which document is being viewed
  const [viewingReadingDocument, setViewingReadingDocument] = useState(null); // Track which reading document is being viewed
  const [documentContent, setDocumentContent] = useState(null); // Store parsed document content
  const [studentSubmissions, setStudentSubmissions] = useState([]); // Student quiz submissions
  const [loadingSubmissions, setLoadingSubmissions] = useState(false); // Loading state for submissions
  const [selectedLessonForSubmissions, setSelectedLessonForSubmissions] = useState(null); // Track which lesson's submissions are being viewed
  const [expandedSubmissions, setExpandedSubmissions] = useState(new Set()); // Track which submissions are expanded to show questions
  const [imageZoom, setImageZoom] = useState({}); // Track zoom level for each submission image { submissionId: zoomLevel }
  
  // Audio feedback recording states (per submission)
  const [feedbackRecordingStates, setFeedbackRecordingStates] = useState({}); // { submissionId: { isRecording, mediaRecorder, audioBlob, audioUrl, recordingTime } }

  // LSRW Module tabs configuration
  const lsrwTabs = [
    { id: 'listening', name: 'Listening', icon: Headphones, color: 'blue' },
    { id: 'speaking', name: 'Speaking', icon: Mic, color: 'purple' },
    { id: 'reading', name: 'Reading', icon: Book, color: 'green' },
    { id: 'writing', name: 'Writing', icon: PenTool, color: 'orange' },
  ];

  // Only fetch batches if no batchId in URL (for standalone LSRW page)
  useEffect(() => {
    if (!batchId) {
      fetchTeacherBatches();
    } else {
      // If batchId is in URL, fetch batch details directly
      fetchBatchDetails();
      setLoadingBatches(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Fetch batch details when batchId is in URL
  const fetchBatchDetails = async () => {
    if (!batchId) return;
    
    try {
      setLoadingBatches(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Get batch details from API
      const response = await getBatchById(token, batchId);
      
      if (response && response.success && response.data) {
        const batch = {
          batch_id: response.data.batch_id,
          batch_name: response.data.batch_name,
          batch_time: response.data.time_from ? `${response.data.time_from} - ${response.data.time_to}` : null,
          courses: {
            course_name: response.data.course_name || 'Course'
          }
        };
        setSelectedBatch(batch);
      }
    } catch (err) {
      console.error('Error fetching batch details:', err);
      setError('Failed to load batch details');
    } finally {
      setLoadingBatches(false);
    }
  };

  // Fetch counts for all tabs when batch is selected
  useEffect(() => {
    if (selectedBatch) {
      fetchAllTabCounts(selectedBatch.batch_id);
    }
  }, [selectedBatch]);

  // Fetch content for active tab
  useEffect(() => {
    if (selectedBatch) {
      fetchLSRWContent(selectedBatch.batch_id, activeTab);
    }
  }, [selectedBatch, activeTab]);
 
  // Fetch counts for all tabs
  const fetchAllTabCounts = async (batchId) => {
    try {
      const token = localStorage.getItem('token');
      const tabTypes = ['listening', 'speaking', 'reading', 'writing'];
      
      // Fetch counts for all tabs in parallel
      const countPromises = tabTypes.map(async (moduleType) => {
        try {
          let response;
          if (moduleType === 'speaking') {
            response = await getSpeakingByBatch(batchId, token);
          } else if (moduleType === 'reading') {
            response = await getReadingByBatch(batchId, token);
          } else if (moduleType === 'writing') {
            response = await getWritingByBatch(batchId, token);
          } else {
            response = await getLSRWByBatch(batchId, token, moduleType);
          }
          
          if (response && response.success) {
            return { moduleType, count: (response.data || []).length };
          }
          return { moduleType, count: 0 };
        } catch (err) {
          console.error(`Error fetching count for ${moduleType}:`, err);
          return { moduleType, count: 0 };
        }
      });

      const counts = await Promise.all(countPromises);
      const countsMap = {};
      counts.forEach(({ moduleType, count }) => {
        countsMap[moduleType] = count;
      });
      
      setTabCounts(prev => ({
        ...prev,
        ...countsMap
      }));
    } catch (err) {
      console.error('Error fetching all tab counts:', err);
    }
  };

  // Fetch student submissions when a lesson is selected
  useEffect(() => {
    if (selectedBatch && selectedLessonForSubmissions) {
      fetchStudentSubmissions(selectedLessonForSubmissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch, selectedLessonForSubmissions]);

  const fetchTeacherBatches = async () => {
    try {
      setLoadingBatches(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Get teacher's batches using the API service
      const response = await getTeacherBatches(token);
      
      if (response && response.success && Array.isArray(response.data)) {
        // Transform batch data to match expected format
        const transformedBatches = response.data.map(batch => ({
          batch_id: batch.batch_id,
          batch_name: batch.batch_name,
          batch_time: batch.time_from ? `${batch.time_from} - ${batch.time_to}` : null,
          courses: {
            course_name: batch.course_name || batch.course_details?.course_name || 'Course'
          }
        }));
        
        setBatches(transformedBatches);
        // Auto-select first batch if available
        if (transformedBatches.length > 0) {
          setSelectedBatch(transformedBatches[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load batches: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchLSRWContent = async (batchId, moduleType = 'listening') => {
    try {
        setLoadingLSRW(true);
        const token = localStorage.getItem('token');
        let response;
        
        // Use appropriate API based on module type
        if (moduleType === 'speaking') {
          response = await getSpeakingByBatch(batchId, token);
        } else if (moduleType === 'reading') {
          response = await getReadingByBatch(batchId, token);
        } else if (moduleType === 'writing') {
          response = await getWritingByBatch(batchId, token);
        } else {
          response = await getLSRWByBatch(batchId, token, moduleType);
        }
        
        if (response && response.success) {
          let content = response.data || [];
          
          // For listening module, sort by session_number
          if (moduleType === 'listening') {
            content = [...content].sort((a, b) => {
              const aSession = a.lsrw_content?.session_number || 9999;
              const bSession = b.lsrw_content?.session_number || 9999;
              return aSession - bSession;
            });
          }
          
          // For speaking module, sort by session_number
          if (moduleType === 'speaking') {
            content = [...content].sort((a, b) => {
              const aSession = a.speaking_material?.session_number || 9999;
              const bSession = b.speaking_material?.session_number || 9999;
              return aSession - bSession;
            });
          }
          
          // For reading module, sort by session_number
          if (moduleType === 'reading') {
            content = [...content].sort((a, b) => {
              const aSession = a.reading_material?.session_number || 9999;
              const bSession = b.reading_material?.session_number || 9999;
              return aSession - bSession;
            });
          }
          
          // For writing module, sort by session_number
          if (moduleType === 'writing') {
            content = [...content].sort((a, b) => {
              const aSession = a.writing_task?.session_number || 9999;
              const bSession = b.writing_task?.session_number || 9999;
              return aSession - bSession;
            });
          }
          
          setLsrwContent(content);
          // Update count for the current tab
          setTabCounts(prev => ({
            ...prev,
            [moduleType]: content.length
          }));
        }
    } catch (err) {
      console.error('Error fetching LSRW content:', err);
      setError('Failed to load LSRW content');
    } finally {
      setLoadingLSRW(false);
    }
  };

  const handleMarkComplete = async (mappingId) => {
    if (!window.confirm('Share this lesson to Learn\'s? Students will be able to see it.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Use appropriate API based on module type
      if (activeTab === 'speaking') {
        await markSpeakingComplete(mappingId, token);
      } else if (activeTab === 'reading') {
        await markReadingComplete(mappingId, token);
      } else if (activeTab === 'writing') {
        // Writing module: ask for status (read or completed)
        const status = window.confirm('Mark as "Completed" (students can see it)?\n\nClick OK for "Completed", Cancel for "Read" only.')
          ? 'completed'
          : 'read';
        await markWritingComplete(mappingId, status, token);
      } else {
        await markLSRWComplete(mappingId, token);
      }
      
      alert(activeTab === 'writing' ? 'Writing task status updated!' : 'Lesson marked as completed!');
      if (selectedBatch) {
        fetchLSRWContent(selectedBatch.batch_id, activeTab);
      }
    } catch (err) {
      alert('Failed to mark lesson as complete: ' + err.message);
    }
  };

  const fetchStudentSubmissions = async (contentId) => {
    if (!selectedBatch || !contentId) return;

    try {
      setLoadingSubmissions(true);
      const token = localStorage.getItem('token');
      let response;
      
      // Use appropriate API based on module type
      if (activeTab === 'speaking') {
        response = await getSpeakingSubmissions(selectedBatch.batch_id, token, contentId);
      } else if (activeTab === 'reading') {
        response = await getReadingSubmissions(selectedBatch.batch_id, token, contentId);
      } else if (activeTab === 'writing') {
        response = await getWritingSubmissions(selectedBatch.batch_id, token, contentId);
      } else {
        response = await getLSRWStudentSubmissions(selectedBatch.batch_id, token, contentId);
      }
      
      if (response && response.success) {
        const submissions = response.data || [];
        // Debug: Log submissions to check data structure
        if (activeTab === 'writing') {
          console.log('Writing submissions received:', submissions);
          submissions.forEach((sub, index) => {
            console.log(`Submission ${index}:`, {
              id: sub.id,
              submission_image_url: sub.submission_image_url,
              writing_tasks: sub.writing_tasks,
              students: sub.students,
              feedback: sub.feedback
            });
          });
        }
        setStudentSubmissions(submissions);
      }
    } catch (err) {
      console.error('Error fetching student submissions:', err);
      alert('Failed to load student submissions: ' + err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleViewSubmissions = (content) => {
    // For speaking/reading/writing, content is in specific fields, for others it's lsrw_content
    const contentId = activeTab === 'speaking' 
      ? (content.speaking_material?.id || content.id)
      : activeTab === 'reading'
      ? (content.reading_material?.id || content.id)
      : activeTab === 'writing'
      ? (content.writing_task?.id || content.id)
      : content.id;
    setSelectedLessonForSubmissions(contentId);
    setExpandedSubmissions(new Set()); // Reset expanded submissions when opening new lesson
    fetchStudentSubmissions(contentId);
  };

  // Toggle submission expansion to show/hide questions
  const handleToggleSubmissionExpand = (submissionId) => {
    const newExpanded = new Set(expandedSubmissions);
    if (expandedSubmissions.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  // Handle lesson expand/collapse
  const handleToggleExpand = (mappingId) => {
    const newExpanded = new Set(expandedLessons);
    if (expandedLessons.has(mappingId)) {
      newExpanded.delete(mappingId);
    } else {
      newExpanded.add(mappingId);
    }
    setExpandedLessons(newExpanded);
  };

  const handleVerifySubmission = async (submissionId) => {
    if (!window.confirm('Verify and release marks to student?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Use appropriate API based on module type
      if (activeTab === 'reading') {
        await verifyReadingAttempt(submissionId, token);
      } else {
        await verifyLSRWSubmission(submissionId, token);
      }
      
      alert('Marks verified and released to student!');
      // Refresh submissions
      if (selectedLessonForSubmissions) {
        fetchStudentSubmissions(selectedLessonForSubmissions);
      }
    } catch (err) {
      alert('Failed to verify submission: ' + err.message);
    }
  };

  // Handle adding/updating feedback for speaking attempts
  const handleAddFeedback = async (attemptId, remarks, audioBlob = null, marks = null) => {
    // At least one of remarks, audioBlob, or marks must be provided
    if (!remarks?.trim() && !audioBlob && (marks === null || marks === undefined || marks === '')) {
      alert('Please provide either text feedback, audio feedback, or marks (or any combination)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await addSpeakingFeedback(attemptId, remarks || '', token, audioBlob, marks);
      alert('Feedback saved successfully!');
      // Clear audio recording state for this submission
      setFeedbackRecordingStates(prev => {
        const newState = { ...prev };
        delete newState[attemptId];
        return newState;
      });
      // Refresh submissions
      if (selectedLessonForSubmissions) {
        fetchStudentSubmissions(selectedLessonForSubmissions);
      }
    } catch (err) {
      alert('Failed to save feedback: ' + err.message);
    }
  };

  // Handle adding/updating feedback for reading attempts (supports text and audio feedback only - marks are auto-calculated)
  const handleAddReadingFeedback = async (attemptId, remarks, audioBlob = null) => {
    // At least one of remarks or audioBlob must be provided (marks are auto-calculated from quiz)
    if (!remarks?.trim() && !audioBlob) {
      alert('Please provide either text feedback or audio feedback');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Marks are auto-calculated, so pass null for marks
      await addReadingFeedback(attemptId, remarks || '', token, audioBlob, null);
      alert('Feedback saved successfully!');
      // Clear audio recording state for this submission
      setFeedbackRecordingStates(prev => {
        const newState = { ...prev };
        delete newState[attemptId];
        return newState;
      });
      // Refresh submissions
      if (selectedLessonForSubmissions) {
        fetchStudentSubmissions(selectedLessonForSubmissions);
      }
    } catch (err) {
      alert('Failed to save feedback: ' + err.message);
    }
  };

  // Handle adding/updating feedback for writing submissions
  const handleAddWritingFeedback = async (submissionId, feedbackText, status, marks, audioBlob) => {
    // At least one of feedbackText, marks, or audioBlob should be provided
    if (!feedbackText?.trim() && marks === null && !audioBlob) {
      alert('Please provide at least one of: feedback text, marks, or audio feedback');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await addWritingFeedback(submissionId, feedbackText || '', status, marks, audioBlob, token);
      alert('Feedback saved successfully!');
      // Clear audio recording state for this submission
      setFeedbackRecordingStates(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      // Refresh submissions
      if (selectedLessonForSubmissions) {
        fetchStudentSubmissions(selectedLessonForSubmissions);
      }
    } catch (err) {
      alert('Failed to save feedback: ' + err.message);
    }
  };

  // Start recording audio feedback
  const startFeedbackRecording = async (submissionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      let interval;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(interval);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        stream.getTracks().forEach(track => track.stop());
        
        setFeedbackRecordingStates(prev => ({
          ...prev,
          [submissionId]: {
            ...prev[submissionId],
            isRecording: false,
            audioBlob: blob,
            audioUrl: url,
            mediaRecorder: null
          }
        }));
      };

      recorder.start();
      
      setFeedbackRecordingStates(prev => ({
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          isRecording: true,
          mediaRecorder: recorder,
          recordingTime: 0
        }
      }));

      // Start timer
      interval = setInterval(() => {
        setFeedbackRecordingStates(prev => ({
          ...prev,
          [submissionId]: {
            ...prev[submissionId],
            recordingTime: (prev[submissionId]?.recordingTime || 0) + 1
          }
        }));
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  // Stop recording audio feedback
  const stopFeedbackRecording = (submissionId) => {
    const state = feedbackRecordingStates[submissionId];
    if (state?.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
    }
  };

  const handleViewDocument = async (documentUrl, content) => {
    try {
      setViewingDocument(documentUrl);
      
      // If questions are already parsed and stored in content, use them
      if (content && content.questions && Array.isArray(content.questions)) {
        setDocumentContent(content.questions);
        return;
      }

      // Otherwise, try to fetch and parse the document
      // For now, we'll show a message that content is being loaded
      // In a real implementation, you might want to fetch the document and parse it
      setDocumentContent(null);
    } catch (err) {
      console.error('Error loading document:', err);
      alert('Failed to load document content');
    }
  };

  const closeDocumentView = () => {
    setViewingDocument(null);
    setDocumentContent(null);
  };

  // Function to extract only the passage from content_text (remove questions)
  const extractPassageOnly = (contentText, questions) => {
    if (!contentText) return '';
    
    // If no questions, return full content
    if (!questions || (Array.isArray(questions) && questions.length === 0)) {
      return contentText;
    }
    
    // Parse questions if it's a string
    let questionSet = questions;
    if (typeof questionSet === 'string' && questionSet.length > 0) {
      try {
        questionSet = JSON.parse(questionSet);
      } catch (e) {
        return contentText; // If parsing fails, return full content
      }
    }
    
    if (!Array.isArray(questionSet) || questionSet.length === 0) {
      return contentText;
    }
    
    // Find the first question in the content_text
    // Patterns: Q1., 1., Question 1, MCQ 1, "MCQ Questions:", etc.
    const questionPatterns = [
      /Q(\d+)\./i,                    // Q1.
      /^(\d+)\.\s+[A-Z]/m,            // 1. Question text
      /Question\s+(\d+)[:.]/i,       // Question 1: or Question 1.
      /MCQ\s+(\d+)[:.]/i,            // MCQ 1: or MCQ 1.
      /^(\d+)\)/m,                    // 1) Question text
      /MCQ Questions?:/i,              // MCQ Questions: or MCQ Question:
      /Questions?:/i,                  // Questions: or Question:
      /^(\d+)\s+[A-Z]/m               // 1 Question text (space after number)
    ];
    
    let firstQuestionIndex = contentText.length;
    
    // Find the earliest question match
    for (const pattern of questionPatterns) {
      const match = contentText.match(pattern);
      if (match && match.index !== undefined && match.index < firstQuestionIndex) {
        firstQuestionIndex = match.index;
      }
    }
    
    // Also check for common question headers
    const headerPatterns = [
      /MCQ Questions?:/i,
      /Questions?:/i,
      /Question\s+Bank:/i,
      /Multiple\s+Choice\s+Questions?:/i
    ];
    
    for (const pattern of headerPatterns) {
      const match = contentText.match(pattern);
      if (match && match.index !== undefined && match.index < firstQuestionIndex) {
        firstQuestionIndex = match.index;
      }
    }
    
    // Extract only the passage (everything before the first question)
    const passage = contentText.substring(0, firstQuestionIndex).trim();
    
    // If we found a question but passage is too short, might be wrong detection
    // Return at least some content (first 50% if question found too early)
    if (passage.length < contentText.length * 0.1 && firstQuestionIndex < contentText.length) {
      // Question found too early, might be false positive
      // Try to find a better split point
      const midPoint = Math.floor(contentText.length / 2);
      return contentText.substring(0, midPoint).trim();
    }
    
    return passage || contentText; // Fallback to full content if extraction fails
  };

  const handleViewReadingDocument = (submission) => {
    const readingMaterial = submission.reading_material || submission.reading_materials;
    if (readingMaterial) {
      setViewingReadingDocument(readingMaterial);
    }
  };

  const closeReadingDocumentView = () => {
    setViewingReadingDocument(null);
  };

  if (loadingBatches) {
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
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 mb-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Headphones className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">LSRW Content Management</h1>
                  <p className="text-purple-100 mt-1">Manage Listening, Speaking, Reading, Writing lessons</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {(() => {
              // If batchId is in URL, always show LSRW content (no batch selection)
              if (batchId) {
                if (loadingBatches || !selectedBatch) {
                  return (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Batch...</h3>
                      </div>
                    </div>
                  );
                }
                // Show LSRW content for the batch from URL
                return (
                  <div className="space-y-6">
                    {/* Batch Header */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                          <p className="text-sm text-gray-600 mt-1">{selectedBatch.courses?.course_name || 'Course'}</p>
                        </div>
                      </div>
                    </div>

                    {/* LSRW Content Area with Tabs */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      {/* LSRW Module Tabs */}
                      <div className="mb-6">
                        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
                          {lsrwTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const colorClasses = {
                              blue: isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : '',
                              purple: isActive ? 'border-purple-600 text-purple-600 bg-purple-50' : '',
                              green: isActive ? 'border-green-600 text-green-600 bg-green-50' : '',
                              orange: isActive ? 'border-orange-600 text-orange-600 bg-orange-50' : '',
                            };
                            const iconColorClasses = {
                              blue: isActive ? 'text-blue-600' : 'text-gray-400',
                              purple: isActive ? 'text-purple-600' : 'text-gray-400',
                              green: isActive ? 'text-green-600' : 'text-gray-400',
                              orange: isActive ? 'text-orange-600' : 'text-gray-400',
                            };
                            const badgeColorClasses = {
                              blue: 'bg-blue-100 text-blue-600',
                              purple: 'bg-purple-100 text-purple-600',
                              green: 'bg-green-100 text-green-600',
                              orange: 'bg-orange-100 text-orange-600',
                            };
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 whitespace-nowrap ${
                                  isActive
                                    ? colorClasses[tab.color]
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <Icon className={`w-5 h-5 ${iconColorClasses[tab.color]}`} />
                                <span>{tab.name}</span>
                                <span className={`${badgeColorClasses[tab.color]} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                  {tabCounts[tab.id] || 0}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                            {(() => {
                              const ActiveIcon = lsrwTabs.find(t => t.id === activeTab)?.icon || Headphones;
                              const activeTabData = lsrwTabs.find(t => t.id === activeTab);
                              const iconColorClasses = {
                                blue: 'text-blue-600',
                                purple: 'text-purple-600',
                                green: 'text-green-600',
                                orange: 'text-orange-600',
                              };
                              return (
                                <>
                                  <ActiveIcon className={`w-6 h-6 ${iconColorClasses[activeTabData?.color || 'blue']}`} />
                                  <span>{activeTabData?.name} Lessons</span>
                                </>
                              );
                            })()}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">Manage and complete {activeTab} lessons for this batch</p>
                        </div>
                        <button
                          onClick={() => selectedBatch && fetchLSRWContent(selectedBatch.batch_id, activeTab)}
                          disabled={loadingLSRW}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh to sync with Supabase storage"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingLSRW ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                      </div>

                      {loadingLSRW ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Lessons</h3>
                        </div>
                      ) : lsrwContent.length > 0 ? (
                        <div className="space-y-4">
                          {lsrwContent.map((mapping) => {
                            // For speaking/reading/writing, content is in specific fields, for others in lsrw_content
                            const content = activeTab === 'speaking' 
                              ? mapping.speaking_material 
                              : activeTab === 'reading'
                              ? mapping.reading_material
                              : activeTab === 'writing'
                              ? mapping.writing_task
                              : mapping.lsrw_content;
                            if (!content) return null;

                            const isExpanded = expandedLessons.has(mapping.id);
                            const toggleExpand = () => {
                              handleToggleExpand(mapping.id, mapping);
                            };

                            return (
                              <div key={mapping.id} className="border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden">
                                {/* Collapsed View - Title and Description */}
                                <div 
                                  onClick={toggleExpand}
                                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <h3 className="text-xl font-bold text-gray-900">
                                          {(() => {
                                            // Get session number based on tab type
                                            let sessionNumber = null;
                                            if (activeTab === 'listening' || activeTab === 'speaking') {
                                              sessionNumber = content.session_number;
                                            } else if (activeTab === 'writing') {
                                              sessionNumber = content.session_number;
                                            } else if (activeTab === 'reading') {
                                              sessionNumber = content.session_number;
                                            }
                                            
                                            // Display format: "Session X: Title" if session number exists, otherwise just "Title"
                                            return sessionNumber ? (
                                              <>Session {sessionNumber}: {content.title}</>
                                            ) : (
                                              content.title
                                            );
                                          })()}
                                        </h3>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                          mapping.tutor_status === 'completed'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : mapping.tutor_status === 'read'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        }`}>
                                          {mapping.tutor_status === 'completed' ? 'Completed' : mapping.tutor_status === 'read' ? 'Read' : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4 flex items-center">
                                      <svg 
                                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded View - Full Details */}
                                {isExpanded && (
                                  <div className="px-6 pb-6 border-t border-gray-200 pt-4 space-y-4">
                                    {/* For Speaking: Show Text Content */}
                                    {activeTab === 'speaking' && content.content_text && (
                                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <Mic className="w-5 h-5 text-purple-600" />
                                            <span className="font-semibold text-gray-800">Speaking Content</span>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {content.content_text}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* For Writing: Show Image/Document/Text Content */}
                                    {activeTab === 'writing' && (
                                      <>
                                        {content.content_type === 'image' && content.file_url && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <FileText className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Image</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <img 
                                                src={content.file_url} 
                                                alt={content.title}
                                                className="max-w-full h-auto rounded-lg"
                                                style={{ maxHeight: '500px' }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {content.content_type === 'document' && content.file_url && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <FileText className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Document</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <a 
                                                href={content.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                              >
                                                <FileText className="w-4 h-4" />
                                                <span>View Document</span>
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        {content.content_type === 'text' && content.content_text && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <PenTool className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Content</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                {content.content_text}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Media Player - Supports Audio, Video, and External URLs */}
                                    {activeTab !== 'speaking' && activeTab !== 'writing' && (() => {
                                      const mediaType = content.media_type;
                                      let mediaUrl = null;
                                      let actualMediaType = mediaType;

                                      // Determine media URL based on type and priority: Audio > Video > External URL
                                      // Priority 1: Audio file
                                      if (content.audio_url) {
                                        mediaUrl = content.audio_url;
                                        if (!actualMediaType) actualMediaType = 'audio';
                                      }
                                      // Priority 2: Video file
                                      if (content.video_file_path) {
                                        mediaUrl = content.video_file_path;
                                        actualMediaType = 'video';
                                      }
                                      // Priority 3: External media URL
                                      if (content.external_media_url) {
                                        mediaUrl = content.external_media_url;
                                        // Auto-detect if not set
                                        if (!actualMediaType) {
                                          const urlLower = content.external_media_url.toLowerCase();
                                          if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
                                              urlLower.includes('vimeo.com') || urlLower.includes('dailymotion.com')) {
                                            actualMediaType = 'video_url';
                                          } else if (urlLower.endsWith('.mp3') || urlLower.includes('soundcloud.com') || 
                                                     urlLower.includes('audio') || urlLower.includes('mp3')) {
                                            actualMediaType = 'audio_url';
                                          } else {
                                            actualMediaType = 'video_url'; // Default to video for embedding
                                          }
                                        }
                                      }

                                      if (!mediaUrl) return null;

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

                                      // Check if URL is embeddable (YouTube, Vimeo, etc.)
                                      const isEmbeddableUrl = (url) => {
                                        const urlLower = url.toLowerCase();
                                        return urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
                                               urlLower.includes('vimeo.com') || urlLower.includes('dailymotion.com');
                                      };

                                      return (
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                              {actualMediaType === 'video' || actualMediaType === 'video_url' ? (
                                                <Play className="w-5 h-5 text-blue-600" />
                                              ) : (
                                                <Headphones className="w-5 h-5 text-blue-600" />
                                              )}
                                              <span className="font-semibold text-gray-800">
                                                {actualMediaType === 'video' || actualMediaType === 'video_url' ? 'Video Player' : 'Audio Player'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Audio Player - Uploaded Audio or External Audio URL */}
                                          {(actualMediaType === 'audio' || actualMediaType === 'audio_url') && (
                                            <audio
                                              controls
                                              className="w-full"
                                              src={mediaUrl}
                                              onPlay={() => {
                                                const allAudios = document.querySelectorAll('audio');
                                                allAudios.forEach(audio => {
                                                  if (audio.src !== mediaUrl) {
                                                    audio.pause();
                                                  }
                                                });
                                                setPlayingAudio(mediaUrl);
                                              }}
                                              onPause={() => {
                                                if (playingAudio === mediaUrl) {
                                                  setPlayingAudio(null);
                                                }
                                              }}
                                              onEnded={() => setPlayingAudio(null)}
                                            >
                                              Your browser does not support the audio element.
                                            </audio>
                                          )}

                                          {/* Video Player - Uploaded Video */}
                                          {actualMediaType === 'video' && (
                                            <video
                                              controls
                                              className="w-full max-w-2xl rounded-lg"
                                              src={mediaUrl}
                                              onPlay={() => {
                                                const allVideos = document.querySelectorAll('video');
                                                allVideos.forEach(video => {
                                                  if (video.src !== mediaUrl) {
                                                    video.pause();
                                                  }
                                                });
                                              }}
                                            >
                                              Your browser does not support the video element.
                                            </video>
                                          )}

                                          {/* External Video URL - Embed (YouTube, Vimeo, etc.) */}
                                          {actualMediaType === 'video_url' && isEmbeddableUrl(mediaUrl) && (
                                            <div className="w-full max-w-2xl">
                                              <iframe
                                                src={getEmbedUrl(mediaUrl)}
                                                className="w-full aspect-video rounded-lg"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={content.title}
                                              />
                                              <a
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                                              >
                                                Open in new tab
                                              </a>
                                            </div>
                                          )}

                                          {/* External Video URL - Direct Video Link (not embeddable) */}
                                          {actualMediaType === 'video_url' && !isEmbeddableUrl(mediaUrl) && (
                                            <div className="w-full max-w-2xl">
                                              <video
                                                controls
                                                className="w-full rounded-lg"
                                                src={mediaUrl}
                                                onPlay={() => {
                                                  const allVideos = document.querySelectorAll('video');
                                                  allVideos.forEach(video => {
                                                    if (video.src !== mediaUrl) {
                                                      video.pause();
                                                    }
                                                  });
                                                }}
                                              >
                                                Your browser does not support the video element.
                                              </video>
                                              <a
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                                              >
                                                Open in new tab
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Action Buttons Row */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {/* View Questions Button - Only for listening/writing modules */}
                                      {activeTab !== 'speaking' && activeTab !== 'reading' && content.question_doc_url && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDocument(content.question_doc_url, content);
                                          }}
                                          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span>View Questions</span>
                                        </button>
                                      )}

                                      {/* View Document Button - Only for reading module */}
                                      {activeTab === 'reading' && content && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewReadingDocument({ reading_material: content });
                                          }}
                                          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span>View Document</span>
                                        </button>
                                      )}

                                      {/* View Submission Button - Show for all lessons */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewSubmissions(content);
                                        }}
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold"
                                      >
                                        <UserCheck className="w-4 h-4" />
                                        <span>View Submission</span>
                                      </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-3 pt-2 flex-wrap gap-2">
                                      {mapping.tutor_status === 'pending' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkComplete(mapping.id);
                                          }}
                                          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold"
                                        >
                                          Share to Learn's
                                        </button>
                                      )}

                                      {mapping.tutor_status === 'completed' && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                                          <p className="text-sm text-green-800">
                                            ✓ Lesson completed. Students can now access this content.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            {(() => {
                              const ActiveIcon = lsrwTabs.find(t => t.id === activeTab)?.icon || Headphones;
                              return <ActiveIcon className="w-8 h-8 text-gray-400" />;
                            })()}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No {lsrwTabs.find(t => t.id === activeTab)?.name} Lessons</h4>
                          <p className="text-gray-500">No {activeTab} lessons have been uploaded for this batch yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              // Show batch selection if no batch selected and no batchId in URL
              if (!selectedBatch && !batchId) {
                return (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5" />
                      <span>Select a Batch to View LSRW Content</span>
                    </h2>
                    
                    {batches.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-semibold">No batches assigned</p>
                        <p className="text-sm mt-2">You don't have any batches assigned yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {batches.map((batch) => (
                          <button
                            key={batch.batch_id}
                            onClick={() => setSelectedBatch(batch)}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-400 transition-all text-left group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                              {batch.batch_name}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {batch.courses?.course_name || 'Course'}
                            </div>
                            {batch.batch_time && (
                              <div className="text-xs text-gray-500 flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{batch.batch_time}</span>
                              </div>
                            )}
                            <div className="mt-4 pt-3 border-t border-blue-200">
                              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                                View LSRW Content →
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Show loading state when batchId is in URL but batch not loaded yet
              if (batchId && !selectedBatch && loadingBatches) {
                return (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Batch...</h3>
                    </div>
                  </div>
                );
              }
              
              // Show LSRW content when batch is selected
              if (selectedBatch) {
                return (
                  <div className="space-y-6">
                    {/* Batch Header with Back Button */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {!batchId && (
                            <button
                              onClick={() => setSelectedBatch(null)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Back to batches"
                            >
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                              </svg>
                            </button>
                          )}
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                            <p className="text-sm text-gray-600 mt-1">{selectedBatch.courses?.course_name || 'Course'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LSRW Content Area with Tabs */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      {/* LSRW Module Tabs */}
                      <div className="mb-6">
                        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
                          {lsrwTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const colorClasses = {
                              blue: isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : '',
                              purple: isActive ? 'border-purple-600 text-purple-600 bg-purple-50' : '',
                              green: isActive ? 'border-green-600 text-green-600 bg-green-50' : '',
                              orange: isActive ? 'border-orange-600 text-orange-600 bg-orange-50' : '',
                            };
                            const iconColorClasses = {
                              blue: isActive ? 'text-blue-600' : 'text-gray-400',
                              purple: isActive ? 'text-purple-600' : 'text-gray-400',
                              green: isActive ? 'text-green-600' : 'text-gray-400',
                              orange: isActive ? 'text-orange-600' : 'text-gray-400',
                            };
                            const badgeColorClasses = {
                              blue: 'bg-blue-100 text-blue-600',
                              purple: 'bg-purple-100 text-purple-600',
                              green: 'bg-green-100 text-green-600',
                              orange: 'bg-orange-100 text-orange-600',
                            };
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 whitespace-nowrap ${
                                  isActive
                                    ? colorClasses[tab.color]
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <Icon className={`w-5 h-5 ${iconColorClasses[tab.color]}`} />
                                <span>{tab.name}</span>
                                <span className={`${badgeColorClasses[tab.color]} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                  {tabCounts[tab.id] || 0}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                            {(() => {
                              const ActiveIcon = lsrwTabs.find(t => t.id === activeTab)?.icon || Headphones;
                              const activeTabData = lsrwTabs.find(t => t.id === activeTab);
                              const iconColorClasses = {
                                blue: 'text-blue-600',
                                purple: 'text-purple-600',
                                green: 'text-green-600',
                                orange: 'text-orange-600',
                              };
                              return (
                                <>
                                  <ActiveIcon className={`w-6 h-6 ${iconColorClasses[activeTabData?.color || 'blue']}`} />
                                  <span>{activeTabData?.name} Lessons</span>
                                </>
                              );
                            })()}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">Manage and complete {activeTab} lessons for this batch</p>
                        </div>
                        <button
                          onClick={() => selectedBatch && fetchLSRWContent(selectedBatch.batch_id, activeTab)}
                          disabled={loadingLSRW}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh to sync with Supabase storage"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingLSRW ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                      </div>

                      {loadingLSRW ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Lessons</h3>
                        </div>
                      ) : lsrwContent.length > 0 ? (
                        <div className="space-y-4">
                          {lsrwContent.map((mapping) => {
                            // For speaking/reading/writing, content is in specific fields, for others in lsrw_content
                            const content = activeTab === 'speaking' 
                              ? mapping.speaking_material 
                              : activeTab === 'reading'
                              ? mapping.reading_material
                              : activeTab === 'writing'
                              ? mapping.writing_task
                              : mapping.lsrw_content;
                            if (!content) return null;

                            const isExpanded = expandedLessons.has(mapping.id);
                            const toggleExpand = () => {
                              handleToggleExpand(mapping.id, mapping);
                            };

                            return (
                              <div key={mapping.id} className="border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden">
                                {/* Collapsed View - Title and Description */}
                                <div 
                                  onClick={toggleExpand}
                                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <h3 className="text-xl font-bold text-gray-900">
                                          {(() => {
                                            // Get session number based on tab type
                                            let sessionNumber = null;
                                            if (activeTab === 'listening' || activeTab === 'speaking') {
                                              sessionNumber = content.session_number;
                                            } else if (activeTab === 'writing') {
                                              sessionNumber = content.session_number;
                                            } else if (activeTab === 'reading') {
                                              sessionNumber = content.session_number;
                                            }
                                            
                                            // Display format: "Session X: Title" if session number exists, otherwise just "Title"
                                            return sessionNumber ? (
                                              <>Session {sessionNumber}: {content.title}</>
                                            ) : (
                                              content.title
                                            );
                                          })()}
                                        </h3>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                          mapping.tutor_status === 'completed'
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : mapping.tutor_status === 'read'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        }`}>
                                          {mapping.tutor_status === 'completed' ? 'Completed' : mapping.tutor_status === 'read' ? 'Read' : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4 flex items-center">
                                      <svg 
                                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded View - Full Details */}
                                {isExpanded && (
                                  <div className="px-6 pb-6 border-t border-gray-200 pt-4 space-y-4">
                                    {/* For Speaking: Show Text Content */}
                                    {activeTab === 'speaking' && content.content_text && (
                                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <Mic className="w-5 h-5 text-purple-600" />
                                            <span className="font-semibold text-gray-800">Speaking Content</span>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-purple-100">
                                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {content.content_text}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* For Writing: Show Image/Document/Text Content */}
                                    {activeTab === 'writing' && (
                                      <>
                                        {content.content_type === 'image' && content.file_url && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <FileText className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Image</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <img 
                                                src={content.file_url} 
                                                alt={content.title}
                                                className="max-w-full h-auto rounded-lg"
                                                style={{ maxHeight: '500px' }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {content.content_type === 'document' && content.file_url && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <FileText className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Document</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <a 
                                                href={content.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                              >
                                                <FileText className="w-4 h-4" />
                                                <span>View Document</span>
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        {content.content_type === 'text' && content.content_text && (
                                          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <PenTool className="w-5 h-5 text-orange-600" />
                                                <span className="font-semibold text-gray-800">Writing Task Content</span>
                                              </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                {content.content_text}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Media Player - Supports Audio, Video, and External URLs */}
                                    {activeTab !== 'speaking' && activeTab !== 'writing' && (() => {
                                      const mediaType = content.media_type;
                                      let mediaUrl = null;
                                      let actualMediaType = mediaType;

                                      // Determine media URL based on type and priority: Audio > Video > External URL
                                      // Priority 1: Audio file
                                      if (content.audio_url) {
                                        mediaUrl = content.audio_url;
                                        if (!actualMediaType) actualMediaType = 'audio';
                                      }
                                      // Priority 2: Video file
                                      if (content.video_file_path) {
                                        mediaUrl = content.video_file_path;
                                        actualMediaType = 'video';
                                      }
                                      // Priority 3: External media URL
                                      if (content.external_media_url) {
                                        mediaUrl = content.external_media_url;
                                        // Auto-detect if not set
                                        if (!actualMediaType) {
                                          const urlLower = content.external_media_url.toLowerCase();
                                          if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
                                              urlLower.includes('vimeo.com') || urlLower.includes('dailymotion.com')) {
                                            actualMediaType = 'video_url';
                                          } else if (urlLower.endsWith('.mp3') || urlLower.includes('soundcloud.com') || 
                                                     urlLower.includes('audio') || urlLower.includes('mp3')) {
                                            actualMediaType = 'audio_url';
                                          } else {
                                            actualMediaType = 'video_url'; // Default to video for embedding
                                          }
                                        }
                                      }

                                      if (!mediaUrl) return null;

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

                                      // Check if URL is embeddable (YouTube, Vimeo, etc.)
                                      const isEmbeddableUrl = (url) => {
                                        const urlLower = url.toLowerCase();
                                        return urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
                                               urlLower.includes('vimeo.com') || urlLower.includes('dailymotion.com');
                                      };

                                      return (
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                              {actualMediaType === 'video' || actualMediaType === 'video_url' ? (
                                                <Play className="w-5 h-5 text-blue-600" />
                                              ) : (
                                                <Headphones className="w-5 h-5 text-blue-600" />
                                              )}
                                              <span className="font-semibold text-gray-800">
                                                {actualMediaType === 'video' || actualMediaType === 'video_url' ? 'Video Player' : 'Audio Player'}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Audio Player - Uploaded Audio or External Audio URL */}
                                          {(actualMediaType === 'audio' || actualMediaType === 'audio_url') && (
                                            <audio
                                              controls
                                              className="w-full"
                                              src={mediaUrl}
                                              onPlay={() => {
                                                const allAudios = document.querySelectorAll('audio');
                                                allAudios.forEach(audio => {
                                                  if (audio.src !== mediaUrl) {
                                                    audio.pause();
                                                  }
                                                });
                                                setPlayingAudio(mediaUrl);
                                              }}
                                              onPause={() => {
                                                if (playingAudio === mediaUrl) {
                                                  setPlayingAudio(null);
                                                }
                                              }}
                                              onEnded={() => setPlayingAudio(null)}
                                            >
                                              Your browser does not support the audio element.
                                            </audio>
                                          )}

                                          {/* Video Player - Uploaded Video */}
                                          {actualMediaType === 'video' && (
                                            <video
                                              controls
                                              className="w-full max-w-2xl rounded-lg"
                                              src={mediaUrl}
                                              onPlay={() => {
                                                const allVideos = document.querySelectorAll('video');
                                                allVideos.forEach(video => {
                                                  if (video.src !== mediaUrl) {
                                                    video.pause();
                                                  }
                                                });
                                              }}
                                            >
                                              Your browser does not support the video element.
                                            </video>
                                          )}

                                          {/* External Video URL - Embed (YouTube, Vimeo, etc.) */}
                                          {actualMediaType === 'video_url' && isEmbeddableUrl(mediaUrl) && (
                                            <div className="w-full max-w-2xl">
                                              <iframe
                                                src={getEmbedUrl(mediaUrl)}
                                                className="w-full aspect-video rounded-lg"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={content.title}
                                              />
                                              <a
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                                              >
                                                Open in new tab
                                              </a>
                                            </div>
                                          )}

                                          {/* External Video URL - Direct Video Link (not embeddable) */}
                                          {actualMediaType === 'video_url' && !isEmbeddableUrl(mediaUrl) && (
                                            <div className="w-full max-w-2xl">
                                              <video
                                                controls
                                                className="w-full rounded-lg"
                                                src={mediaUrl}
                                                onPlay={() => {
                                                  const allVideos = document.querySelectorAll('video');
                                                  allVideos.forEach(video => {
                                                    if (video.src !== mediaUrl) {
                                                      video.pause();
                                                    }
                                                  });
                                                }}
                                              >
                                                Your browser does not support the video element.
                                              </video>
                                              <a
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                                              >
                                                Open in new tab
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Action Buttons Row */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {/* View Questions Button - Only for listening/writing modules */}
                                      {activeTab !== 'speaking' && activeTab !== 'reading' && content.question_doc_url && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDocument(content.question_doc_url, content);
                                          }}
                                          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span>View Questions</span>
                                        </button>
                                      )}

                                      {/* View Document Button - Only for reading module */}
                                      {activeTab === 'reading' && content && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewReadingDocument({ reading_material: content });
                                          }}
                                          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span>View Document</span>
                                        </button>
                                      )}

                                      {/* View Submission Button - Show for all lessons */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewSubmissions(content);
                                        }}
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold"
                                      >
                                        <UserCheck className="w-4 h-4" />
                                        <span>View Submission</span>
                                      </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-3 pt-2 flex-wrap gap-2">
                                      {mapping.tutor_status === 'pending' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkComplete(mapping.id);
                                          }}
                                          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold"
                                        >
                                          Share to Learn's
                                        </button>
                                      )}

                                      {mapping.tutor_status === 'completed' && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                                          <p className="text-sm text-green-800">
                                            ✓ Lesson completed. Students can now access this content.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            {(() => {
                              const ActiveIcon = lsrwTabs.find(t => t.id === activeTab)?.icon || Headphones;
                              return <ActiveIcon className="w-8 h-8 text-gray-400" />;
                            })()}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No {lsrwTabs.find(t => t.id === activeTab)?.name} Lessons</h4>
                          <p className="text-gray-500">No {activeTab} lessons have been uploaded for this batch yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              // Fallback: show nothing or error message
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Student Submissions Modal */}
      {selectedLessonForSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLessonForSubmissions(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Student Submissions</h2>
              </div>
              <button
                onClick={() => setSelectedLessonForSubmissions(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingSubmissions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Submissions...</h3>
                </div>
              ) : studentSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                  <p className="text-gray-600">
                    {activeTab === 'speaking' 
                      ? "No students have submitted their speaking recordings yet."
                      : "No students have submitted this quiz yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentSubmissions.map((submission) => {
                    const isExpanded = expandedSubmissions.has(submission.id);
                    return (
                    <div
                      key={submission.id}
                      className={`border-2 rounded-xl p-5 ${
                        (() => {
                          // For speaking: check if feedback exists
                          if (activeTab === 'speaking') {
                            const hasFeedback = submission.feedback && (submission.feedback.remarks || submission.feedback.audio_url);
                            return hasFeedback ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50';
                          }
                          // For reading: check if feedback exists (text, marks, or audio)
                          if (activeTab === 'reading') {
                            const hasFeedback = submission.feedback && (submission.feedback.remarks || (submission.feedback.marks !== null && submission.feedback.marks !== undefined) || submission.feedback.audio_url);
                            return hasFeedback ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50';
                          }
                          // For writing: check feedback status
                          if (activeTab === 'writing') {
                            const feedbackStatus = submission.feedback?.status;
                            if (feedbackStatus === 'completed') {
                              return 'border-green-300 bg-green-50';
                            } else if (feedbackStatus === 'needs_improvement') {
                              return 'border-orange-300 bg-orange-50';
                            } else if (feedbackStatus === 'reviewed') {
                              return 'border-blue-300 bg-blue-50';
                            }
                            return 'border-yellow-300 bg-yellow-50';
                          }
                          // For other modules: use verified status
                          return submission.verified ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50';
                        })()
                      }`}
                    >
                      {/* Clickable Header Section */}
                      <div 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleToggleSubmissionExpand(submission.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {submission.students?.name || 'Student'}
                              </h3>
                              <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                Reg: {submission.students?.registration_number || 'N/A'}
                              </span>
                              {(() => {
                                // For speaking: check if feedback exists (text or audio)
                                if (activeTab === 'speaking') {
                                  const hasFeedback = submission.feedback && (submission.feedback.remarks || submission.feedback.audio_url);
                                  if (hasFeedback) {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completed
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    );
                                  }
                                }
                                // For writing: check feedback status
                                else if (activeTab === 'writing') {
                                  const feedbackStatus = submission.feedback?.status;
                                  if (feedbackStatus === 'completed') {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completed
                                      </span>
                                    );
                                  } else if (feedbackStatus === 'needs_improvement') {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Needs Improvement
                                      </span>
                                    );
                                  } else if (feedbackStatus === 'reviewed') {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Reviewed
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    );
                                  }
                                }
                                // For reading: check if feedback exists (text, marks, or audio)
                                else if (activeTab === 'reading') {
                                  const hasFeedback = submission.feedback && (submission.feedback.remarks || (submission.feedback.marks !== null && submission.feedback.marks !== undefined) || submission.feedback.audio_url);
                                  if (hasFeedback) {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completed
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    );
                                  }
                                }
                                // For other modules: use verified status
                                else {
                                  return submission.verified ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Pending
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                              {activeTab !== 'speaking' && activeTab !== 'writing' && (
                                <>
                                  <span>Score: <strong className={submission.verified ? 'text-green-700' : 'text-gray-700'}>{submission.score}/{submission.max_score || submission.max_marks}</strong></span>
                                  <span>•</span>
                                </>
                              )}
                              {activeTab === 'speaking' ? (
                                <div className="flex items-center gap-2">
                                  <Mic className="w-4 h-4 text-purple-600" />
                                  <span className="font-semibold text-gray-800">
                                    Recording Uploaded: <span className="text-purple-700">{new Date(submission.submitted_at || submission.created_at).toLocaleString()}</span>
                                  </span>
                                </div>
                              ) : activeTab === 'writing' ? (
                                <div className="flex items-center gap-2">
                                  <PenTool className="w-4 h-4 text-orange-600" />
                                  <span className="font-semibold text-gray-800">
                                    Image Submitted: <span className="text-orange-700">{new Date(submission.submitted_at || submission.created_at).toLocaleString()}</span>
                                  </span>
                                </div>
                              ) : (
                                <span>Submitted: {new Date(submission.submitted_at || submission.created_at).toLocaleString()}</span>
                              )}
                              {submission.verified_at && activeTab !== 'writing' && (
                                <>
                                  <span>•</span>
                                  <span>Verified: {new Date(submission.verified_at).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Desktop/Tablet: Button in same row */}
                          <div className="hidden sm:flex items-center gap-2">
                            {/* Verify button for non-speaking, non-writing modules (including reading) */}
                            {activeTab !== 'speaking' && activeTab !== 'writing' && !submission.verified && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent expanding when clicking verify
                                  handleVerifySubmission(submission.id);
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Verify & Release
                              </button>
                            )}
                            {/* Expand/Collapse Icon - For listening/reading/writing show if has questions, for speaking always show */}
                            {(() => {
                              if (activeTab === 'speaking') {
                                // For speaking, always show expand icon to view audio and feedback
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              // For writing, always show expand icon to view submission image and feedback
                              if (activeTab === 'writing') {
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              // For reading, always show expand icon if there's reading material
                              if (activeTab === 'reading') {
                                const hasReadingMaterial = submission.reading_material || submission.reading_materials;
                                if (hasReadingMaterial) {
                                  return isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                  );
                                }
                                return null;
                              }
                              // For other modules, check if has questions
                              const questionSet = submission.lsrw_content?.questions || submission.lsrw_content?.question_set;
                              let parsedQuestionSet = questionSet;
                              if (typeof questionSet === 'string' && questionSet.length > 0) {
                                try {
                                  parsedQuestionSet = JSON.parse(questionSet);
                                } catch (e) {
                                  parsedQuestionSet = null;
                                }
                              }
                              const hasQuestions = Array.isArray(parsedQuestionSet) && parsedQuestionSet.length > 0;
                              
                              if (hasQuestions) {
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {/* Mobile: Buttons and Chevron in header row */}
                          <div className="flex sm:hidden items-center gap-2">
                            {/* Verify button for non-speaking, non-writing modules (including reading) */}
                            {activeTab !== 'speaking' && activeTab !== 'writing' && !submission.verified && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent expanding when clicking verify
                                  handleVerifySubmission(submission.id);
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold flex items-center gap-1 text-xs"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Verify
                              </button>
                            )}
                            {/* Expand/Collapse Icon */}
                            {(() => {
                              if (activeTab === 'speaking') {
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              // For writing, always show expand icon to view submission image and feedback
                              if (activeTab === 'writing') {
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              // For reading, always show expand icon if there's reading material
                              if (activeTab === 'reading') {
                                const hasReadingMaterial = submission.reading_material || submission.reading_materials;
                                if (hasReadingMaterial) {
                                  return isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                  );
                                }
                                return null;
                              }
                              const questionSet = submission.lsrw_content?.questions || submission.lsrw_content?.question_set;
                              let parsedQuestionSet = questionSet;
                              if (typeof questionSet === 'string' && questionSet.length > 0) {
                                try {
                                  parsedQuestionSet = JSON.parse(questionSet);
                                } catch (e) {
                                  parsedQuestionSet = null;
                                }
                              }
                              const hasQuestions = Array.isArray(parsedQuestionSet) && parsedQuestionSet.length > 0;
                              
                              if (hasQuestions) {
                                return isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* For Speaking: Show Audio Player and Feedback */}
                      {isExpanded && activeTab === 'speaking' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          {/* Student Audio Recording */}
                          {submission.audio_url && (
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <Mic className="w-5 h-5 text-purple-600" />
                                  <span className="font-semibold text-gray-800">Student Recording</span>
                                </div>
                              </div>
                              <audio
                                controls
                                className="w-full"
                                src={submission.audio_url}
                                onPlay={() => {
                                  const allAudios = document.querySelectorAll('audio');
                                  allAudios.forEach(audio => {
                                    if (audio.src !== submission.audio_url) {
                                      audio.pause();
                                    }
                                  });
                                  setPlayingAudio(submission.audio_url);
                                }}
                                onPause={() => {
                                  if (playingAudio === submission.audio_url) {
                                    setPlayingAudio(null);
                                  }
                                }}
                                onEnded={() => setPlayingAudio(null)}
                              >
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}

                          {/* Speaking Material Content */}
                          {submission.speaking_materials && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-2">Speaking Material:</h4>
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {submission.speaking_materials.content_text}
                              </p>
                            </div>
                          )}

                          {/* Feedback Section */}
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-3">Teacher Feedback:</h4>
                            
                            {/* Existing Marks */}
                            {submission.feedback && submission.feedback.marks !== null && submission.feedback.marks !== undefined && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-900">Marks Given:</span>
                                  <span className="text-lg font-bold text-green-700">
                                    {submission.feedback.marks}/{submission.max_marks || submission.content?.max_marks || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Existing Text Feedback */}
                            {submission.feedback && submission.feedback.remarks && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-gray-800 whitespace-pre-wrap">{submission.feedback.remarks}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Updated: {new Date(submission.feedback.updated_at || submission.feedback.created_at).toLocaleString()}
                                </p>
                              </div>
                            )}

                            {/* Existing Audio Feedback */}
                            {submission.feedback && submission.feedback.audio_url && (
                              <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Mic className="w-4 h-4 text-purple-600" />
                                  <span className="font-semibold text-purple-900">Audio Feedback:</span>
                                </div>
                                <audio
                                  controls
                                  className="w-full"
                                  src={submission.feedback.audio_url}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}

                            {!submission.feedback && (
                              <p className="text-gray-500 text-sm mb-3">No feedback provided yet.</p>
                            )}
                            
                            {/* Feedback Input Form */}
                            <div className="space-y-3">
                              {/* Marks Input */}
                              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <label className="block font-semibold text-gray-800 mb-2">
                                  Marks (out of {submission.max_marks || submission.content?.max_marks || 'N/A'}):
                                </label>
                                <input
                                  type="number"
                                  id={`marks-${submission.id}`}
                                  min="0"
                                  max={submission.max_marks || submission.content?.max_marks || 100}
                                  defaultValue={submission.feedback?.marks !== null && submission.feedback?.marks !== undefined ? submission.feedback.marks : ''}
                                  placeholder="Enter marks (0 to max)"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Maximum marks: {submission.max_marks || submission.content?.max_marks || 'N/A'}
                                </p>
                              </div>

                              {/* Text Feedback */}
                              <textarea
                                id={`feedback-${submission.id}`}
                                defaultValue={submission.feedback?.remarks || ''}
                                placeholder="Enter your text feedback (optional if providing audio feedback or marks)..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                rows="4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {/* Audio Feedback Recording */}
                              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-gray-800">Audio Feedback (Optional):</span>
                                  {(() => {
                                    const recordingState = feedbackRecordingStates[submission.id];
                                    if (recordingState?.isRecording) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            stopFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                          Stop ({Math.floor((recordingState.recordingTime || 0) / 60)}:{(recordingState.recordingTime || 0) % 60 < 10 ? '0' : ''}{(recordingState.recordingTime || 0) % 60})
                                        </button>
                                      );
                                    } else {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <Mic className="w-4 h-4" />
                                          {recordingState?.audioUrl ? 'Re-record' : 'Record Audio Feedback'}
                                        </button>
                                      );
                                    }
                                  })()}
                                </div>
                                
                                {/* Audio Player for recorded feedback */}
                                {feedbackRecordingStates[submission.id]?.audioUrl && (
                                  <div className="mt-3">
                                    <audio
                                      controls
                                      className="w-full"
                                      src={feedbackRecordingStates[submission.id].audioUrl}
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>

                              {/* Submit Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const remarks = document.getElementById(`feedback-${submission.id}`).value;
                                  const marksInput = document.getElementById(`marks-${submission.id}`).value;
                                  const marks = marksInput !== '' ? parseInt(marksInput) : null;
                                  const audioBlob = feedbackRecordingStates[submission.id]?.audioBlob || null;
                                  
                                  // Validate marks if provided
                                  if (marks !== null && !isNaN(marks)) {
                                    const maxMarks = submission.max_marks || submission.content?.max_marks || 100;
                                    if (marks < 0 || marks > maxMarks) {
                                      alert(`Marks must be between 0 and ${maxMarks}`);
                                      return;
                                    }
                                  }
                                  
                                  handleAddFeedback(submission.id, remarks, audioBlob, marks);
                                }}
                                disabled={feedbackRecordingStates[submission.id]?.isRecording}
                                className="w-full px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submission.feedback ? 'Update Feedback' : 'Add Feedback'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}


                      {/* For Writing: Show Submission Image and Feedback */}
                      {isExpanded && activeTab === 'writing' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          {/* Student Submission Image */}
                          {submission.submission_image_url ? (
                            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <PenTool className="w-5 h-5 text-orange-600" />
                                  <span className="font-semibold text-gray-800">Student's Written Answer</span>
                                </div>
                                {/* Zoom Controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentZoom = imageZoom[submission.id] || 1;
                                      const newZoom = Math.max(0.5, currentZoom - 0.25);
                                      setImageZoom(prev => ({ ...prev, [submission.id]: newZoom }));
                                    }}
                                    className="p-2 bg-white rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors shadow-sm"
                                    title="Zoom Out (or Ctrl/Cmd + Scroll)"
                                  >
                                    <ZoomOut className="w-4 h-4 text-orange-600" />
                                  </button>
                                  <span className="text-sm font-medium text-gray-700 min-w-[70px] text-center bg-white px-2 py-1 rounded border border-orange-200">
                                    {Math.round((imageZoom[submission.id] || 1) * 100)}%
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentZoom = imageZoom[submission.id] || 1;
                                      const newZoom = Math.min(3, currentZoom + 0.25);
                                      setImageZoom(prev => ({ ...prev, [submission.id]: newZoom }));
                                    }}
                                    className="p-2 bg-white rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors shadow-sm"
                                    title="Zoom In (or Ctrl/Cmd + Scroll)"
                                  >
                                    <ZoomIn className="w-4 h-4 text-orange-600" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setImageZoom(prev => ({ ...prev, [submission.id]: 1 }));
                                    }}
                                    className="p-2 bg-white rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors shadow-sm"
                                    title="Reset to 100%"
                                  >
                                    <RotateCcw className="w-4 h-4 text-orange-600" />
                                  </button>
                                  <span className="text-xs text-gray-500 ml-2 hidden sm:inline">
                                    (Ctrl/Cmd + Scroll to zoom)
                                  </span>
                                </div>
                              </div>
                              <div 
                                className="bg-white rounded-lg p-4 border border-orange-100 overflow-auto" 
                                style={{ maxHeight: '700px' }}
                                onWheel={(e) => {
                                  e.stopPropagation();
                                  if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    const currentZoom = imageZoom[submission.id] || 1;
                                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                                    const newZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
                                    setImageZoom(prev => ({ ...prev, [submission.id]: newZoom }));
                                  }
                                }}
                              >
                                <div className="flex justify-center items-start">
                                  <img 
                                    src={submission.submission_image_url} 
                                    alt="Student writing submission"
                                    className="rounded-lg transition-transform duration-200 select-none"
                                    style={{ 
                                      maxWidth: '100%',
                                      height: 'auto',
                                      transform: `scale(${imageZoom[submission.id] || 1})`,
                                      transformOrigin: 'top center',
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none'
                                    }}
                                    draggable={false}
                                    onError={(e) => {
                                      console.error('Error loading submission image:', submission.submission_image_url);
                                      console.error('Submission data:', submission);
                                      e.target.style.display = 'none';
                                      const errorDiv = e.target.nextElementSibling;
                                      if (errorDiv) {
                                        errorDiv.style.display = 'block';
                                      }
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'none' }} className="text-red-500 text-sm mt-2 text-center">
                                  <p>Failed to load image.</p>
                                  <a href={submission.submission_image_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">
                                    Click here to view image
                                  </a>
                                  <p className="text-xs text-gray-500 mt-2">URL: {submission.submission_image_url}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <span className="font-semibold text-gray-800">No submission image available</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">
                                The student has not uploaded an image for this writing task yet.
                              </p>
                              {console.log('Submission data (no image):', submission)}
                            </div>
                          )}

                          {/* Writing Task Content (for reference) */}
                          {submission.writing_tasks && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-2">Writing Task:</h4>
                              <p className="text-gray-700 mb-2 font-medium">{submission.writing_tasks.title}</p>
                              {submission.writing_tasks.instruction && (
                                <p className="text-gray-600 text-sm mb-3">{submission.writing_tasks.instruction}</p>
                              )}
                              {submission.writing_tasks.content_type === 'image' && submission.writing_tasks.file_url && (
                                <div className="mt-3">
                                  <img 
                                    src={submission.writing_tasks.file_url} 
                                    alt="Writing task"
                                    className="max-w-full h-auto rounded-lg border border-gray-300"
                                    style={{ maxHeight: '300px' }}
                                  />
                                </div>
                              )}
                              {submission.writing_tasks.content_type === 'text' && submission.writing_tasks.content_text && (
                                <p className="text-gray-700 whitespace-pre-wrap text-sm bg-white p-3 rounded border border-gray-200">
                                  {submission.writing_tasks.content_text}
                                </p>
                              )}
                              {submission.writing_tasks.content_type === 'document' && submission.writing_tasks.file_url && (
                                <a 
                                  href={submission.writing_tasks.file_url} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mt-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>View Writing Task Document</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Feedback Section */}
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-3">Teacher Feedback:</h4>
                            
                            {/* Existing Marks */}
                            {submission.feedback && submission.feedback.marks !== null && submission.feedback.marks !== undefined && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-900">Marks Given:</span>
                                  <span className="text-lg font-bold text-green-700">
                                    {submission.feedback.marks}/{submission.max_marks || submission.writing_tasks?.max_marks || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Existing Text Feedback */}
                            {submission.feedback && submission.feedback.feedback_text && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-gray-800 whitespace-pre-wrap">{submission.feedback.feedback_text}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Updated: {new Date(submission.feedback.updated_at || submission.feedback.created_at).toLocaleString()}
                                </p>
                              </div>
                            )}

                            {/* Existing Audio Feedback */}
                            {submission.feedback && submission.feedback.audio_url && (
                              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Mic className="w-4 h-4 text-orange-600" />
                                  <span className="font-semibold text-orange-900">Audio Feedback:</span>
                                </div>
                                <audio
                                  controls
                                  className="w-full"
                                  src={submission.feedback.audio_url}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}

                            {!submission.feedback && (
                              <p className="text-gray-500 text-sm mb-3">No feedback provided yet.</p>
                            )}
                            
                            {/* Feedback Input Form */}
                            <div className="space-y-3">
                              {/* Marks Input */}
                              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <label className="block font-semibold text-gray-800 mb-2">
                                  Marks (out of {submission.max_marks || submission.writing_tasks?.max_marks || 'N/A'}):
                                </label>
                                <input
                                  type="number"
                                  id={`marks-${submission.id}`}
                                  min="0"
                                  max={submission.max_marks || submission.writing_tasks?.max_marks || 100}
                                  defaultValue={submission.feedback?.marks !== null && submission.feedback?.marks !== undefined ? submission.feedback.marks : ''}
                                  placeholder="Enter marks (0 to max)"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Maximum marks: {submission.max_marks || submission.writing_tasks?.max_marks || 'N/A'}
                                </p>
                              </div>

                              {/* Text Feedback */}
                              <textarea
                                id={`feedback-${submission.id}`}
                                defaultValue={submission.feedback?.feedback_text || ''}
                                placeholder="Enter your text feedback (optional if providing audio feedback or marks)..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                rows="4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {/* Audio Feedback Recording */}
                              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-gray-800">Audio Feedback (Optional):</span>
                                  {(() => {
                                    const recordingState = feedbackRecordingStates[submission.id];
                                    if (recordingState?.isRecording) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            stopFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                          Stop ({Math.floor((recordingState.recordingTime || 0) / 60)}:{(recordingState.recordingTime || 0) % 60 < 10 ? '0' : ''}{(recordingState.recordingTime || 0) % 60})
                                        </button>
                                      );
                                    } else {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <Mic className="w-4 h-4" />
                                          {recordingState?.audioUrl ? 'Re-record' : 'Record Audio Feedback'}
                                        </button>
                                      );
                                    }
                                  })()}
                                </div>
                                
                                {/* Audio Player for recorded feedback */}
                                {feedbackRecordingStates[submission.id]?.audioUrl && (
                                  <div className="mt-3">
                                    <audio
                                      controls
                                      className="w-full"
                                      src={feedbackRecordingStates[submission.id].audioUrl}
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>

                              {/* Submit Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const feedbackText = document.getElementById(`feedback-${submission.id}`).value;
                                  const marksInput = document.getElementById(`marks-${submission.id}`).value;
                                  const marks = marksInput !== '' ? parseInt(marksInput) : null;
                                  const audioBlob = feedbackRecordingStates[submission.id]?.audioBlob || null;
                                  
                                  // Validate marks if provided
                                  if (marks !== null && !isNaN(marks)) {
                                    const maxMarks = submission.max_marks || submission.writing_tasks?.max_marks || 100;
                                    if (marks < 0 || marks > maxMarks) {
                                      alert(`Marks must be between 0 and ${maxMarks}`);
                                      return;
                                    }
                                  }
                                  
                                  handleAddWritingFeedback(submission.id, feedbackText, null, marks, audioBlob);
                                }}
                                disabled={feedbackRecordingStates[submission.id]?.isRecording}
                                className="w-full px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submission.feedback ? 'Update Feedback' : 'Add Feedback'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show Questions and Answers - For reading and other non-speaking modules when Expanded */}
                      {isExpanded && activeTab !== 'speaking' && activeTab !== 'writing' && (() => {
                        // For reading, get questions from reading_material
                        let questionSet;
                        if (activeTab === 'reading') {
                          questionSet = submission.reading_material?.questions || submission.reading_materials?.questions;
                        } else {
                          // For other modules, check if questions exists and is valid (field name is 'questions' not 'question_set')
                          questionSet = submission.lsrw_content?.questions || submission.lsrw_content?.question_set;
                        }
                        
                        // If questions is a string (JSON), try to parse it
                        let parsedQuestionSet = questionSet;
                        if (typeof questionSet === 'string' && questionSet.length > 0) {
                          try {
                            parsedQuestionSet = JSON.parse(questionSet);
                          } catch (e) {
                            parsedQuestionSet = null;
                          }
                        }
                        
                        // Ensure it's an array
                        if (!Array.isArray(parsedQuestionSet)) {
                          parsedQuestionSet = null;
                        }
                        
                        return parsedQuestionSet && parsedQuestionSet.length > 0;
                      })() ? (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-lg font-bold text-gray-900 mb-4">Student's Answers & Results:</h4>
                          <div className="space-y-4" style={{ display: 'block' }}>
                            {(() => {
                              // For reading, get questions from reading_material
                              let questionSet;
                              if (activeTab === 'reading') {
                                questionSet = submission.reading_material?.questions || submission.reading_materials?.questions;
                              } else {
                                // Parse questions if it's a string (field name is 'questions' not 'question_set')
                                questionSet = submission.lsrw_content?.questions || submission.lsrw_content?.question_set;
                              }
                              if (typeof questionSet === 'string') {
                                try {
                                  questionSet = JSON.parse(questionSet);
                                } catch (e) {
                                  console.error('Failed to parse questions:', e);
                                  return [];
                                }
                              }
                              return Array.isArray(questionSet) ? questionSet : [];
                            })().map((question, index) => {
                              // For reading module, questions have different structure (question, optionA, optionB, optionC, optionD, correct_answer)
                              // For other modules, questions have (question, options[], correctAnswer)
                              const isReading = activeTab === 'reading';
                              const questionKey = isReading ? `question${index + 1}` : (question.questionNumber || `Q${index + 1}`);
                              const studentAnswerRaw = submission.answers?.[questionKey];
                              const studentAnswer = studentAnswerRaw ? String(studentAnswerRaw).toUpperCase().trim() : null;
                              const correctAnswerRaw = isReading ? question.correct_answer : question.correctAnswer;
                              const correctAnswer = correctAnswerRaw ? String(correctAnswerRaw).toUpperCase().trim() : null;
                              const isCorrect = studentAnswer && correctAnswer && studentAnswer === correctAnswer;
                              
                              // For reading, convert to options array format
                              let options = [];
                              if (isReading) {
                                options = [
                                  { key: 'A', text: question.optionA || '' },
                                  { key: 'B', text: question.optionB || '' },
                                  { key: 'C', text: question.optionC || '' },
                                  { key: 'D', text: question.optionD || '' }
                                ];
                              } else {
                                options = question.options || [];
                              }
                              
                              // Debug log
                              console.log(`[Teacher LSRW] Q${index + 1}:`, {
                                questionKey,
                                studentAnswer,
                                correctAnswer,
                                isCorrect,
                                studentAnswerRaw,
                                correctAnswerRaw
                              });

                              return (
                                <div
                                  key={index}
                                  className={`border-2 rounded-lg p-4 ${
                                    isCorrect
                                      ? 'border-green-300 bg-green-50'
                                      : 'border-red-300 bg-red-50'
                                  }`}
                                >
                                  <div className="mb-3">
                                    <div className="flex items-start gap-2 mb-2">
                                      {isCorrect ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                      )}
                                      <p className="text-base font-semibold text-gray-900">
                                        {isReading ? `Q${index + 1}` : questionKey}. {question.question}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-2 mb-3">
                                    {options && options.map((option) => {
                                      const isSelected = studentAnswer === option.key.toLowerCase().trim();
                                      const isCorrectOption = correctAnswer === option.key.toLowerCase().trim();
                                      
                                      let bgColor = 'bg-white';
                                      let borderColor = 'border-gray-200';
                                      let textColor = 'text-gray-700';

                                      if (isCorrectOption) {
                                        bgColor = 'bg-green-100';
                                        borderColor = 'border-green-500';
                                        textColor = 'text-green-900';
                                      } else if (isSelected && !isCorrectOption) {
                                        bgColor = 'bg-red-100';
                                        borderColor = 'border-red-500';
                                        textColor = 'text-red-900';
                                      }

                                      return (
                                        <div
                                          key={option.key}
                                          className={`flex items-center gap-3 p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                                        >
                                          <input
                                            type="radio"
                                            name={questionKey}
                                            value={option.key}
                                            checked={isSelected}
                                            disabled
                                            className="w-4 h-4 cursor-not-allowed flex-shrink-0"
                                          />
                                          <span className="text-sm flex-1">
                                            {option.key.toUpperCase()}) {option.text}
                                            {isCorrectOption && (
                                              <span className="ml-2 text-green-700 font-semibold">✓ Correct Answer</span>
                                            )}
                                            {isSelected && !isCorrectOption && (
                                              <span className="ml-2 text-red-700 font-semibold">✗ Student's Answer</span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {/* Student's Answer - Always Display */}
                                      <div className={`p-4 rounded-lg border-2 ${
                                        isCorrect 
                                          ? 'bg-green-200 border-green-600' 
                                          : studentAnswer 
                                            ? 'bg-red-200 border-red-600' 
                                            : 'bg-gray-100 border-gray-300'
                                      }`}>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Student's Answer:</div>
                                        <div className={`text-xl font-bold ${
                                          isCorrect 
                                            ? 'text-green-900' 
                                            : studentAnswer 
                                              ? 'text-red-900' 
                                              : 'text-gray-600'
                                        }`}>
                                          {studentAnswer ? (
                                            <>
                                              <span className="text-2xl">{studentAnswer.toUpperCase()}</span>
                                              {question.options?.find(opt => opt.key.toLowerCase().trim() === studentAnswer) && (
                                                <span className="ml-2 text-sm">
                                                  ({question.options.find(opt => opt.key.toLowerCase().trim() === studentAnswer).text})
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-sm">Not answered</span>
                                          )}
                                        </div>
                                        {isCorrect && (
                                          <div className="mt-1 text-xs text-green-700 font-semibold flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Correct
                                          </div>
                                        )}
                                        {!isCorrect && studentAnswer && (
                                          <div className="mt-1 text-xs text-red-700 font-semibold flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Incorrect
                                          </div>
                                        )}
                                      </div>

                                      {/* Correct Answer - Always Display */}
                                      <div className="p-4 rounded-lg border-2 bg-green-200 border-green-600">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Correct Answer:</div>
                                        <div className="text-xl font-bold text-green-900">
                                          {correctAnswer ? (
                                            <>
                                              <span className="text-2xl">{correctAnswer.toUpperCase()}</span>
                                              {question.options?.find(opt => opt.key.toLowerCase().trim() === correctAnswer) && (
                                                <span className="ml-2 text-sm">
                                                  ({question.options.find(opt => opt.key.toLowerCase().trim() === correctAnswer).text})
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-sm">N/A</span>
                                          )}
                                        </div>
                                        <div className="mt-1 text-xs text-green-700 font-semibold flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          Answer Key
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : isExpanded && submission.answers && Object.keys(submission.answers).length > 0 ? (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Student Answers (Questions not available):</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {Object.entries(submission.answers).map(([question, answer]) => (
                              <div key={question} className="bg-white rounded-lg p-2 border border-gray-200">
                                <div className="text-xs font-semibold text-gray-600">{question}</div>
                                <div className="text-sm font-bold text-gray-900">{answer.toUpperCase()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* For Reading: Show Feedback Section */}
                      {isExpanded && activeTab === 'reading' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          {/* Feedback Section */}
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-3">Teacher Feedback:</h4>
                            
                            {/* Auto-calculated Marks (from quiz) */}
                            {submission.score !== null && submission.score !== undefined && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-green-900">Quiz Score (Auto-calculated):</span>
                                  <span className="text-lg font-bold text-green-700">
                                    {submission.score}/{submission.max_score || submission.reading_materials?.max_marks || submission.reading_material?.max_marks || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Existing Text Feedback */}
                            {submission.feedback && submission.feedback.remarks && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-gray-800 whitespace-pre-wrap">{submission.feedback.remarks}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Updated: {new Date(submission.feedback.updated_at || submission.feedback.created_at).toLocaleString()}
                                </p>
                              </div>
                            )}

                            {/* Existing Audio Feedback */}
                            {submission.feedback && submission.feedback.audio_url && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Mic className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-900">Audio Feedback:</span>
                                </div>
                                <audio
                                  controls
                                  className="w-full"
                                  src={submission.feedback.audio_url}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}

                            {!submission.feedback && (
                              <p className="text-gray-500 text-sm mb-3">No feedback provided yet.</p>
                            )}
                            
                            {/* Feedback Input Form */}
                            <div className="space-y-3">
                              {/* Text Feedback */}
                              <textarea
                                id={`reading-feedback-${submission.id}`}
                                defaultValue={submission.feedback?.remarks || ''}
                                placeholder="Enter your text feedback (optional if providing audio feedback)..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                rows="4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              {/* Audio Feedback Recording */}
                              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-semibold text-gray-800">Audio Feedback (Optional):</span>
                                  {(() => {
                                    const recordingState = feedbackRecordingStates[submission.id];
                                    if (recordingState?.isRecording) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            stopFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                          Stop ({Math.floor((recordingState.recordingTime || 0) / 60)}:{(recordingState.recordingTime || 0) % 60 < 10 ? '0' : ''}{(recordingState.recordingTime || 0) % 60})
                                        </button>
                                      );
                                    } else {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startFeedbackRecording(submission.id);
                                          }}
                                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center gap-2"
                                        >
                                          <Mic className="w-4 h-4" />
                                          {recordingState?.audioUrl ? 'Re-record' : 'Record Audio Feedback'}
                                        </button>
                                      );
                                    }
                                  })()}
                                </div>
                                
                                {/* Audio Player for recorded feedback */}
                                {feedbackRecordingStates[submission.id]?.audioUrl && (
                                  <div className="mt-3">
                                    <audio
                                      controls
                                      className="w-full"
                                      src={feedbackRecordingStates[submission.id].audioUrl}
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>

                              {/* Submit Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const remarks = document.getElementById(`reading-feedback-${submission.id}`).value;
                                  const audioBlob = feedbackRecordingStates[submission.id]?.audioBlob || null;
                                  
                                  // Marks are auto-calculated from quiz, so we don't need to pass marks
                                  handleAddReadingFeedback(submission.id, remarks, audioBlob);
                                }}
                                className="w-full px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold"
                              >
                                {submission.feedback ? 'Update Feedback' : 'Add Feedback'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reading Document Modal/Viewer */}
      {viewingReadingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeReadingDocumentView}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Reading Document</h2>
              </div>
              <button
                onClick={closeReadingDocumentView}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Section 1: Reading Document/Passage (No Questions) */}
                <div className="space-y-4">
                  {/* Reading Document File (if available) - Shows only passage */}
                  {viewingReadingDocument.file_url && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        Reading Document (Passage Only):
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        <a
                          href={viewingReadingDocument.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold underline"
                        >
                          <FileText className="w-4 h-4" />
                          View/Download Document
                        </a>
                        <p className="text-xs text-gray-500 mt-2 break-all">{viewingReadingDocument.file_url}</p>
                      </div>
                    </div>
                  )}

                  {/* Reading Passage (if no file_url or as additional display) - Only passage, no questions */}
                  {viewingReadingDocument.content_text && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-green-600" />
                        Reading Passage:
                      </h3>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {extractPassageOnly(viewingReadingDocument.content_text, viewingReadingDocument.questions)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 2: MCQ Questions (Separate Section) */}
                {(() => {
                  let questionSet = viewingReadingDocument.questions;
                  
                  // Parse questions if it's a string
                  if (typeof questionSet === 'string' && questionSet.length > 0) {
                    try {
                      questionSet = JSON.parse(questionSet);
                    } catch (e) {
                      questionSet = null;
                    }
                  }
                  
                  if (!Array.isArray(questionSet) || questionSet.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div className="mt-6 pt-6 border-t-2 border-gray-300">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Book className="w-5 h-5 text-green-600" />
                        MCQ Questions:
                      </h3>
                      <div className="space-y-4">
                        {questionSet.map((question, index) => {
                          const options = [
                            { key: 'A', text: question.optionA || '' },
                            { key: 'B', text: question.optionB || '' },
                            { key: 'C', text: question.optionC || '' },
                            { key: 'D', text: question.optionD || '' }
                          ];
                          const correctAnswer = question.correct_answer ? String(question.correct_answer).toUpperCase().trim() : null;
                          
                          return (
                            <div key={index} className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                              <div className="mb-3">
                                <p className="text-base font-semibold text-gray-900">
                                  Q{index + 1}: {question.question}
                                </p>
                              </div>
                              
                              <div className="space-y-2 mb-3">
                                {options.map((option) => {
                                  const isCorrect = correctAnswer === option.key;
                                  return (
                                    <div
                                      key={option.key}
                                      className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                                        isCorrect
                                          ? 'bg-green-100 border-green-500 text-green-900'
                                          : 'bg-gray-50 border-gray-200 text-gray-700'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`reading-doc-question-${index}`}
                                        value={option.key}
                                        checked={isCorrect}
                                        disabled
                                        className="w-4 h-4 cursor-not-allowed flex-shrink-0"
                                      />
                                      <span className="text-sm flex-1">
                                        {option.key.toUpperCase()}) {option.text}
                                        {isCorrect && (
                                          <span className="ml-2 text-green-700 font-semibold">✓ Correct Answer</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="pt-3 border-t border-gray-200">
                                <div className="p-3 bg-green-100 rounded-lg border-2 border-green-500">
                                  <div className="text-xs font-semibold text-gray-700 mb-1">Correct Answer:</div>
                                  <div className="text-lg font-bold text-green-900">
                                    {correctAnswer ? (
                                      <>
                                        <span className="text-xl">{correctAnswer}</span>
                                        {options.find(opt => opt.key === correctAnswer) && (
                                          <span className="ml-2 text-sm">
                                            ({options.find(opt => opt.key === correctAnswer).text})
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-sm">N/A</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Content Modal/Viewer */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeDocumentView}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Questions Document</h2>
              </div>
              <button
                onClick={closeDocumentView}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {documentContent && Array.isArray(documentContent) && documentContent.length > 0 ? (
                <div className="space-y-8">
                  {documentContent.map((question, index) => (
                    <div key={index} className="text-gray-900">
                      {/* Question Number and Text */}
                      <div className="mb-2">
                        <p className="text-base font-medium">
                          {question.questionNumber || `Q${index + 1}`}. {question.question}
                        </p>
                      </div>
                      
                      {/* Options - each on separate line */}
                      {question.options && question.options.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="text-base text-gray-700">
                              {option.key}) {option.text}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Correct Answer */}
                      {question.correctAnswer && (
                        <div className="text-base font-semibold text-gray-900">
                          Correct Answer: {question.correctAnswer.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Content</h3>
                  <p className="text-gray-600 mb-4">Questions are being parsed from the document...</p>
                  <div className="inline-block">
                    <a
                      href={viewingDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span>Open Document in New Tab</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherLSRWPage;

