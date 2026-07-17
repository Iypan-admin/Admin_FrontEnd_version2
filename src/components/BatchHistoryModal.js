import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, MapPin, BookOpen } from 'lucide-react';
import { getStudentBatchHistory } from '../services/Api';

const BatchHistoryModal = ({ isOpen, onClose, student }) => {
  const [batchHistory, setBatchHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setIsVisible(true);
      fetchBatchHistory();
    } else {
      setIsVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student]);

  const fetchBatchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStudentBatchHistory(student.student_id);
      
      if (response && response.enrollments) {
        setBatchHistory(response.enrollments);
      }
    } catch (err) {
      console.error("Error fetching batch history:", err);
      setError("Failed to load batch history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "approved") {
      return "bg-blue-100 text-blue-700 border-blue-300";
    }
    if (statusLower === "started") {
      return "bg-green-100 text-green-700 border-green-300";
    }
    if (statusLower === "completed") {
      return "bg-purple-100 text-purple-700 border-purple-300";
    }
    if (statusLower === "pending") {
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
    return "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getStatusText = (enrollment) => {
    // Get batch status from batches table
    const batchStatus = enrollment.batches?.status;
    
    if (!batchStatus) {
      return "Pending";
    }
    
    const statusLower = batchStatus.toLowerCase();
    
    // Map batch status to display status
    const statusMap = {
      'approved': 'Not Started',
      'started': 'Ongoing',
      'completed': 'Completed',
      'pending': 'Pending',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled'
    };
    
    return statusMap[statusLower] || batchStatus;
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={handleClose}
      />

      {/* Right Side Slide-in Panel */}
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[42rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - BERRY Style */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Batch History</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {student?.name || 'Student'} - {student?.registration_number || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm sm:text-base text-center">Loading batch history...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
                <p className="font-medium">{error}</p>
              </div>
            ) : batchHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm sm:text-base text-center font-medium">No batch history found</p>
                <p className="text-sm text-gray-400 mt-1 text-center">This student hasn't been enrolled in any batches yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Batch Name
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Center
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Mode
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          End Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchHistory.map((enrollment, index) => {
                        const batchStatus = enrollment.batches?.status;
                        const statusText = getStatusText(enrollment);
                        const statusColor = getStatusColor(batchStatus);
                        
                        return (
                          <tr
                            key={enrollment.enrollment_id || index}
                            className="hover:bg-gray-50 transition-colors duration-200"
                          >
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {enrollment.batches?.batch_name || enrollment.batch?.batch_name || enrollment.batch_name || 'N/A'}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                  {enrollment.batches?.centers?.center_name || enrollment.batch?.center?.center_name || enrollment.center_name || 'N/A'}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700 capitalize">
                                {enrollment.batches?.courses?.mode || enrollment.batch?.course?.mode || enrollment.mode || 'N/A'}
                              </span>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                  {formatDate(enrollment.batches?.start_date)}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-700">
                                  {formatDate(enrollment.batches?.end_date)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer - BERRY Style */}
          <div className="pt-6 border-t border-gray-200 mt-6 px-6 pb-6">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <div className="text-sm text-gray-600 flex items-center">
                <span className="font-medium">{batchHistory.length}</span>
                <span className="ml-1">batch record{batchHistory.length !== 1 ? 's' : ''} found</span>
              </div>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 shadow-sm hover:shadow-md"
                style={{ backgroundColor: '#2196f3' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BatchHistoryModal;
