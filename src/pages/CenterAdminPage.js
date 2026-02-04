import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import Navbar from "../components/Navbar";
import CenterHeader from "../components/CenterHeader";
import CreateBatchRequestModal from "../components/CreateBatchRequestModal";


import { getBatchesByCenter, getStudentsByCenter, getCenterByAdminId, getTeachersByCenter, getReferredStudents, getAllLeads, getDemoBatches, getCurrentUserProfile } from "../services/Api";

function CenterAdminPage() {
  const navigate = useNavigate();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [demoUpcomingCount, setDemoUpcomingCount] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalBatches: 0,
    totalReferredStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;

  // Priority: profileInfo.full_name > decodedToken.full_name > decodedToken.name
  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    if (decodedToken?.full_name && decodedToken.full_name.trim() !== '') {
      return decodedToken.full_name;
    }
    return decodedToken?.name || 'Center Admin';
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle(); // Initial check
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

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

    // Fetch profile info
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfileInfo();

    window.addEventListener('profileUpdated', fetchProfileInfo);
    return () => {
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);



  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar 
        showCenterViewOptions={!!selectedCenter}
        selectedCenter={selectedCenter}
      />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        <CenterHeader 
          title={`Welcome back, ${getDisplayName()}! 👋`} 
          subtitle="Center Administrator Dashboard" 
          icon={LayoutDashboard}
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">

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

              {/* Enhanced Statistics Cards - BERRY Style (Matching Finance Dashboard) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                {[
                  {
                    title: "Total Students",
                    value: loading ? "..." : stats.totalStudents,
                    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
                    gradient: "from-blue-600 to-blue-700",
                    lightGradient: "from-blue-100 to-blue-200",
                    path: "/center-admin/students"
                  },
                  {
                    title: "Active Students",
                    value: loading ? "..." : stats.activeStudents,
                    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                    gradient: "from-emerald-600 to-emerald-700",
                    lightGradient: "from-emerald-100 to-emerald-200",
                    path: "/center-admin/students"
                  },
                  {
                    title: "Total Teachers",
                    value: loading ? "..." : stats.totalTeachers,
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    gradient: "from-amber-500 to-amber-600",
                    lightGradient: "from-amber-100 to-amber-200",
                    path: "/center-admin/teachers"
                  },
                  {
                    title: "Total Batches",
                    value: loading ? "..." : stats.totalBatches,
                    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                    gradient: "from-purple-600 to-purple-700",
                    lightGradient: "from-purple-100 to-purple-200",
                    path: "/center-admin/batches"
                  },
                  {
                    title: "Referred Students",
                    value: loading ? "..." : stats.referredStudents,
                    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
                    gradient: "from-indigo-600 to-indigo-700",
                    lightGradient: "from-indigo-100 to-indigo-200",
                    path: "/center-admin/referred-students"
                  }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className={`bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-xl p-4 sm:p-5 relative overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                    onClick={() => navigate(stat.path)}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                          </svg>
                        </div>
                        <span className="text-white/40 group-hover:text-white/60 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </div>
                      <p className="text-white/80 text-xs font-bold uppercase tracking-wider">{stat.title}</p>
                      <h3 className="text-white text-2xl sm:text-3xl font-black mt-1 leading-none">{stat.value}</h3>
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-white/60 text-[10px] font-medium uppercase tracking-tighter">View Details</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                      </div>
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