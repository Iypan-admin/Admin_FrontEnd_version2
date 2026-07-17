import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Copy, CheckCircle, Trash2, Edit, Video } from 'lucide-react';

const GoogleMeetModal = ({
  isOpen,
  onClose,
  meetLink,
  title = "Class Meeting",
  date,
  time,
  note,
  meetId,
  onEdit,
  onDelete,
  showControls = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState('');

  // Convert Google Meet link to embedded format
  const getEmbedUrl = (link) => {
    try {
      // Clean the URL first - remove any mobile app intents or extra parameters
      let cleanLink = link.trim();
      
      // Remove mobile app intent URLs
      if (cleanLink.includes('intent://')) {
        // Extract the actual Google Meet URL from the intent
        const urlMatch = cleanLink.match(/url%3D([^&]+)/);
        if (urlMatch) {
          cleanLink = decodeURIComponent(urlMatch[1]);
        }
      }
      
      // Extract meeting code from various Google Meet link formats
      const patterns = [
        /https:\/\/meet\.google\.com\/([a-z0-9-]+)/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\?.*/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\/.*/i
      ];

      for (const pattern of patterns) {
        const match = cleanLink.match(pattern);
        if (match) {
          const meetingCode = match[1];
          // Use clean Google Meet URL for embedding - remove all query parameters
          return `https://meet.google.com/${meetingCode}`;
        }
      }

      // If no pattern matches, return original link
      return cleanLink;
    } catch (err) {
      console.error('Error processing Meet link:', err);
      return link;
    }
  };

  // Alternative embedding method for when direct embedding fails
  const getAlternativeEmbedUrl = (link) => {
    try {
      // Clean the URL first - remove any mobile app intents
      let cleanLink = link.trim();
      
      if (cleanLink.includes('intent://')) {
        const urlMatch = cleanLink.match(/url%3D([^&]+)/);
        if (urlMatch) {
          cleanLink = decodeURIComponent(urlMatch[1]);
        }
      }
      
      const patterns = [
        /https:\/\/meet\.google\.com\/([a-z0-9-]+)/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\?.*/i
      ];

      for (const pattern of patterns) {
        const match = cleanLink.match(pattern);
        if (match) {
          const meetingCode = match[1];
          // Alternative: Use Google Meet's embed-friendly URL
          return `https://meet.google.com/${meetingCode}?authuser=0&hs=179`;
        }
      }
      return cleanLink;
    } catch (err) {
      return link;
    }
  };

  // Initialize embed URL
  useEffect(() => {
    if (isOpen && meetLink) {
      const embedUrl = getEmbedUrl(meetLink);
      setCurrentEmbedUrl(embedUrl);
      setRetryCount(0);
      
      // Proactively show fallback for Google Meet since it blocks iframe embedding
      if (embedUrl.includes('meet.google.com')) {
        // Set a short delay to show loading, then show the fallback
        const timer = setTimeout(() => {
          setError('Google Meet cannot be embedded due to security restrictions. Please use the "Open in Tab" button to join the meeting.');
          setIsLoading(false);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    } else {
      setCurrentEmbedUrl('');
    }
  }, [isOpen, meetLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleOpenExternal = () => {
    window.open(meetLink, '_blank', 'noopener,noreferrer');
  };

  const handleEdit = () => {
    onClose();
    onEdit && onEdit(meetId);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      onDelete && onDelete(meetId);
      onClose();
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Google Meet cannot be embedded due to security restrictions. Please use the "Open in Tab" button to join the meeting.');
  };

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setLinkCopied(false);
    }
  }, [isOpen]);

  // Handle iframe load timeout
  useEffect(() => {
    if (isOpen && currentEmbedUrl) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setError('Google Meet is taking too long to load. Please try opening in a new tab.');
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isOpen, currentEmbedUrl, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl mx-4 my-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {(date || time) && (
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                {date && <span>📅 {new Date(date).toLocaleDateString()}</span>}
                {time && <span>🕐 {time}</span>}
              </div>
            )}
            {note && (
              <p className="text-sm text-gray-600 mt-1 italic">{note}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Teacher Controls */}
            {showControls && (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  title="Edit class"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Delete class"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="Copy meeting link"
            >
              {linkCopied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {/* Open External Button */}
            <button
              onClick={handleOpenExternal}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Tab</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Google Meet...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Meet Ready</h3>
                <p className="text-gray-600 mb-4">
                  Google Meet cannot be embedded due to security restrictions, but you can join the meeting in a new tab.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">i</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Meeting Details:</strong><br />
                        <span className="font-medium">{title}</span><br />
                        <span className="text-blue-600">{new Date(date).toLocaleDateString()} at {new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleOpenExternal}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                >
                  <Video className="w-5 h-5" />
                  <span>Join Google Meet</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {currentEmbedUrl ? (
                <iframe
                  src={currentEmbedUrl}
                  className="w-full h-full border-0"
                  allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                  sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title={`Google Meet - ${title}`}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p>Preparing Google Meet...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>🔗 Meeting Link:</span>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">
                {meetLink}
              </code>
            </div>
            <div className="text-xs text-gray-500">
              If the meeting doesn't load, try opening in a new tab
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMeetModal;
