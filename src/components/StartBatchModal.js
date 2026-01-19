import React, { useState, useEffect } from 'react';

const StartBatchModal = ({ isOpen, onClose, onConfirm, batchName, isLoading }) => {
  const [totalSessions, setTotalSessions] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');

  // Handle slide-in animation and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Trigger slide-in animation after modal is shown
      setTimeout(() => setIsVisible(true), 10);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate session count is mandatory
    if (!totalSessions || totalSessions.trim() === '') {
      setError('Total Sessions is required');
      return;
    }

    const sessions = parseInt(totalSessions);
    if (isNaN(sessions) || sessions < 1) {
      setError('Please enter a valid number of sessions (minimum 1)');
      return;
    }

    onConfirm(sessions);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setTotalSessions('');
      setError('');
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isOpen) return null;

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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #10b981, #059669)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Start Batch</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Name
              </label>
              <input
                type="text"
                value={batchName || ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Sessions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={totalSessions}
                onChange={(e) => {
                  setTotalSessions(e.target.value);
                  setError(''); // Clear error on input
                }}
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter number of sessions (e.g., 30)"
                disabled={isLoading}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Empty session rows will be created for the teacher to fill in.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Starting...
                  </>
                ) : (
                  'Start Batch'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StartBatchModal;

