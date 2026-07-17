import React, { useState, useEffect } from 'react';
import { getAllCenters, getAllTeachers, getAllCourses } from '../services/Api';

const CreateBatchModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    duration: '',
    center: '',
    teacher: '',
    assistant_tutor: '',
    course_id: '',
    mode: '',
    type: '',
    language: '',
    time_from: '',
    time_to: '',
    max_students: 10, 
  });

  const [centers, setCenters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState({
    centers: true,
    teachers: true,
    courses: true
  });
  const [error, setError] = useState({
    centers: null,
    teachers: null,
    courses: null
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);





  useEffect(() => {
    const fetchData = async () => {
      // Fetch centers
      try {
        setLoading(prev => ({ ...prev, centers: true }));
        const centersResponse = await getAllCenters();
        if (centersResponse && centersResponse.success && Array.isArray(centersResponse.data)) {
          setCenters(centersResponse.data);
        } else {
          setError(prev => ({ ...prev, centers: 'Invalid centers data format' }));
        }
      } catch (err) {
        setError(prev => ({ ...prev, centers: 'Failed to load centers' }));
        console.error('Error fetching centers:', err);
      } finally {
        setLoading(prev => ({ ...prev, centers: false }));
      }

            // Updated teachers fetch
      try {
        setLoading(prev => ({ ...prev, teachers: true }));
        const response = await getAllTeachers();

        // getAllTeachers returns data.data || data, so it could be an array directly
        // or an object with success and data properties
        if (Array.isArray(response)) {
          setTeachers(response);
        } else if (response && response.success && Array.isArray(response.data)) {
          setTeachers(response.data);
        } else {
          setError(prev => ({ ...prev, teachers: 'Invalid teachers data format' }));
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setError(prev => ({ ...prev, teachers: 'Failed to load teachers' }));   
      } finally {
        setLoading(prev => ({ ...prev, teachers: false }));
      }

      // Fetch courses
      try {
        setLoading(prev => ({ ...prev, courses: true }));
        const token = localStorage.getItem("token");
        const coursesResponse = await getAllCourses(token);

        if (coursesResponse && Array.isArray(coursesResponse.data)) {
          setCourses(coursesResponse.data);
        } else {
          setError(prev => ({ ...prev, courses: 'Invalid courses data format' }));
        }
      } catch (err) {
        setError(prev => ({ ...prev, courses: 'Failed to load courses' }));
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(prev => ({ ...prev, courses: false }));
      }
    };

    fetchData();
  }, []);

  // Smooth slide-in animation
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
    const selectedCourse = courses.find((c) => c.id === formData.course_id);
    if (selectedCourse) {
      setFormData((prev) => ({
        ...prev,
        duration: selectedCourse.duration || 0
      }));
    }
  }, [formData.course_id, courses]);
  useEffect(() => {
    if (formData.center && formData.language && formData.type) {
      const selectedCenter = centers.find(c => c.center_id === formData.center);

      if (selectedCenter?.center_admin?.name === "ISMLHQ") {
        setFormData(prev => ({
          ...prev,
          mode: "Online",
          course_id: ""
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          mode: "Offline",
          course_id: ""
        }));
      }
    }
  }, [formData.center, formData.language, formData.type, centers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const batchData = {
        duration: parseInt(formData.duration),
        center: formData.center,
        teacher: formData.teacher,
        course_id: formData.course_id,
        mode: formData.mode,
        time_from: formData.time_from,
        time_to: formData.time_to,
        max_students: parseInt(formData.max_students) || 10,
        status: 'Pending' // Set status as Pending for approval workflow
      };

      // Add assistant_tutor if provided (optional)
      if (formData.assistant_tutor) {
        batchData.assistant_tutor = formData.assistant_tutor;
      }

      await onSubmit(batchData);
      handleClose();
    } catch (error) {
      console.error('Failed to create batch:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  return (
    <div 
      className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Right Side Modal - BERRY Style with Smooth Slide Animation */}
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
              <h2 className="text-xl font-bold text-gray-800">Create New Batch</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
            >
              <svg
                className="w-5 h-5 text-gray-500"
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
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Center Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
                {loading.centers ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : error.centers ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error.centers}</div>
                ) : (
                  <div className="space-y-1">
                    <select
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.center}
                      onChange={(e) => setFormData({ ...formData, center: e.target.value })}
                      required
                    >
                      <option value="">Select a center</option>
                      {centers.map((center) => (
                        <option key={center.center_id} value={center.center_id}>
                          {center.center_name}
                        </option>
                      ))}
                    </select>
                    {formData.center && centers.find(c => c.center_id === formData.center)?.center_admin?.name && (
                      <p className="text-sm text-gray-500 mt-1">
                        Center Admin: {centers.find(c => c.center_id === formData.center).center_admin.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      language: e.target.value,
                      type: '',
                      mode: '',
                      course_id: ''
                    })
                  }
                  required
                >
                  <option value="">Select Language</option>
                  {[...new Set(courses.map((c) => c.language))].map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {formData.language && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        mode: '',
                        course_id: ''
                      })
                    }
                    required
                  >
                    <option value="">Select Type</option>
                    {[...new Set(courses.filter(c => c.language === formData.language).map(c => c.type))].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.language && formData.type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    value={formData.mode}
                    disabled
                    required
                  >
                    {formData.mode ? (
                      <option value={formData.mode}>{formData.mode}</option>
                    ) : (
                      <option value="">Select Mode</option>
                    )}
                  </select>
                </div>
              )}

              {formData.language && formData.type && formData.mode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.course_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedCourse = courses.find(
                        (c) =>
                          c.id === selectedId &&
                          c.language?.toLowerCase().trim() === formData.language?.toLowerCase().trim() &&
                          c.type?.toLowerCase().trim() === formData.type?.toLowerCase().trim() &&
                          c.mode?.toLowerCase().trim() === formData.mode?.toLowerCase().trim()
                      );

                      setFormData(prev => ({
                        ...prev,
                        course_id: selectedId,
                        duration: selectedCourse?.duration || 6
                      }));
                    }}
                    required
                  >
                    <option value="">Select Course</option>
                    {courses
                      .filter(
                        (c) =>
                          c.language?.toLowerCase().trim() === formData.language?.toLowerCase().trim() &&
                          c.type?.toLowerCase().trim() === formData.type?.toLowerCase().trim() &&
                          c.mode?.toLowerCase().trim() === formData.mode?.toLowerCase().trim()
                      )
                      .map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.course_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                <input
                  type="number"
                  value={formData.duration}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
                />
              </div>
<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seat Limit</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                  placeholder="Enter seat limit (e.g., 10)"
                  required
                />
              </div>




              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>

                {loading.teachers ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : error.teachers ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error.teachers}</div>
                ) : (
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    required
                  >
                    <option value="">Select a teacher</option>
                    {teachers
                      .filter((teacher) => {
                        const match = teacher.center_id === formData.center;
                        return match;
                      })
                      .map((teacher) => (
                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                          {teacher.teacher_name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Assistant Tutor Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assistant Tutor <span className="text-gray-400 text-xs">(Optional)</span>
                </label>

                {loading.teachers ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : error.teachers ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error.teachers}</div>
                ) : (
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.assistant_tutor}
                    onChange={(e) => setFormData({ ...formData, assistant_tutor: e.target.value })}
                  >
                    <option value="">Select an assistant tutor (Optional)</option>
                    {teachers
                      .filter((teacher) => {
                        const match = teacher.center_id === formData.center && teacher.teacher_id !== formData.teacher;
                        return match;
                      })
                      .map((teacher) => (
                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                          {teacher.teacher_name}
                        </option>
                      ))}
                  </select>
                )}
              </div>



              {/* Time Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Timing</label>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.time_from}
                      onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.time_to}
                      onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Batch'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBatchModal;