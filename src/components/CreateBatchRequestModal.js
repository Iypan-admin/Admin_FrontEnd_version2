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
    justification: '', // Will be sent as empty string
    assistant_tutor_id: ''
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
  const [isVisible, setIsVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  // Auto-fill duration and mode when course is selected
  useEffect(() => {
    const selectedCourse = courses.find(c => c.id === formData.course_id);
    if (selectedCourse) {
      setFormData(prev => ({
        ...prev,
        duration: selectedCourse.duration || 0,
        mode: selectedCourse.mode || 'Offline' // Auto-detect mode from course
      }));
    } else {
      // Reset when course is deselected
      setFormData(prev => ({
        ...prev,
        duration: '',
        mode: 'Offline'
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

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError({ teachers: null, courses: null, center: null, general: null });

    try {
      const token = localStorage.getItem('token');
      // Ensure justification is an empty string if undefined/null
      const submitData = {
        ...formData,
        justification: formData.justification || '',
        duration: formData.duration || 0,
        max_students: formData.max_students || 10,
        mode: formData.mode || 'Offline'
      };
      await createBatchRequest(submitData, token);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to create batch request:', error);
      setError({ teachers: null, courses: null, center: null, general: error.message || 'Failed to create batch request' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] lg:w-[36rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - BERRY Style */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Request New Batch</h2>
                <p className="text-xs text-gray-500 mt-0.5">Submit a proposal for a new academic batch</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error.general && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{error.general}</p>
            </div>
          )}

          {/* Center Information Card */}
          {centerInfo && !loading.center && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Authenticated Center</p>
                <h3 className="text-sm font-bold text-blue-900 truncate">{centerInfo.center_name}</h3>
                <p className="text-xs text-blue-700 mt-0.5">{centerInfo.state_name} Region</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5">
              {/* Course Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Course</label>
                {loading.courses ? (
                  <div className="w-full h-11 bg-gray-50 border border-gray-200 rounded-lg animate-pulse" />
                ) : (
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm"
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_name} {course.type ? `(${course.type})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration - Auto-filled */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Duration</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed font-semibold text-sm"
                      value={formData.duration ? `${formData.duration} Months` : '---'}
                      disabled
                      readOnly
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                </div>

                {/* Mode - Auto-filled */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teaching Mode</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed font-semibold text-sm"
                      value={formData.mode || '---'}
                      disabled
                      readOnly
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teacher Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Main Teacher</label>
                  <button
                    type="button"
                    onClick={refreshTeachers}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter"
                  >
                    {loading.teachers ? 'Updating...' : 'Refresh List'}
                  </button>
                </div>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  required
                >
                  <option value="">Select a teacher from your center</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.teacher_name || teacher.user?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assistant Tutor Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Assistant Tutor <span className="text-gray-400 normal-case font-normal">(Optional)</span>
                </label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm"
                  value={formData.assistant_tutor_id}
                  onChange={(e) => setFormData({ ...formData, assistant_tutor_id: e.target.value })}
                >
                  <option value="">Select an assistant tutor (Optional)</option>
                  {teachers
                    .filter(teacher => teacher.teacher_id !== formData.teacher_id)
                    .map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.teacher_name || teacher.user?.name || 'Unknown'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                    value={formData.time_from}
                    onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
                    required
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">End Time</label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                    value={formData.time_to}
                    onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Seat Limit</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                  />
                  <span className="w-12 text-center font-black text-blue-600 bg-blue-50 rounded-lg py-1 border border-blue-100">
                    {formData.max_students}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Standard batch size is usually between 10-25 students.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-6 -mx-6 -mb-6 mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 border-2 border-transparent rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBatchRequestModal;
