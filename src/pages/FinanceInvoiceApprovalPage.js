import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FinanceNotificationBell from "../components/FinanceNotificationBell";
import { 
  getFinanceAdminInvoices,
  getFinanceAdminAcceptedInvoices,
  getInvoiceItems,
  updateInvoiceStatus,
  getCurrentUserProfile
} from "../services/Api";
import InvoicePrintTemplate from "../components/InvoicePrintTemplate";
import { X, Printer } from "lucide-react";

const FinanceInvoiceApprovalPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending"); // "pending" or "approved"
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  const [invoiceItemsMap, setInvoiceItemsMap] = useState({});
  const [loadingItems, setLoadingItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCenter, setFilterCenter] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [approving, setApproving] = useState(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  
  // Berry style state variables
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
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

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
    return userName;
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  // Sync mobile menu state with Navbar
  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
  }, []);

  // Fetch profile info
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
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

  // Berry style mobile detection
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

  // Fetch pending invoices (MF Verified)
  const fetchPendingInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFinanceAdminInvoices();

      if (response?.success && Array.isArray(response.data)) {
        const sortedInvoices = response.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setInvoices(sortedInvoices);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching pending invoices:", err);
      setError(err.message || "Failed to load pending invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch approved invoices (Finance Accepted + Invoice Paid)
  const fetchApprovedInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFinanceAdminAcceptedInvoices();

      if (response?.success && Array.isArray(response.data)) {
        const sortedInvoices = response.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setInvoices(sortedInvoices);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching approved invoices:", err);
      setError(err.message || "Failed to load approved invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch invoices based on active tab
  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingInvoices();
    } else {
      fetchApprovedInvoices();
    }
  }, [activeTab, fetchPendingInvoices, fetchApprovedInvoices]);

  // Filter invoices
  useEffect(() => {
    let filtered = invoices;

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.centers?.center_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCenter) {
      filtered = filtered.filter(invoice => 
        invoice.centers?.center_name === filterCenter
      );
    }

    if (filterCycle) {
      filtered = filtered.filter(invoice => 
        invoice.cycle_number === parseInt(filterCycle)
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, filterCenter, filterCycle]);

  const uniqueCenters = Array.from(
    new Set(invoices.map(inv => inv.centers?.center_name).filter(Boolean))
  ).sort();

  const fetchInvoiceItems = useCallback(async (invoiceId) => {
    try {
      setLoadingItems(prev => new Set(prev).add(invoiceId));
      const response = await getInvoiceItems(invoiceId);

      if (response?.success && Array.isArray(response.data)) {
        setInvoiceItemsMap(prev => ({
          ...prev,
          [invoiceId]: response.data
        }));
      }
    } catch (err) {
      console.error("Error fetching invoice items:", err);
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  }, []);

  const toggleInvoiceExpansion = (invoiceId) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
      fetchInvoiceItems(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const handleApprove = async (invoiceId) => {
    try {
      setApproving(prev => new Set(prev).add(invoiceId));
      await updateInvoiceStatus(invoiceId, 'Finance Accepted', 'Approved by Finance Admin');
      
      // Refresh invoices based on active tab
      if (activeTab === "pending") {
        await fetchPendingInvoices();
      } else {
        await fetchApprovedInvoices();
      }
      
      setExpandedInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    } catch (err) {
      console.error("Error approving invoice:", err);
      alert(err.message || "Failed to approve invoice");
    } finally {
      setApproving(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  const handlePrintPreview = async (invoice) => {
    setInvoiceToPrint(invoice);
    setShowPrintPreview(true);
    
    if (invoiceItemsMap[invoice.invoice_id]) {
      setPrintItems(invoiceItemsMap[invoice.invoice_id]);
    } else {
      try {
        const response = await getInvoiceItems(invoice.invoice_id);
        if (response?.success && Array.isArray(response.data)) {
          setPrintItems(response.data);
          setInvoiceItemsMap(prev => ({
            ...prev,
            [invoice.invoice_id]: response.data
          }));
        }
      } catch (err) {
        console.error("Error fetching items for print:", err);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  const formatDateRange = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

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
                    Invoice Approval Dashboard 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Review and approve verified invoices
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
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-md">
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
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
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

            {/* Tabs - BERRY Style */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex flex-col sm:flex-row -mb-px">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-medium text-xs sm:text-sm transition-all duration-300 ${
                      activeTab === "pending"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        activeTab === "pending" ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          activeTab === "pending" ? "text-blue-600" : "text-gray-600"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-center sm:text-left">
                        <span className="font-semibold text-xs sm:text-sm">Pending</span>
                        <p className="text-xs text-gray-500 hidden sm:block">Awaiting approval</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("approved")}
                    className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-medium text-xs sm:text-sm transition-all duration-300 ${
                      activeTab === "approved"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        activeTab === "approved" ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          activeTab === "approved" ? "text-blue-600" : "text-gray-600"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-center sm:text-left">
                        <span className="font-semibold text-xs sm:text-sm">Approved</span>
                        <p className="text-xs text-gray-500 hidden sm:block">Completed</p>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Filters - BERRY Style */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100 p-6 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Filter Invoices</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Search Invoice</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Search by Invoice No or Center..."
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Center Filter</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={filterCenter}
                        onChange={(e) => setFilterCenter(e.target.value)}
                      >
                        <option value="">All Centers</option>
                        {uniqueCenters.map(center => (
                          <option key={center} value={center}>{center}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cycle Filter</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={filterCycle}
                        onChange={(e) => setFilterCycle(e.target.value)}
                      >
                        <option value="">All Cycles</option>
                        <option value="1">Cycle 1</option>
                        <option value="2">Cycle 2</option>
                        <option value="3">Cycle 3</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setFilterCenter("");
                          setFilterCycle("");
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Clear Filters
                      </button>
                    </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold">Error</span>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 animate-pulse"></div>
                  </div>
                  <p className="text-gray-600 font-semibold mt-4 text-lg">Loading invoices...</p>
                  <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your data</p>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="mx-auto w-32 h-32 bg-gradient-to-r from-blue-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchTerm || filterCenter || filterCycle ? "No invoices found" : `No ${activeTab === "pending" ? "pending" : "approved"} invoices`}
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  {searchTerm || filterCenter || filterCycle 
                    ? "No invoices match your search criteria. Try adjusting your filters."
                    : `There are no ${activeTab === "pending" ? "verified" : "approved"} invoices to review at the moment.`}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {activeTab === "pending" ? "Pending Invoices" : "Approved Invoices"}
                      </h2>
                      <p className="text-sm text-gray-600">{filteredInvoices.length} invoice(s) found</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {activeTab === "pending" ? "Action Required" : "Completed"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12"></th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Period</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cycle</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Net Amount</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Center Share</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredInvoices.map((invoice) => {
                          const isExpanded = expandedInvoices.has(invoice.invoice_id);
                          const invoiceItems = invoiceItemsMap[invoice.invoice_id] || [];
                          const isLoading = loadingItems.has(invoice.invoice_id);
                          const isApproving = approving.has(invoice.invoice_id);
                          
                          return (
                            <React.Fragment key={invoice.invoice_id}>
                              <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 transition-all duration-200">
                                <td className="px-4 py-4 text-sm">
                                  <button
                                    onClick={() => toggleInvoiceExpansion(invoice.invoice_id)}
                                    className="p-2 text-gray-400 hover:text-blue-600 transition-all duration-200 hover:bg-blue-50 rounded-lg"
                                  >
                                    {isExpanded ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-blue-100 rounded">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <span className="font-mono font-semibold text-blue-600">{invoice.invoice_number}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                    <span className="font-medium text-gray-900">{invoice.centers?.center_name || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                <td className="px-4 py-4 text-sm text-gray-600">{formatDateRange(invoice.period_start, invoice.period_end)}</td>
                                <td className="px-4 py-4 text-sm">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold">
                                    Cycle {invoice.cycle_number}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-blue-600 font-bold">₹</span>
                                    <span className="font-bold text-blue-600">{invoice.total_net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-purple-600 font-bold">₹</span>
                                    <span className="font-bold text-purple-600">{invoice.total_center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handlePrintPreview(invoice)}
                                      className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-xs font-semibold shadow-md hover:shadow-lg"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </button>
                                    {activeTab === "pending" && (
                                      <button
                                        onClick={() => handleApprove(invoice.invoice_id)}
                                        disabled={isApproving}
                                        className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                                          isApproving
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                      >
                                        {isApproving ? (
                                          <>
                                            <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 014 12z"></path>
                                            </svg>
                                            Approving...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Approve
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {activeTab === "approved" && (
                                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-100 text-blue-800 border border-blue-200">
                                        ✓ Approved
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expanded Row - Berry Style */}
                              {isExpanded && (
                                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                                  <td colSpan="10" className="px-4 py-4">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                      <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                          <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h3 className="text-xl font-bold text-gray-800">Student Payment Details</h3>
                                            <p className="text-sm text-gray-600">Invoice {invoice.invoice_number}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                            {invoiceItems.length} Students
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {isLoading ? (
                                        <div className="text-center py-12">
                                          <div className="inline-flex items-center space-x-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                                            <span className="text-gray-600 font-medium">Loading student payments...</span>
                                          </div>
                                        </div>
                                      ) : invoiceItems.length === 0 ? (
                                        <div className="text-center py-12">
                                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                          </div>
                                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Student Payments</h3>
                                          <p className="text-gray-600">No student payments found for this invoice</p>
                                        </div>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                                              <tr>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">S.No</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Student Name</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Register No</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course Name</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fee Term</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fee Paid</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Net Amount</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Center Share</th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                              {invoiceItems.map((item, index) => (
                                                <tr key={item.item_id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 transition-all duration-200">
                                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">{index + 1}</td>
                                                  <td className="px-4 py-4 text-sm">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                                        {item.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                                      </div>
                                                      <span className="font-medium text-gray-900">{item.student_name}</span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-4 text-sm font-mono text-gray-600">{item.registration_number || 'N/A'}</td>
                                                  <td className="px-4 py-4 text-sm text-gray-600">{item.course_name}</td>
                                                  <td className="px-4 py-4 text-sm text-gray-600">{formatDate(item.transaction_date)}</td>
                                                  <td className="px-4 py-4 text-sm">
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold">
                                                      {item.fee_term}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">₹{item.fee_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                  <td className="px-4 py-4 text-sm">
                                                    <div className="flex items-center space-x-1">
                                                      <span className="text-blue-600 font-bold">₹</span>
                                                      <span className="font-bold text-blue-600">{item.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-4 text-sm">
                                                    <div className="flex items-center space-x-1">
                                                      <span className="text-purple-600 font-bold">₹</span>
                                                      <span className="font-bold text-purple-600">{item.center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                                    </div>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-75 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8">
          <div className="relative bg-gray-100 rounded-2xl shadow-2xl max-w-5xl w-full mx-auto overflow-hidden">
            {/* Modal Header - Non-printable */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Printer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Invoice Print Preview</h3>
                  <p className="text-sm text-gray-500">{invoiceToPrint?.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content - Printable */}
            <div className="p-4 sm:p-12 bg-gray-50 flex justify-center overflow-x-auto">
              <div className="bg-white shadow-xl">
                <InvoicePrintTemplate 
                  invoice={invoiceToPrint} 
                  items={printItems} 
                  centerName={invoiceToPrint?.centers?.center_name || 'N/A'} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceInvoiceApprovalPage;

