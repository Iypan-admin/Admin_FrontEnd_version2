import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import { 
  getFinanceAdminInvoices,
  getFinanceAdminAcceptedInvoices,
  getInvoiceItems,
  updateInvoiceStatus
} from "../services/Api";

const FinanceInvoiceApprovalPage = () => {
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="flex-1 lg:ml-64 overflow-hidden">
        <div className="h-screen overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Invoice Approval</h1>
                    <p className="text-green-100 text-lg">
                      Review and approve verified invoices
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
                    onClick={() => setActiveTab("pending")}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors duration-200 ${
                      activeTab === "pending"
                        ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                        : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
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
                        ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                        : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Center</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm || filterCenter || filterCycle ? "No invoices found" : `No ${activeTab === "pending" ? "pending" : "approved"} invoices`}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterCenter || filterCycle 
                    ? "No invoices match your search criteria."
                    : `There are no ${activeTab === "pending" ? "verified" : "approved"} invoices to review.`}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
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
                              <tr className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
                                <td className="px-4 py-4 text-sm">
                                  <button
                                    onClick={() => toggleInvoiceExpansion(invoice.invoice_id)}
                                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
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
                                <td className="px-4 py-4 text-sm font-mono text-green-600">{invoice.invoice_number}</td>
                                <td className="px-4 py-4 text-sm font-medium text-gray-900">{invoice.centers?.center_name || 'N/A'}</td>
                                <td className="px-4 py-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                <td className="px-4 py-4 text-sm text-gray-600">{formatDateRange(invoice.period_start, invoice.period_end)}</td>
                                <td className="px-4 py-4 text-sm text-gray-600">Cycle {invoice.cycle_number}</td>
                                <td className="px-4 py-4 text-sm font-medium text-green-600">₹{invoice.total_net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                <td className="px-4 py-4 text-sm font-bold text-purple-600">₹{invoice.total_center_share?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                <td className="px-4 py-4 text-sm">
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    {invoice.pdf_url && (
                                      <a
                                        href={`${invoice.pdf_url}?t=${invoice.updated_at || invoice.created_at || Date.now()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-xs font-medium"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View PDF
                                      </a>
                                    )}
                                    {activeTab === "pending" && (
                                      <button
                                        onClick={() => handleApprove(invoice.invoice_id)}
                                        disabled={isApproving}
                                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-200 ${
                                          isApproving
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
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
                                        Approved
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expanded Row - Same as InvoiceRequestsPage */}
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan="10" className="px-4 py-4">
                                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                      <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Student Payment List</h3>
                                        <span className="text-sm text-gray-600">{invoiceItems.length} student(s)</span>
                                      </div>
                                      
                                      {isLoading ? (
                                        <div className="text-center py-8">
                                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600 mx-auto mb-2"></div>
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
                                                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Center Share</th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {invoiceItems.map((item, index) => (
                                                <tr key={item.item_id} className="hover:bg-gray-50">
                                                  <td className="px-3 py-3 text-sm">{index + 1}</td>
                                                  <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.student_name}</td>
                                                  <td className="px-3 py-3 text-sm text-gray-600">{item.registration_number || 'N/A'}</td>
                                                  <td className="px-3 py-3 text-sm text-gray-600">{item.course_name}</td>
                                                  <td className="px-3 py-3 text-sm text-gray-600">{formatDate(item.transaction_date)}</td>
                                                  <td className="px-3 py-3 text-sm text-gray-600">{item.fee_term}</td>
                                                  <td className="px-3 py-3 text-sm text-gray-900">₹{item.fee_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                  <td className="px-3 py-3 text-sm text-green-600">₹{item.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
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

export default FinanceInvoiceApprovalPage;

