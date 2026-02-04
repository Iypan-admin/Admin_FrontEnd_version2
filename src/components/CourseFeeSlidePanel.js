import React, { useState, useEffect } from "react";
import { createCourseFee, updateCourseFee } from "../services/Api";

const CourseFeeSlidePanel = ({ isOpen, onClose, onSuccess, initialData, isEditMode }) => {
  const [formData, setFormData] = useState({
    course_name: '',
    duration: '',
    total_fees: ''
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
          duration: initialData.duration || '',
          total_fees: initialData.total_fees || ''
        });
      } else {
        setFormData({
          course_name: '',
          duration: '',
          total_fees: ''
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
      
      const courseFeeData = {
        course_name: formData.course_name.trim(),
        duration: Number(formData.duration),
        total_fees: Number(formData.total_fees)
      };
      
      if (isEditMode && initialData?.id) {
        await updateCourseFee(initialData.id, courseFeeData, token);
      } else {
        await createCourseFee(courseFeeData, token);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving course fee:', error);
      setError(isEditMode ? 'Failed to update course fee' : 'Failed to create course fee');
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
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-green-500 to-green-600">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {isEditMode ? "Edit Course Fee" : "Add New Fee Structure"}
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
                  placeholder="e.g. French Proficiency"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (Months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 6"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              {/* Total Fees */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total Course Fee *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                    value={formData.total_fees}
                    onChange={(e) => setFormData({ ...formData, total_fees: e.target.value })}
                  />
                </div>
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
                className="px-8 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  isEditMode ? "Save Changes" : "Save Structure"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseFeeSlidePanel;
