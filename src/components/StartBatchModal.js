import React, { useState } from 'react';
import { X } from 'lucide-react';

const StartBatchModal = ({ isOpen, onClose, onConfirm, batchName, isLoading }) => {
  const [totalSessions, setTotalSessions] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const sessions = totalSessions ? parseInt(totalSessions) : null;
    onConfirm(sessions);
  };

  const handleClose = () => {
    setTotalSessions('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Start Batch</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Sessions <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="number"
              min="1"
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter number of sessions (e.g., 5)"
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-gray-500">
              If specified, empty session rows will be created for the teacher to fill in.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
  );
};

export default StartBatchModal;

