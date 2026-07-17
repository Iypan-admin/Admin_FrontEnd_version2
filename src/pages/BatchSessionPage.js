import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, BookOpen, AlertCircle, ArrowLeft, Edit, Trash2, Save, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getBatches, getBatchById, getGMeetsByBatch, createGMeet, updateGMeet, deleteGMeet } from '../services/Api';

function BatchSessionPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [savingSession, setSavingSession] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null); // session_number or null
  const [cancelReason, setCancelReason] = useState('');

  // Fetch all batches
  useEffect(() => {
    if (!batchId) {
      fetchBatches();
    }
  }, [batchId]);

  // Fetch selected batch details and sessions
  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await getBatches(token);

      if (response?.success && Array.isArray(response.data)) {
        // Filter only started batches (or all if you want to see all)
        setBatches(response.data);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      setError('Failed to load batches: ' + error.message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await getBatchById(token, batchId);
      if (response && response.success && response.data) {
        console.log('Batch details fetched:', response.data);
        console.log('Total sessions:', response.data.total_sessions);
        setSelectedBatch(response.data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      setError('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await getGMeetsByBatch(batchId, token);

      // If batch has total_sessions, organize by session_number
      if (selectedBatch && selectedBatch.total_sessions) {
        const sessionsMap = {};
        // Initialize all sessions
        for (let i = 1; i <= selectedBatch.total_sessions; i++) {
          sessionsMap[i] = null;
        }
        // Fill in existing sessions
        response.forEach(session => {
          if (session.session_number) {
            sessionsMap[session.session_number] = session;
          }
        });
        // Convert to array
        const sessionsArray = [];
        for (let i = 1; i <= selectedBatch.total_sessions; i++) {
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
        const sortedSessions = response
          .sort((a, b) => {
            if (a.session_number && b.session_number) {
              return a.session_number - b.session_number;
            }
            if (a.date && b.date) {
              return new Date(a.date) - new Date(b.date);
            }
            return 0;
          })
          .map((session, index) => ({
            session_number: session.session_number || index + 1,
            ...session
          }));
        setSessions(sortedSessions);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [batchId, selectedBatch]);

  useEffect(() => {
    if (selectedBatch) {
      fetchSessions();
    }
  }, [selectedBatch, fetchSessions]);

  const handleBatchClick = (batchId) => {
    navigate(`/academic/batch-sessions/${batchId}`);
  };

  const handleBack = () => {
    navigate('/academic/batch-sessions');
    setSelectedBatch(null);
    setSessions([]);
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

  const handleSessionEdit = (sessionNumber) => {
    setEditingSession(sessionNumber);
  };

  const handleSessionSave = async (sessionNumber) => {
    try {
      setSavingSession(sessionNumber);
      const token = localStorage.getItem('token');
      const session = sessions.find(s => s.session_number === sessionNumber);
      
      if (!session || !session.meet_id) {
        // Create new session
        const newSession = {
          batch_id: batchId,
          session_number: sessionNumber,
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: session.status || 'Scheduled',
          cancellation_reason: session.cancellation_reason || null,
          current: false
        };
        await createGMeet(newSession, token);
      } else {
        // Update existing session
        const updates = {
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: session.status || 'Scheduled',
          cancellation_reason: session.cancellation_reason || null
        };
        await updateGMeet(session.meet_id, updates, token);
      }
      
      setEditingSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session: ' + error.message);
    } finally {
      setSavingSession(null);
    }
  };

  const handleSessionCancel = () => {
    setEditingSession(null);
    fetchSessions(); // Reload to reset changes
  };

  const handleSessionChange = (sessionNumber, field, value) => {
    setSessions(prev => prev.map(s => 
      s.session_number === sessionNumber 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const handleStatusChange = async (sessionNumber, newStatus) => {
    if (newStatus === 'Cancelled') {
      setShowCancelModal(sessionNumber);
      setCancelReason('');
      return;
    }
    
    await updateSessionStatus(sessionNumber, newStatus, null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }
    
    await updateSessionStatus(showCancelModal, 'Cancelled', cancelReason);
    setShowCancelModal(null);
    setCancelReason('');
  };

  const updateSessionStatus = async (sessionNumber, status, cancellationReason) => {
    try {
      const token = localStorage.getItem('token');
      const session = sessions.find(s => s.session_number === sessionNumber);
      
      if (!session || !session.meet_id) {
        // If no meet_id, create session first
        const newSession = {
          batch_id: batchId,
          session_number: sessionNumber,
          title: session.title || `Session ${sessionNumber}`,
          date: session.date || null,
          time: session.time || null,
          meet_link: session.meet_link || null,
          note: session.note || null,
          status: status,
          cancellation_reason: cancellationReason || null,
          current: false
        };
        const result = await createGMeet(newSession, token);
        if (result && result.data && result.data[0]) {
          setSessions(prev => prev.map(s => 
            s.session_number === sessionNumber 
              ? { ...s, meet_id: result.data[0].meet_id, status, cancellation_reason: cancellationReason }
              : s
          ));
        }
      } else {
        // Update existing session
        const updates = {
          status: status,
          cancellation_reason: cancellationReason || null
        };
        await updateGMeet(session.meet_id, updates, token);
        setSessions(prev => prev.map(s => 
          s.session_number === sessionNumber 
            ? { ...s, status, cancellation_reason: cancellationReason }
            : s
        ));
      }
      
      fetchSessions();
    } catch (error) {
      console.error('Error updating session status:', error);
      alert('Failed to update session status: ' + error.message);
    }
  };

  const handleDeleteSession = async (meetId) => {
    if (!meetId) return;
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const token = localStorage.getItem('token');
        await deleteGMeet(meetId, token);
        fetchSessions();
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session: ' + error.message);
      }
    }
  };

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
        }
      }

      // Refresh sessions from backend
      await fetchSessions();

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
    for (let i = 1; i <= (selectedBatch?.total_sessions || sessions.length); i++) {
      rows += `${i},Session ${i}\n`;
    }
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session_titles_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredBatches = batches.filter((batch) => {
    const query = searchTerm.toLowerCase();
    return (
      batch.batch_name?.toLowerCase().includes(query) ||
      batch.course_name?.toLowerCase().includes(query) ||
      batch.teacher_name?.toLowerCase().includes(query) ||
      batch.center_name?.toLowerCase().includes(query) ||
      batch.status?.toLowerCase().includes(query)
    );
  });

  // If batchId is in URL, show sessions view
  if (batchId && selectedBatch) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex overflow-hidden">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                {/* Header with Back Button */}
                <div className="mb-4 sm:mb-6">
                  <button
                    onClick={handleBack}
                    className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Batches
                  </button>
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Batch Sessions
                      </h1>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">
                        {selectedBatch.batch_name} - View Sessions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sessions Table */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Session Management</h2>
                      <p className="text-sm text-gray-600">
                        Total Sessions: {selectedBatch?.total_sessions !== null && selectedBatch?.total_sessions !== undefined ? selectedBatch.total_sessions : sessions.length || '-'}
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

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading sessions...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google Meet Link</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sessions.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                No sessions found. {selectedBatch?.total_sessions ? `Expected ${selectedBatch.total_sessions} sessions.` : 'No sessions created yet.'}
                              </td>
                            </tr>
                          ) : (
                            sessions.map((session) => {
                              const isEditing = editingSession === session.session_number;
                              const isSaving = savingSession === session.session_number;
                              const sessionStatus = session.status || 'Scheduled';
                              const isCancelled = sessionStatus === 'Cancelled';
                              const isCompleted = sessionStatus === 'Completed';
                              
                              return (
                                <tr key={session.session_number || session.meet_id} className="hover:bg-gray-50">
                                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {session.session_number}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                      <input
                                        type="date"
                                        value={session.date || ''}
                                        onChange={(e) => handleSessionChange(session.session_number, 'date', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    ) : (
                                      session.date ? formatDate(session.date) : '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                      <input
                                        type="time"
                                        value={session.time || ''}
                                        onChange={(e) => handleSessionChange(session.session_number, 'time', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    ) : (
                                      session.time ? formatTime(session.time) : '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-500">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={session.title || ''}
                                        onChange={(e) => handleSessionChange(session.session_number, 'title', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    ) : (
                                      session.title || '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-500">
                                    {isEditing ? (
                                      <input
                                        type="url"
                                        value={session.meet_link || ''}
                                        onChange={(e) => handleSessionChange(session.session_number, 'meet_link', e.target.value)}
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    ) : session.meet_link ? (
                                      <a href={session.meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                        <Video className="w-4 h-4 mr-1" /> Join
                                      </a>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-500">
                                    {isEditing ? (
                                      <textarea
                                        value={session.note || ''}
                                        onChange={(e) => handleSessionChange(session.session_number, 'note', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                        rows="2"
                                      />
                                    ) : (
                                      session.note || '-'
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    {isEditing ? (
                                      <select
                                        value={sessionStatus}
                                        onChange={(e) => handleStatusChange(session.session_number, e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                      </select>
                                    ) : (
                                      <div className="flex flex-col">
                                        <span
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            isCompleted
                                              ? 'bg-green-100 text-green-800'
                                              : isCancelled
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-blue-100 text-blue-800'
                                          }`}
                                        >
                                          {sessionStatus}
                                        </span>
                                        {isCancelled && session.cancellation_reason && (
                                          <span
                                            className="mt-1 text-xs text-gray-600 truncate max-w-xs"
                                            title={session.cancellation_reason}
                                          >
                                            {session.cancellation_reason}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isEditing ? (
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => handleSessionSave(session.session_number)}
                                          disabled={isSaving}
                                          className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center"
                                          title="Save"
                                        >
                                          {isSaving ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                          ) : (
                                            <Save className="w-4 h-4" />
                                          )}
                                        </button>
                                        <button
                                          onClick={handleSessionCancel}
                                          className="text-gray-600 hover:text-gray-900 flex items-center"
                                          title="Cancel"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => handleSessionEdit(session.session_number)}
                                          className="text-blue-600 hover:text-blue-900 flex items-center"
                                          title="Edit"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
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
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show batches list view
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Batch Session
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage batch sessions</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search batches by name, course, teacher, or center..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Batches Table */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading batches...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sessions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBatches.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                              No batches found.
                            </td>
                          </tr>
                        ) : (
                          filteredBatches.map((batch) => (
                            <tr key={batch.batch_id} className="hover:bg-gray-50 cursor-pointer">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {batch.batch_name}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {batch.course_name || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {batch.teacher_name || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {batch.center_name || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  batch.status === 'Started' ? 'bg-green-100 text-green-800' :
                                  batch.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                                  batch.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {batch.status || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {batch.total_sessions || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleBatchClick(batch.batch_id)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View Sessions
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Session {showCancelModal}</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for cancellation:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows="4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchSessionPage;

