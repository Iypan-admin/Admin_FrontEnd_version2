import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, MapPin, BookOpen } from 'lucide-react';
import { getStudentBatchHistory } from '../services/Api';

const BatchHistoryModal = ({ isOpen, onClose, student }) => {
  const [batchHistory, setBatchHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && student) {
      fetchBatchHistory();
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
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (statusLower === "started") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (statusLower === "completed") {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    if (statusLower === "pending") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Batch History</h2>
                  <p className="text-blue-100 text-sm">
                    {student?.name || 'Student'} - {student?.registration_number || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading batch history...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
                <p className="font-medium">{error}</p>
              </div>
            ) : batchHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No batch history found</p>
                <p className="text-sm text-gray-500 mt-1">This student hasn't been enrolled in any batches yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Batch Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Center
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                          className={`hover:bg-blue-50 transition-colors duration-200`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {enrollment.batches?.batch_name || enrollment.batch?.batch_name || enrollment.batch_name || 'N/A'}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {enrollment.batches?.centers?.center_name || enrollment.batch?.center?.center_name || enrollment.center_name || 'N/A'}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700 capitalize">
                              {enrollment.batches?.courses?.mode || enrollment.batch?.course?.mode || enrollment.mode || 'N/A'}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {formatDate(enrollment.batches?.start_date)}
                              </span>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
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
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{batchHistory.length}</span> batch record{batchHistory.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BatchHistoryModal;
