import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventCalendar from "../components/EventCalendar";
import { getAllTeachers, getAllCenters, getAllStudents } from "../services/Api";

const AcademicCoordinatorPage = () => {
  const navigate = useNavigate();
  const [teacherCount, setTeacherCount] = useState(0);
  const [centerCount, setCenterCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState({
    teachers: true,
    centers: true,
    students: true,
    pending: true
  });
  const [error, setError] = useState({
    teachers: null,
    centers: null,
    students: null,
    pending: null
  });
  const [showCalendar, setShowCalendar] = useState(false);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'Academic Coordinator');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students and filter pending ones
        const studentsResponse = await getAllStudents();
        const students = studentsResponse.data || [];
        const pending = students.filter(student => !student.status);
        setStudentCount(students.length);
        setPendingStudents(pending.slice(0, 5)); // Show only latest 5 pending students
        setLoading(prev => ({ ...prev, students: false, pending: false }));
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setError(prev => ({ 
          ...prev, 
          students: "Failed to load student count",
          pending: "Failed to load pending approvals"
        }));
        setLoading(prev => ({ ...prev, students: false, pending: false }));
      }

      try {
        // Fetch teachers - handle both array and wrapped responses
        const teachersResponse = await getAllTeachers();
        const teachers = Array.isArray(teachersResponse)
          ? teachersResponse
          : teachersResponse?.data || [];
        setTeacherCount(teachers.length);
        setLoading(prev => ({ ...prev, teachers: false }));
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
        setError(prev => ({ ...prev, teachers: "Failed to load teacher count" }));
        setLoading(prev => ({ ...prev, teachers: false }));
      }

      try {
        // Fetch centers
        const centersResponse = await getAllCenters();
        const centers = centersResponse.data || [];
        setCenterCount(centers.length);
        setLoading(prev => ({ ...prev, centers: false }));
      } catch (error) {
        console.error("Failed to fetch centers:", error);
        setError(prev => ({ ...prev, centers: "Failed to load center count" }));
        setLoading(prev => ({ ...prev, centers: false }));
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Professional Welcome Section - Modern Design */}
              <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                <div className="relative p-5 sm:p-6 lg:p-7">
                  <div className="flex items-start space-x-5">
                    {/* Icon Container with Enhanced Design */}
                    <div className="relative group flex-shrink-0">
                      <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                      <div className="relative p-4 bg-white/25 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" 
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>

                    {/* Content Section with Professional Typography */}
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
                          <span className="text-white">Welcome back, </span>
                          <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent font-black drop-shadow-lg">
                            {userName}
                          </span>
                          <span className="text-white">!</span>
                        </h1>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95 leading-tight tracking-tight">
                          Dashboard
                        </h2>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-blue-50 text-sm sm:text-base font-medium leading-relaxed">
                          Manage your academic operations efficiently
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Cards - Modern Design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: "Total Teachers",
                    count: loading.teachers ? "..." : teacherCount,
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    gradient: "from-blue-500 to-blue-600",
                    bgColor: "bg-blue-500",
                    textColor: "text-blue-600",
                    error: error.teachers
                  },
                  {
                    title: "Active Centers",
                    count: loading.centers ? "..." : centerCount,
                    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                    gradient: "from-emerald-500 to-emerald-600",
                    bgColor: "bg-emerald-500",
                    textColor: "text-emerald-600",
                    error: error.centers
                  },
                  {
                    title: "Total Students",
                    count: loading.students ? "..." : studentCount,
                    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                    gradient: "from-purple-500 to-purple-600",
                    bgColor: "bg-purple-500",
                    textColor: "text-purple-600",
                    error: error.students
                  }
                ].map((stat, index) => (
                  <div 
                    key={index} 
                    className="relative bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden group hover:shadow-xl transition-all duration-300"
                  >
                    {/* Top Colored Bar */}
                    <div className={`h-2 bg-gradient-to-r ${stat.gradient}`}></div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className={`${stat.textColor} text-xs font-bold uppercase tracking-wider mb-2`}>
                            {stat.title}
                          </p>
                          <h3 className="text-4xl font-black text-gray-900 mb-1">
                            {loading.teachers || loading.centers || loading.students ? (
                              <div className="inline-block animate-pulse bg-gray-200 h-10 w-20 rounded"></div>
                            ) : (
                              stat.count
                            )}
                          </h3>
                        </div>
                        <div className={`${stat.bgColor} p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Bottom Accent Line */}
                      <div className={`h-1 bg-gradient-to-r ${stat.gradient} rounded-full`}></div>
                      
                      {stat.error && (
                        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                          <p className="text-sm text-red-700 font-medium">{stat.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Enhanced Pending Approvals Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                          Pending Student Approvals
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {pendingStudents.length} recent registration requests
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/manage-students')}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm font-semibold"
                    >
                      View All
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {loading.pending ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin h-10 w-10 border-3 border-orange-500 rounded-full border-t-transparent mb-4"></div>
                      <p className="text-gray-500 text-sm">Loading pending approvals...</p>
                    </div>
                  ) : error.pending ? (
                    <div className="text-center py-8">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-600 font-medium">{error.pending}</p>
                      </div>
                    </div>
                  ) : pendingStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-8">
                        <svg className="mx-auto h-16 w-16 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">All Caught Up!</h3>
                        <p className="text-green-600">No pending student approvals at the moment.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-inner">
                      <div className="max-h-64 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {pendingStudents.map((student, index) => (
                              <tr key={student.student_id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 transition-all duration-200 group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                                        {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                        {student.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Student #{index + 1}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                    {student.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-blue-200 transition-colors">
                                    {student.center_name}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Quick Actions Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 group">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                        Quick Actions
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">Access your management tools</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      {
                        title: "Manage Teachers",
                        description: "Add, edit, and manage teacher profiles",
                        path: '/manage-teachers',
                        gradient: "from-blue-500 to-blue-600",
                        bgGradient: "from-blue-50 to-blue-100",
                        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      },
                      {
                        title: "Manage Batches",
                        description: "Create and manage course batches",
                        path: '/manage-batches',
                        gradient: "from-amber-500 to-amber-600",
                        bgGradient: "from-amber-50 to-amber-100",
                        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      },
                      {
                        title: "Manage Students",
                        description: "View and approve student registrations",
                        path: '/manage-students',
                        gradient: "from-purple-500 to-purple-600",
                        bgGradient: "from-purple-50 to-purple-100",
                        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      },
                      {
                        title: "Event Calendar",
                        description: "Manage academic events and schedules",
                        action: () => setShowCalendar(true),
                        gradient: "from-green-500 to-green-600",
                        bgGradient: "from-green-50 to-green-100",
                        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      },
                    ].map((action, index) => (
                      <button
                        key={index}
                        onClick={() => action.action ? action.action() : navigate(action.path)}
                        className={`w-full group/btn relative overflow-hidden rounded-xl p-6 bg-gradient-to-r ${action.bgGradient} hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 border border-white/50`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Animated background gradient on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300`}></div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 bg-gradient-to-r ${action.gradient} rounded-xl shadow-lg group-hover/btn:scale-110 transition-transform duration-300`}>
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon} />
                              </svg>
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-gray-800 group-hover/btn:text-gray-900 transition-colors">
                                {action.title}
                              </h3>
                              <p className="text-sm text-gray-600 group-hover/btn:text-gray-700 transition-colors">
                                {action.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 group-hover/btn:text-gray-600 transition-colors">
                              Go
                            </span>
                            <svg className="w-5 h-5 text-gray-400 group-hover/btn:text-gray-600 group-hover/btn:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Calendar Modal */}
        {showCalendar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Academic Event Calendar</h2>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <EventCalendar />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicCoordinatorPage;