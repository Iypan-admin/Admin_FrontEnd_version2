import React, { useState, useEffect } from 'react';
import { getAllCenters, getAllTeachers, getAllCourses, getBatchById } from '../services/Api';

const EditBatchModal = ({ batch, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    batch_name: '',
    duration: 6,
    center: '',
    teacher: '',
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

  // Fetch full batch details when modal opens
  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!batch || !batch.batch_id) {
        setError('Batch ID is missing');
        setLoading(prev => ({ ...prev, batch: false }));
        return;
      }

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
    if (batchData.center) {
      centerId = String(batchData.center);
      // Verify it exists in centers list if available
      if (centers.length > 0) {
        const exists = centers.some(c => String(c.center_id) === centerId);
        if (!exists) {
          console.warn('⚠️ Center ID not found in centers list:', centerId);
        }
      }
      updateFormData({ center: centerId });
    } else if (batchData.center_name && centers.length > 0) {
      const selectedCenter = centers.find(c => c.center_name === batchData.center_name);
      if (selectedCenter) {
        centerId = String(selectedCenter.center_id);
        updateFormData({ center: centerId });
      }
    }

    // 3. Try to populate teacher dropdown
    let teacherId = '';
    if (batchData.teacher && teachers.length > 0) {
      const batchTeacherId = String(batchData.teacher);
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
        console.log('👨‍🏫 Teacher matched:', teacherId);
      } else {
        // Use the ID directly if teachers list doesn't have it yet
        teacherId = batchTeacherId;
        updateFormData({ teacher: teacherId });
        console.log('👨‍🏫 Using teacher ID directly (not found in list yet):', teacherId);
      }
    } else if (batchData.teacher) {
      // Teachers list not loaded yet, use ID directly
      teacherId = String(batchData.teacher);
      updateFormData({ teacher: teacherId });
      console.log('👨‍🏫 Using teacher ID directly (teachers list not loaded):', teacherId);
    } else if (batchData.teacher_name && teachers.length > 0) {
      const selectedTeacher = teachers.find(t => t.teacher_name === batchData.teacher_name);
      if (selectedTeacher) {
        teacherId = String(selectedTeacher.teacher_id);
        updateFormData({ teacher: teacherId });
        console.log('👨‍🏫 Teacher matched by name:', teacherId);
      }
    }

    // 4. Try to populate course dropdown
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


      await onUpdate(batch.batch_id, updatedData);
      onClose();
    } catch (error) {
      console.error('Failed to update batch:', error);
    }
  };

  const isLoading = loading.centers || loading.teachers || loading.courses || loading.batch;

  if (error && !batchData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Edit Batch</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading batch data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">{error}</p>
              </div>
            )}
            <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.batch_name}
                onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (months)</label>
              <input
                type="number"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                min="1"
                max="24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Seat Limit</label>
              <input
                type="number"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                min="1"
                max="100"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Maximum number of students allowed in this batch</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Center</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              <label className="block text-sm font-medium text-gray-700">Teacher</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              <label className="block text-sm font-medium text-gray-700">Course</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.time_from}
                onChange={(e) => setFormData({ ...formData, time_from: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.time_to}
                onChange={(e) => setFormData({ ...formData, time_to: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Save Changes'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default EditBatchModal;
