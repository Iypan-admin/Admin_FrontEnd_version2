import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CreateCenterRequestModal from "../components/CreateCenterRequestModal";
import MiniCalendarWidget from "../components/MiniCalendarWidget";
import CalendarNotificationBar from "../components/CalendarNotificationBar";
import { getCentersForStateAdmin, getMyCenterRequests } from "../services/Api";

function StateAdminPage() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [stats, setStats] = useState({
    totalCenters: 0,
    activeCenters: 0,
    totalAdmins: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requests, setRequests] = useState([]);

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
        
        // Check if user is logged in
        if (!token) {
          setError("No authentication token found. Please log in again.");
          setLoading(false);
          return;
        }

        // Decode token to get user info
        let userInfo = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userInfo = payload;
          console.log("Current user info:", userInfo);
        } catch (e) {
          console.error("Error decoding token:", e);
        }

        const [centersResponse, requestsResponse] = await Promise.all([
          getCentersForStateAdmin(token),
          getMyCenterRequests(token)
        ]);
        
        const centers = centersResponse.data || [];
        const requests = requestsResponse.data || [];

        setStats({
          totalCenters: centers.length,
          activeCenters: centers.filter(center => center.center_admin).length,
          totalAdmins: centers.filter(center => center.center_admin).length,
          pendingRequests: requests.filter(req => req.status === 'pending').length
        });
        
        setRequests(requests);
      } catch (error) {
        console.error("Error fetching stats:", error);
        
        // Provide more specific error messages
        if (error.message.includes("State not found for this admin")) {
          setError("You are not assigned to any state. Please contact your administrator to assign you to a state.");
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
          setError("Access denied. You don't have permission to view this page.");
        } else if (error.message.includes("404") || error.message.includes("Not Found")) {
          setError("Service not available. Please check if all backend services are running.");
        } else {
          setError(`Failed to load dashboard statistics: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleRequestSuccess = () => {
    // Refresh data after successful request creation
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const [centersResponse, requestsResponse] = await Promise.all([
          getCentersForStateAdmin(token),
          getMyCenterRequests(token)
        ]);
        
        const centers = centersResponse.data || [];
        const requests = requestsResponse.data || [];

        setStats(prev => ({
          ...prev,
          pendingRequests: requests.filter(req => req.status === 'pending').length
        }));
        
        setRequests(requests);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };

    fetchStats();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <CalendarNotificationBar onScrollToCalendar={scrollToCalendar} />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Welcome Section - Center Admin Style */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black opacity-10"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                      State Admin Dashboard
                    </h1>
                    <p className="text-blue-100 text-lg">
                      Manage centers and requests for your state
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-blue-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last updated: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            {error && (
              <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    
                    {/* Debug Information */}
                    <div className="p-4 bg-red-100/50 rounded-xl border border-red-200/50">
                      <h4 className="text-sm font-semibold text-red-800 mb-3">Debug Information:</h4>
                      <div className="text-sm text-red-700 space-y-2">
                        <p>• Check if you are logged in as a state admin user</p>
                        <p>• Verify that your user account is assigned to a state in the database</p>
                        <p>• Ensure all backend services (Listing Service:3008, Role Assignment:3002) are running</p>
                        <p>• Check the browser console for detailed error messages</p>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-lg transition-colors font-medium"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Total Centers",
                  value: loading ? "..." : stats.totalCenters,
                  icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                  gradient: "from-blue-400 to-indigo-500",
                  bgGradient: "from-blue-50 to-indigo-50",
                  textColor: "text-blue-600"
                },
                {
                  title: "Active Centers",
                  value: loading ? "..." : stats.activeCenters,
                  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                  gradient: "from-green-400 to-emerald-500",
                  bgGradient: "from-green-50 to-emerald-50",
                  textColor: "text-green-600"
                },
                {
                  title: "Center Admins",
                  value: loading ? "..." : stats.totalAdmins,
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z",
                  gradient: "from-purple-400 to-pink-500",
                  bgGradient: "from-purple-50 to-pink-50",
                  textColor: "text-purple-600"
                },
                {
                  title: "Pending Requests",
                  value: loading ? "..." : stats.pendingRequests,
                  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                  gradient: "from-yellow-400 to-orange-500",
                  bgGradient: "from-yellow-50 to-orange-50",
                  textColor: "text-yellow-600"
                }
              ].map((stat, index) => (
                <div
                  key={index}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-4 bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${stat.textColor} uppercase tracking-wide`}>{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`w-3 h-3 bg-gradient-to-r ${stat.gradient} rounded-full ${stat.title === 'Pending Requests' ? 'animate-pulse' : ''}`}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Quick Actions</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Quick access to main features</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => navigate('/state-admin/centers')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-blue-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">View Centers</span>
                    <p className="text-sm text-blue-600/70">Manage all centers</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-green-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Request New Center</span>
                    <p className="text-sm text-green-600/70">Create center request</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/state-admin/center-requests')}
                  className="group relative flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-2xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-offset-2 shadow-lg hover:shadow-xl border border-purple-200/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-lg">Center Requests</span>
                    <p className="text-sm text-purple-600/70">Review requests</p>
                  </div>
                  {stats.pendingRequests > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Event Calendar Widget */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Event Calendar</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>View upcoming events</span>
                </div>
              </div>
              <MiniCalendarWidget scrollRef={calendarRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <CreateCenterRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  );
}

export default StateAdminPage;