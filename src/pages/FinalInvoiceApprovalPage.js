import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import { 
  getManagerAdminInvoices,
  getManagerAdminPaidInvoices,
  getInvoiceItems,
  updateInvoiceStatus,
  getCurrentUserProfile
} from "../services/Api";
import InvoicePrintTemplate from "../components/InvoicePrintTemplate";
import { X, Printer } from "lucide-react";

const FinalInvoiceApprovalPage = () => {
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
  const navigate = useNavigate();

  // Berry UI State
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Get current user from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  const userRole = decodedToken?.role || null;

  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    const roleMap = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'academic': 'Academic Coordinator'
    };
    return roleMap[userRole] || "User";
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (e) => setIsMobileMenuOpen(e.detail);
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    handleSidebarToggle();
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  // Fetch pending invoices (Finance Accepted)
  const fetchPendingInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getManagerAdminInvoices();

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

  // Fetch approved invoices (Invoice Paid)
  const fetchApprovedInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getManagerAdminPaidInvoices();

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
    setCurrentPage(1); // Reset to first page on search/filter change
  }, [invoices, searchTerm, filterCenter, filterCycle]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when changing tabs
  }, [activeTab]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
      await updateInvoiceStatus(invoiceId, 'Invoice Paid', 'Final approval by Manager/Admin');
      
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
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <Navbar />
      <div 
        className="flex-1 transition-all duration-300 min-w-0 overflow-y-auto h-screen"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        {/* Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Final Invoice Approval</h1>
                  <p className="text-sm text-gray-500 mt-1">Review and approve center invoices</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {(userRole === 'manager' || userRole === 'admin') && <ManagerNotificationBell />}
                {userRole === 'academic' && <AcademicNotificationBell />}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-purple-300 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md hover:ring-2 hover:ring-purple-300 transition-all">
                        {getDisplayName()?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </button>

                  {isProfileDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                          <h3 className="font-bold text-gray-800">Welcome, {getDisplayName()?.split(' ')[0] || "User"}</h3>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{userRole?.replace('_', ' ') || 'Manager'}</p>
                        </div>
                        <div className="py-2">
                          <button
                            onClick={() => {
                              const path = userRole === 'academic' ? '/academic-coordinator/settings' : '/manager/account-settings';
                              navigate(path);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                          >
                            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Account Settings
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem("token");
                              navigate("/");
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2 hover:bg-red-50 transition-colors text-sm text-red-600 border-t border-gray-100"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
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

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors duration-200 ${
                    activeTab === "pending"
                      ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                      : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Pending</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("approved")}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors duration-200 ${
                    activeTab === "approved"
                      ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                      : "text-gray-600 hover:text-purple-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Approved</span>
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by Invoice No or Center..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Center</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cycle</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                      className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading invoices...</p>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm || filterCenter || filterCycle ? "No invoices found" : `No ${activeTab === "pending" ? "pending" : "approved"} invoices`}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || filterCenter || filterCycle 
                      ? "No invoices match your search criteria."
                      : `There are no ${activeTab === "pending" ? "finance accepted" : "paid"} invoices to review.`}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">
                      {activeTab === "pending" ? "Pending Invoices" : "Approved Invoices"}
                    </h2>
                    <p className="text-sm text-gray-600">{filteredInvoices.length} invoice(s) found</p>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-12"></th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Invoice No</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Center</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Payment Period</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cycle</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Net Amount</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Center Share</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {paginatedInvoices.map((invoice) => {
                            const isExpanded = expandedInvoices.has(invoice.invoice_id);
                            const invoiceItems = invoiceItemsMap[invoice.invoice_id] || [];
                            const isLoading = loadingItems.has(invoice.invoice_id);
                            const isApproving = approving.has(invoice.invoice_id);
                            
                            return (
                              <React.Fragment key={invoice.invoice_id}>
                                <tr className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200">
                                  <td className="px-4 py-4 text-sm">
                                    <button
                                      onClick={() => toggleInvoiceExpansion(invoice.invoice_id)}
                                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
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
                                  <td className="px-4 py-4 text-sm font-mono text-purple-600">{invoice.invoice_number}</td>
                                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{invoice.centers?.center_name || 'N/A'}</td>
                                  <td className="px-4 py-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                  <td className="px-4 py-4 text-sm text-gray-600">{formatDateRange(invoice.period_start, invoice.period_end)}</td>
                                  <td className="px-4 py-4 text-sm text-gray-600">Cycle {invoice.cycle_number}</td>
                                  <td className="px-4 py-4 text-sm font-medium text-purple-600">₹{invoice.total_net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                  <td className="px-4 py-4 text-sm font-bold text-purple-600">₹{invoice.total_center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                  <td className="px-4 py-4 text-sm">
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                      {invoice.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <button
                                      onClick={() => handlePrintPreview(invoice)}
                                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xs font-medium"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View & Print
                                    </button>
                                      {activeTab === "pending" && (
                                        <button
                                          onClick={() => handleApprove(invoice.invoice_id)}
                                          disabled={isApproving}
                                          className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-200 ${
                                            isApproving
                                              ? 'bg-gray-400 text-white cursor-not-allowed'
                                              : 'bg-purple-600 text-white hover:bg-purple-700'
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
                                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                                          Paid
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Expanded Row - Same structure as other pages */}
                                {isExpanded && (
                                  <tr className="bg-gray-50">
                                    <td colSpan="10" className="px-3 py-4">
                                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mx-4">
                                        <div className="flex items-center justify-between mb-4">
                                          <h3 className="text-lg font-bold text-gray-800">Student Payment List</h3>
                                          <span className="text-sm font-medium px-3 py-1 bg-purple-100 text-purple-700 rounded-full">{invoiceItems.length} student(s)</span>
                                        </div>
                                        
                                        {isLoading ? (
                                          <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600 mx-auto mb-3"></div>
                                            <p className="text-gray-500 font-medium text-sm">Loading student list...</p>
                                          </div>
                                        ) : invoiceItems.length === 0 ? (
                                          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            <p>No student payments found for this invoice</p>
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">S.No</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Details</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course Name</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fee Term</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Fee Paid</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Net Amount</th>
                                                  <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Center Share</th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-gray-100">
                                                {invoiceItems.map((item, index) => (
                                                  <tr key={item.item_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 py-4 text-sm text-gray-500">{index + 1}</td>
                                                    <td className="px-3 py-4">
                                                      <div className="text-sm font-bold text-gray-900">{item.student_name}</div>
                                                      <div className="text-xs text-gray-500 font-mono mt-0.5">{item.registration_number || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-3 py-4 text-sm text-gray-700">{item.course_name}</td>
                                                    <td className="px-3 py-4 text-sm text-gray-600">{formatDate(item.transaction_date)}</td>
                                                    <td className="px-3 py-4 text-sm text-purple-600 font-medium">{item.fee_term}</td>
                                                    <td className="px-3 py-4 text-sm text-gray-900 font-medium text-right">₹{item.fee_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                    <td className="px-3 py-4 text-sm text-purple-600 font-bold text-right">₹{item.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                    <td className="px-3 py-4 text-sm font-bold text-purple-600 text-right">₹{item.center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
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

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-sm text-gray-500 font-medium">
                        Showing <span className="text-gray-900 font-bold">{startIndex + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(startIndex + itemsPerPage, filteredInvoices.length)}</span> of <span className="text-gray-900 font-bold">{filteredInvoices.length}</span> invoices
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="flex items-center">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`min-w-[40px] h-10 px-2 rounded-lg text-sm font-bold transition-all ${
                                currentPage === page
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-100'
                              } mx-0.5`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

export default FinalInvoiceApprovalPage;
