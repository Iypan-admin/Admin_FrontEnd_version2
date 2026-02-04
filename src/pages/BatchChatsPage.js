import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TeacherNotificationBell from '../components/TeacherNotificationBell';
import { createChatMessage, fetchChatMessages, deleteChatMessage, updateChatMessage, getBatchById, getTeacherBatchStudents, getMyTutorInfo } from '../services/Api';
import { MessageCircle, Send, Edit3, Trash2, Clock, User, Search, Users } from 'lucide-react';

function BatchChatsPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); // null = batch chat, student_id = individual chat
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false); // For mobile chat options sidebar
  const [tutorInfo, setTutorInfo] = useState(null);

  // Get full name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name - ONLY show full name, never username
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    if (tutorInfo?.full_name && tutorInfo.full_name.trim() !== '') {
      return tutorInfo.full_name;
    }
    return "Teacher";
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Mobile only (< 768px), tablet/desktop >= 768px
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
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Fetch tutor info
  useEffect(() => {
    const fetchTutorInfo = async () => {
      try {
        const data = await getMyTutorInfo();
        setTutorInfo(data);
      } catch (error) {
        console.error("Failed to fetch tutor info:", error);
      }
    };
    fetchTutorInfo();
  }, []);

  // Fetch batch details
  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getBatchById(token, batchId);
        if (response && response.success && response.data) {
          setBatch(response.data);
        }
      } catch (error) {
        console.error('Error fetching batch details:', error);
      }
    };
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  // Fetch students in batch
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getTeacherBatchStudents(batchId, token);
        if (response && response.success && response.data) {
          setStudents(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    if (batchId) {
      fetchStudents();
    }
  }, [batchId]);

  // Fetch messages when component mounts or selected student changes
  useEffect(() => {
    const loadMessages = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
        setLoading(true);
        }
        
        const data = await fetchChatMessages(batchId, selectedStudent || null);
        setMessages(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load chat messages');
      } finally {
        if (isInitialLoad) {
        setLoading(false);
        }
      }
    };

    if (batchId) {
      // Initial load with loading state
      loadMessages(true);
      
      // Set up polling for real-time updates every 5 seconds (without loading state)
      const interval = setInterval(() => {
        loadMessages(false);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [batchId, selectedStudent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // Get user_id from token
      const token = localStorage.getItem("token");
      const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
      const userId = decodedToken?.id || null;

      const chatData = {
        text: message.trim(),
        batch_id: batchId,
        sender: 'teacher',
        user_id: userId,
        recipient_id: selectedStudent || null // null for batch-wide, student_id for individual
      };

      const response = await createChatMessage(chatData);
      
      // Clear input first
      setMessage('');
      
      // Add the new message to the messages array immediately
      if (response && response.success && response.data) {
        setMessages(prevMessages => [...prevMessages, response.data]);
      }
      
      // Then fetch all messages to ensure synchronization
      const updatedMessages = await fetchChatMessages(batchId, selectedStudent || null);
      setMessages(updatedMessages);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await deleteChatMessage(messageId);

      // Check for the 'message' property instead of 'success'
      if (response && response.message) {
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      } else {
        throw new Error(response.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const handleEditClick = (msg) => {
    setEditingMessage(msg.id);
    setEditText(msg.text);
  };

  const handleEditSubmit = async (messageId) => {
    if (!editText.trim()) return;
    
    try {
      const updateData = {
        text: editText.trim(),
        batch_id: batchId
      };
      
      await updateChatMessage(messageId, updateData);
      
      // Update local messages state
      setMessages(messages.map(msg => 
        msg.id === messageId ? {...msg, text: editText.trim()} : msg
      ));
      
      // Exit edit mode
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error('Error updating message:', err);
      alert('Failed to update message');
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.registration_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && messages.length === 0 && !batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 mx-auto" style={{ borderColor: '#e3f2fd', borderTopColor: '#2196f3' }}></div>
              <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Chat...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-gray-50 flex w-full">
      <Navbar />
      <div className="flex-1 overflow-y-auto transition-all duration-300 bg-gray-50" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
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
                    Batch Chat
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {selectedStudent 
                      ? `Chatting with ${students.find(s => s.student_id === selectedStudent)?.name || 'Student'}`
                      : 'Communicate with your batch students'
                    }
                  </p>
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
                            <span className="text-sm text-gray-700">Account Settings</span>
                          </button>
                          <button
                            onClick={() => {
                              navigate('/teacher');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-sm text-gray-700">Dashboard</span>
                          </button>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              localStorage.removeItem('token');
                              window.dispatchEvent(new Event('storage'));
                              navigate('/');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium">Logout</span>
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

        {/* Main Chat Layout - BERRY Style */}
        <div className="flex h-[calc(100vh-80px)] relative overflow-hidden">
          {/* Mobile Overlay */}
          {isMobile && isChatSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsChatSidebarOpen(false)}
            />
          )}

          {/* Left Sidebar - Batch Info & Students */}
          <div className={`${isMobile ? 'fixed' : 'relative'} ${isMobile ? (isChatSidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''} md:translate-x-0 md:relative md:z-auto w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 h-full`}>
            {/* Batch Info Section */}
            <div className="p-4 border-b border-gray-200 relative">
              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={() => setIsChatSidebarOpen(false)}
                  className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-800 truncate">{batch?.batch_name || 'Batch'}</h2>
                  <p className="text-sm text-gray-500">{students.length} {students.length === 1 ? 'Student' : 'Students'}</p>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {/* Batch Chat Option */}
              <div
                onClick={() => {
                  setSelectedStudent(null);
                  if (isMobile) setIsChatSidebarOpen(false);
                }}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 ${
                  selectedStudent === null
                    ? 'bg-blue-50 border-l-4' 
                    : 'hover:bg-gray-50'
                }`}
                style={selectedStudent === null ? { borderLeftColor: '#2196f3' } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedStudent === null
                      ? 'shadow-md'
                      : ''
                  }`} style={selectedStudent === null ? { background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' } : { backgroundColor: '#e3f2fd' }}>
                    <Users className={`w-5 h-5 ${selectedStudent === null ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedStudent === null ? 'text-blue-700' : 'text-gray-800'}`}>
                      Batch Chat
                    </p>
                    <p className="text-xs text-gray-500">All students</p>
                  </div>
                  </div>
                </div>
                
              {/* Students List */}
              <div className="px-2 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">Students</p>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchQuery ? 'No students found' : 'No students in this batch'}
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.student_id}
                      onClick={() => {
                        setSelectedStudent(student.student_id);
                        if (isMobile) setIsChatSidebarOpen(false);
                      }}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-1 ${
                        selectedStudent === student.student_id
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          selectedStudent === student.student_id
                            ? 'shadow-md'
                            : ''
                        }`} style={selectedStudent === student.student_id 
                          ? { background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }
                          : { backgroundColor: '#e3f2fd', color: '#2196f3' }
                        }>
                          {student.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            selectedStudent === student.student_id ? 'text-blue-700' : 'text-gray-800'
                          }`}>
                            {student.name || 'Student'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.registration_number || ''}
                          </p>
                      </div>
                        {selectedStudent === student.student_id && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2196f3' }}></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Chat Messages */}
          <div className="flex-1 flex flex-col bg-gray-50 relative min-w-0 overflow-hidden">
            {/* Mobile Chat Options Toggle Button */}
            {isMobile && (
              <button
                onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
                className="md:hidden fixed top-20 left-4 z-30 p-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}
                title="Chat Options"
              >
                <Users className="w-5 h-5 text-white" />
              </button>
            )}

            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

                {/* Chat Messages Area */}
            <div className={`flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${isMobile ? 'pt-20' : ''}`}>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                    <MessageCircle className="w-10 h-10" style={{ color: '#2196f3' }} />
                      </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {selectedStudent ? 'No messages yet' : 'No Messages Yet'}
                  </h4>
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    {selectedStudent 
                      ? `Start a conversation with ${students.find(s => s.student_id === selectedStudent)?.name || 'this student'}`
                      : 'Start the conversation by sending your first message to the batch'
                    }
                      </p>
                    </div>
                  ) : (
                <div className="space-y-4">
                      {messages.map((msg, index) => (
                        <div 
                          key={msg.id}
                      className={`flex ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}
                        >
                      <div className={`max-w-[75%] rounded-xl p-4 shadow-sm ${
                            msg.sender === 'teacher' 
                          ? 'text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`} style={msg.sender === 'teacher' ? { backgroundColor: '#2196f3' } : {}}>
                            {editingMessage === msg.id ? (
                              <div className="flex flex-col space-y-3">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none text-sm"
                                  rows="3"
                                  placeholder="Edit your message..."
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => setEditingMessage(null)}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors text-sm font-medium"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditSubmit(msg.id)}
                                className="px-4 py-2 rounded-lg text-white hover:shadow-md transition-all text-sm font-medium"
                                style={{ backgroundColor: '#4caf50' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#4caf50'}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start space-x-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    msg.sender === 'teacher' 
                                      ? 'bg-white/20' 
                                  : 'bg-blue-50'
                                  }`}>
                                <User className={`w-4 h-4 ${msg.sender === 'teacher' ? 'text-white' : 'text-blue-600'}`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm sm:text-base leading-relaxed break-words">{msg.text}</p>
                                <div className="flex items-center mt-2">
                                      <span className={`text-xs flex items-center space-x-1 ${
                                        msg.sender === 'teacher' 
                                          ? 'text-white/70' 
                                          : 'text-gray-500'
                                      }`}>
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(msg.created_at || msg.timestamp).toLocaleTimeString()}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action buttons for teacher's messages */}
                                {msg.sender === 'teacher' && !editingMessage && (
                                  <div className="flex mt-3 justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditClick(msg)}
                                  className="px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center space-x-1"
                                  style={msg.sender === 'teacher' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: '#e3f2fd', color: '#2196f3' }}
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                  className="px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center space-x-1"
                                  style={msg.sender === 'teacher' ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' } : { backgroundColor: '#ffebee', color: '#f44336' }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

            {/* Message Input Area - BERRY Style */}
            <div className="border-t border-gray-200 p-4 bg-white">
                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-grow relative">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    placeholder={selectedStudent ? "Type a message..." : "Type a message to all students..."}
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <MessageCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!message.trim()}
                  className={`px-6 py-3 rounded-lg font-medium transition-all text-sm flex items-center space-x-2 ${
                        message.trim() 
                      ? 'text-white shadow-md hover:shadow-lg'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                  style={message.trim() ? { backgroundColor: '#2196f3' } : {}}
                  onMouseEnter={(e) => {
                    if (message.trim()) e.target.style.backgroundColor = '#1976d2';
                  }}
                  onMouseLeave={(e) => {
                    if (message.trim()) e.target.style.backgroundColor = '#2196f3';
                  }}
                    >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                    </button>
                  </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchChatsPage;
