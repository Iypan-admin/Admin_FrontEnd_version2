import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

const ViewElitePassSlidePanel = ({ isOpen, onClose, card }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isOpen || !card) return null;

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
        className={`fixed top-0 right-0 h-full w-full max-w-3xl z-50 transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full bg-white shadow-2xl flex flex-col overflow-hidden">
          {/* Header - BERRY Style */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl flex-shrink-0 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">Elite Pass Preview</h2>
                  <p className="text-blue-100 text-sm truncate">{card.name_on_the_pass || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => window.open(card.pdf_url, '_blank')}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-5 h-5" />
                </button>
                <button
                    onClick={handleClose}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
                >
                    <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col p-4 sm:p-6">
            {/* Card Info Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Card Full Name</p>
                    <p className="text-sm font-semibold text-gray-900">{card.card_name || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Card Number</p>
                    <p className="text-sm font-mono font-semibold text-blue-600">{card.card_number || 'N/A'}</p>
                </div>
            </div>

            {/* PDF Preview Container */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">PDF Viewer</span>
                    </div>
                </div>
                {card.pdf_url ? (
                    <iframe
                        src={`${card.pdf_url}#toolbar=0`}
                        title="Pass Preview"
                        className="w-full h-full flex-1 border-none"
                    ></iframe>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-lg font-semibold text-gray-700">Preview Unavailable</p>
                        <p className="text-sm">The PDF file for this pass could not be located.</p>
                    </div>
                )}
            </div>
          </div>

          {/* Footer - BERRY Style */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200 flex-shrink-0">
            <span className="text-xs text-gray-500 font-medium italic">
                Secure Pass Verification System
            </span>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-bold text-sm shadow-sm"
                >
                    Close Preview
                </button>
                <a
                    href={card.pdf_url}
                    download
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-bold text-sm shadow-sm flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download PDF
                </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewElitePassSlidePanel;
