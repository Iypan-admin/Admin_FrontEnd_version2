import React, { useState, useEffect } from "react";
import { createCourse, updateCourse } from "../services/Api";

const CourseSlidePanel = ({ isOpen, onClose, onSuccess, initialData, isEditMode }) => {
  const [formData, setFormData] = useState({
    course_name: '',
    program: '',
    type: '',
    language: '',
    level: '',
    mode: '',
    duration: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
      if (initialData) {
        setFormData({
          course_name: initialData.course_name || '',
          program: initialData.program || '',
          type: initialData.type || '',
          language: initialData.language || '',
          level: initialData.level || '',
          mode: initialData.mode || '',
          duration: initialData.duration || ''
        });
      } else {
        setFormData({
          course_name: '',
          program: '',
          type: '',
          language: '',
          level: '',
          mode: '',
          duration: ''
        });
      }
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialData]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const courseData = {
        ...formData,
        type: formData.type || null,
        duration: Number(formData.duration)
      };
      
      if (isEditMode && initialData?.id) {
        await updateCourse(initialData.id, courseData, token);
      } else {
        await createCourse(courseData, token);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving course:', error);
      setError(isEditMode ? 'Failed to update course' : 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-blue-500 to-blue-600">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {isEditMode ? "Edit Course" : "Add New Course"}
              </h2>
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

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. French Immersion Proficiency"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                />
              </div>

              {/* Program */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Program *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master of Arts in Linguistics"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Language *</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="FRENCH">FRENCH</option>
                    <option value="GERMAN">GERMAN</option>
                    <option value="JAPANESE">JAPANESE</option>
                    <option value="SPANISH">SPANISH</option>
                    <option value="ENGLISH">ENGLISH</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Level *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A1, B2"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Mode */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Learning Mode *</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  >
                    <option value="">Select Mode</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Course Type (Optional)</label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="">Standard</option>
                  <option value="Immersion">Immersion</option>
                  <option value="Fast Track">Fast Track</option>
                  <option value="Foundation">Foundation</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  isEditMode ? "Save Changes" : "Create Course"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseSlidePanel;
