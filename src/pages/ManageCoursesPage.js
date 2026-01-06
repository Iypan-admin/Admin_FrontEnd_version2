import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getAllCourses, createCourse, updateCourse } from '../services/Api';

const ManageCoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Add this state to track submission
  const [formData, setFormData] = useState({
    course_name: '',
    program: '',
    type: '',
    language: '',
    level: '',
    mode: '',
    duration: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await getAllCourses(token);

      // Check if response has the expected structure
      if (response && response.success && Array.isArray(response.data)) {
        setCourses(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      // Prepare data - convert empty type to null
      const courseData = {
        ...formData,
        type: formData.type || null, // Convert empty string to null
        duration: Number(formData.duration) // Ensure duration is number
      };
      
      await createCourse(courseData, token);

      setShowCreateModal(false);
      setFormData({
        course_name: '',
        program: '',
        type: '',
        language: '',
        level: '',
        mode: '',
        duration: ''
      });

      // Refresh the courses list
      fetchCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      setError('Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (course) => {
    setEditingCourse(course);
    setFormData({
      course_name: course.course_name,
      program: course.program,
      type: course.type,
      language: course.language,
      level: course.level,
      mode: course.mode,
      duration: course.duration
    });
    setIsEditMode(true);
    setShowCreateModal(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      // Prepare data - convert empty type to null
      const courseData = {
        ...formData,
        type: formData.type || null, // Convert empty string to null
        duration: Number(formData.duration) // Ensure duration is number
      };
      
      await updateCourse(editingCourse.id, courseData, token);

      setShowCreateModal(false);
      setIsEditMode(false);
      setEditingCourse(null);
      setFormData({
        course_name: '',
        program: '',
        type: '',
        language: '',
        level: '',
        mode: '',
        duration: ''
      });

      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      setError('Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header Section */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                          Manage Courses
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base">
                          Create, edit, and manage your course catalog
                        </p>
                      </div>
                    </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                      className="group bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg font-semibold border border-white/30 flex items-center justify-center gap-3"
                >
                      <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Course
                </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 mb-6 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-xl mr-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 mb-1">Error Loading Courses</h3>
                      <p className="text-red-600">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Courses</h3>
                  <p className="mt-2 text-gray-500">Please wait while we fetch your course data...</p>
                </div>
              ) : (
                <>
                  {/* Enhanced Empty State */}
                  {courses.length === 0 && (
                    <div className="text-center py-12 sm:py-16 lg:py-20">
                      <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100/50 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl"></div>
                        
                        <div className="relative z-10">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">No Courses Yet</h3>
                          <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                            Start building your course catalog by creating your first course. It's easy to get started!
                          </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-lg"
                        >
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                            Create Your First Course
                        </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Enhanced Courses Table */}
                  {courses.length > 0 && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-20">
                            <tr>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <span className="hidden sm:inline">Course Name</span>
                                  <span className="sm:hidden">Course</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <span>Type</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                  </svg>
                                  <span className="hidden sm:inline">Language</span>
                                  <span className="sm:hidden">Lang</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Level</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="hidden sm:inline">Duration</span>
                                  <span className="sm:hidden">Dur</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>Mode</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="hidden sm:inline">Program</span>
                                  <span className="sm:hidden">Prog</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="hidden sm:inline">Created At</span>
                                  <span className="sm:hidden">Date</span>
                                </div>
                              </th>
                              <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>Actions</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {courses.map((course, index) => (
                              <tr key={course.id} className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                      {course.course_name?.charAt(0)?.toUpperCase() || 'C'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate">
                                        {course.course_name}
                                      </p>
                                      <p className="text-xs text-gray-500 hidden sm:block">ID: {course.id?.slice(0, 8)}...</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold ${
                                    course.type === 'Immersion'
                                      ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                                      : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
                                  }`}>
                                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                                      course.type === 'Immersion' ? 'bg-blue-400' : 'bg-green-400'
                                    }`}></div>
                                    <span className="hidden sm:inline">{course.type}</span>
                                    <span className="sm:hidden">{course.type?.slice(0, 3)}</span>
                                  </span>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{course.language || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{course.level || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{course.duration || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{course.mode || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{course.program || '-'}</span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">
                                      {new Date(course.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => handleEditClick(course)}
                                    className="inline-flex items-center px-2 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                  >
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span className="hidden sm:inline">Edit</span>
                                    <span className="sm:hidden">✏️</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Responsive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto my-4 sm:my-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg sm:rounded-xl">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                  {isEditMode ? "Edit Course" : "Create New Course"}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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

            <form onSubmit={isEditMode ? handleUpdateCourse : handleCreateCourse}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">

                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Course Name *
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-700 font-medium text-sm sm:text-base"
                    value={formData.course_name}
                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                    placeholder="Enter course name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Program *
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 text-gray-700 font-medium text-sm sm:text-base"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    placeholder="Enter program name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Type
                  </label>
                  <select
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 text-gray-700 font-medium bg-white text-sm sm:text-base"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="">Select Course Type (Optional)</option>
                    <option value="Regular">Regular</option>
                    <option value="Fast Track">Fast Track</option>
                    <option value="Foundation">Foundation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Language *
                  </label>
                  <select
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 text-gray-700 font-medium bg-white text-sm sm:text-base"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    required
                  >
                    <option value="">Select Language</option>
                    <option value="FRENCH">FRENCH</option>
                    <option value="GERMAN">GERMAN</option>
                    <option value="JAPANESE">JAPANESE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Level *
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 text-gray-700 font-medium text-sm sm:text-base"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="Enter level (e.g., Beginner, Intermediate, Advanced)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Mode *
                  </label>
                  <select
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 text-gray-700 font-medium bg-white text-sm sm:text-base"
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    required
                  >
                    <option value="">Select Mode</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Duration (months) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg sm:rounded-xl border-2 border-gray-200 px-3 py-2 sm:px-4 sm:py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200 text-gray-700 font-medium text-sm sm:text-base"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    placeholder="Enter duration in months"
                    required
                  />
                </div>

              </div>

              {/* Enhanced Responsive Button Layout */}
              <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setIsEditMode(false);
                    setEditingCourse(null);
                    setFormData({
                      course_name: "",
                      program: "",
                      type: "Regular",
                      language: "",
                      level: "",
                      mode: "",
                      duration: "",
                    });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent mr-1 sm:mr-2"></div>
                      <span className="text-xs sm:text-sm">{isEditMode ? "Updating..." : "Creating..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs sm:text-sm">{isEditMode ? "Update Course" : "Create Course"}</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}
    </div>
  );
};

export default ManageCoursesPage;