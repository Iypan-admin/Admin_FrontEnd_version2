import React, { useState } from 'react';

const RejectionModal = ({ isOpen, onClose, onConfirm, batchName, isLoading }) => {
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rejectionReason.trim()) {
      onConfirm(rejectionReason.trim());
      setRejectionReason('');
    }
  };

  const handleClose = () => {
    setRejectionReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      ></div>
      
      {/* Modal - Right Side Berry Style */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Modal Header - Berry Style */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Reject Batch</h2>
                <p className="text-xs text-gray-500">Batch Rejection Confirmation</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-red-100 rounded-full transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body - Berry Style */}
        <div className="p-6 overflow-y-auto h-full">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    You are about to reject batch:
                  </p>
                  <p className="text-base font-bold text-red-900">
                    {batchName}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Please provide a clear reason for rejection. This will help the Academic Coordinator understand what needs to be improved.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejecting this batch..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-colors text-sm"
                rows={5}
                required
                disabled={isLoading}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {rejectionReason.length}/500 characters
                </p>
                {rejectionReason.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Ready to submit</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - Berry Style */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 border border-transparent rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                disabled={isLoading || !rejectionReason.trim()}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Batch
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RejectionModal;





