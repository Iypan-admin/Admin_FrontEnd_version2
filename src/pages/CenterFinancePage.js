import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import { 
  getCenterByAdminId,
  getCyclePayments,
  generateInvoice,
  getCenterInvoices,
  getInvoiceItems
} from "../services/Api";

const CenterFinancePage = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "history"
  
  // Generate Invoice Tab state
  const [cyclePayments, setCyclePayments] = useState([]);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // History Tab state
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  const [invoiceItemsMap, setInvoiceItemsMap] = useState({});
  const [loadingItems, setLoadingItems] = useState(new Set());
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  
  // Search & filter state (for History tab)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterCycle, setFilterCycle] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load center info
  useEffect(() => {
    const loadCenter = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        const centerResponse = await getCenterByAdminId(token);
        if (!centerResponse || !centerResponse.success) {
          throw new Error(centerResponse?.message || 'Failed to fetch center info');
        }

        const center = Array.isArray(centerResponse.data)
          ? centerResponse.data[0]
          : centerResponse.data;

        setSelectedCenter({
          center_id: center.center_id,
          center_name: center.center_name,
        });
      } catch (err) {
        console.error('Failed to load center info:', err);
        setSelectedCenter({ center_id: 'unknown', center_name: 'Unknown Center' });
      }
    };

    loadCenter();
  }, []);

  // Fetch cycle payments for Generate Invoice tab
  const fetchCyclePayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCyclePayments();

      if (response?.success && response.data) {
        setCyclePayments(response.data.payments || []);
        setCycleInfo({
          cycle: response.data.cycle,
          canGenerate: response.data.canGenerate,
          summary: response.data.summary
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching cycle payments:", err);
      setError(err.message || "Failed to load cycle payments");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch invoices for View Invoices tab
  const fetchInvoices = useCallback(async () => {
    try {
      setInvoiceLoading(true);
      const response = await getCenterInvoices();

      if (response?.success && Array.isArray(response.data)) {
        const sortedInvoices = response.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setInvoices(sortedInvoices);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err.message || "Failed to load invoices");
    } finally {
      setInvoiceLoading(false);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "generate") {
      fetchCyclePayments();
    } else if (activeTab === "history") {
      fetchInvoices();
    }
  }, [activeTab, fetchCyclePayments, fetchInvoices]);

  // Fetch invoice items when invoice is expanded
  const fetchInvoiceItems = async (invoiceId) => {
    if (invoiceItemsMap[invoiceId]) {
      // Already loaded
      return;
    }

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
      setError(err.message || "Failed to load invoice items");
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  // Toggle invoice expansion
  const toggleInvoiceExpansion = (invoiceId) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
      // Fetch items when expanding
      fetchInvoiceItems(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  // Filter invoices
  useEffect(() => {
    let filtered = invoices;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }

    // Month filter
    if (filterMonth !== "all") {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
        return (invoiceDate.getMonth() + 1) === parseInt(filterMonth);
      });
    }

    // Year filter
    if (filterYear !== "all") {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
        return invoiceDate.getFullYear() === parseInt(filterYear);
      });
    }

    // Cycle filter
    if (filterCycle !== "all") {
      filtered = filtered.filter(invoice => invoice.cycle_number === parseInt(filterCycle));
    }

    setFilteredInvoices(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [invoices, searchTerm, filterStatus, filterMonth, filterYear, filterCycle]);

  // Calculate total center share amount for filtered invoices
  const totalCenterShare = useMemo(() => {
    return filteredInvoices.reduce((sum, invoice) => {
      return sum + (parseFloat(invoice.total_center_share) || 0);
    }, 0);
  }, [filteredInvoices]);

  // Get unique months, years, and cycles from invoices
  const availableMonths = useMemo(() => {
    const months = new Set();
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
      months.add(invoiceDate.getMonth() + 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [invoices]);

  const availableYears = useMemo(() => {
    const years = new Set();
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
      years.add(invoiceDate.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [invoices]);

  const availableCycles = useMemo(() => {
    const cycles = new Set();
    invoices.forEach(invoice => {
      if (invoice.cycle_number) {
        cycles.add(invoice.cycle_number);
      }
    });
    return Array.from(cycles).sort((a, b) => a - b);
  }, [invoices]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Pagination for invoices
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Format date (DD/MM/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date range (DD/MM/YYYY – DD/MM/YYYY)
  const formatDateRange = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  // Generate invoice handler
  const handleGenerateInvoice = async () => {
    try {
      setGenerating(true);
      const response = await generateInvoice();

      if (response?.success) {
        // Show success message
        alert(`Invoice generated successfully! Invoice Number: ${response.data.invoice.invoice_number}`);
        
        // Refresh cycle payments (will update to show no more payments)
        await fetchCyclePayments();
        
        // Switch to History tab to show the newly generated invoice
        setActiveTab("history");
        
        // Refresh invoices list in history tab
        await fetchInvoices();
      } else {
        throw new Error(response?.error || "Failed to generate invoice");
      }
    } catch (err) {
      console.error("Error generating invoice:", err);
      alert(err.message || "Failed to generate invoice");
    } finally {
      setGenerating(false);
    }
  };

  if (loading && activeTab === "generate") {
    return (
      <div className="flex h-screen overflow-hidden">
        <Navbar showCenterViewOptions={false} selectedCenter={selectedCenter} />
        <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar showCenterViewOptions={false} selectedCenter={selectedCenter} />
      <div className="flex-1 lg:ml-64 overflow-hidden">
        <div className="h-screen overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Invoice Management</h1>
                    <p className="text-blue-100 text-lg">
                      {selectedCenter?.center_name || 'Your center'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("generate")}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors duration-200 ${
                      activeTab === "generate"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Generate Invoice</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors duration-200 ${
                      activeTab === "history"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>History</span>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Generate Invoice Tab */}
                {activeTab === "generate" && (
                  <div className="space-y-6">
                    {/* Cycle Info Card */}
                    {cycleInfo && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              Cycle {cycleInfo.cycle.cycleNumber}
                            </div>
                            <div className="text-sm text-gray-600">Current Cycle</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {formatDateRange(cycleInfo.cycle.periodStart, cycleInfo.cycle.periodEnd)}
                            </div>
                            <div className="text-sm text-gray-600">Payment Period</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">
                              {formatDateRange(cycleInfo.cycle.generationStart, cycleInfo.cycle.generationEnd)}
                            </div>
                            <div className="text-sm text-gray-600">Generation Period</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {cycleInfo.summary?.totalPayments || 0}
                            </div>
                            <div className="text-sm text-gray-600">Total Payments</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              ₹{cycleInfo.summary?.totalCenterShare?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                            <div className="text-sm text-gray-600">Total Center Share</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Generate Invoice Button */}
                    {cycleInfo?.canGenerate && cyclePayments.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={handleGenerateInvoice}
                          disabled={generating}
                          className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 ${
                            generating ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {generating ? (
                            <span className="flex items-center space-x-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 014 12z"></path>
                              </svg>
                              <span>Generating...</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Generate Invoice</span>
                            </span>
                          )}
                        </button>
                      </div>
                    )}

                    {!cycleInfo?.canGenerate && cyclePayments.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">
                            {cycleInfo?.cycle?.generationStart && cycleInfo?.cycle?.generationEnd
                              ? `Invoice for Cycle ${cycleInfo.cycle.cycleNumber} (Payment Period: ${formatDateRange(cycleInfo.cycle.periodStart, cycleInfo.cycle.periodEnd)}) can only be generated during the generation period: ${formatDateRange(cycleInfo.cycle.generationStart, cycleInfo.cycle.generationEnd)}`
                              : cycleInfo?.cycle?.cycleNumber === 1 
                              ? "Invoice for Cycle 1 can only be generated during the generation period: 11th - 15th of the month"
                              : cycleInfo?.cycle?.cycleNumber === 2
                              ? "Invoice for Cycle 2 can only be generated during the generation period: 21st - 25th of the month"
                              : cycleInfo?.cycle?.cycleNumber === 3
                              ? "Invoice for Cycle 3 can only be generated during the generation period: 1st - 5th of the next month"
                              : "Invoice can only be generated during the specified generation period for each cycle"
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Payments Table */}
                    {cyclePayments.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          No payments available
                        </h3>
                        <p className="text-gray-500">
                          No payments found for the current invoice cycle.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-bold text-gray-800">Student Payment Data</h2>
                          <p className="text-sm text-gray-600">{cyclePayments.length} payments found</p>
                        </div>
                        <div className="overflow-x-auto">
                          <div className="max-h-[500px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Register No</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Name</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Mode</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Term</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Paid</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Amount</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center Share</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {cyclePayments.map((payment, index) => (
                                  <tr key={payment.payment_id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                    <td className="px-4 py-4 text-sm">{index + 1}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{payment.student_name}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{payment.registration_number}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{payment.course_name}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{payment.course_mode || 'N/A'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(payment.transaction_date)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{payment.fee_term}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-green-600">₹{payment.fee_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-blue-600">₹{payment.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-purple-600">₹{payment.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                  <div className="space-y-6">
                    {/* Search and Filter */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                      {/* Search and Status Row */}
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Search Invoices
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              placeholder="Search by Invoice No..."
                              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="lg:w-48">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                          >
                            <option value="all">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="MF Verified">MF Verified</option>
                            <option value="Finance Accepted">Finance Accepted</option>
                            <option value="Invoice Paid">Invoice Paid</option>
                            <option value="Verified">Verified</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </div>
                      </div>

                      {/* Advanced Filters Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Month
                          </label>
                          <select
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                          >
                            <option value="all">All Months</option>
                            {availableMonths.map(month => (
                              <option key={month} value={month}>
                                {monthNames[month - 1]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Year
                          </label>
                          <select
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                          >
                            <option value="all">All Years</option>
                            {availableYears.map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cycle
                          </label>
                          <select
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filterCycle}
                            onChange={(e) => setFilterCycle(e.target.value)}
                          >
                            <option value="all">All Cycles</option>
                            {availableCycles.map(cycle => (
                              <option key={cycle} value={cycle}>
                                Cycle {cycle}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Total Center Share Summary */}
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">
                              {filterMonth !== "all" || filterYear !== "all" || filterCycle !== "all" || filterStatus !== "all" || searchTerm
                                ? "Total Center Share Amount (Filtered)"
                                : "Total Center Share Amount (All Invoices)"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {filterMonth !== "all" || filterYear !== "all" || filterCycle !== "all" || filterStatus !== "all" || searchTerm
                                ? `${filteredInvoices.length} invoice(s) match your filters`
                                : `${filteredInvoices.length} invoice(s) in total`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">
                              ₹{totalCenterShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Invoices Table */}
                    {invoiceLoading ? (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading invoices...</p>
                      </div>
                    ) : filteredInvoices.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {searchTerm || filterStatus !== 'all' ? "No invoices found" : "No invoices generated"}
                        </h3>
                        <p className="text-gray-500">
                          {searchTerm || filterStatus !== 'all' 
                            ? "No invoices match your search criteria."
                            : "No invoices have been generated yet."}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-bold text-gray-800">Generated Invoices</h2>
                          <p className="text-sm text-gray-600">{filteredInvoices.length} invoice(s) found</p>
                        </div>
                        <div className="overflow-x-auto">
                          <div className="max-h-[500px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12"></th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Period</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Net Amount</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Center Share</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {paginatedInvoices.map((invoice) => {
                                  const isExpanded = expandedInvoices.has(invoice.invoice_id);
                                  const invoiceItems = invoiceItemsMap[invoice.invoice_id] || [];
                                  const isLoading = loadingItems.has(invoice.invoice_id);
                                  
                                  return (
                                    <React.Fragment key={invoice.invoice_id}>
                                      <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                        <td className="px-4 py-4 text-sm">
                                          <button
                                            onClick={() => toggleInvoiceExpansion(invoice.invoice_id)}
                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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
                                        <td className="px-4 py-4 text-sm font-mono text-blue-600">{invoice.invoice_number}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600">{formatDateRange(invoice.period_start, invoice.period_end)}</td>
                                        <td className="px-4 py-4 text-sm font-medium text-blue-600">₹{invoice.total_net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-purple-600">₹{invoice.total_center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                        <td className="px-4 py-4 text-sm">
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            invoice.status === 'Invoice Paid' 
                                              ? 'bg-green-100 text-green-800'
                                              : invoice.status === 'Finance Accepted'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : invoice.status === 'MF Verified'
                                              ? 'bg-blue-100 text-blue-800'
                                              : invoice.status === 'Approved' 
                                              ? 'bg-green-100 text-green-800' 
                                              : invoice.status === 'Verified'
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {invoice.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                          {invoice.pdf_url ? (
                                            <a
                                              href={`${invoice.pdf_url}?t=${invoice.updated_at || invoice.created_at || Date.now()}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xs font-medium"
                                            >
                                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                              </svg>
                                              View PDF
                                            </a>
                                          ) : (
                                            <span className="text-gray-400 text-xs">PDF not available</span>
                                          )}
                                        </td>
                                      </tr>
                                      
                                      {/* Expanded Row - Student Payment List */}
                                      {isExpanded && (
                                        <tr className="bg-gray-50">
                                          <td colSpan="8" className="px-4 py-4">
                                            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                              <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-800">Student Payment List</h3>
                                                <span className="text-sm text-gray-600">{invoiceItems.length} student(s)</span>
                                              </div>
                                              
                                              {isLoading ? (
                                                <div className="text-center py-8">
                                                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-2"></div>
                                                  <p className="text-gray-600 text-sm">Loading student list...</p>
                                                </div>
                                              ) : invoiceItems.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                  <p>No student payments found for this invoice</p>
                                                </div>
                                              ) : (
                                                <div className="overflow-x-auto">
                                                  <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-100">
                                                      <tr>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Register No</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Name</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Term</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Paid</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Amount</th>
                                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center Share (20%)</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                      {invoiceItems.map((item, index) => (
                                                        <tr key={item.item_id} className="hover:bg-blue-50 transition-colors">
                                                          <td className="px-3 py-3 text-sm text-gray-600">{index + 1}</td>
                                                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.student_name}</td>
                                                          <td className="px-3 py-3 text-sm text-gray-600">{item.registration_number || 'N/A'}</td>
                                                          <td className="px-3 py-3 text-sm text-gray-600">{item.course_name}</td>
                                                          <td className="px-3 py-3 text-sm text-gray-600">{formatDate(item.transaction_date)}</td>
                                                          <td className="px-3 py-3 text-sm text-gray-600">{item.fee_term}</td>
                                                          <td className="px-3 py-3 text-sm font-medium text-green-600">₹{item.fee_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                          <td className="px-3 py-3 text-sm font-medium text-blue-600">₹{item.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                          <td className="px-3 py-3 text-sm font-bold text-purple-600">₹{item.center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
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
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <span className="px-4 py-2 text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

export default CenterFinancePage;
