import React, { useState, useEffect } from 'react';
import { getAllCenters } from '../services/Api';

const AssignTeacherModal = ({ onClose, onAssign, teacherId }) => {
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await getAllCenters();
        if (response.success && Array.isArray(response.data)) {
          // Only get centers with an admin assigned
          const availableCenters = response.data.filter(center => center.center_admin);
          setCenters(availableCenters);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching centers:', error);
        setError('Failed to load centers');
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCenter) {
      setError('Please select a center');
      return;
    }
    onAssign(teacherId, selectedCenter);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Assign Teacher to Center</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Center
              </label>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : centers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No centers available for assignment</p>
                  <p className="text-sm mt-1">Please ensure centers have admins assigned</p>
                </div>
              ) : (
                <div className="relative">
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 
                             focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    required
                  >
                    <option value="">Select a center</option>
                    {centers.map((center) => (
                      <option key={center.center_id} value={center.center_id}>
                        {center.center_name} - {center.state.state_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
                         rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || centers.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
                         rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </div>
                ) : (
                  'Assign Teacher'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignTeacherModal;