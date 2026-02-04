import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createState } from '../services/Api';

const CreateStateSlidePanel = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    stateName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Reset form when opening
      setFormData({ stateName: '' });
      setError(null);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await createState(formData, token);
      onSuccess();
      handleClose();
    } catch (error) {
      setError(error.message || 'Failed to create state');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setFormData({ stateName: '' });
      setError(null);
    }, 300); // Wait for animation to complete
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Right Side Slide Panel - BERRY Style */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl z-50 transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full bg-white shadow-2xl flex flex-col overflow-hidden">
          {/* Header - BERRY Style */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-5 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl flex-shrink-0 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">Create New State</h2>
                  <p className="text-blue-100 text-sm truncate">Add a new state to the system</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200 flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* State Name Input - BERRY Style */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      State Name
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.stateName}
                    onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Enter state name"
                    required
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the full name of the state you want to add to the system.
                  </p>
                </div>

                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">State Creation</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Once created, you can assign a state admin to manage this state and its centers.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer - BERRY Style */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.stateName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create State'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateStateSlidePanel;

