import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import MiniCalendarWidget from "../components/MiniCalendarWidget";
import { getMyTutorInfo, getTeacherBatches } from "../services/Api";

function TeacherPage() {
  const navigate = useNavigate();
  const [tutorInfo, setTutorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    fetchTutorInfo();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await getTeacherBatches(token);
      setBatches(response.data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchTutorInfo = async () => {
    try {
      setLoading(true);
      const data = await getMyTutorInfo();
      setTutorInfo(data);
    } catch (error) {
      console.error("Failed to fetch tutor info:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalClasses = batches.length;
  const activeClasses = batches.filter(b => b.status !== 'Completed' && b.status !== 'completed').length;
  const completedClasses = batches.filter(b => b.status === 'Completed' || b.status === 'completed').length;

  const quickActions = [
    {
      title: "Your Classes",
      description: "View and manage your class schedule",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
      path: "/teacher/classes",
      color: "blue",
      bgColor: "bg-blue-50"
    },
    {
      title: "My Info",
      description: "View and update your profile information",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      path: "/teacher/tutor-info",
      color: "purple",
      bgColor: "bg-purple-50"
    },
    {
      title: "Demo Class",
      description: "Manage and view your demo classes",
      icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
      path: "/teacher/demo-classes",
      color: "green",
      bgColor: "bg-green-50"
    },
    {
      title: "Leave Request",
      description: "Submit and manage your leave requests",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      path: "/teacher/leave-requests",
      color: "orange",
      bgColor: "bg-orange-50"
    },
    {
      title: "Sub Tutor Request",
      description: "Request a substitute teacher for your classes",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      path: "/teacher/leave-requests",
      color: "indigo",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <Navbar />
      <div className="flex-1 lg:ml-64 overflow-y-auto h-screen">
        <div className="p-4 lg:p-8 relative z-10">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Enhanced Welcome Section with Tutor Profile - Compact & Responsive */}
              <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -translate-y-10 sm:-translate-y-12 lg:-translate-y-16 translate-x-10 sm:translate-x-12 lg:translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full translate-y-8 sm:translate-y-10 lg:translate-y-12 -translate-x-8 sm:-translate-x-10 lg:-translate-x-12"></div>

                <div className="relative z-10 flex flex-col space-y-4">
                  {/* Row 1: Image and Welcome Text - Mobile: Same Row, Desktop/Tablet: Same Row */}
                  <div className="flex flex-row items-center space-x-3 sm:space-x-4 lg:space-x-6">
                    {/* Compact Tutor Profile Photo */}
                    <div className="relative group flex-shrink-0">
                      {loading ? (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse flex items-center justify-center shadow-lg">
                          <svg
                            className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      ) : tutorInfo?.profile_photo ? (
                        <img
                          src={tutorInfo.profile_photo}
                          alt="Tutor Profile"
                          className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full object-cover border-2 sm:border-4 border-white shadow-lg sm:shadow-xl group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      {/* Compact Fallback Avatar */}
                      <div
                        className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl lg:text-2xl shadow-lg sm:shadow-xl group-hover:scale-105 transition-transform duration-300 ${
                          tutorInfo?.profile_photo ? "hidden" : "flex"
                        }`}
                        style={{
                          display: tutorInfo?.profile_photo ? "none" : "flex",
                        }}
                      >
                        {tutorInfo?.full_name
                          ? tutorInfo.full_name.charAt(0).toUpperCase()
                          : "T"}
                      </div>
                      {/* Compact Online Status Indicator */}
                      <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-gradient-to-r from-green-400 to-emerald-500 border-2 sm:border-4 border-white rounded-full shadow-lg animate-pulse"></div>
                      {/* Ring Animation - Hidden on mobile */}
                      <div className="hidden sm:block absolute inset-0 rounded-full border-2 sm:border-4 border-blue-200/50 animate-ping"></div>
                    </div>

                    {/* Compact Tutor Information - Welcome Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-0 sm:space-x-4">
                        <div className="flex-1 min-w-0">
                          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black bg-gradient-to-r from-gray-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent truncate">
                            Welcome back, {tutorInfo?.full_name || "Teacher"}!
                          </h1>
                          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1 font-medium">
                            Ready to inspire and educate today? 🎓
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-green-200">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-green-700 text-xs sm:text-sm font-bold">
                            Online
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email, Teaching, Experience - Mobile: Stacked, Desktop/Tablet: Same Row */}
                  <div className="w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex items-center space-x-2 sm:space-x-3 bg-white/60 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-white/50 shadow-md sm:shadow-lg">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Email
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                            {tutorInfo?.email || "teacher@example.com"}
                          </p>
                        </div>
                      </div>

                      {tutorInfo?.language_taught && (
                        <div className="flex items-center space-x-2 sm:space-x-3 bg-white/60 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-white/50 shadow-md sm:shadow-lg">
                          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Teaching
                            </p>
                            <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                              {tutorInfo.language_taught}
                            </p>
                          </div>
                        </div>
                      )}

                      {tutorInfo?.experience_years && (
                        <div className="flex items-center space-x-2 sm:space-x-3 bg-white/60 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-white/50 shadow-md sm:shadow-lg">
                          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Experience
                            </p>
                            <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                              {tutorInfo.experience_years} years
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Classes Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-semibold mb-1">
                        Total Batches
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {totalClasses}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Active Classes Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-semibold mb-1">
                        Active Batches
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {activeClasses}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Completed Classes Card */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-semibold mb-1">
                        Completed Batches
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {completedClasses}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                {quickActions.map((action) => (
                  <div
                    key={action.title}
                    className="group relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
                  >
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>

                    <div className="relative z-10">
                      <div
                        className={`p-4 sm:p-5 bg-gradient-to-br ${action.bgColor} relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className={`w-6 h-6 text-${action.color}-600`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d={action.icon}
                              />
                            </svg>
                          </div>
                          <h3
                            className={`text-lg sm:text-xl font-bold text-${action.color}-800 mb-1`}
                          >
                            {action.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        <p className="text-gray-600 text-xs sm:text-sm mb-4 leading-relaxed">
                          {action.description}
                        </p>
                        <button
                          onClick={() => navigate(action.path)}
                          className={`w-full bg-gradient-to-r from-${action.color}-500 to-${action.color}-600 text-white py-2.5 px-4 rounded-xl hover:from-${action.color}-600 hover:to-${action.color}-700 
                            transition-all duration-300 flex items-center justify-center space-x-2 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                        >
                          <span>Go to {action.title}</span>
                          <svg
                            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Academic Events Calendar Section */}
              <div className="relative">
                <MiniCalendarWidget />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherPage;
