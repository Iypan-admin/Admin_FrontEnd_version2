import React, { useState } from 'react';

const EditTransactionModal = ({ payment, onClose, onUpdate }) => {
  const [duration, setDuration] = useState(payment?.course_duration || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duration <= 0) {
      setError('Please enter a valid duration');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({ course_duration: duration });
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to update duration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 transform transition-all scale-100">
        {/* Modal Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">Edit Duration</h2>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Update Course Length</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-all shadow-sm text-gray-400 hover:text-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
                {payment?.student_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-800 truncate">{payment?.student_name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{payment?.course_name}</p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl animate-shake">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Course Duration (Months)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full pl-6 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  min="1"
                  max="48"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase">Months</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 text-xs font-black text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest"
                disabled={isSubmitting}
              >
                Go Back
              </button>
              <button
                type="submit"
                className="px-6 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all uppercase tracking-widest disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Saving
                  </div>
                ) : (
                  'Confirm Update'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;