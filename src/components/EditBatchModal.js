import React, { useState, useEffect } from 'react';
import { getAllCenters, getAllTeachers, getAllCourses, getBatchById } from '../services/Api';

const EditBatchModal = ({ batch, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    batch_name: '',
    duration: 6,
    center: '',
    teacher: '',
    assistant_tutor: '',
    course_id: '',
    time_from: '',
    time_to: '',
    max_students: 10
  });

  const [centers, setCenters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState({
    centers: true,
    teachers: true,
    courses: true,
    batch: true
  });
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smooth slide-in animation and fetch batch details when modal opens
  useEffect(() => {
    if (batch && batch.batch_id) {
      // Trigger slide-in animation after modal is shown
      setTimeout(() => setIsVisible(true), 10);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      const fetchBatchDetails = async () => {
        try {
          setLoading(prev => ({ ...prev, batch: true }));
          const token = localStorage.getItem('token');
          const response = await getBatchById(token, batch.batch_id);
          
          if (response && response.success && response.data) {
            setBatchData(response.data);
            console.log('✅ Batch data fetched:', response.data);
          } else {
            // Fallback to the batch prop if API fails
            console.warn('⚠️ API response format unexpected, using batch prop:', response);
            setBatchData(batch);
          }
        } catch (error) {
          console.error('❌ Error fetching batch details:', error);
          // Fallback to the batch prop
          setBatchData(batch);
          setError('Failed to fetch batch details. Using available data.');
        } finally {
          setLoading(prev => ({ ...prev, batch: false }));
        }
      };

      fetchBatchDetails();
    } else {
      setError('Batch ID is missing');
      setLoading(prev => ({ ...prev, batch: false }));
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [batch]);

  // 🔥 Pre-fill formData when batch data is available
  // This effect runs whenever batchData changes and populates what it can
  useEffect(() => {
    if (!batchData) {
      console.log('⏳ Waiting for batch data...');
      return;
    }

    console.log('🔄 Form population triggered:', {
      hasBatchData: true,
      centersCount: centers.length,
      teachersCount: teachers.length,
      coursesCount: courses.length,
      batchCenter: batchData.center,
      batchTeacher: batchData.teacher,
      batchCourse: batchData.course_id
    });

    // Helper function to parse time to HH:mm format for time input
    const parseTimeForInput = (timeStr) => {
      if (!timeStr) {
        console.log('⚠️ Empty time string');
        return '';
      }
      
      // Convert to string if it's not already
      const timeString = String(timeStr).trim();
      console.log('🕐 Parsing time:', timeString, 'Type:', typeof timeStr);
      
      // If already in HH:mm format (24-hour) - most common case
      if (/^\d{1,2}:\d{2}$/.test(timeString)) {
        // Ensure it's in HH:mm format (2 digits for hours)
        const [hours, minutes] = timeString.split(':');
        const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
        console.log('✅ Time already in HH:mm format:', formattedTime);
        return formattedTime;
      }
      
      // If in HH:mm:ss format, extract HH:mm
      if (/^\d{1,2}:\d{2}:\d{2}/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
        console.log('✅ Extracted HH:mm from HH:mm:ss:', formattedTime);
        return formattedTime;
      }
      
      // If in 12-hour format like "10:30AM" or "10:30 AM"
      const amPmMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (amPmMatch) {
        let hours = parseInt(amPmMatch[1], 10);
        const minutes = amPmMatch[2];
        const amPm = amPmMatch[3].toUpperCase();
        
        if (amPm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (amPm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
        console.log('✅ Converted 12-hour to 24-hour:', timeString, '→', formattedTime);
        return formattedTime;
      }
      
      console.warn('⚠️ Could not parse time format:', timeString);
      return '';
    };

    // Always populate basic fields immediately
    const updateFormData = (updates) => {
      setFormData(prev => {
        const newData = { ...prev, ...updates };
        console.log('📝 Form data update:', newData);
        return newData;
      });
    };

    // 1. Populate basic fields that don't depend on dropdowns
    // Log the raw batch data first to see what we're working with
    console.log('🔍 Raw batch data for times:', {
      time_from: batchData.time_from,
      time_to: batchData.time_to,
      time_from_type: typeof batchData.time_from,
      time_to_type: typeof batchData.time_to,
      fullBatchData: batchData
    });
    
    const timeFrom = parseTimeForInput(batchData.time_from);
    const timeTo = parseTimeForInput(batchData.time_to);
    
    console.log('🕐 Time parsing results:', {
      originalFrom: batchData.time_from,
      parsedFrom: timeFrom,
      originalTo: batchData.time_to,
      parsedTo: timeTo,
      timeFromLength: timeFrom?.length,
      timeToLength: timeTo?.length
    });
    
    // Populate ALL basic fields in one go to ensure nothing gets overwritten
    const basicFields = {
      batch_name: batchData.batch_name || formData.batch_name || '',
      duration: batchData.duration || formData.duration || 6,
      max_students: batchData.max_students || formData.max_students || 10,
      time_from: timeFrom || formData.time_from || '',
      time_to: timeTo || formData.time_to || ''
    };
    
    console.log('📝 Setting basic fields with times:', basicFields);
    
    // Set all basic fields including times immediately using updateFormData
    updateFormData(basicFields);

    // 2. Try to populate center dropdown
    let centerId = '';
    // Check if center is an object with center_id, or just an ID string/UUID
    if (batchData.center) {
      if (typeof batchData.center === 'object' && batchData.center.center_id) {
        centerId = String(batchData.center.center_id);
      } else if (typeof batchData.center === 'string') {
        centerId = String(batchData.center);
      } else {
        centerId = String(batchData.center);
      }
      // Verify it exists in centers list if available
      if (centers.length > 0) {
        const exists = centers.some(c => String(c.center_id) === centerId);
        if (!exists) {
          console.warn('⚠️ Center ID not found in centers list:', centerId, 'Available centers:', centers.map(c => c.center_id));
        }
      }
      updateFormData({ center: centerId });
      console.log('🏢 Center populated:', { centerId, centerData: batchData.center });
    } else if (batchData.center_name && centers.length > 0) {
      const selectedCenter = centers.find(c => c.center_name === batchData.center_name);
      if (selectedCenter) {
        centerId = String(selectedCenter.center_id);
        updateFormData({ center: centerId });
        console.log('🏢 Center matched by name:', centerId);
      }
    }

    // 3. Try to populate teacher dropdown
    let teacherId = '';
    // Check if teacher is an object with teacher_id, or just an ID string/UUID
    if (batchData.teacher) {
      let batchTeacherId = '';
      if (typeof batchData.teacher === 'object' && batchData.teacher.teacher_id) {
        batchTeacherId = String(batchData.teacher.teacher_id);
      } else if (typeof batchData.teacher === 'string') {
        batchTeacherId = String(batchData.teacher);
      } else {
        batchTeacherId = String(batchData.teacher);
      }
      
      if (teachers.length > 0) {
        // Try to find by teacher_id first
        let foundTeacher = teachers.find(t => String(t.teacher_id) === batchTeacherId);
        
        // If not found, try to find by user_id (teacher field)
        if (!foundTeacher) {
          foundTeacher = teachers.find(t => String(t.teacher) === batchTeacherId);
          if (foundTeacher) {
            console.log('✅ Found teacher by user_id, using teacher_id:', foundTeacher.teacher_id);
          }
        }
        
        if (foundTeacher) {
          teacherId = String(foundTeacher.teacher_id);
          updateFormData({ teacher: teacherId });
          console.log('👨‍🏫 Teacher matched:', { teacherId, teacherData: batchData.teacher });
        } else {
          // Use the ID directly if teachers list doesn't have it yet
          teacherId = batchTeacherId;
          updateFormData({ teacher: teacherId });
          console.log('👨‍🏫 Using teacher ID directly (not found in list yet):', teacherId);
        }
      } else {
        // Teachers list not loaded yet, use ID directly
        teacherId = batchTeacherId;
        updateFormData({ teacher: teacherId });
        console.log('👨‍🏫 Using teacher ID directly (teachers list not loaded):', teacherId);
      }
    } else if (batchData.teacher_name && teachers.length > 0) {
      const selectedTeacher = teachers.find(t => t.teacher_name === batchData.teacher_name);
      if (selectedTeacher) {
        teacherId = String(selectedTeacher.teacher_id);
        updateFormData({ teacher: teacherId });
        console.log('👨‍🏫 Teacher matched by name:', teacherId);
      }
    }

    // 4. Try to populate assistant tutor dropdown
    let assistantTutorId = '';
    // Check if assistant_tutor is an object with teacher_id, or just an ID string/UUID, or null
    if (batchData.assistant_tutor) {
      let batchAssistantTutorId = '';
      if (typeof batchData.assistant_tutor === 'object' && batchData.assistant_tutor.teacher_id) {
        batchAssistantTutorId = String(batchData.assistant_tutor.teacher_id);
      } else if (typeof batchData.assistant_tutor === 'string') {
        batchAssistantTutorId = String(batchData.assistant_tutor);
      } else {
        batchAssistantTutorId = String(batchData.assistant_tutor);
      }
      
      if (teachers.length > 0) {
        // Try to find by teacher_id first
        let foundAssistant = teachers.find(t => String(t.teacher_id) === batchAssistantTutorId);
        
        // If not found, try to find by user_id (teacher field)
        if (!foundAssistant) {
          foundAssistant = teachers.find(t => String(t.teacher) === batchAssistantTutorId);
          if (foundAssistant) {
            console.log('✅ Found assistant tutor by user_id, using teacher_id:', foundAssistant.teacher_id);
          }
        }
        
        if (foundAssistant) {
          assistantTutorId = String(foundAssistant.teacher_id);
          updateFormData({ assistant_tutor: assistantTutorId });
          console.log('👨‍🏫 Assistant Tutor matched:', { assistantTutorId, assistantData: batchData.assistant_tutor });
        } else {
          // Use the ID directly if teachers list doesn't have it yet
          assistantTutorId = batchAssistantTutorId;
          updateFormData({ assistant_tutor: assistantTutorId });
          console.log('👨‍🏫 Using assistant tutor ID directly (not found in list yet):', assistantTutorId);
        }
      } else {
        // Teachers list not loaded yet, use ID directly
        assistantTutorId = batchAssistantTutorId;
        updateFormData({ assistant_tutor: assistantTutorId });
        console.log('👨‍🏫 Using assistant tutor ID directly (teachers list not loaded):', assistantTutorId);
      }
    } else if (batchData.assistant_tutor_name && teachers.length > 0) {
      const selectedAssistant = teachers.find(t => t.teacher_name === batchData.assistant_tutor_name);
      if (selectedAssistant) {
        assistantTutorId = String(selectedAssistant.teacher_id);
        updateFormData({ assistant_tutor: assistantTutorId });
        console.log('👨‍🏫 Assistant Tutor matched by name:', assistantTutorId);
      }
    } else {
      // No assistant tutor
      updateFormData({ assistant_tutor: '' });
      console.log('👨‍🏫 No assistant tutor assigned');
    }

    // 5. Try to populate course dropdown
    let courseId = '';
    if (batchData.course_id) {
      courseId = String(batchData.course_id);
      // Verify it exists in courses list if available
      if (courses.length > 0) {
        const exists = courses.some(c => String(c.id) === courseId);
        if (!exists) {
          console.warn('⚠️ Course ID not found in courses list:', courseId);
        }
      }
      updateFormData({ course_id: courseId });
    } else if (batchData.course_name && courses.length > 0) {
      const selectedCourse = courses.find(cr => cr.course_name === batchData.course_name);
      if (selectedCourse) {
        courseId = String(selectedCourse.id);
        updateFormData({ course_id: courseId });
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchData, centers, teachers, courses]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const token = localStorage.getItem('token');
        const [centersResponse, teachersResponse, coursesResponse] = await Promise.all([
          getAllCenters().catch(err => {
            console.error('Error fetching centers:', err);
            return { success: false, data: [] };
          }),
          getAllTeachers().catch(err => {
            console.error('Error fetching teachers:', err);
            return { success: false, data: [] };
          }),
          getAllCourses(token).catch(err => {
            console.error('Error fetching courses:', err);
            return { success: false, data: [] };
          })
        ]);

        console.log('📦 Raw API responses:', {
          centers: centersResponse,
          teachers: teachersResponse,
          courses: coursesResponse
        });

        // Handle centers
        if (centersResponse.success && Array.isArray(centersResponse.data)) {
          setCenters(centersResponse.data);
          console.log('✅ Centers loaded:', centersResponse.data.length, centersResponse.data.map(c => ({ id: c.center_id, name: c.center_name })));
        } else {
          console.warn('⚠️ Centers response issue:', centersResponse);
        }
        setLoading(prev => ({ ...prev, centers: false }));

        // Handle teachers - check response structure
        let teachersData = teachersResponse.data || teachersResponse;
        if (teachersResponse.success && Array.isArray(teachersData)) {
          setTeachers(teachersData);
          console.log('✅ Teachers loaded:', teachersData.length, teachersData.map(t => ({ id: t.teacher_id, name: t.teacher_name })).slice(0, 3));
        } else {
          console.warn('⚠️ Teachers response issue:', teachersResponse);
          // Try alternative structure
          if (Array.isArray(teachersResponse)) {
            setTeachers(teachersResponse);
            console.log('✅ Teachers loaded (alternative structure):', teachersResponse.length);
          }
        }
        setLoading(prev => ({ ...prev, teachers: false }));

        // Handle courses
        let coursesData = coursesResponse.data || coursesResponse;
        if (coursesResponse.success && Array.isArray(coursesData)) {
          setCourses(coursesData);
          console.log('✅ Courses loaded:', coursesData.length, coursesData.map(c => ({ id: c.id, name: c.course_name })).slice(0, 3));
        } else {
          console.warn('⚠️ Courses response issue:', coursesResponse);
          // Try alternative structure
          if (Array.isArray(coursesResponse)) {
            setCourses(coursesResponse);
            console.log('✅ Courses loaded (alternative structure):', coursesResponse.length);
          }
        }
        setLoading(prev => ({ ...prev, courses: false }));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load required data');
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedData = {
        batch_name: formData.batch_name,
        duration: parseInt(formData.duration), // keep numeric
        center: formData.center,               // string or UUID
        teacher: formData.teacher,             // string or UUID
        course_id: formData.course_id,         // keep as string/UUID
        time_from: formData.time_from,
        time_to: formData.time_to,
        max_students: parseInt(formData.max_students) // convert to integer
      };

      // Add assistant_tutor if provided (optional)
      if (formData.assistant_tutor) {
        updatedData.assistant_tutor = formData.assistant_tutor;
      } else {
        // If assistant_tutor is empty, set to null to remove it
        updatedData.assistant_tutor = null;
      }

      await onUpdate(batch.batch_id, updatedData);
      handleClose();
    } catch (error) {
      console.error('Failed to update batch:', error);
      setError(error.message || 'Failed to update batch');
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

  const isLoading = loading.centers || loading.teachers || loading.courses || loading.batch;

  if (!batch) return null;

  if (error && !batchData) {
    return (
      <div 
        className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div 
          className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Error</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Edit Batch</h2>
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading batch data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">{error}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.batch_name}
                    onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    min="1"
                    max="24"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seat Limit</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                    min="1"
                    max="100"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum number of students allowed in this batch</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.center}
                    onChange={(e) => setFormData({ ...formData, center: e.target.value })}
                    required
                  >
                    <option value="">Select Center</option>
                    {centers.map((center) => (
                      <option key={center.center_id} value={String(center.center_id)}>
                        {center.center_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={String(teacher.teacher_id)}>
                        {teacher.teacher_name}
                      </option>
                    ))}
                  </select>
                </div>

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
                  ) : (
                    <select
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={formData.assistant_tutor}
                      onChange={(e) => setFormData({ ...formData, assistant_tutor: e.target.value })}
                    >
                      <option value="">Select an assistant tutor (Optional)</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.teacher_id} value={String(teacher.teacher_id)}>
                          {teacher.teacher_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={String(course.id)}>
                        {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>

              {/* Footer */}
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
                  disabled={isSubmitting || isLoading}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditBatchModal;
