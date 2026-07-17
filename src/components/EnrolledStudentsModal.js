import React, { useState, useEffect } from 'react';

const EnrolledStudentsModal = ({ isOpen, onClose, batchId, batchName }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && batchId) {
      fetchEnrolledStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, batchId]);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3008/api/students/batch/${batchId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch students');
      
      const data = await response.json();
      setStudents(data.data || []);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone) => {
    return phone ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : "N/A";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Enrolled Students</h2>
              <p className="text-blue-100 text-sm">{batchName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No students enrolled yet</div>
          ) : (
            <div className="space-y-3">
              {students.map((student, index) => (
                <div
                  key={student.student_id || index}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-500">{formatPhone(student.phone)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Registration</div>
                      <div className="font-mono text-sm font-semibold text-blue-600">{student.registration_number || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="text-center text-sm text-gray-600">
            Total: {students.length} student{students.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrolledStudentsModal;
