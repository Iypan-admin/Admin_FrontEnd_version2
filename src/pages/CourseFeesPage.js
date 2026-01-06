import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getAllCourseFees, createCourseFee, updateCourseFee, deleteCourseFee } from '../services/Api';

const CourseFeesPage = () => {
  const [courseFees, setCourseFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    course_name: '',
    duration: '',
    total_fees: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFee, setEditingFee] = useState(null);

  const fetchCourseFees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await getAllCourseFees(token);

      if (response && response.success && Array.isArray(response.data)) {
        setCourseFees(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching course fees:', error);
      setError('Failed to load course fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseFees();
  }, []);

  const handleCreateCourseFee = async (e) => {
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
      
      await createCourseFee(courseFeeData, token);

      setShowCreateModal(false);
      setFormData({
        course_name: '',
        duration: '',
        total_fees: ''
      });

      fetchCourseFees();
    } catch (error) {
      console.error('Error creating course fee:', error);
      setError('Failed to create course fee: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (fee) => {
    setEditingFee(fee);
    setFormData({
      course_name: fee.course_name,
      duration: fee.duration,
      total_fees: fee.total_fees
    });
    setIsEditMode(true);
    setShowCreateModal(true);
  };

  const handleUpdateCourseFee = async (e) => {
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
      
      await updateCourseFee(editingFee.id, courseFeeData, token);

      setShowCreateModal(false);
      setIsEditMode(false);
      setEditingFee(null);
      setFormData({
        course_name: '',
        duration: '',
        total_fees: ''
      });

      fetchCourseFees();
    } catch (error) {
      console.error('Error updating course fee:', error);
      setError('Failed to update course fee: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course fee?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await deleteCourseFee(id, token);
      fetchCourseFees();
    } catch (error) {
      console.error('Error deleting course fee:', error);
      setError('Failed to delete course fee: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
                          Course Fees Management
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base">
                          Manage course fees and pricing
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
                      Add Course Fee
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-xl mr-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                      <p className="text-red-600">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Course Fees</h3>
                  <p className="mt-2 text-gray-500">Please wait...</p>
                </div>
              ) : (
                <>
                  {/* Empty State */}
                  {courseFees.length === 0 && (
                    <div className="text-center py-12 sm:py-16 lg:py-20">
                      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-8 sm:p-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">No Course Fees Yet</h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                          Start by adding your first course fee structure.
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold text-lg"
                        >
                          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Course Fee
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Course Fees Table */}
                  {courseFees.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Course Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Duration (Months)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Total Fees (₹)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Created At
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {courseFees.map((fee) => (
                              <tr key={fee.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-gray-900">{fee.course_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-700">{fee.duration}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-green-600">₹{fee.total_fees.toLocaleString('en-IN')}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-700">
                                    {new Date(fee.created_at).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditClick(fee)}
                                      className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(fee.id)}
                                      className="inline-flex items-center px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditMode ? "Edit Course Fee" : "Add Course Fee"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditMode(false);
                  setEditingFee(null);
                  setFormData({ course_name: '', duration: '', total_fees: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={isEditMode ? handleUpdateCourseFee : handleCreateCourseFee}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    value={formData.course_name}
                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                    placeholder="Enter course name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (Months) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Enter duration in months"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Fees (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    value={formData.total_fees}
                    onChange={(e) => setFormData({ ...formData, total_fees: e.target.value })}
                    placeholder="Enter total fees"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setIsEditMode(false);
                    setEditingFee(null);
                    setFormData({ course_name: '', duration: '', total_fees: '' });
                  }}
                  className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseFeesPage;

