import React, { useState, useEffect } from 'react';
import { getAllCourses, createBatchRequest, getCenterByAdminId, getTeachersByCenter } from '../services/Api';

const CreateBatchRequestModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    duration: '',
    teacher_id: '',
    course_id: '',
    time_from: '',
    time_to: '',
    max_students: 10,
    mode: 'Offline',
    justification: ''
  });

  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [centerInfo, setCenterInfo] = useState(null);
  const [loading, setLoading] = useState({
    teachers: true,
    courses: true,
    center: true
  });
  const [error, setError] = useState({
    teachers: null,
    courses: null,
    center: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      
      // First, get center information
      try {
        setLoading(prev => ({ ...prev, center: true }));
        const centerResponse = await getCenterByAdminId(token);
        if (centerResponse.success && centerResponse.data && Array.isArray(centerResponse.data) && centerResponse.data.length > 0) {
          const centerData = centerResponse.data[0]; // Get the first center from the array
          setCenterInfo(centerData);
          
          // Then fetch teachers for this center
          try {
            setLoading(prev => ({ ...prev, teachers: true }));
            const teachersResponse = await getTeachersByCenter(centerData.center_id, token);
            if (teachersResponse.success && Array.isArray(teachersResponse.data)) {
              setTeachers(teachersResponse.data);
            }
          } catch (error) {
            console.error('Error fetching teachers:', error);
            setError(prev => ({ ...prev, teachers: 'Failed to load teachers for this center' }));
          } finally {
            setLoading(prev => ({ ...prev, teachers: false }));
          }
        } else {
          // No center found for this admin
          setError(prev => ({ ...prev, center: 'No center found for this admin. Please contact your administrator.' }));
        }
      } catch (error) {
        console.error('Error fetching center info:', error);
        setError(prev => ({ ...prev, center: 'Failed to load center information' }));
      } finally {
        setLoading(prev => ({ ...prev, center: false }));
      }

      // Fetch courses
      try {
        setLoading(prev => ({ ...prev, courses: true }));
        const coursesResponse = await getAllCourses();
        if (coursesResponse.success && Array.isArray(coursesResponse.data)) {
          setCourses(coursesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setError(prev => ({ ...prev, courses: 'Failed to load courses' }));
      } finally {
        setLoading(prev => ({ ...prev, courses: false }));
      }
    };

    fetchData();
  }, []);

  // Auto-fill duration when course is selected
  useEffect(() => {
    const selectedCourse = courses.find(c => c.id === formData.course_id);
    if (selectedCourse) {
      setFormData(prev => ({
        ...prev,
        duration: selectedCourse.duration || 0
      }));
    }
  }, [formData.course_id, courses]);

  // Refresh teachers when center changes
  const refreshTeachers = async () => {
    if (!centerInfo?.center_id) return;
    
    try {
      setLoading(prev => ({ ...prev, teachers: true }));
      setError(prev => ({ ...prev, teachers: null }));
      const token = localStorage.getItem('token');
      const teachersResponse = await getTeachersByCenter(centerInfo.center_id, token);
      if (teachersResponse.success && Array.isArray(teachersResponse.data)) {
        setTeachers(teachersResponse.data);
        // Clear teacher selection if current teacher is not in the new list
        const currentTeacherExists = teachersResponse.data.some(t => t.teacher_id === formData.teacher_id);
        if (!currentTeacherExists) {
          setFormData(prev => ({ ...prev, teacher_id: '' }));
        }
      }
    } catch (error) {
      console.error('Error refreshing teachers:', error);
      setError(prev => ({ ...prev, teachers: 'Failed to refresh teachers' }));
    } finally {
      setLoading(prev => ({ ...prev, teachers: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError({ teachers: null, courses: null, center: null, general: null });

    try {
      const token = localStorage.getItem('token');
      await createBatchRequest(formData, token);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create batch request:', error);
      setError({ teachers: null, courses: null, center: null, general: error.message || 'Failed to create batch request' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 py-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Request New Batch</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6">
          {error.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error.general}</p>
            </div>
          )}

          {/* Center Information */}
          {loading.center ? (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-48"></div>
              </div>
            </div>
          ) : error.center ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error.center}</p>
            </div>
          ) : centerInfo ? (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm text-blue-800">
                  <strong>Center:</strong> {centerInfo.center_name} | <strong>State:</strong> {centerInfo.state_name}
                </span>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                {loading.courses ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : error.courses ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error.courses}</div>
                ) : (
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_name} ({course.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                  min="1"
                  placeholder="Course duration in hours"
                />
              </div>

              {/* Teacher Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Teacher</label>
                  {centerInfo && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {centerInfo.center_name} ({teachers.length} teachers)
                      </span>
                      <button
                        type="button"
                        onClick={refreshTeachers}
                        disabled={loading.teachers}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {loading.teachers ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  )}
                </div>
                {loading.teachers ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : error.teachers ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error.teachers}</div>
                ) : teachers.length === 0 ? (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                    No teachers found for {centerInfo?.center_name || 'this center'}. Please contact your administrator.
                  </div>
                ) : (
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">Select a teacher from {centerInfo?.center_name || 'your center'}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.teacher_name || teacher.user?.name || 'Unknown Teacher'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  required
                >
                  <option value="Offline">Offline</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {/* Time From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.time_from}
                  onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
                  required
                />
              </div>

              {/* Time To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.time_to}
                  onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
                  required
                />
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                  min="1"
                  max="50"
                  required
                />
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Justification (Optional)
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Explain why this batch is needed..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting Request...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBatchRequestModal;
