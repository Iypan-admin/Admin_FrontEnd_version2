import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FinanceNotificationBell from "../components/FinanceNotificationBell";
import { getAllPayments, getCurrentUserProfile } from "../services/Api";

const FinanceAdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filter state
  const [dateFilter, setDateFilter] = useState("yesterday"); // yesterday | today | last7days

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                  decodedToken.full_name !== null && 
                  decodedToken.full_name !== undefined && 
                  String(decodedToken.full_name).trim() !== '') 
  ? decodedToken.full_name 
  : (decodedToken?.name || 'Finance Admin');

  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    return userName;
  };

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync mobile menu state with Navbar
  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
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
  const [stats, setStats] = useState({
    totalPayments: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    recentPendingPayments: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getAllPayments();

        if (!response.success) throw new Error(response.error || "Failed to fetch");

        const payments = Array.isArray(response.data) ? response.data : [];
        const pendingPayments = payments.filter(p => !p.status);
        const approvedPayments = payments.filter(p => p.status);
        
        // Revenue calculations
        const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
        
        // Debug EMI payments - Enhanced
        console.log('All approved payments:', approvedPayments.length, approvedPayments);
        console.log('Sample payment structure:', approvedPayments[0]);
        
        // Check different possible EMI field names and values
        const emiPayments1 = approvedPayments.filter(p => p.payment_type === 'emi');
        const emiPayments2 = approvedPayments.filter(p => p.payment_type === 'EMI');
        const emiPayments3 = approvedPayments.filter(p => p.payment_type?.toLowerCase() === 'emi');
        const emiPayments4 = approvedPayments.filter(p => p.payment_type?.toLowerCase() === 'EMI'.toLowerCase());
        const emiPayments5 = approvedPayments.filter(p => p.payment_type?.includes?.('emi') || p.payment_type?.includes?.('EMI'));
        
        console.log('EMI check 1 (exact "emi"):', emiPayments1.length);
        console.log('EMI check 2 (exact "EMI"):', emiPayments2.length);
        console.log('EMI check 3 (lowercase "emi"):', emiPayments3.length);
        console.log('EMI check 4 (case-insensitive):', emiPayments4.length);
        console.log('EMI check 5 (includes "emi"):', emiPayments5.length);
        
        // Show all unique payment_type values
        const uniquePaymentTypes = [...new Set(approvedPayments.map(p => p.payment_type))];
        console.log('All payment_type values found:', uniquePaymentTypes);
        
        // Use the best EMI detection method
        const emiPayments = emiPayments5.length > 0 ? emiPayments5 : emiPayments4;
        console.log('Final EMI Payments found:', emiPayments.length, emiPayments);
        
        const fullPaymentRevenue = approvedPayments.filter(p => p.payment_type !== 'emi' || !p.payment_type).reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
        
        // Fix EMI revenue calculation - use final_fees for EMI payments (contains EMI amount)
        const emiRevenue = emiPayments.reduce((sum, p) => {
          const emiAmount = p.final_fees || p.amount || 0;
          console.log(`EMI Payment - ID: ${p.payment_id}, Amount: ₹${emiAmount}, Type: ${p.payment_type}`);
          return sum + emiAmount;
        }, 0);
        
        console.log(`EMI Revenue Calculation: ${emiPayments.length} payments × amounts = ₹${emiRevenue}`);
        
        // Date range calculations for graphs
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        // Revenue by date ranges
        const yesterdayRevenue = approvedPayments
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate.toDateString() === yesterday.toDateString();
          })
          .reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
          
        const todayRevenue = approvedPayments
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate.toDateString() === today.toDateString();
          })
          .reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
        
        const lastWeekRevenue = approvedPayments
          .filter(p => new Date(p.created_at) >= lastWeek)
          .reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
        
        // Prepare data for graphs
        const revenueByDate = {};
        const emiRevenueByDate = {};
        
        approvedPayments.forEach(p => {
          const date = new Date(p.created_at).toLocaleDateString('en-IN');
          const amount = p.final_fees || p.amount || 0;
          
          revenueByDate[date] = (revenueByDate[date] || 0) + amount;
          
          // Use enhanced EMI detection with correct amount calculation
          const isEMI = p.payment_type?.includes?.('emi') || p.payment_type?.includes?.('EMI') || p.payment_type?.toLowerCase() === 'emi';
          if (isEMI) {
            const emiAmount = p.final_fees || p.amount || 0; // Use final_fees for EMI amount
            emiRevenueByDate[date] = (emiRevenueByDate[date] || 0) + emiAmount;
            console.log(`EMI payment found on ${date}: ID=${p.payment_id}, Amount=₹${emiAmount}, Type=${p.payment_type}`);
          }
        });
        
        console.log('EMI Revenue by Date:', emiRevenueByDate);
        console.log('Total Revenue by Date:', revenueByDate);
        
        // Convert to array format for charts
        const chartData = Object.entries(revenueByDate)
          .map(([date, revenue]) => ({ date, revenue, emiRevenue: emiRevenueByDate[date] || 0 }))
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-30); // Last 30 days
        
        // Monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = approvedPayments
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
          })
          .reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);
        
        // Yearly revenue (current year)
        const yearlyRevenue = approvedPayments
          .filter(p => new Date(p.created_at).getFullYear() === currentYear)
          .reduce((sum, p) => sum + (p.final_fees || p.amount || 0), 0);

        const recentPending = [...pendingPayments]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);

        setStats({
          totalPayments: payments.length,
          pendingPayments: pendingPayments.length,
          approvedPayments: approvedPayments.length,
          recentPendingPayments: recentPending,
          // Revenue data
          totalRevenue,
          monthlyRevenue,
          yearlyRevenue,
          fullPaymentRevenue,
          emiRevenue,
          // Date range revenue
          yesterdayRevenue,
          todayRevenue,
          lastWeekRevenue,
          // Chart data
          chartData,
          emiPaymentsCount: emiPayments.length
        });
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payment statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch profile info
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
          setProfilePictureUrl(response.data.profile_picture || null);
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

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium font-inter">Loading financial data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar />

      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Welcome Text */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Hamburger Menu Toggle */}
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                  title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                    Welcome back, {getDisplayName()}! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Finance Administrator Dashboard
                  </p>
                </div>
              </div>

              {/* Right: Notifications & Profile Dropdown */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <FinanceNotificationBell />

                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase() || "F"}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      
                      {/* Dropdown Box - BERRY Style */}
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {/* Header Section */}
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">Finance Admin</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Settings */}
                          <button
                            onClick={() => {
                              navigate('/finance/account-settings');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-700">Account Settings</span>
                          </button>

                          {/* Logout */}
                          <button
                            onClick={() => {
                              localStorage.removeItem("token");
                              navigate("/login");
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-gray-200"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm text-gray-700">Logout</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Advanced Revenue Statistics - BERRY Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              {/* Total Revenue Card */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-purple-100 font-bold text-xs uppercase tracking-wider">All-Time</span>
                  </div>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium">Total Revenue</p>
                  <h3 className="text-white text-2xl sm:text-4xl font-black mt-1">
                    ₹{loading ? "..." : stats.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                  </h3>
                  <p className="text-purple-100/80 text-xs mt-2 border-t border-white/10 pt-2">Complete earnings</p>
                </div>
              </div>

              {/* Monthly Revenue Card */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-blue-100 font-bold text-xs uppercase tracking-wider">This Month</span>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">Monthly Revenue</p>
                  <h3 className="text-white text-2xl sm:text-4xl font-black mt-1">
                    ₹{loading ? "..." : stats.monthlyRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                  </h3>
                  <p className="text-blue-100/80 text-xs mt-2 border-t border-white/10 pt-2">Current month earnings</p>
                </div>
              </div>

              {/* Yearly Revenue Card */}
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-green-100 font-bold text-xs uppercase tracking-wider">This Year</span>
                  </div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium">Yearly Revenue</p>
                  <h3 className="text-white text-2xl sm:text-4xl font-black mt-1">
                    ₹{loading ? "..." : stats.yearlyRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                  </h3>
                  <p className="text-green-100/80 text-xs mt-2 border-t border-white/10 pt-2">Annual earnings</p>
                </div>
              </div>

              {/* Full Payment Revenue Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="text-emerald-100 font-bold text-xs uppercase tracking-wider">Complete</span>
                  </div>
                  <p className="text-emerald-100 text-xs sm:text-sm font-medium">Full Payment Revenue</p>
                  <h3 className="text-white text-2xl sm:text-4xl font-black mt-1">
                    ₹{loading ? "..." : stats.fullPaymentRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                  </h3>
                  <p className="text-emerald-100/80 text-xs mt-2 border-t border-white/10 pt-2">One-time payments</p>
                </div>
              </div>

              {/* EMI Revenue Card */}
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 sm:p-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                    </div>
                    <span className="text-orange-100 font-bold text-xs uppercase tracking-wider">Installments</span>
                  </div>
                  <p className="text-orange-100 text-xs sm:text-sm font-medium">EMI Revenue</p>
                  <h3 className="text-white text-2xl sm:text-4xl font-black mt-1">
                    ₹{loading ? "..." : stats.emiRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                  </h3>
                  <p className="text-orange-100/80 text-xs mt-2 border-t border-white/10 pt-2">Monthly installments</p>
                </div>
              </div>
            </div>

            {/* Advanced Revenue Charts - BERRY Style */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Revenue Trend</h2>
                        <p className="text-sm text-gray-600">Last 30 days performance</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Full Payment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-600">EMI</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                    </div>
                  ) : stats.chartData && stats.chartData.length > 0 ? (
                    <div className="h-64">
                      <svg viewBox="0 0 800 250" className="w-full h-full">
                        {/* Grid lines */}
                        {[...Array(6)].map((_, i) => {
                          const maxRevenue = Math.max(...stats.chartData.map(d => d.revenue));
                          const step = maxRevenue / 5;
                          const value = maxRevenue - (step * i);
                          const roundedValue = Math.round(value / 1000) * 1000;
                          return (
                          <g key={i}>
                            <line
                              x1="50"
                              y1={20 + i * 40}
                              x2="750"
                              y2={20 + i * 40}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                            <text
                              x="40"
                              y={25 + i * 40}
                              textAnchor="end"
                              className="text-xs fill-gray-500"
                            >
                              ₹{roundedValue.toLocaleString('en-IN')}
                            </text>
                          </g>
                        )})}
                        
                        {/* Full Payment Revenue line */}
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          points={stats.chartData.map((d, i) => {
                            const x = 50 + (i * 700) / (stats.chartData.length - 1);
                            const maxRevenue = Math.max(...stats.chartData.map(d => d.revenue));
                            const fullPaymentRevenue = d.revenue - d.emiRevenue; // Calculate full payment revenue
                            const y = 220 - (fullPaymentRevenue / maxRevenue) * 200;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        
                        {/* EMI Revenue line */}
                        <polyline
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="3"
                          points={stats.chartData.map((d, i) => {
                            const x = 50 + (i * 700) / (stats.chartData.length - 1);
                            const maxRevenue = Math.max(...stats.chartData.map(d => d.revenue));
                            const y = 220 - (d.emiRevenue / maxRevenue) * 200;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        
                        {/* Data points */}
                        {stats.chartData.map((d, i) => {
                          const x = 50 + (i * 700) / (stats.chartData.length - 1);
                          const maxRevenue = Math.max(...stats.chartData.map(d => d.revenue));
                          const fullPaymentRevenue = d.revenue - d.emiRevenue;
                          const fullPaymentY = 220 - (fullPaymentRevenue / maxRevenue) * 200;
                          const emiY = 220 - (d.emiRevenue / maxRevenue) * 200;
                          
                          return (
                            <g key={i}>
                              <circle cx={x} cy={fullPaymentY} r="4" fill="#10b981" />
                              <circle cx={x} cy={emiY} r="4" fill="#f97316" />
                              <text
                                x={x}
                                y="240"
                                textAnchor="middle"
                                className="text-xs fill-gray-500"
                                transform={`rotate(-45 ${x} 240)`}
                              >
                                {d.date}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p>No revenue data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range Revenue */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Date Range Analysis</h2>
                        <p className="text-sm text-gray-600">Revenue by time periods</p>
                      </div>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <div className="flex items-center space-x-3">
                      <select 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="yesterday">Yesterday</option>
                        <option value="today">Today</option>
                        <option value="last7days">Last 7 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {dateFilter === 'yesterday' ? (
                      <>
                        {/* Yesterday */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Yesterday</p>
                              <p className="text-sm text-gray-500">{new Date(Date.now() - 86400000).toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              ₹{loading ? "..." : stats.yesterdayRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                            </p>
                            <p className="text-xs text-gray-500">Total Revenue</p>
                          </div>
                        </div>
                        
                        {/* Yesterday - Full Payment vs EMI Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">Full Payment</p>
                                <p className="text-xs text-gray-500">Yesterday</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹{loading ? "..." : (stats.yesterdayRevenue - (stats.chartData?.find(d => d.date === new Date(Date.now() - 86400000).toLocaleDateString('en-IN'))?.emiRevenue || 0))?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">EMI</p>
                                <p className="text-xs text-gray-500">Yesterday</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">
                                ₹{loading ? "..." : stats.chartData?.find(d => d.date === new Date(Date.now() - 86400000).toLocaleDateString('en-IN'))?.emiRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                    
                    {dateFilter === 'today' ? (
                      <>
                        {/* Today */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Today</p>
                              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              ₹{loading ? "..." : stats.todayRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                            </p>
                            <p className="text-xs text-gray-500">Total Revenue</p>
                          </div>
                        </div>
                        
                        {/* Today - Full Payment vs EMI Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">Full Payment</p>
                                <p className="text-xs text-gray-500">Today</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹{loading ? "..." : (stats.todayRevenue - (stats.chartData?.find(d => d.date === new Date().toLocaleDateString('en-IN'))?.emiRevenue || 0))?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">EMI</p>
                                <p className="text-xs text-gray-500">Today</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">
                                ₹{loading ? "..." : stats.chartData?.find(d => d.date === new Date().toLocaleDateString('en-IN'))?.emiRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                    
                    {dateFilter === 'last7days' ? (
                      <>
                        {/* Last Week */}
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Last 7 Days</p>
                              <p className="text-sm text-gray-500">{new Date(Date.now() - 604800000).toLocaleDateString('en-IN')} - {new Date().toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              ₹{loading ? "..." : stats.lastWeekRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                            </p>
                            <p className="text-xs text-gray-500">Total Revenue</p>
                          </div>
                        </div>
                        
                        {/* Last Week - Full Payment vs EMI Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">Full Payment</p>
                                <p className="text-xs text-gray-500">Last 7 Days</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹{loading ? "..." : (stats.lastWeekRevenue - (stats.chartData?.reduce((sum, d) => {
                                  const date = new Date(d.date);
                                  const weekAgo = new Date(Date.now() - 604800000);
                                  if (date >= weekAgo) return sum + (d.emiRevenue || 0);
                                  return sum;
                                }, 0) || 0))?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">EMI</p>
                                <p className="text-xs text-gray-500">Last 7 Days</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">
                                ₹{loading ? "..." : (stats.chartData?.reduce((sum, d) => {
                                  const date = new Date(d.date);
                                  const weekAgo = new Date(Date.now() - 604800000);
                                  if (date >= weekAgo) return sum + (d.emiRevenue || 0);
                                  return sum;
                                }, 0) || 0)?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                    
                    {/* EMI Summary - Always show */}
                    <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">EMI Summary</p>
                            <p className="text-sm text-gray-500">{stats.emiPaymentsCount || 0} EMI payments found</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-orange-600">
                            ₹{loading ? "..." : stats.emiRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                          </p>
                          <p className="text-xs text-gray-500">Total EMI Revenue</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Recent Pending Payments */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Recent Pending Payments</h2>
                      <p className="text-sm text-gray-600">Latest unapproved payment requests</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/approve-students')}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    View All
                  </button>
                </div>
              </div>

              <div className="p-6">
                {stats.recentPendingPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All payments approved!</h3>
                    <p className="text-gray-500">No pending payment requests at the moment</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Payment ID</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Student Email</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Course</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Date</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {stats.recentPendingPayments.map((payment, index) => (
                          <tr key={payment.payment_id} className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-200 group">
                            <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                <span className="text-yellow-600">{payment.payment_id}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate max-w-[200px]">{payment.student_email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="font-medium">{payment.course_name || "N/A"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAdminPage;
