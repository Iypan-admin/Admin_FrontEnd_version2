import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getAllCourses, getLSRWByCourse, getWritingByCourse, getSpeakingByCourse, getReadingByCourse, updateSessionNumbers, deleteListeningSession, deleteSpeakingSession, deleteReadingSession, deleteWritingSession } from '../services/Api';
import { FolderOpen, Loader2, Search, X, Headphones, Mic, Book, PenTool, Eye, Download, Trash2, FileText, FileAudio, Image, ChevronDown, ChevronUp, ExternalLink, GripVertical } from 'lucide-react';

function LSRWFileViewPage() {
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
  const [expandedSessions, setExpandedSessions] = useState(new Set()); // Track which sessions are expanded (for listening tab)
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 }); // Track fetch progress
  const [error, setError] = useState(null);
  const [draggedSession, setDraggedSession] = useState(null); // Track which session is being dragged
  const [isReordering, setIsReordering] = useState(false); // Track if reordering is in progress

  // LSRW Module tabs configuration
  const lsrwTabs = [
    { id: 'listening', name: 'Listening', icon: Headphones, color: 'blue' },
    { id: 'speaking', name: 'Speaking', icon: Mic, color: 'purple' },
    { id: 'reading', name: 'Reading', icon: Book, color: 'green' },
    { id: 'writing', name: 'Writing', icon: PenTool, color: 'orange' },
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch files when component mounts
  useEffect(() => {
    if (!loading && courses.length > 0 && !filesFetched) {
      fetchAllFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, courses.length, filesFetched]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getAllCourses(token);
      if (response && response.success && Array.isArray(response.data)) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all LSRW files grouped by course (optimized with parallel fetching)
  const fetchAllFiles = async () => {
    if (courses.length === 0) {
      setLoadingFiles(false);
      setAllFiles([]);
      return;
    }
    
    setLoadingFiles(true);
    setError(null);
    
    const timeoutId = setTimeout(() => {
      setLoadingFiles(false);
      if (allFiles.length === 0) {
        setAllFiles([]);
      }
    }, 120000); // 2 minutes timeout
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const totalCourses = courses.length;
      setFetchProgress({ current: 0, total: totalCourses });

      const BATCH_SIZE = 10;
      const filesByCourse = [];
      
      for (let i = 0; i < courses.length; i += BATCH_SIZE) {
        const batch = courses.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (course) => {
          const courseFiles = {
            courseId: course.id,
            courseName: course.course_name,
            language: course.language,
            level: course.level,
            modules: {
              listening: [],
              speaking: [],
              reading: [],
              writing: []
            }
          };

          const modulePromises = [];
          
          // Fetch Listening
          modulePromises.push(
            Promise.race([
              getLSRWByCourse(course.id, token, 'listening'),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]).catch(err => {
              console.warn(`Error fetching listening for ${course.course_name}:`, err);
              return null;
            }).then(listeningRes => {
              if (listeningRes && listeningRes.success && listeningRes.data && Array.isArray(listeningRes.data)) {
                // Use session_number from database (already sorted by backend)
                // Group items by lsrw_id (each upload is a session)
                const sessionMap = new Map();

                listeningRes.data.forEach(item => {
                  const sessionKey = item.lsrw_id || item.id;
                  const sessionNumber = item.session_number || 1; // Use database session_number
                  
                  if (!sessionMap.has(sessionKey)) {
                    sessionMap.set(sessionKey, {
                      sessionNumber: sessionNumber, // Use from database
                      lsrwId: sessionKey,
                      title: item.title || `Session ${sessionNumber}`,
                      created_at: item.created_at,
                      files: []
                    });
                  }

                  const session = sessionMap.get(sessionKey);
                  const mediaType = item.media_type || 'audio';
                  
                  // Handle media files based on media_type and available URLs
                  if (mediaType === 'audio' || mediaType === 'audio_url') {
                    const audioUrl = item.audio_url || item.external_media_url;
                    if (audioUrl) {
                      session.files.push({
                        ...item,
                        module_type: 'listening',
                        file_url: audioUrl,
                        file_type: mediaType === 'audio_url' ? 'audio_url' : 'audio',
                        file_name: mediaType === 'audio_url' ? 'External Audio URL' : 'Audio File',
                        is_audio: true,
                        is_external_url: mediaType === 'audio_url',
                        session_number: session.sessionNumber
                      });
                    }
                  } else if (mediaType === 'video' || mediaType === 'video_url') {
                    const videoUrl = item.video_file_path || item.external_media_url;
                    if (videoUrl) {
                      session.files.push({
                        ...item,
                        module_type: 'listening',
                        file_url: videoUrl,
                        file_type: mediaType === 'video_url' ? 'video_url' : 'video',
                        file_name: mediaType === 'video_url' ? 'External Video URL' : 'Video File',
                        is_video: true,
                        is_external_url: mediaType === 'video_url',
                        session_number: session.sessionNumber
                      });
                    }
                  } else {
                    if (item.audio_url) {
                      session.files.push({
                        ...item,
                        module_type: 'listening',
                        file_url: item.audio_url,
                        file_type: 'audio',
                        file_name: 'Audio File',
                        is_audio: true,
                        session_number: session.sessionNumber
                      });
                    }
                  }
                  
                  // Question document
                  const questionDocUrl = item.question_doc_url || item.question_document_url || item.questionDoc || item.question_doc;
                  if (questionDocUrl) {
                    session.files.push({
                      ...item,
                      module_type: 'listening',
                      file_url: questionDocUrl,
                      file_type: 'document',
                      file_name: 'Question Document',
                      is_question_doc: true,
                      session_number: session.sessionNumber
                    });
                  }
                });

                // Convert map to array of sessions
                courseFiles.modules.listening = Array.from(sessionMap.values());
              }
            })
          );

          // Fetch Speaking
          modulePromises.push(
            Promise.race([
              getSpeakingByCourse(course.id, token),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]).catch(err => {
              console.warn(`Error fetching speaking for ${course.course_name}:`, err);
              return null;
            }).then(speakingRes => {
              if (speakingRes && speakingRes.success && speakingRes.data && Array.isArray(speakingRes.data)) {
                // Use session_number from database (already sorted by backend)
                // Group items by id (each upload is a session)
                const sessionMap = new Map();

                speakingRes.data.forEach(item => {
                  const sessionKey = item.id;
                  const sessionNumber = item.session_number || 1; // Use database session_number
                  
                  if (!sessionMap.has(sessionKey)) {
                    sessionMap.set(sessionKey, {
                      sessionNumber: sessionNumber, // Use from database
                      lsrwId: sessionKey,
                      id: sessionKey,
                      title: item.title || `Session ${sessionNumber}`,
                      created_at: item.created_at,
                      files: []
                    });
                  }

                  const session = sessionMap.get(sessionKey);
                  
                  // Add text content
                  if (item.text_content || item.content_text || item.instruction) {
                    session.files.push({
                      ...item,
                      module_type: 'speaking',
                      file_type: 'text',
                      file_name: 'Text Content',
                      is_text: true,
                      session_number: session.sessionNumber
                    });
                  }
                  
                  // Add text file
                  if (item.original_file_url) {
                    session.files.push({
                      ...item,
                      module_type: 'speaking',
                      file_url: item.original_file_url,
                      file_type: 'document',
                      file_name: 'Text File',
                      is_text_file: true,
                      session_number: session.sessionNumber
                    });
                  }
                });

                // Convert map to array of sessions
                courseFiles.modules.speaking = Array.from(sessionMap.values());
              }
            })
          );

          // Fetch Reading
          modulePromises.push(
            Promise.race([
              getReadingByCourse(course.id, token),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]).catch(err => {
              console.warn(`Error fetching reading for ${course.course_name}:`, err);
              return null;
            }).then(readingRes => {
              if (readingRes && readingRes.success && readingRes.data && Array.isArray(readingRes.data)) {
                // Group reading materials by session_number (similar to speaking)
                const sessionMap = new Map();
                
                readingRes.data.forEach(item => {
                  const sessionNumber = item.session_number || 999999; // Put items without session_number at the end
                  const sessionKey = sessionNumber;
                  
                  if (!sessionMap.has(sessionKey)) {
                    sessionMap.set(sessionKey, {
                      sessionNumber: sessionNumber,
                      title: item.title,
                      created_at: item.created_at,
                      id: item.id,
                      lsrwId: item.id, // For compatibility with delete function
                      files: []
                    });
                  }
                  
                  const session = sessionMap.get(sessionKey);
                  
                  // Add file if exists
                  if (item.file_url) {
                    session.files.push({
                      ...item,
                      module_type: 'reading',
                      file_url: item.file_url,
                      file_type: 'document',
                      file_name: 'Reading Document',
                      session_number: session.sessionNumber
                    });
                  }
                  
                  // Add text content
                  if (item.content_text) {
                    session.files.push({
                      ...item,
                      module_type: 'reading',
                      file_type: 'text',
                      file_name: 'Text Content',
                      content_text: item.content_text,
                      session_number: session.sessionNumber
                    });
                  }
                });
                
                // Convert map to array of sessions, sorted by session_number
                courseFiles.modules.reading = Array.from(sessionMap.values())
                  .sort((a, b) => (a.sessionNumber || 999999) - (b.sessionNumber || 999999));
              }
            })
          );

          // Fetch Writing
          modulePromises.push(
            Promise.race([
              getWritingByCourse(course.id, token),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]).catch(err => {
              console.warn(`Error fetching writing for ${course.course_name}:`, err);
              return null;
            }).then(writingRes => {
              if (writingRes && writingRes.success && writingRes.data && Array.isArray(writingRes.data)) {
                // Group writing materials by session_number (similar to speaking)
                const sessionMap = new Map();
                
                writingRes.data.forEach(item => {
                  const sessionNumber = item.session_number || 1;
                  const sessionKey = sessionNumber;
                  
                  if (!sessionMap.has(sessionKey)) {
                    sessionMap.set(sessionKey, {
                      sessionNumber: sessionNumber,
                      title: item.title || `Writing Task ${sessionNumber}`,
                      lsrwId: item.id,
                      id: item.id,
                      files: []
                    });
                  }
                  
                  const session = sessionMap.get(sessionKey);
                  
                  const contentType = item.content_type || item.file_type || null;
                  const fileUrl = item.file_url || null;
                  
                  let imageUrl = null;
                  let docUrl = null;
                  
                  if (fileUrl && (contentType === 'image' || item.file_type === 'image')) {
                    imageUrl = fileUrl;
                  } else if (fileUrl && (contentType === 'document' || item.file_type === 'document')) {
                    docUrl = fileUrl;
                  } else if (fileUrl) {
                    if (contentType === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileUrl)) {
                      imageUrl = fileUrl;
                    } else if (contentType === 'document' || /\.(pdf|doc|docx)$/i.test(fileUrl)) {
                      docUrl = fileUrl;
                    }
                  }
                  
                  if (!imageUrl && !docUrl) {
                    imageUrl = item.writing_image_url || item.image_url || null;
                    docUrl = item.writing_document_url || item.document_url || null;
                  }
                  
                  if (imageUrl) {
                    session.files.push({
                      ...item,
                      module_type: 'writing',
                      file_url: imageUrl,
                      file_type: 'image',
                      is_image: true,
                      title: item.title,
                      instruction: item.instruction,
                      content_text: item.content_text,
                      content_type: item.content_type,
                      session_number: sessionNumber
                    });
                  } else if (docUrl) {
                    session.files.push({
                      ...item,
                      module_type: 'writing',
                      file_url: docUrl,
                      file_type: 'document',
                      is_document: true,
                      title: item.title,
                      instruction: item.instruction,
                      content_text: item.content_text,
                      content_type: item.content_type,
                      session_number: sessionNumber
                    });
                  } else {
                    session.files.push({
                      ...item,
                      module_type: 'writing',
                      file_url: null,
                      file_type: 'text',
                      title: item.title,
                      instruction: item.instruction,
                      content_text: item.content_text,
                      content_type: item.content_type,
                      session_number: sessionNumber
                    });
                  }
                });
                
                // Convert map to array of sessions
                courseFiles.modules.writing = Array.from(sessionMap.values());
              }
            })
          );

          await Promise.all(modulePromises);
          
          const hasFiles = courseFiles.modules.listening.length > 0 ||
                          courseFiles.modules.speaking.length > 0 ||
                          courseFiles.modules.reading.length > 0 ||
                          courseFiles.modules.writing.length > 0;
          
          return hasFiles ? courseFiles : null;
        });

        const batchResults = await Promise.all(batchPromises);
        const validCourses = batchResults.filter(course => course !== null);
        filesByCourse.push(...validCourses);
        
        const processed = Math.min(i + BATCH_SIZE, totalCourses);
        setFetchProgress({ current: processed, total: totalCourses });
      }

      clearTimeout(timeoutId);
      setAllFiles(filesByCourse);
      setFilesFetched(true);
      setLoadingFiles(false);
      setFetchProgress({ current: 0, total: 0 });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching all files:', error);
      setError('Failed to fetch files');
      setAllFiles([]);
      setFilesFetched(true);
      setLoadingFiles(false);
    }
  };

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

  // Handle file delete
  const handleDelete = async (fileId, moduleType, courseId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      alert('Delete functionality will be implemented with API endpoint');
      fetchAllFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
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
            {/* Section Title */}
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                <span className="truncate">LSRW File View</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all uploaded LSRW files organized by course and module</p>
            </div>

            {/* Module Type Tabs for File View */}
            <div className="bg-white rounded-2xl shadow-xl p-1.5 sm:p-2 mb-4 sm:mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {lsrwTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = fileViewTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFileViewTab(tab.id)}
                      className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap text-xs sm:text-base ${
                        isActive
                          ? (tab.color === 'blue' ? 'bg-blue-600 text-white shadow-lg scale-105' :
                             tab.color === 'purple' ? 'bg-purple-600 text-white shadow-lg scale-105' :
                             tab.color === 'green' ? 'bg-green-600 text-white shadow-lg scale-105' :
                             'bg-orange-600 text-white shadow-lg scale-105')
                          : `text-gray-600 hover:bg-gray-100`
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="truncate">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search/Filter Bar for Course Name */}
            <div className="mb-4 sm:mb-6">
              <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by course name, language, or level..."
                    value={fileViewSearchTerm}
                    onChange={(e) => setFileViewSearchTerm(e.target.value)}
                    className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {fileViewSearchTerm && (
                    <button
                      onClick={() => setFileViewSearchTerm('')}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      title="Clear search"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* File View Content */}
            {loadingFiles ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading files...</p>
                {fetchProgress.total > 0 && (
                  <>
                    <p className="text-sm text-gray-600 mt-2">
                      Processing {fetchProgress.current} of {fetchProgress.total} courses...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 max-w-md mx-auto">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {Math.round((fetchProgress.current / fetchProgress.total) * 100)}% complete
                    </p>
                  </>
                )}
                {fetchProgress.total === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Fetching files from {courses.length} course(s)...</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  if (courses.length === 0) {
                    return (
                      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-xl p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Found</h3>
                        <p className="text-gray-600">No courses are available. Please add courses first.</p>
                      </div>
                    );
                  }

                  if (allFiles.length === 0 && courses.length > 0 && !loadingFiles && filesFetched) {
                    return (
                      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-xl p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Files Found</h3>
                        <p className="text-gray-600 mb-4">No LSRW files have been uploaded yet for any course.</p>
                        <p className="text-sm text-gray-500">Only courses with uploaded materials are displayed.</p>
                        {error && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (!filesFetched && !loadingFiles && allFiles.length === 0) {
                    return (
                      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-xl p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Preparing to fetch files...</p>
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
                      <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-xl p-12 text-center">
                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Match Your Search</h3>
                        <p className="text-gray-600 mb-4">No courses found matching "{fileViewSearchTerm}"</p>
                        <button
                          onClick={() => setFileViewSearchTerm('')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Clear Search
                        </button>
                      </div>
                    );
                  }

                  return filteredCourses.map((course) => {
                    const moduleFiles = course.modules[fileViewTab] || [];
                    const activeTabConfig = lsrwTabs.find(tab => tab.id === fileViewTab) || lsrwTabs[0];
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
                        className={`bg-white rounded-2xl shadow-xl overflow-hidden ${isExpanded ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}
                      >
                        <button
                          onClick={toggleCourse}
                          className="w-full p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 sm:gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{course.courseName}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                              {course.language} • {course.level}
                            </p>
                            {moduleFiles.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {(fileViewTab === 'listening' || fileViewTab === 'speaking' || fileViewTab === 'reading' || fileViewTab === 'writing') && moduleFiles[0]?.files && Array.isArray(moduleFiles[0].files) ? (
                                  // Show session count for listening, speaking, reading, and writing
                                  `${moduleFiles.length} ${moduleFiles.length === 1 ? 'session' : 'sessions'} available`
                                ) : (
                                  // Show file count for other tabs
                                  `${moduleFiles.length} ${moduleFiles.length === 1 ? 'file' : 'files'} available`
                                )}
                              </p>
                            )}
                          </div>
                          <div className="ml-2 sm:ml-4 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-200 pt-3 sm:pt-4">
                            {moduleFiles.length > 0 ? (
                              <div className="space-y-2">
                                {(fileViewTab === 'listening' || fileViewTab === 'speaking' || fileViewTab === 'reading' || fileViewTab === 'writing') ? (
                                  // For listening and speaking tabs, group by sessions
                                  (() => {
                                    // Check if files are grouped by session (has files array property)
                                    const isGroupedBySession = moduleFiles[0]?.files && Array.isArray(moduleFiles[0].files);
                                    
                                    if (isGroupedBySession) {
                                      // Files are grouped by session - add drag and drop
                                      const handleDragStart = (e, sessionIndex) => {
                                        setDraggedSession(sessionIndex);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/html', e.target);
                                      };

                                      const handleDragOver = (e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                      };

                                      const handleDrop = async (e, targetSessionIndex) => {
                                        e.preventDefault();
                                        if (draggedSession === null || draggedSession === targetSessionIndex) {
                                          setDraggedSession(null);
                                          return;
                                        }

                                        // Reorder sessions in local state
                                        const reorderedSessions = [...moduleFiles];
                                        const [movedSession] = reorderedSessions.splice(draggedSession, 1);
                                        reorderedSessions.splice(targetSessionIndex, 0, movedSession);

                                        // Update session numbers
                                        const sessionOrders = reorderedSessions.map((session, index) => ({
                                          id: session.lsrwId || session.id,
                                          session_number: index + 1
                                        }));

                                        setIsReordering(true);
                                        try {
                                          const token = localStorage.getItem('token');
                                          await updateSessionNumbers(course.courseId, fileViewTab, sessionOrders, token);
                                          
                                          // Update local state by refetching
                                          await fetchAllFiles();
                                        } catch (error) {
                                          console.error('Error reordering sessions:', error);
                                          alert('Failed to reorder sessions. Please try again.');
                                        } finally {
                                          setIsReordering(false);
                                          setDraggedSession(null);
                                        }
                                      };

                                      return moduleFiles.map((session, sessionIndex) => {
                                        const sessionKey = `${course.courseId}_session_${session.sessionNumber || sessionIndex + 1}`;
                                        const isSessionExpanded = expandedSessions.has(sessionKey);
                                        const isDragging = draggedSession === sessionIndex;
                                        
                                        const toggleSession = () => {
                                          const newExpanded = new Set(expandedSessions);
                                          if (isSessionExpanded) {
                                            newExpanded.delete(sessionKey);
                                          } else {
                                            newExpanded.add(sessionKey);
                                          }
                                          setExpandedSessions(newExpanded);
                                        };

                                        const handleDeleteSession = async () => {
                                          const fileTypes = fileViewTab === 'listening' ? 'audio, video, documents' : 
                                                           fileViewTab === 'speaking' ? 'text files, documents' : 
                                                           fileViewTab === 'reading' ? 'documents, text content' : 
                                                           fileViewTab === 'writing' ? 'images, documents, text content' : 
                                                           'files';
                                          if (!window.confirm(`Are you sure you want to delete Session ${session.sessionNumber || sessionIndex + 1}?\n\nThis will permanently delete:\n- All files (${fileTypes})\n- All storage files\n- The entire session record\n\nThis action cannot be undone.`)) {
                                            return;
                                          }

                                          try {
                                            const token = localStorage.getItem('token');
                                            if (fileViewTab === 'listening') {
                                              await deleteListeningSession(session.lsrwId, token);
                                            } else if (fileViewTab === 'speaking') {
                                              await deleteSpeakingSession(session.lsrwId || session.id, token);
                                            } else if (fileViewTab === 'reading') {
                                              await deleteReadingSession(session.lsrwId || session.id, token);
                                            } else if (fileViewTab === 'writing') {
                                              await deleteWritingSession(session.lsrwId || session.id, token);
                                            }
                                            
                                            // Refetch files to update the view
                                            await fetchAllFiles();
                                            
                                            // Show success message
                                            alert('Session deleted successfully!');
                                          } catch (error) {
                                            console.error('Error deleting session:', error);
                                            alert(`Failed to delete session: ${error.message}`);
                                          }
                                        };

                                        return (
                                          <div 
                                            key={sessionKey} 
                                            className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${isDragging ? 'opacity-50' : ''} ${isReordering ? 'pointer-events-none' : ''}`}
                                            draggable={!isReordering}
                                            onDragStart={(e) => handleDragStart(e, sessionIndex)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, sessionIndex)}
                                          >
                                            <div className="flex items-center gap-2">
                                              {/* Drag Handle */}
                                              <div 
                                                className="p-2 cursor-move text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                draggable={false}
                                                title="Drag to reorder"
                                              >
                                                <GripVertical className="w-5 h-5" />
                                              </div>
                                              
                                              {/* Session Button */}
                                              <button
                                                onClick={toggleSession}
                                                className={`flex-1 p-3 sm:p-4 transition-colors flex items-center justify-between gap-2 ${
                                                  fileViewTab === 'listening' ? 'bg-blue-50 hover:bg-blue-100' :
                                                  fileViewTab === 'speaking' ? 'bg-purple-50 hover:bg-purple-100' :
                                                  fileViewTab === 'reading' ? 'bg-green-50 hover:bg-green-100' :
                                                  fileViewTab === 'writing' ? 'bg-orange-50 hover:bg-orange-100' :
                                                  'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                  <div className={`p-1.5 sm:p-2 rounded-lg ${
                                                    activeTabConfig.color === 'blue' ? 'bg-blue-600 text-white' :
                                                    activeTabConfig.color === 'purple' ? 'bg-purple-600 text-white' :
                                                    activeTabConfig.color === 'green' ? 'bg-green-600 text-white' :
                                                    activeTabConfig.color === 'orange' ? 'bg-orange-600 text-white' :
                                                    'bg-gray-200 text-gray-700'
                                                  }`}>
                                                    {fileViewTab === 'listening' ? (
                                                      <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    ) : fileViewTab === 'speaking' ? (
                                                      <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    ) : fileViewTab === 'reading' ? (
                                                      <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    ) : fileViewTab === 'writing' ? (
                                                      <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    ) : (
                                                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    )}
                                                  </div>
                                                  <div className="flex-1 min-w-0 text-left">
                                                    <p className="font-semibold text-sm sm:text-base text-gray-800">
                                                      Session {session.sessionNumber || sessionIndex + 1}
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                      {session.title || (fileViewTab === 'listening' ? 'Listening Material' : fileViewTab === 'speaking' ? 'Speaking Material' : fileViewTab === 'reading' ? 'Reading Material' : 'Writing Task')}
                                                      {session.created_at && ` • ${new Date(session.created_at).toLocaleDateString()}`}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                      {session.files.length} {session.files.length === 1 ? 'file' : 'files'}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                  {isSessionExpanded ? (
                                                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                                  ) : (
                                                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                                  )}
                                                </div>
                                              </button>

                                              {/* Delete Button - For listening, speaking, reading, and writing */}
                                              {(fileViewTab === 'listening' || fileViewTab === 'speaking' || fileViewTab === 'reading' || fileViewTab === 'writing') && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSession();
                                                  }}
                                                  className="p-2 sm:p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                  title="Delete entire session"
                                                >
                                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                              )}
                                            </div>
                                            
                                            {isSessionExpanded && session.files && session.files.length > 0 && (
                                              <div className="p-2 sm:p-3 bg-white space-y-2">
                                                {session.files.map((file, fileIndex) => {
                                                  const fileId = file.lsrw_id || file.id;
                                                  const uniqueKey = `${fileId}_${fileIndex}_${file.file_type}`;
                                                  const bgColor = activeTabConfig.color === 'blue' ? 'bg-blue-50 border-blue-100' :
                                                                 activeTabConfig.color === 'purple' ? 'bg-purple-50 border-purple-100' :
                                                                 activeTabConfig.color === 'green' ? 'bg-green-50 border-green-100' :
                                                                 'bg-orange-50 border-orange-100';
                                                  const iconColor = activeTabConfig.color === 'blue' ? 'text-blue-600' :
                                                                   activeTabConfig.color === 'purple' ? 'text-purple-600' :
                                                                   activeTabConfig.color === 'green' ? 'text-green-600' :
                                                                   'text-orange-600';
                                                  const buttonColor = activeTabConfig.color === 'blue' ? 'text-blue-600 hover:bg-blue-100' :
                                                                     activeTabConfig.color === 'purple' ? 'text-purple-600 hover:bg-purple-100' :
                                                                     activeTabConfig.color === 'green' ? 'text-green-600 hover:bg-green-100' :
                                                                     'text-orange-600 hover:bg-orange-100';
                                                  
                                                  let displayFileName = file.file_url ? getFileName(file.file_url) : '';
                                                  let displayTitle = file.title || 'Untitled';
                                                  
                                                  if (file.file_name) {
                                                    displayTitle = `${file.title || 'Untitled'} - ${file.file_name}`;
                                                  }
                                                  if (file.is_video) {
                                                    displayTitle = `${file.title || 'Untitled'} - ${file.is_external_url ? 'External Video URL' : 'Video File'}`;
                                                  }
                                                  if (!file.file_url) {
                                                    displayFileName = file.is_audio ? 'No audio file' : 
                                                                     file.is_video ? 'No video file' : 
                                                                     (file.is_question_doc ? 'No question document' : 'No files');
                                                  } else if (file.is_external_url) {
                                                    const url = file.file_url;
                                                    displayFileName = url.length > 50 ? url.substring(0, 50) + '...' : url;
                                                  }
                                                  
                                                  const isImageFile = file.file_type === 'image' || 
                                                                     file.is_image === true ||
                                                                     /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url || '');
                                                  const isVideoFile = file.file_type === 'video' || 
                                                                     file.file_type === 'video_url' ||
                                                                     file.is_video === true ||
                                                                     /\.(mp4|mov|webm|ogg|avi)$/i.test(file.file_url || '');
                                                  const isExternalUrl = file.is_external_url || 
                                                                       file.file_type === 'audio_url' || 
                                                                       file.file_type === 'video_url' ||
                                                                       (file.file_url && (file.file_url.startsWith('http://') || file.file_url.startsWith('https://')) && 
                                                                        !file.file_url.includes('supabase') && 
                                                                        !isAudioFile(file.file_url) && 
                                                                        !isPdfFile(file.file_url) &&
                                                                        !isVideoFile);
                                                  const hasFileUrl = file.file_url && (
                                                    isAudioFile(file.file_url) ||
                                                    isPdfFile(file.file_url) ||
                                                    getFileExtension(file.file_url) === 'docx' ||
                                                    getFileExtension(file.file_url) === 'doc' ||
                                                    isImageFile ||
                                                    isVideoFile ||
                                                    isExternalUrl
                                                  );
                                                  const hasTextContent = (
                                                    file.instruction ||
                                                    file.content_text ||
                                                    file.text_content ||
                                                    file.question ||
                                                    file.title ||
                                                    file.passage
                                                  );
                                                  const canPreview = hasFileUrl || hasTextContent;
                                                  
                                                  return (
                                                    <React.Fragment key={uniqueKey}>
                                                      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-3 ${bgColor} rounded-lg border gap-3 sm:gap-0`}>
                                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                          {file.is_question_doc ? (
                                                            <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                          ) : file.is_video || file.file_type === 'video' || file.file_type === 'video_url' ? (
                                                            <svg className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                          ) : (
                                                            <FileAudio className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                          )}
                                                          <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm sm:text-base text-gray-800 truncate">{displayTitle}</p>
                                                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                              {displayFileName}
                                                              {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString()}`}
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                          {canPreview && (
                                                            <button
                                                              onClick={() => {
                                                                if (file.file_url && (isAudioFile(file.file_url) || file.file_type === 'audio' || file.file_type === 'audio_url')) {
                                                                  handlePreview(file.file_url, displayTitle, file.file_type === 'audio_url' ? 'audio_url' : 'audio');
                                                                } else if (file.file_url && (isVideoFile || file.file_type === 'video' || file.file_type === 'video_url')) {
                                                                  handlePreview(file.file_url, displayTitle, file.file_type === 'video_url' ? 'video_url' : 'video');
                                                                } else if (file.file_url && isExternalUrl) {
                                                                  handlePreview(file.file_url, displayTitle, 'external_url');
                                                                } else if (file.file_url) {
                                                                  handlePreview(file.file_url, displayTitle, file.file_type || 'document', file);
                                                                } else if (hasTextContent) {
                                                                  handlePreview(null, displayTitle, 'text', file);
                                                                }
                                                              }}
                                                              className={`p-1.5 sm:p-2 ${buttonColor} rounded-lg transition-colors flex-shrink-0`}
                                                              title="Preview"
                                                            >
                                                              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </button>
                                                          )}
                                                          {file.file_url && (
                                                            <button
                                                              onClick={() => handleDownload(file.file_url, displayTitle)}
                                                              className="p-1.5 sm:p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                                                              title="Download"
                                                            >
                                                              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </button>
                                                          )}
                                                          <button
                                                            onClick={() => handleDelete(fileId, fileViewTab, course.courseId)}
                                                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                                            title="Delete"
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                          </button>
                                                        </div>
                                                      </div>
                                                      
                                                      {playingAudio === file.file_url && (file.file_type === 'audio' || isAudioFile(file.file_url)) && (
                                                        <div className="mt-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                                            <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                                                            <span className="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1">Playing: {displayTitle}</span>
                                                            <button
                                                              onClick={() => setPlayingAudio(null)}
                                                              className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                              title="Close player"
                                                            >
                                                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                                            </button>
                                                          </div>
                                                          <audio 
                                                            controls 
                                                            className="w-full" 
                                                            src={file.file_url}
                                                            autoPlay
                                                            onEnded={() => setPlayingAudio(null)}
                                                          />
                                                        </div>
                                                      )}
                                                    </React.Fragment>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      });
                                    } else {
                                      // Fallback: display files directly (for backward compatibility)
                                      return moduleFiles.map((file, index) => {
                                        const fileId = file.lsrw_id || file.speaking_material_id || file.reading_material_id || file.writing_task_id || file.id;
                                        const uniqueKey = fileViewTab === 'listening' ? `${fileId}_${index}_${file.file_type}` : fileId;
                                        const bgColor = activeTabConfig.color === 'blue' ? 'bg-blue-50 border-blue-100' :
                                                       activeTabConfig.color === 'purple' ? 'bg-purple-50 border-purple-100' :
                                                       activeTabConfig.color === 'green' ? 'bg-green-50 border-green-100' :
                                                       'bg-orange-50 border-orange-100';
                                        const iconColor = activeTabConfig.color === 'blue' ? 'text-blue-600' :
                                                         activeTabConfig.color === 'purple' ? 'text-purple-600' :
                                                         activeTabConfig.color === 'green' ? 'text-green-600' :
                                                         'text-orange-600';
                                        const buttonColor = activeTabConfig.color === 'blue' ? 'text-blue-600 hover:bg-blue-100' :
                                                           activeTabConfig.color === 'purple' ? 'text-purple-600 hover:bg-purple-100' :
                                                           activeTabConfig.color === 'green' ? 'text-green-600 hover:bg-green-100' :
                                                           'text-orange-600 hover:bg-orange-100';
                                        
                                        let displayFileName = file.file_url ? getFileName(file.file_url) : '';
                                        let displayTitle = file.title || 'Untitled';
                                        
                                        if (fileViewTab === 'listening') {
                                          if (file.file_name) {
                                            displayTitle = `${file.title || 'Untitled'} - ${file.file_name}`;
                                          }
                                          if (file.is_video) {
                                            displayTitle = `${file.title || 'Untitled'} - ${file.is_external_url ? 'External Video URL' : 'Video File'}`;
                                          }
                                          if (!file.file_url) {
                                            displayFileName = file.is_audio ? 'No audio file' : 
                                                             file.is_video ? 'No video file' : 
                                                             (file.is_question_doc ? 'No question document' : 'No files');
                                          } else if (file.is_external_url) {
                                            const url = file.file_url;
                                            displayFileName = url.length > 50 ? url.substring(0, 50) + '...' : url;
                                          }
                                        } else if (fileViewTab === 'writing') {
                                          if (file.is_image || file.file_type === 'image') {
                                            displayTitle = `${file.title || 'Untitled'} - Image`;
                                            displayFileName = file.file_url ? getFileName(file.file_url) : 'Image file';
                                          } else if (file.is_document || file.file_type === 'document') {
                                            displayTitle = `${file.title || 'Untitled'} - Document`;
                                            displayFileName = file.file_url ? getFileName(file.file_url) : 'Document file';
                                          } else {
                                            displayFileName = 'Text content only';
                                          }
                                        } else {
                                          if (!file.file_url) {
                                            displayFileName = 'Text content only';
                                          }
                                        }
                                        
                                        const isImageFile = file.file_type === 'image' || 
                                                           file.is_image === true ||
                                                           /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url || '');
                                        const isVideoFile = file.file_type === 'video' || 
                                                           file.file_type === 'video_url' ||
                                                           file.is_video === true ||
                                                           /\.(mp4|mov|webm|ogg|avi)$/i.test(file.file_url || '');
                                        const isExternalUrl = file.is_external_url || 
                                                             file.file_type === 'audio_url' || 
                                                             file.file_type === 'video_url' ||
                                                             (file.file_url && (file.file_url.startsWith('http://') || file.file_url.startsWith('https://')) && 
                                                              !file.file_url.includes('supabase') && 
                                                              !isAudioFile(file.file_url) && 
                                                              !isPdfFile(file.file_url) &&
                                                              !isVideoFile);
                                        const hasFileUrl = file.file_url && (
                                          isAudioFile(file.file_url) ||
                                          isPdfFile(file.file_url) ||
                                          getFileExtension(file.file_url) === 'docx' ||
                                          getFileExtension(file.file_url) === 'doc' ||
                                          isImageFile ||
                                          isVideoFile ||
                                          isExternalUrl
                                        );
                                        const hasTextContent = (
                                          file.instruction ||
                                          file.content_text ||
                                          file.text_content ||
                                          file.question ||
                                          file.title ||
                                          file.passage
                                        );
                                        const canPreview = hasFileUrl || hasTextContent;
                                        
                                        return (
                                          <React.Fragment key={uniqueKey}>
                                            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-3 ${bgColor} rounded-lg border gap-3 sm:gap-0`}>
                                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                {fileViewTab === 'listening' ? (
                                                  file.is_question_doc ? (
                                                    <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                  ) : file.is_video || file.file_type === 'video' || file.file_type === 'video_url' ? (
                                                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                  ) : (
                                                    <FileAudio className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                  )
                                                ) : fileViewTab === 'writing' && (file.is_image || file.file_type === 'image') ? (
                                                  <Image className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                ) : (
                                                  <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-sm sm:text-base text-gray-800 truncate">{displayTitle}</p>
                                                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                    {displayFileName}
                                                    {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString()}`}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                {canPreview && (
                                                  <button
                                                    onClick={() => {
                                                      if (fileViewTab === 'writing' && file.file_url && (file.file_type === 'image' || file.is_image || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url))) {
                                                        handlePreview(file.file_url, displayTitle, 'image', file);
                                                      } else if (file.file_url && (file.file_type === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url))) {
                                                        handlePreview(file.file_url, displayTitle, 'image');
                                                      } else if (file.file_url && (isAudioFile(file.file_url) || file.file_type === 'audio' || file.file_type === 'audio_url')) {
                                                        handlePreview(file.file_url, displayTitle, file.file_type === 'audio_url' ? 'audio_url' : 'audio');
                                                      } else if (file.file_url && (isVideoFile || file.file_type === 'video' || file.file_type === 'video_url')) {
                                                        handlePreview(file.file_url, displayTitle, file.file_type === 'video_url' ? 'video_url' : 'video');
                                                      } else if (file.file_url && isExternalUrl) {
                                                        handlePreview(file.file_url, displayTitle, 'external_url');
                                                      } else if (file.file_url) {
                                                        handlePreview(file.file_url, displayTitle, file.file_type || 'document', file);
                                                      } else if (hasTextContent) {
                                                        handlePreview(null, displayTitle, 'text', file);
                                                      }
                                                    }}
                                                    className={`p-1.5 sm:p-2 ${buttonColor} rounded-lg transition-colors flex-shrink-0`}
                                                    title="Preview"
                                                  >
                                                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                  </button>
                                                )}
                                                {file.file_url && (
                                                  <button
                                                    onClick={() => handleDownload(file.file_url, displayTitle)}
                                                    className="p-1.5 sm:p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                                                    title="Download"
                                                  >
                                                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleDelete(fileId, fileViewTab, course.courseId)}
                                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                                  title="Delete"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </button>
                                              </div>
                                            </div>
                                            
                                            {playingAudio === file.file_url && (file.file_type === 'audio' || isAudioFile(file.file_url)) && (
                                              <div className="mt-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                                  <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                                                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1">Playing: {displayTitle}</span>
                                                  <button
                                                    onClick={() => setPlayingAudio(null)}
                                                    className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                    title="Close player"
                                                  >
                                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                                  </button>
                                                </div>
                                                <audio 
                                                  controls 
                                                  className="w-full" 
                                                  src={file.file_url}
                                                  autoPlay
                                                  onEnded={() => setPlayingAudio(null)}
                                                />
                                              </div>
                                            )}
                                          </React.Fragment>
                                        );
                                      });
                                    }
                                  })()
                                ) : (
                                  // For other tabs, display files directly
                                  moduleFiles.map((file, index) => {
                                    const fileId = file.lsrw_id || file.speaking_material_id || file.reading_material_id || file.writing_task_id || file.id;
                                    const uniqueKey = fileViewTab === 'listening' ? `${fileId}_${index}_${file.file_type}` : fileId;
                                    const bgColor = activeTabConfig.color === 'blue' ? 'bg-blue-50 border-blue-100' :
                                                   activeTabConfig.color === 'purple' ? 'bg-purple-50 border-purple-100' :
                                                   activeTabConfig.color === 'green' ? 'bg-green-50 border-green-100' :
                                                   'bg-orange-50 border-orange-100';
                                    const iconColor = activeTabConfig.color === 'blue' ? 'text-blue-600' :
                                                     activeTabConfig.color === 'purple' ? 'text-purple-600' :
                                                     activeTabConfig.color === 'green' ? 'text-green-600' :
                                                     'text-orange-600';
                                    const buttonColor = activeTabConfig.color === 'blue' ? 'text-blue-600 hover:bg-blue-100' :
                                                       activeTabConfig.color === 'purple' ? 'text-purple-600 hover:bg-purple-100' :
                                                       activeTabConfig.color === 'green' ? 'text-green-600 hover:bg-green-100' :
                                                       'text-orange-600 hover:bg-orange-100';
                                    
                                    let displayFileName = file.file_url ? getFileName(file.file_url) : '';
                                    let displayTitle = file.title || 'Untitled';
                                    
                                    if (fileViewTab === 'listening') {
                                      if (file.file_name) {
                                        displayTitle = `${file.title || 'Untitled'} - ${file.file_name}`;
                                      }
                                      if (file.is_video) {
                                        displayTitle = `${file.title || 'Untitled'} - ${file.is_external_url ? 'External Video URL' : 'Video File'}`;
                                      }
                                      if (!file.file_url) {
                                        displayFileName = file.is_audio ? 'No audio file' : 
                                                         file.is_video ? 'No video file' : 
                                                         (file.is_question_doc ? 'No question document' : 'No files');
                                      } else if (file.is_external_url) {
                                        const url = file.file_url;
                                        displayFileName = url.length > 50 ? url.substring(0, 50) + '...' : url;
                                      }
                                    } else if (fileViewTab === 'writing') {
                                      if (file.is_image || file.file_type === 'image') {
                                        displayTitle = `${file.title || 'Untitled'} - Image`;
                                        displayFileName = file.file_url ? getFileName(file.file_url) : 'Image file';
                                      } else if (file.is_document || file.file_type === 'document') {
                                        displayTitle = `${file.title || 'Untitled'} - Document`;
                                        displayFileName = file.file_url ? getFileName(file.file_url) : 'Document file';
                                      } else {
                                        displayFileName = 'Text content only';
                                      }
                                    } else {
                                      if (!file.file_url) {
                                        displayFileName = 'Text content only';
                                      }
                                    }
                                    
                                    const isImageFile = file.file_type === 'image' || 
                                                       file.is_image === true ||
                                                       /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url || '');
                                    const isVideoFile = file.file_type === 'video' || 
                                                       file.file_type === 'video_url' ||
                                                       file.is_video === true ||
                                                       /\.(mp4|mov|webm|ogg|avi)$/i.test(file.file_url || '');
                                    const isExternalUrl = file.is_external_url || 
                                                         file.file_type === 'audio_url' || 
                                                         file.file_type === 'video_url' ||
                                                         (file.file_url && (file.file_url.startsWith('http://') || file.file_url.startsWith('https://')) && 
                                                          !file.file_url.includes('supabase') && 
                                                          !isAudioFile(file.file_url) && 
                                                          !isPdfFile(file.file_url) &&
                                                          !isVideoFile);
                                    const hasFileUrl = file.file_url && (
                                      isAudioFile(file.file_url) ||
                                      isPdfFile(file.file_url) ||
                                      getFileExtension(file.file_url) === 'docx' ||
                                      getFileExtension(file.file_url) === 'doc' ||
                                      isImageFile ||
                                      isVideoFile ||
                                      isExternalUrl
                                    );
                                    const hasTextContent = (
                                      file.instruction ||
                                      file.content_text ||
                                      file.text_content ||
                                      file.question ||
                                      file.title ||
                                      file.passage
                                    );
                                    const canPreview = hasFileUrl || hasTextContent;
                                    
                                    return (
                                      <React.Fragment key={uniqueKey}>
                                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-3 ${bgColor} rounded-lg border gap-3 sm:gap-0`}>
                                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                            {fileViewTab === 'listening' ? (
                                              file.is_question_doc ? (
                                                <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                              ) : file.is_video || file.file_type === 'video' || file.file_type === 'video_url' ? (
                                                <svg className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                              ) : (
                                                <FileAudio className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                              )
                                            ) : fileViewTab === 'writing' && (file.is_image || file.file_type === 'image') ? (
                                              <Image className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                            ) : (
                                              <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm sm:text-base text-gray-800 truncate">{displayTitle}</p>
                                              <p className="text-xs sm:text-sm text-gray-600 truncate">
                                                {displayFileName}
                                                {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString()}`}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                            {canPreview && (
                                              <button
                                                onClick={() => {
                                                  if (fileViewTab === 'writing' && file.file_url && (file.file_type === 'image' || file.is_image || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url))) {
                                                    handlePreview(file.file_url, displayTitle, 'image', file);
                                                  } else if (file.file_url && (file.file_type === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.file_url))) {
                                                    handlePreview(file.file_url, displayTitle, 'image');
                                                  } else if (file.file_url && (isAudioFile(file.file_url) || file.file_type === 'audio' || file.file_type === 'audio_url')) {
                                                    handlePreview(file.file_url, displayTitle, file.file_type === 'audio_url' ? 'audio_url' : 'audio');
                                                  } else if (file.file_url && (isVideoFile || file.file_type === 'video' || file.file_type === 'video_url')) {
                                                    handlePreview(file.file_url, displayTitle, file.file_type === 'video_url' ? 'video_url' : 'video');
                                                  } else if (file.file_url && isExternalUrl) {
                                                    handlePreview(file.file_url, displayTitle, 'external_url');
                                                  } else if (file.file_url) {
                                                    handlePreview(file.file_url, displayTitle, file.file_type || 'document', file);
                                                  } else if (hasTextContent) {
                                                    handlePreview(null, displayTitle, 'text', file);
                                                  }
                                                }}
                                                className={`p-1.5 sm:p-2 ${buttonColor} rounded-lg transition-colors flex-shrink-0`}
                                                title="Preview"
                                              >
                                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </button>
                                            )}
                                            {file.file_url && (
                                              <button
                                                onClick={() => handleDownload(file.file_url, displayTitle)}
                                                className="p-1.5 sm:p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                                                title="Download"
                                              >
                                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDelete(fileId, fileViewTab, course.courseId)}
                                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {playingAudio === file.file_url && (file.file_type === 'audio' || isAudioFile(file.file_url)) && (
                                          <div className="mt-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                                              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate flex-1">Playing: {displayTitle}</span>
                                              <button
                                                onClick={() => setPlayingAudio(null)}
                                                className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                title="Close player"
                                              >
                                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                              </button>
                                            </div>
                                            <audio 
                                              controls 
                                              className="w-full" 
                                              src={file.file_url}
                                              autoPlay
                                              onEnded={() => setPlayingAudio(null)}
                                            />
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  })
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">No {lsrwTabs.find(t => t.id === fileViewTab)?.name || 'files'} found for this course</p>
                                <p className="text-sm text-gray-500 mt-1">Upload {lsrwTabs.find(t => t.id === fileViewTab)?.name || 'files'} using the LSRW Upload menu</p>
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
                                            {q.optionA && <div className="text-sm text-gray-600"><span className="font-medium">A)</span> {q.optionA}</div>}
                                            {q.optionB && <div className="text-sm text-gray-600"><span className="font-medium">B)</span> {q.optionB}</div>}
                                            {q.optionC && <div className="text-sm text-gray-600"><span className="font-medium">C)</span> {q.optionC}</div>}
                                            {q.optionD && <div className="text-sm text-gray-600"><span className="font-medium">D)</span> {q.optionD}</div>}
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
                      <div className="max-w-4xl mx-auto space-y-4">
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4">Image</h4>
                          <div className="flex items-center justify-center">
                            <img 
                              src={previewFile.url} 
                              alt={previewFile.name || 'Writing task image'} 
                              className="max-w-full h-auto rounded-lg shadow-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div style={{ display: 'none' }} className="text-center py-8">
                              <p className="text-gray-600">Failed to load image</p>
                            </div>
                          </div>
                        </div>
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
                    ) : previewFile.type === 'video' || previewFile.type === 'video_url' ? (
                      <div className="flex items-center justify-center w-full h-full">
                        {previewFile.url && (previewFile.url.includes('youtube.com') || previewFile.url.includes('vimeo.com')) ? (
                          <div className="w-full max-w-4xl">
                            {(() => {
                              // Convert YouTube/Vimeo URL to embed format
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
                                <iframe
                                  src={getEmbedUrl(previewFile.url)}
                                  className="w-full aspect-video rounded-lg"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={previewFile.name}
                                />
                              );
                            })()}
                          </div>
                        ) : (
                          <video controls className="w-full max-w-4xl rounded-lg" src={previewFile.url} />
                        )}
                      </div>
                    ) : previewFile.type === 'external_url' ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center max-w-2xl">
                          <ExternalLink className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-4">External Media URL</p>
                          <a
                            href={previewFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 underline break-all"
                          >
                            {previewFile.url}
                          </a>
                          <p className="text-sm text-gray-500 mt-4">Click the link above to open in a new tab</p>
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
                    ) : (
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">Preview not available for this file type</p>
                          {previewFile.url && (
                            <a
                              href={previewFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 underline"
                            >
                              Open in new tab
                            </a>
                          )}
                        </div>
                      </div>
                    )}
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

