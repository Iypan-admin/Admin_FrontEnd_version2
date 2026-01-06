import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateBatchRequestModal from "../components/CreateBatchRequestModal";
import MiniCalendarWidget from "../components/MiniCalendarWidget";
import CalendarNotificationBar from "../components/CalendarNotificationBar";
import { getBatchesByCenter, getStudentsByCenter, getCenterByAdminId, getTeachersByCenter, getReferredStudents, getAllLeads, getDemoBatches } from "../services/Api";

function CenterAdminPage() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalBatches: 0,
    activeStudents: 0,
    referredStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [demoUpcomingCount, setDemoUpcomingCount] = useState(0);

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'Center Admin');

  // Scroll to calendar function
  const scrollToCalendar = () => {
    if (calendarRef.current) {
      calendarRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        const centerResponse = await getCenterByAdminId(token);
        console.log("Center Response:", centerResponse);

        if (!centerResponse || !centerResponse.success) {
          throw new Error(centerResponse?.message || 'Failed to get center information');
        }

        // Access the first element in the data array, matching ViewBatchesPage.js structure
        const center = centerResponse.data?.[0];
        if (!center || !center.center_id) {
          throw new Error('No center found for this admin');
        }

        // Set the selected center for navbar links
        if (center && center.center_id) {
          setSelectedCenter({
            center_id: center.center_id,
            center_name: center.center_name || "Current Center"
          });
        }

        // Now use center.center_id instead of centerId
        try {
          const [studentsResponse, teachersResponse, batchesResponse, referredStudentsResponse] = await Promise.all([
            getStudentsByCenter(center.center_id, token),
            getTeachersByCenter(center.center_id, token),
            getBatchesByCenter(center.center_id, token),
            getReferredStudents(center.center_id, token)
          ]);

          // Debug logs
          console.log("Students Response:", studentsResponse);
          console.log("Teachers Response:", teachersResponse);
          console.log("Batches Response:", batchesResponse);
          console.log("Referred Students Response:", referredStudentsResponse);

          // More lenient validation
          const validateResponse = (response) => {
            if (!response) {
              console.error("Empty response received");
              return [];
            }
            if (!response.success) {
              console.warn("Response indicates failure:", response);
              return [];
            }
            if (!Array.isArray(response.data)) {
              console.warn("Response data is not an array:", response.data);
              return [];
            }
            return response.data;
          };

          const students = validateResponse(studentsResponse);
          const teachers = validateResponse(teachersResponse);
          const batches = validateResponse(batchesResponse);
          const referredStudents = validateResponse(referredStudentsResponse);

          setStats({
            totalStudents: students.length,
            activeStudents: students.filter(student => student.status === true).length,
            totalTeachers: teachers.length,
            totalBatches: batches.length,
            referredStudents: referredStudents.length
          });

          // Demo upcoming count: scheduled batches in future for this center
          try {
            const [leadsList, demoBatches] = await Promise.all([
              getAllLeads(token),
              getDemoBatches(null, null, null, null, token)
            ]);
            const leadIdSet = new Set((Array.isArray(leadsList) ? leadsList : []).map(l => l.lead_id));
            const now = new Date();
            const getRange = (batch) => {
              const start = new Date(batch.demo_date);
              if (batch.start_time) {
                const [hs, ms] = batch.start_time.split(':');
                start.setHours(parseInt(hs), parseInt(ms), 0, 0);
              } else {
                start.setHours(0, 0, 0, 0);
              }
              const end = new Date(batch.demo_date);
              if (batch.end_time) {
                const [he, me] = batch.end_time.split(':');
                end.setHours(parseInt(he), parseInt(me), 0, 0);
              } else if (batch.start_time) {
                const [hs2, ms2] = batch.start_time.split(':');
                end.setHours(parseInt(hs2) + 1, parseInt(ms2), 0, 0);
              } else {
                end.setHours(23, 59, 59, 999);
              }
              return { start, end };
            };
            const upcoming = (Array.isArray(demoBatches) ? demoBatches : [])
              .filter(b => b.status === 'scheduled')
              .filter(b => Array.isArray(b.demo_batch_students) && b.demo_batch_students.some(s => leadIdSet.has(s.lead_id)))
              .map(b => ({ b, r: getRange(b) }))
              .filter(({ r }) => r.end >= now);
            setDemoUpcomingCount(upcoming.length);
          } catch (demoErr) {
            console.warn('Failed to compute demo upcoming count', demoErr);
            setDemoUpcomingCount(0);
          }

        } catch (apiError) {
          console.error("API Error Details:", {
            error: apiError,
            message: apiError.message,
            studentsUrl: `${process.env.LIST_API_URL}/students/center/${center.center_id}`,
            teachersUrl: `${process.env.LIST_API_URL}/center/${center.center_id}/teachers`,
            batchesUrl: `${process.env.LIST_API_URL}/batchcenter/${center.center_id}`,
          });
          throw new Error(`Failed to fetch data: ${apiError.message}`);
        }

      } catch (error) {
        console.error("Error fetching stats:", error);
        setError(error.message || "Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <CalendarNotificationBar onScrollToCalendar={scrollToCalendar} />
      {/* Fixed Sidebar - always visible and non-scrollable */}
      <div className="fixed inset-y-0 left-0 z-40">
        <Navbar
          showCenterViewOptions={!!selectedCenter}
          selectedCenter={selectedCenter}
        />
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 lg:ml-64 overflow-y-auto">
        <div className="p-2 sm:p-4 lg:p-8">
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
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
                          Manage your center's students, teachers, and batches efficiently
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl flex items-center space-x-4 shadow-lg">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                  {
                    title: "Total Students",
                    value: loading ? "..." : stats.totalStudents,
                    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                    color: "blue",
                    gradient: "from-blue-500 to-blue-600",
                    bgColor: "bg-blue-50",
                    textColor: "text-blue-600",
                    iconBg: "bg-blue-100"
                  },
                  {
                    title: "Active Students",
                    value: loading ? "..." : stats.activeStudents,
                    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                    color: "green",
                    gradient: "from-green-500 to-green-600",
                    bgColor: "bg-green-50",
                    textColor: "text-green-600",
                    iconBg: "bg-green-100"
                  },
                  {
                    title: "Total Teachers",
                    value: loading ? "..." : stats.totalTeachers,
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    color: "yellow",
                    gradient: "from-yellow-500 to-orange-500",
                    bgColor: "bg-yellow-50",
                    textColor: "text-yellow-600",
                    iconBg: "bg-yellow-100"
                  },
                  {
                    title: "Total Batches",
                    value: loading ? "..." : stats.totalBatches,
                    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                    color: "purple",
                    gradient: "from-purple-500 to-purple-600",
                    bgColor: "bg-purple-50",
                    textColor: "text-purple-600",
                    iconBg: "bg-purple-100"
                  },
                  {
                    title: "Referred Students",
                    value: loading ? "..." : stats.referredStudents,
                    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
                    color: "indigo",
                    gradient: "from-indigo-500 to-indigo-600",
                    bgColor: "bg-indigo-50",
                    textColor: "text-indigo-600",
                    iconBg: "bg-indigo-100"
                  }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className={`${stat.bgColor} rounded-2xl shadow-lg border border-gray-200 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl group cursor-pointer`}
                    onClick={() => {
                      if (stat.title === "Referred Students") {
                        navigate("/center-admin/referred-students");
                      } else if (stat.title === "Total Students") {
                        navigate("/center-admin/students");
                      } else if (stat.title === "Total Teachers") {
                        navigate("/center-admin/teachers");
                      } else if (stat.title === "Total Batches") {
                        navigate("/center-admin/batches");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                        <svg className={`w-6 h-6 ${stat.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                        </svg>
                      </div>
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${stat.gradient} opacity-60`}></div>
                    </div>
                    <div>
                      <p className={`${stat.textColor} text-sm font-semibold mb-1`}>{stat.title}</p>
                      <h3 className="text-3xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                        {stat.value}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                      <span className="flex items-center">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.gradient} mr-2`}></div>
                        Click to view details
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      title: "View Students",
                      description: "Manage all students",
                      path: "/center-admin/students",
                      gradient: "from-blue-500 to-blue-600",
                      bgColor: "bg-blue-50",
                      textColor: "text-blue-700",
                      hoverColor: "hover:bg-blue-100",
                      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    },
                    {
                      title: "View Teachers",
                      description: "Manage teaching staff",
                      path: "/center-admin/teachers",
                      gradient: "from-yellow-500 to-orange-500",
                      bgColor: "bg-yellow-50",
                      textColor: "text-yellow-700",
                      hoverColor: "hover:bg-yellow-100",
                      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    },
                    {
                      title: "View Batches",
                      description: "Manage course batches",
                      path: "/center-admin/batches",
                      gradient: "from-purple-500 to-purple-600",
                      bgColor: "bg-purple-50",
                      textColor: "text-purple-700",
                      hoverColor: "hover:bg-purple-100",
                      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    },
                  {
                    title: "Manage Leads",
                    description: "Add and manage leads",
                    path: "/center/leads",
                    gradient: "from-cyan-500 to-sky-600",
                    bgColor: "bg-cyan-50",
                    textColor: "text-cyan-700",
                    hoverColor: "hover:bg-cyan-100",
                    icon: "M16 12a4 4 0 11-8 0 4 4 0 018 0m6 8a6 6 0 10-12 0"
                  },
                    {
                      title: "Invoice Approval",
                      description: "Review finance invoices",
                      path: "/center-admin/finance",
                      gradient: "from-emerald-500 to-teal-600",
                      bgColor: "bg-emerald-50",
                      textColor: "text-emerald-700",
                      hoverColor: "hover:bg-emerald-100",
                      icon: "M9 12h6m-6 4h6M9 8h6M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                    },
                    {
                      title: "Referred Students",
                      description: "View referred students",
                      path: "/center-admin/referred-students",
                      gradient: "from-indigo-500 to-indigo-600",
                      bgColor: "bg-indigo-50",
                      textColor: "text-indigo-700",
                      hoverColor: "hover:bg-indigo-100",
                      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    },
                    {
                      title: "Request New Batch",
                      description: "Request batch creation",
                      action: "modal",
                      gradient: "from-green-500 to-green-600",
                      bgColor: "bg-green-50",
                      textColor: "text-green-700",
                      hoverColor: "hover:bg-green-100",
                      icon: "M12 6v6m0 0v6m0-6h6m-6 0H6"
                    },
                    {
                      title: "Student & Elite Card",
                      description: "Manage elite cards",
                      path: "/center/viewcenterelite",
                      gradient: "from-pink-500 to-rose-600",
                      bgColor: "bg-pink-50",
                      textColor: "text-pink-700",
                      hoverColor: "hover:bg-pink-100",
                      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    }
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={() => action.action === 'modal' ? setShowRequestModal(true) : navigate(action.path)}
                      className={`${action.bgColor} ${action.hoverColor} ${action.textColor} rounded-xl p-6 transition-all transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 group`}
                    >
                      <div className="relative flex items-center space-x-4">
                        <div className={`p-3 bg-gradient-to-r ${action.gradient} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon} />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg">{action.title}</h3>
                          <p className="text-sm opacity-75">{action.description}</p>
                        </div>

                        {/* Demo upcoming badge on Manage Leads */}
                        {action.path === '/center/leads' && demoUpcomingCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white shadow">
                            {demoUpcomingCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Event Calendar Widget */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Event Calendar</h2>
            </div>
            <MiniCalendarWidget scrollRef={calendarRef} />
          </div>
        </div>
      </div>

      {/* Batch Request Modal */}
      {showRequestModal && (
        <CreateBatchRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            alert("Batch request submitted successfully!");
          }}
        />
      )}
    </div>
  );
}

export default CenterAdminPage;