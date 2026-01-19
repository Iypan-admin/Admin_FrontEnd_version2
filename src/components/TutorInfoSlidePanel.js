import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getTutorInfoByUserId } from '../services/Api';

const TutorInfoSlidePanel = ({ isOpen, onClose, userId, userName }) => {
  const [tutorInfo, setTutorInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setIsVisible(true);
      fetchTutorInfo();
    } else {
      setIsVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const fetchTutorInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTutorInfoByUserId(userId);
      setTutorInfo(data);
    } catch (err) {
      console.error('Error fetching tutor info:', err);
      // Check if it's a 404 error (no profile found)
      if (err.message && err.message.includes('not found')) {
        setError('This tutor hasn\'t completed their profile information yet.');
      } else {
        setError(err.message || 'Failed to load tutor information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setTutorInfo(null);
      setError(null);
    }, 300); // Wait for animation to complete
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">Tutor Profile Details</h2>
                  <p className="text-blue-100 text-sm truncate">{userName}</p>
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
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Profile</h3>
                  <p className="mt-2 text-gray-500">Please wait while we fetch tutor information...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Profile</h3>
                  <p className="text-gray-500 mb-6 text-center max-w-md">{error}</p>
                  <button
                    onClick={fetchTutorInfo}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                </div>
              ) : !tutorInfo ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Profile Information</h3>
                  <p className="text-gray-500 text-center max-w-md mb-6">
                    This tutor hasn't completed their profile information yet. They need to visit their "My Info" page to fill out their profile details.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-800 font-medium">Profile Setup Required</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Ask the tutor to log in and complete their profile in the "My Info" section.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile Photo Section - BERRY Style */}
                  {tutorInfo.profile_photo && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Profile Photo
                      </h3>
                      <div className="flex items-center space-x-4">
                        <img
                          src={tutorInfo.profile_photo}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Profile photo uploaded</p>
                          <p className="text-xs text-gray-500 mt-1">Click to view full size</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personal Information - BERRY Style */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.full_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.gender || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{formatDate(tutorInfo.date_of_birth)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language Taught</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.language_taught || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Teaching Information - BERRY Style */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Teaching Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Mode</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.teaching_mode || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.experience_years || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency Level</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.proficiency_level || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Levels</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">
                          {Array.isArray(tutorInfo.teaching_levels) 
                            ? tutorInfo.teaching_levels.join(', ') 
                            : tutorInfo.teaching_levels || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.qualification || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language Taught</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{tutorInfo.language_taught || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio and Certifications - BERRY Style */}
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200 min-h-[100px]">{tutorInfo.bio || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200 min-h-[80px]">{tutorInfo.certifications || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps - BERRY Style */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-600">{formatDateTime(tutorInfo.created_at)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Last Updated:</span>
                        <span className="ml-2 text-gray-600">{formatDateTime(tutorInfo.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - BERRY Style */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorInfoSlidePanel;

