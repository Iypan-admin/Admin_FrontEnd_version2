import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useParams } from 'react-router-dom';
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, Plus, Save, Eye, User } from 'lucide-react';
import { 
    getBatchForAttendance, 
    getBatchAttendanceData, 
    getSessionAttendanceRecords, 
    createAttendanceSession, 
    bulkUpdateAttendanceRecords 
} from '../services/Api';

const TeacherAttendancePage = () => {
    const { batchId } = useParams();
    const [batch, setBatch] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Get today's date in YYYY-MM-DD format for minimum date restriction
    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const today = getTodayDate();

    // Create session form state
    const [newSession, setNewSession] = useState({
        session_date: getTodayDate(),
        notes: ''
    });

    // Attendance marking state
    const [localRecords, setLocalRecords] = useState([]);

    useEffect(() => {
        if (batchId) {
            fetchBatchDetails();
            fetchAttendanceData();
        }
    }, [batchId]);

    const fetchBatchDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await getBatchForAttendance(batchId, token);
            
            // Handle response structure: { success: true, data: {...} } or direct data
            const batchData = response.success ? response.data : response;
            
            if (batchData && batchData.batch_id) {
                setBatch(batchData);
            } else {
                throw new Error(response.error || 'Failed to fetch batch details');
            }
        } catch (err) {
            console.error('Error fetching batch details:', err);
            if (err.message.includes('403') || err.message.includes('Forbidden')) {
                setError('You are not authorized to access this batch. Please contact your administrator.');
            } else {
                setError(err.message);
            }
        }
    };

    const fetchAttendanceData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const data = await getBatchAttendanceData(batchId, token);
            
            if (data.success) {
                setSessions(data.data.sessions);
            } else {
                throw new Error(data.error || 'Failed to fetch attendance data');
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            if (err.message.includes('403') || err.message.includes('Forbidden')) {
                setError('You are not authorized to view attendance for this batch. Please contact your administrator.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionRecords = async (sessionId) => {
        try {
            const token = localStorage.getItem('token');
            const data = await getSessionAttendanceRecords(batchId, sessionId, token);
            
            if (data.success) {
                console.log('🔍 Selected session:', data.session);
                console.log('🔍 Session records:', data.records);
                setAttendanceRecords(data.records);
                setLocalRecords(data.records.map(record => ({ ...record })));
                setSelectedSession(data.session);
            } else {
                throw new Error(data.error || 'Failed to fetch session records');
            }
        } catch (err) {
            console.error('Error fetching session records:', err);
            setError(err.message);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const sessionData = {
                batch_id: batchId,
                session_date: newSession.session_date,
                notes: newSession.notes
            };
            
            const data = await createAttendanceSession(sessionData, token);
            
            if (data.success) {
                alert('Session created successfully!');
                setShowCreateModal(false);
                setNewSession({ session_date: getTodayDate(), notes: '' });
                fetchAttendanceData();
            } else {
                throw new Error(data.error || 'Failed to create session');
            }
        } catch (err) {
            console.error('Error creating session:', err);
            setError(err.message);
        }
    };

    const handleStatusChange = (recordId, newStatus) => {
        setLocalRecords(prev => 
            prev.map(record => 
                record.id === recordId 
                    ? { ...record, status: newStatus }
                    : record
            )
        );
        setUnsavedChanges(true);
    };

    const handleSaveAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            
            const data = await bulkUpdateAttendanceRecords(localRecords, token);
            
            if (data.success) {
                alert(data.message);
                setUnsavedChanges(false);
                fetchSessionRecords(selectedSession.id);
            } else {
                throw new Error(data.error || 'Failed to save attendance');
            }
        } catch (err) {
            console.error('Error saving attendance:', err);
            setError(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return 'bg-green-100 text-green-800 border-green-200';
            case 'absent': return 'bg-red-100 text-red-800 border-red-200';
            case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircle className="w-4 h-4" />;
            case 'absent': return <XCircle className="w-4 h-4" />;
            case 'late': return <Clock className="w-4 h-4" />;
            case 'excused': return <AlertCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
                <Navbar />
                <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
                        <div className="mt-16 lg:mt-0">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                                    </div>
                                    <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Attendance Data</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
                <Navbar />
                <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
                        <div className="mt-16 lg:mt-0">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center py-20">
                                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                        <AlertCircle className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h3>
                                    <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
            <Navbar />
            <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
                    <div className="mt-16 lg:mt-0">
                        <div className="max-w-7xl mx-auto">
                            {/* Enhanced Header */}
                            <div className="mb-6 sm:mb-8">
                                <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
                                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                            Attendance Management
                                        </h1>
                                        <p className="text-sm sm:text-base text-gray-600 mt-1">
                                            {batch?.batch_name} - {batch?.courses?.course_name}
                                        </p>
                                    </div>
                                </div>
                                
                                {batch?.status !== 'Started' && (
                                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-yellow-100 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-yellow-800">Batch Not Started</h4>
                                                <p className="text-sm text-yellow-700">
                                                    Ask Academic Admin to start the batch to enable attendance tracking.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Create Session Button */}
                            {batch?.status === 'Started' && (
                                <div className="mb-4 sm:mb-6">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="group inline-flex items-center px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                    >
                                        <div className="p-1 bg-white/20 rounded-lg mr-3 group-hover:bg-white/30 transition-colors">
                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <span className="text-sm sm:text-base">Create New Session</span>
                                    </button>
                                </div>
                            )}

                            {/* Enhanced Sessions List */}
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-white/20">
                                <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                    <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Class Sessions</h2>
                                        <p className="text-sm text-gray-600">Manage attendance for each session</p>
                                    </div>
                                </div>
                                
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 sm:py-12">
                                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                                            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                        </div>
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Sessions Created</h4>
                                        <p className="text-gray-500 text-sm sm:text-base">Create your first session to start tracking attendance</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {sessions.map((session, index) => (
                                            <div
                                                key={session.id}
                                                className="group bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-200/50 hover:border-blue-300/50 transition-all duration-200 hover:shadow-md cursor-pointer"
                                                onClick={() => {
                                                    fetchSessionRecords(session.id);
                                                    setShowSessionModal(true);
                                                }}
                                                style={{ animationDelay: `${index * 100}ms` }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                                        <div className="p-2 sm:p-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex-shrink-0">
                                                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">
                                                                {new Date(session.session_date).toLocaleDateString()}
                                                            </h3>
                                                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                                                Created by {session.created_by_name}
                                                            </p>
                                                            {session.notes && (
                                                                <p className="text-xs sm:text-sm text-gray-600 italic bg-white/50 rounded-lg p-2 mt-2">
                                                                    {session.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-3 ml-3">
                                                        <div className="text-right">
                                                            <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                                                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                <span>{session.records?.length || 0} students</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-1.5 bg-white/50 rounded-lg group-hover:bg-white/70 transition-colors">
                                                            <Eye className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Create Session Modal */}
                            {showCreateModal && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                                    <div className="relative bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
                                        <div className="p-4 sm:p-6 lg:p-8">
                                            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                                                <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                                                    <Plus className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Create New Session</h3>
                                                    <p className="text-sm text-gray-600">Add a new attendance session</p>
                                                </div>
                                            </div>
                                            
                                            <form onSubmit={handleCreateSession} className="space-y-4 sm:space-y-6">
                                                <div className="space-y-2">
                                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                                        <Calendar className="w-4 h-4 text-blue-600" />
                                                        <span>Session Date</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        min={today}
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                                                        value={newSession.session_date}
                                                        onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                                        <AlertCircle className="w-4 h-4 text-blue-600" />
                                                        <span>Notes (Optional)</span>
                                                    </label>
                                                    <textarea
                                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
                                                        rows="3"
                                                        value={newSession.notes}
                                                        onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                                                        placeholder="Add any notes about this session..."
                                                    />
                                                </div>
                                                
                                                <div className="flex justify-end space-x-3 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateModal(false)}
                                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                                                    >
                                                        Create Session
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Session Details Modal */}
                            {showSessionModal && selectedSession && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                                    <div className="relative bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
                                        <div className="p-4 sm:p-6 lg:p-8">
                                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                                                        <Calendar className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                                                            Session: {new Date(selectedSession.session_date).toLocaleDateString()}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">Mark attendance for students</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowSessionModal(false);
                                                        setUnsavedChanges(false);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {selectedSession.notes && (
                                                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                                                    <div className="flex items-start space-x-2">
                                                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-medium text-blue-800">Session Notes</p>
                                                            <p className="text-sm text-blue-700 mt-1">{selectedSession.notes}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Enhanced Attendance Records Table */}
                                            <div className="mb-6 sm:mb-8">
                                                <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                                                    <div className="p-1.5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                                                        <Users className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-gray-900">Student Attendance</h4>
                                                </div>
                                                
                                                <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                                                                <tr>
                                                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                                        Student
                                                                    </th>
                                                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                                        Status
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-gray-200">
                                                                {localRecords.map((record, index) => (
                                                                    <tr key={record.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                                                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                                            <div className="flex items-center space-x-3">
                                                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                                                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                                                                        {record.student_name}
                                                                                    </div>
                                                                                    <div className="text-xs sm:text-sm text-gray-500 truncate">
                                                                                        {record.email}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                                            <select
                                                                                value={record.status}
                                                                                onChange={(e) => handleStatusChange(record.id, e.target.value)}
                                                                                className={`px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${getStatusColor(record.status)}`}
                                                                            >
                                                                                <option value="absent">Absent</option>
                                                                                <option value="present">Present</option>
                                                                                <option value="late">Late</option>
                                                                                <option value="excused">Excused</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enhanced Save Button */}
                                            <div className="flex justify-end pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={handleSaveAttendance}
                                                    disabled={!unsavedChanges}
                                                    className={`inline-flex items-center px-4 py-3 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform ${
                                                        unsavedChanges
                                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:scale-105 shadow-lg hover:shadow-xl'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <div className={`p-1 rounded-lg mr-3 ${unsavedChanges ? 'bg-white/20' : 'bg-gray-200'}`}>
                                                        <Save className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm sm:text-base">
                                                        {unsavedChanges ? 'Save Changes' : 'No Changes'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendancePage;