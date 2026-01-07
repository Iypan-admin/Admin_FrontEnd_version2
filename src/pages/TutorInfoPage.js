import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  getMyTutorInfo,
  createTutorInfo,
  updateTutorInfo,
  deleteTutorInfo,
  uploadTutorProfilePhoto,
} from "../services/Api";

function TutorInfoPage() {
  const [tutorInfo, setTutorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Calculate profile completion percentage based on actual form fields
  const calculateProfileCompletion = (info) => {
    if (!info) return 0;
    
    // Only check fields that actually exist in the form
    const fields = [
      'full_name', 'email', 'phone', 'date_of_birth', 'gender',
      'language_taught', 'proficiency_level', 'qualification', 'experience_years', 'teaching_mode',
      'teaching_levels', 'bio', 'certifications', 'profile_photo'
    ];
    
    const filledFields = fields.filter(field => {
      const value = info[field];
      // For arrays (like teaching_levels), check if it has items
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      // For other fields, check if not empty
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((filledFields.length / fields.length) * 100);
  };

  // Format last updated time
  const formatLastUpdated = (info) => {
    if (!info || !info.updated_at) return 'Never';
    
    try {
      const updatedDate = new Date(info.updated_at);
      const now = new Date();
      const diffInSeconds = Math.floor((now - updatedDate) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
      
      return updatedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Recently';
    }
  };

  const profileCompletion = calculateProfileCompletion(tutorInfo);

  useEffect(() => {
    fetchTutorInfo();
  }, []);

  const fetchTutorInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching tutor info...");
      const data = await getMyTutorInfo();
      console.log("Tutor info data:", data);
      setTutorInfo(data || null);
      setFormData(data || {});
    } catch (error) {
      console.error("Failed to fetch tutor info:", error);
      setError("Failed to load tutor information");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const values = formData[name] || [];
      if (checked) {
        setFormData({ ...formData, [name]: [...values, value] });
      } else {
        setFormData({
          ...formData,
          [name]: values.filter((v) => v !== value),
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      console.log("Uploading file:", file.name, file.type, file.size);
      const publicUrl = await uploadTutorProfilePhoto(file);
      console.log("Upload successful, public URL:", publicUrl);
      setFormData({ ...formData, profile_photo: publicUrl });
      setSuccessMessage("Profile photo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload profile photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      if (tutorInfo) {
        await updateTutorInfo(formData);
        setSuccessMessage("Tutor information updated successfully!");
      } else {
        try {
          await createTutorInfo(formData);
          setSuccessMessage("Tutor information created successfully!");
        } catch (createError) {
          if (createError.message?.includes("already exists")) {
            await updateTutorInfo(formData);
            setSuccessMessage("Tutor information updated successfully!");
          } else throw createError;
        }
      }
      setEditing(false);
      fetchTutorInfo();
    } catch (error) {
      console.error("Failed to save tutor info:", error);
      setError("Failed to save tutor information.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your tutor info?"))
      return;

    try {
      setError(null);
      await deleteTutorInfo();
      setTutorInfo(null);
      setFormData({});
      setEditing(true);
      setSuccessMessage("Tutor information deleted successfully!");
    } catch (error) {
      console.error("Failed to delete tutor info:", error);
      setError("Failed to delete tutor information.");
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData(tutorInfo || {});
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Sidebar Navbar */}
        <Navbar />
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-2 sm:p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Header Section - Attractive Design with Previous Color Pattern */}
              <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                </div>
                
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>

                <div className="relative p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left Section - Title and Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Icon with Glow Effect */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <div className="relative p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl group-hover:scale-105 transition-transform duration-300">
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Title Section */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                            My Profile
                          </h1>
                          <div className={`px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-lg ${
                            loading 
                              ? 'bg-yellow-400/40 text-yellow-100 border-yellow-300/60' 
                              : profileCompletion >= 80
                              ? 'bg-green-400/40 text-green-100 border-green-300/60'
                              : profileCompletion >= 50
                              ? 'bg-orange-400/40 text-orange-100 border-orange-300/60'
                              : 'bg-red-400/40 text-red-100 border-red-300/60'
                          }`}>
                            {loading ? '⏳ Loading...' : profileCompletion >= 80 ? '✓ Complete' : profileCompletion >= 50 ? '⚙ In Progress' : '⚠ Setup Required'}
                          </div>
                        </div>
                        <p className="text-blue-100 text-sm sm:text-base font-medium">
                          ✨ Manage your teaching profile and information
                        </p>
                        
                        {/* Status Indicators */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-2 rounded-xl border border-white/30 shadow-lg hover:bg-white/25 transition-all duration-300">
                            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/70"></div>
                            <span className="text-white text-xs font-bold">Active</span>
                          </div>
                          {tutorInfo && (
                            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-2 rounded-xl border border-white/30 shadow-lg hover:bg-white/25 transition-all duration-300">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white text-xs font-semibold">Profile:</span>
                              <div className="w-24 sm:w-32 bg-white/25 rounded-full h-2.5 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-2.5 rounded-full shadow-lg transition-all duration-500 ${
                                    profileCompletion >= 80 
                                      ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400' 
                                      : profileCompletion >= 50 
                                      ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400'
                                      : 'bg-gradient-to-r from-red-400 via-pink-400 to-rose-400'
                                  }`} 
                                  style={{ width: `${profileCompletion}%` }}
                                ></div>
                              </div>
                              <span className="text-white text-xs font-bold min-w-[3rem]">{profileCompletion}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Decorative Elements */}
                    <div className="flex items-center space-x-3">
                      <div className="hidden lg:flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-white/30 to-white/10 rounded-xl"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Messages - Responsive */}
              {successMessage && (
                <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 text-emerald-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center shadow-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mr-3 sm:mr-4 shadow-lg flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-base sm:text-lg block">{successMessage}</span>
                    <p className="text-emerald-600 text-xs sm:text-sm mt-1">Your changes have been saved successfully!</p>
                  </div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0 mt-2 sm:mt-0"></div>
                </div>
              )}

              {error && (
                <div className="bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border border-red-200 text-red-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center shadow-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-red-400 to-rose-500 rounded-full mr-3 sm:mr-4 shadow-lg flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-base sm:text-lg block">{error}</span>
                    <p className="text-red-600 text-xs sm:text-sm mt-1">Please try again or contact support if the issue persists.</p>
                  </div>
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0 mt-2 sm:mt-0"></div>
                </div>
              )}

              {/* Enhanced Loading State - Responsive */}
              {loading ? (
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 animate-pulse"></div>
                  <div className="absolute top-4 right-4 w-24 sm:w-32 h-24 sm:h-32 bg-blue-200/20 rounded-full blur-2xl animate-bounce"></div>
                  <div className="absolute bottom-4 left-4 w-20 sm:w-24 h-20 sm:h-24 bg-purple-200/20 rounded-full blur-xl animate-bounce delay-1000"></div>
                  
                  <div className="relative z-10">
                    <div className="relative inline-block">
                      {/* Outer Ring */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border-4 border-blue-200 rounded-full animate-spin"></div>
                      {/* Inner Ring */}
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-13 sm:w-16 lg:w-20 h-13 sm:h-16 lg:h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                      {/* Center Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Loading your profile...</h3>
                      <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Please wait while we fetch your information</p>
                      <div className="flex justify-center space-x-1 mt-3 sm:mt-4">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Enhanced Profile Photo Section - Responsive */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100 p-4 sm:p-6 lg:p-8 xl:p-10 xl:sticky xl:top-6 relative overflow-hidden group hover:shadow-3xl transition-all duration-500">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/20 to-blue-200/20 rounded-full blur-xl"></div>
                  
                  <div className="text-center relative z-10">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-gray-800 mb-6 sm:mb-8 flex items-center justify-center group">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl mr-3 sm:mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profile Photo
                      </span>
                    </h3>
                    
                    {formData.profile_photo ? (
                      <div className="relative inline-block group">
                        <div className="relative">
              <img
                src={formData.profile_photo}
                alt="Profile"
                onLoad={() => console.log("Image loaded successfully:", formData.profile_photo)}
                onError={(e) => console.error("Image failed to load:", formData.profile_photo, e)}
                            className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full object-cover border-2 sm:border-4 border-white shadow-2xl ring-2 sm:ring-4 ring-blue-200/50 group-hover:scale-105 transition-all duration-300"
                          />
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        {editing && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                            <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                              <div className="p-2 sm:p-3 bg-white/20 rounded-full mb-2 sm:mb-3">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <p className="text-white text-sm sm:text-base lg:text-lg font-bold">Change Photo</p>
                              <p className="text-white/80 text-xs sm:text-sm">Click to upload new image</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 border-2 sm:border-4 border-white flex items-center justify-center mx-auto shadow-2xl ring-2 sm:ring-4 ring-blue-200/50 group-hover:scale-105 transition-all duration-300">
                        <div className="text-center">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-blue-400 mx-auto mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-blue-500 text-xs sm:text-sm font-medium">No Photo</p>
                        </div>
                      </div>
                    )}
                    
                    {editing && (
                      <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                        <label className="cursor-pointer group block">
                          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 inline-flex items-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105">
                            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg mr-2 sm:mr-3 group-hover:rotate-12 transition-transform duration-300">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-sm sm:text-base lg:text-lg block">
                                {uploading ? "Uploading..." : "Upload Photo"}
                              </span>
                              <span className="text-blue-100 text-xs sm:text-sm">
                                {uploading ? "Please wait..." : "Click to select image"}
                              </span>
                            </div>
                          </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
            />
                        </label>
            {uploading && (
                          <div className="flex items-center justify-center space-x-2 sm:space-x-3 bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="relative">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-200 rounded-full"></div>
                              <div className="absolute top-0 left-0 w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-blue-700 font-medium text-sm sm:text-base">Processing your image...</span>
                          </div>
                        )}
                        <div className="text-center text-gray-500 text-xs sm:text-sm">
                          <p>📸 JPG, PNG, or GIF up to 10MB</p>
                          {formData.profile_photo && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                              <strong>Current URL:</strong><br />
                              {formData.profile_photo}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Main Form Section - Responsive */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-100/50 p-4 sm:p-6 lg:p-8 xl:p-10 relative overflow-hidden group hover:shadow-3xl transition-all duration-500">
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/10 to-purple-200/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-200/10 to-blue-200/10 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10">
                    {/* Modern Header Section */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                              Personal Information
                            </h2>
                            <p className="text-gray-600 text-sm sm:text-base">✨ Complete your profile details</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                          {editing ? (
                            <>
                              <button
                                onClick={handleSave}
                                className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Save Changes
                              </button>
                              <button
                                onClick={handleCancel}
                                className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditing(true)}
                                className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Profile
                              </button>
                              {tutorInfo && (
                                <button
                                  onClick={handleDelete}
                                  className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                      {/* Modern Basic Information Section */}
                      <div className="space-y-6">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                              <p className="text-sm text-gray-600">Your personal details</p>
                            </div>
                          </div>

                          {[
                            { label: "Full Name", name: "full_name", type: "text", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", required: true },
                            { label: "Email", name: "email", type: "email", icon: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", required: true },
                            { label: "Phone", name: "phone", type: "tel", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                            { label: "Date of Birth", name: "date_of_birth", type: "date", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          ].map((field) => (
                            <div key={field.name} className="space-y-2">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={field.icon} />
                                  </svg>
                                </div>
                                <span>{field.label}</span>
                                {field.required && <span className="text-red-500">*</span>}
                              </label>
                              <div className="relative">
                                <input
                                  type={field.type}
                                  name={field.name}
                                  value={formData[field.name] || ""}
                                  onChange={handleChange}
                                  disabled={!editing}
                                  className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 ${
                                    editing 
                                      ? "border-blue-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
                                      : "border-gray-200 bg-gray-50"
                                  }`}
                                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                                />
                                {editing && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Modern Gender Field */}
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                              <div className="p-1.5 bg-pink-100 rounded-lg">
                                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span>Gender</span>
                            </label>
                            <div className="relative">
                              <select
                                name="gender"
                                value={formData.gender || ""}
                                onChange={handleChange}
                                disabled={!editing}
                                className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 appearance-none ${
                                  editing 
                                    ? "border-pink-200 bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 shadow-sm" 
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">👨 Male</option>
                                <option value="Female">👩 Female</option>
                                <option value="Other">🏳️‍⚧️ Other</option>
                                <option value="Prefer not to say">🤐 Prefer not to say</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 pointer-events-none">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
          </div>

                      {/* Modern Teaching Information Section */}
                      <div className="space-y-6">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Teaching Information</h3>
                              <p className="text-sm text-gray-600">Your teaching profile details</p>
                            </div>
                          </div>

                          {[
                            { label: "Language Taught", name: "language_taught", type: "text", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", required: true },
                            { label: "Proficiency Level", name: "proficiency_level", type: "text", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
                            { label: "Qualification", name: "qualification", type: "text", icon: "M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
                            { label: "Experience Years", name: "experience_years", type: "text", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                          ].map((field) => (
                            <div key={field.name} className="space-y-2">
                              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                                <div className="p-1.5 bg-green-100 rounded-lg">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={field.icon} />
                                  </svg>
                                </div>
                                <span>{field.label}</span>
                                {field.required && <span className="text-red-500">*</span>}
                              </label>
                              <div className="relative">
                                <input
                                  type={field.type}
                                  name={field.name}
                                  value={formData[field.name] || ""}
                                  onChange={handleChange}
                                  disabled={!editing}
                                  className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 ${
                                    editing 
                                      ? "border-green-200 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 shadow-sm" 
                                      : "border-gray-200 bg-gray-50"
                                  }`}
                                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                                />
                                {editing && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Modern Teaching Mode Field */}
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                              <div className="p-1.5 bg-purple-100 rounded-lg">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span>Teaching Mode</span>
                            </label>
                            <div className="relative">
                              <select
                                name="teaching_mode"
                                value={formData.teaching_mode || ""}
                                onChange={handleChange}
                                disabled={!editing}
                                className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 appearance-none ${
                                  editing 
                                    ? "border-purple-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm" 
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <option value="">Select Teaching Mode</option>
                                <option value="Online">🌐 Online</option>
                                <option value="Offline">🏫 Offline</option>
                                <option value="Hybrid">🔄 Hybrid</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
          </div>

          {/* Teaching Levels - Responsive */}
                  <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
              Teaching Levels
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      {["Beginner", "Intermediate", "Advanced", "Elementary", "Middle School", "High School"].map((level) => (
                        <label key={level} className={`flex items-center p-2.5 sm:p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          formData.teaching_levels?.includes(level) 
                            ? "border-blue-500 bg-blue-50 text-blue-700" 
                            : "border-gray-200 hover:border-gray-300"
                        } ${!editing ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="checkbox"
                    name="teaching_levels"
                    value={level}
                    checked={formData.teaching_levels?.includes(level) || false}
                    onChange={handleChange}
                    disabled={!editing}
                            className="mr-2 sm:mr-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                          <span className="font-medium text-sm sm:text-base">{level}</span>
                </label>
              ))}
            </div>
          </div>

                  {/* Bio - Responsive */}
                  <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Bio & Certifications
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                          Bio
                        </label>
                        <textarea
                          name="bio"
                          value={formData.bio || ""}
                          onChange={handleChange}
                          disabled={!editing}
                          rows={3}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-sm sm:text-base ${
                            editing 
                              ? "border-gray-300 bg-white" 
                              : "border-gray-200 bg-gray-50"
                          }`}
                          placeholder="Tell us about yourself, your teaching philosophy, and what makes you unique..."
                        />
                      </div>
          <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                          Certifications
            </label>
                        <textarea
                          name="certifications"
                          value={formData.certifications || ""}
              onChange={handleChange}
              disabled={!editing}
                          rows={2}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-sm sm:text-base ${
                            editing 
                              ? "border-gray-300 bg-white" 
                              : "border-gray-200 bg-gray-50"
                          }`}
                          placeholder="List your teaching certifications, degrees, and qualifications..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TutorInfoPage;