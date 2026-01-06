import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getBatchById, getTeacherBatchStudents, getLSRWByBatch, markLSRWComplete } from '../services/Api';
import { BookOpen, Users, Calendar, Clock, MapPin, GraduationCap, User, CheckCircle, XCircle, AlertCircle, Loader2, Award, Building, Headphones, FileText, Play } from 'lucide-react';

function BatchCourseDetailsPage() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [lsrwContent, setLsrwContent] = useState([]);
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'lsrw'
  
  // Get user role to conditionally show LSRW tab
  const token = localStorage.getItem('token');
  const decodedToken = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const userRole = decodedToken?.role || null;
  const isAcademic = userRole === 'academic' || userRole === 'admin';
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingLSRW, setLoadingLSRW] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');
        if (!batchId) throw new Error('Batch ID is required');

        setLoadingBatch(true);
        const response = await getBatchById(token, batchId);

        if (response && response.success && response.data) {
          setBatch(response.data);
        } else {
          throw new Error(response?.message || 'Failed to fetch batch details');
        }
      } catch (err) {
        console.error('Error fetching batch details:', err);
        setError(err.message || 'Failed to load batch details');
      } finally {
        setLoadingBatch(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');
        if (!batchId) throw new Error('Batch ID is required');

        setLoadingStudents(true);
        const response = await getTeacherBatchStudents(batchId, token);

        // Update this condition to match new response structure
        if (response && response.success && Array.isArray(response.data)) {
          setStudents(response.data); // response.data already contains the formatted student data
        } else {
          throw new Error('Invalid students data format');
        }
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(err.message || 'Failed to load details');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [batchId]);

  useEffect(() => {
    if (activeTab === 'lsrw' && batchId && isAcademic) {
      fetchLSRWContent();
    }
  }, [activeTab, batchId, isAcademic]);

  const fetchLSRWContent = async () => {
    try {
      setLoadingLSRW(true);
      const token = localStorage.getItem('token');
      const response = await getLSRWByBatch(batchId, token, 'listening');
      if (response && response.success) {
        setLsrwContent(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching LSRW content:', err);
    } finally {
      setLoadingLSRW(false);
    }
  };

  const handleMarkComplete = async (mappingId) => {
    if (!window.confirm('Mark this lesson as completed? Students will be able to see it.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await markLSRWComplete(mappingId, token);
      alert('Lesson marked as completed!');
      fetchLSRWContent();
    } catch (err) {
      alert('Failed to mark lesson as complete: ' + err.message);
    }
  };

  if (loadingBatch) {
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
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Course Details</h3>
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
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Details</h3>
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
              {batch && (
                <>
                  {/* Enhanced Header */}
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {batch.batch_name}
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Course Details & Student Information</p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Course Overview */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
                    <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                      <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Course Overview</h2>
                        <p className="text-sm text-gray-600">Batch information and details</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Batch Name</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.batch_name}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5 border border-green-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <GraduationCap className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Course Name</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.course_name || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border border-purple-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Clock className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Duration</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.duration} months</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-5 border border-orange-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <Building className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Center</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{batch.center_name || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-5 border border-indigo-200/50">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Created At</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-6">
                    <div className="flex space-x-2 border-b border-gray-200 mb-6">
                      <button
                        onClick={() => setActiveTab('students')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                          activeTab === 'students'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Students</span>
                          {students.length > 0 && (
                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                              {students.length}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Only show LSRW tab for academic/admin roles */}
                      {isAcademic && (
                        <button
                          onClick={() => setActiveTab('lsrw')}
                          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                            activeTab === 'lsrw'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Headphones className="w-4 h-4" />
                            <span>LSRW</span>
                            {lsrwContent.length > 0 && (
                              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                {lsrwContent.length}
                              </span>
                            )}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Students Tab Content */}
                    {activeTab === 'students' && (
                      <div>
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Enrolled Students</h2>
                          <p className="text-sm text-gray-600">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
                        </div>
                      </div>
                    </div>
                    
                    {loadingStudents ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Students</h3>
                      </div>
                    ) : students.length > 0 ? (
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                              <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4" />
                                    <span>Registration</span>
                                  </div>
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4" />
                                    <span>Student Name</span>
                                  </div>
                                </th>
                                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-4 h-4" />
                                    <span>Center</span>
                                  </div>
                                </th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Status</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-gray-200">
                              {students.map((student, index) => (
                                <tr key={student.enrollment_id} className="hover:bg-blue-50/50 transition-colors duration-200 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                                      {student.registration_number}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                      </div>
                                      <div className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">
                                        {student.name}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{student.center_name}</div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      student.status 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                        student.status ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                      {student.status ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        </div>
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Students Enrolled</h4>
                        <p className="text-gray-500 text-sm sm:text-base">No students have been enrolled in this batch yet</p>
                      </div>
                    )}
                      </div>
                    )}

                    {/* LSRW Tab Content */}
                    {activeTab === 'lsrw' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                              <Headphones className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Listening Lessons</h2>
                              <p className="text-sm text-gray-600">Manage LSRW content for this batch</p>
                            </div>
                          </div>
                        </div>

                        {loadingLSRW ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Lessons</h3>
                          </div>
                        ) : lsrwContent.length > 0 ? (
                          <div className="space-y-4">
                            {lsrwContent.map((mapping) => {
                              const content = mapping.lsrw_content;
                              if (!content) return null;

                              return (
                                <div key={mapping.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <h3 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h3>
                                      {content.instruction && (
                                        <p className="text-gray-600 mb-3">{content.instruction}</p>
                                      )}
                                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>Max Marks: {content.max_marks}</span>
                                        <span>•</span>
                                        <span>Type: {content.module_type}</span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                        mapping.tutor_status === 'completed'
                                          ? 'bg-green-100 text-green-800 border border-green-200'
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                      }`}>
                                        {mapping.tutor_status === 'completed' ? 'Completed' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-4 mb-4">
                                    {content.audio_url && (
                                      <a
                                        href={content.audio_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <Play className="w-4 h-4" />
                                        <span>Play Audio</span>
                                      </a>
                                    )}
                                    {content.question_doc_url && (
                                      <a
                                        href={content.question_doc_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>View Questions</span>
                                      </a>
                                    )}
                                  </div>

                                  {mapping.tutor_status === 'pending' && (
                                    <button
                                      onClick={() => handleMarkComplete(mapping.id)}
                                      className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold"
                                    >
                                      Mark as Completed
                                    </button>
                                  )}

                                  {mapping.tutor_status === 'completed' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <p className="text-sm text-green-800">
                                        ✓ Lesson completed. Students can now access this content.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                              <Headphones className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No LSRW Lessons</h4>
                            <p className="text-gray-500">No listening lessons have been uploaded for this course yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchCourseDetailsPage;

