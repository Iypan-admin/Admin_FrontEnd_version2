import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import {
  getAllPayments,
  approvePayment,
  editPaymentDuration,
} from "../services/Api";
import EditTransactionModal from "../components/EditTransactionModal";
// Icons will be replaced with inline SVG to avoid dependency issues

const ApproveStudentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | approved | pending
  const [filterPaymentType, setFilterPaymentType] = useState("all"); // all | full | emi
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved"
  
  // Revenue breakdown filter state
  const [revenueFilterMonth, setRevenueFilterMonth] = useState("all");
  const [revenueFilterBatch, setRevenueFilterBatch] = useState("all");
  const [revenueFilterCourse, setRevenueFilterCourse] = useState("all");
  const [revenueFilterDateRange, setRevenueFilterDateRange] = useState({ start: "", end: "" });

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllPayments();

      if (response?.success && Array.isArray(response.data)) {
        const sortedPayments = response.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        // Debug: Log the first payment to see the data structure
        if (sortedPayments.length > 0) {
          console.log("Sample payment data structure:", sortedPayments[0]);
          console.log("Enrollment data:", sortedPayments[0].enrollment);
          console.log("Batch data:", sortedPayments[0].enrollment?.batch);
        }
        setPayments(sortedPayments);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Approve payment
  const handleApprove = async (paymentId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to approve this payment?"
    );
    if (!isConfirmed) return;

    try {
      await approvePayment(paymentId);
      alert("Payment approved successfully!");
      fetchPayments();
    } catch (err) {
      alert("Failed to approve payment: " + err.message);
    }
  };

  // Open edit modal
  const handleEdit = (payment) => {
    setEditingPayment(payment);
  };

  // Update payment
  const handleUpdatePayment = async (updatedFields) => {
    try {
      await editPaymentDuration(editingPayment.payment_id, updatedFields.course_duration);

      setPayments((prev) =>
        prev.map((payment) =>
          payment.payment_id === editingPayment.payment_id
            ? { ...payment, ...updatedFields }
            : payment
        )
      );

      setEditingPayment(null);
    } catch (err) {
      console.error("Failed to update payment:", err);
      alert("Failed to update payment: " + err.message);
    }
  };

  // Get unique values for filter dropdowns
  // Helper function to get batch name
  const getBatchName = (payment) => {
    return payment.batch_name || 
           payment.enrollment?.batch?.batch_name || 
           payment.enrollment?.batch?.name || 
           'N/A';
  };

  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(payments.map(p => p.course_name).filter(Boolean))];
    return courses.sort();
  }, [payments]);

  const uniqueBatches = useMemo(() => {
    const batches = [...new Set(payments.map(p => getBatchName(p)).filter(name => name !== 'N/A'))];
    return batches.sort();
  }, [payments]);

  const uniqueYears = useMemo(() => {
    const years = [...new Set(payments.map(p => new Date(p.created_at).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [payments]);

  const uniqueMonths = useMemo(() => {
    const months = [...new Set(payments.map(p => new Date(p.created_at).getMonth() + 1))];
    return months.sort((a, b) => a - b);
  }, [payments]);

  // Extract date range values for dependency tracking
  const revenueDateStart = revenueFilterDateRange?.start || "";
  const revenueDateEnd = revenueFilterDateRange?.end || "";

  // Revenue calculations
  const revenueStats = useMemo(() => {
    let approvedPayments = payments.filter(p => p.status === true);
    
    // Apply revenue breakdown filters
    approvedPayments = approvedPayments.filter((p) => {
      if (!p.created_at) return false;
      
      const paymentDate = new Date(p.created_at);
      if (isNaN(paymentDate.getTime())) return false;
      
      // Month filter
      const matchesMonth =
        !revenueFilterMonth || revenueFilterMonth === "all"
          ? true
          : paymentDate.getMonth() + 1 === parseInt(revenueFilterMonth, 10);

      // Batch filter
      const matchesBatch =
        !revenueFilterBatch || revenueFilterBatch === "all"
          ? true
          : getBatchName(p) === revenueFilterBatch;

      // Course filter
      const matchesCourse =
        !revenueFilterCourse || revenueFilterCourse === "all"
          ? true
          : p.course_name === revenueFilterCourse;

      // Date range filter
      let matchesDateRange = true;
      const startDateStr = revenueDateStart;
      const endDateStr = revenueDateEnd;
      
      if (startDateStr && startDateStr.trim() !== "") {
        const startDate = new Date(startDateStr + "T00:00:00");
        if (!isNaN(startDate.getTime())) {
          const paymentDateStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          if (paymentDateStart < startDateOnly) {
            matchesDateRange = false;
          }
        }
      }
      
      if (endDateStr && endDateStr.trim() !== "") {
        const endDate = new Date(endDateStr + "T23:59:59");
        if (!isNaN(endDate.getTime())) {
          const paymentDateEnd = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (paymentDateEnd > endDateOnly) {
            matchesDateRange = false;
          }
        }
      }

      return matchesMonth && matchesBatch && matchesCourse && matchesDateRange;
    });
    
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.final_fees || 0), 0);
    const fullPaymentRevenue = approvedPayments
      .filter(p => p.payment_type === 'full')
      .reduce((sum, p) => sum + (p.final_fees || 0), 0);
    const emiRevenue = approvedPayments
      .filter(p => p.payment_type === 'emi')
      .reduce((sum, p) => sum + (p.final_fees || 0), 0);
    
    const courseBreakdown = approvedPayments.reduce((acc, p) => {
      const course = p.course_name || 'Unknown';
      acc[course] = (acc[course] || 0) + (p.final_fees || 0);
      return acc;
    }, {});

    const batchBreakdown = approvedPayments.reduce((acc, p) => {
      const batch = getBatchName(p);
      acc[batch] = (acc[batch] || 0) + (p.final_fees || 0);
      return acc;
    }, {});

    return {
      totalRevenue,
      fullPaymentRevenue,
      emiRevenue,
      courseBreakdown,
      batchBreakdown,
      totalPayments: approvedPayments.length,
      averagePayment: approvedPayments.length > 0 ? totalRevenue / approvedPayments.length : 0
    };
  }, [payments, revenueFilterMonth, revenueFilterBatch, revenueFilterCourse, revenueDateStart, revenueDateEnd]);

  // EMI calculations for each payment
  const getEmiDetails = (payment) => {
    if (payment.payment_type !== 'emi') return null;
    
    const totalEmiDuration = payment.emi_duration || 0;
    const currentEmi = payment.current_emi || 0;
    const remainingEmis = totalEmiDuration - currentEmi;
    const nextDueDate = payment.next_emi_due_date;
    
    return {
      totalEmiDuration,
      currentEmi,
      remainingEmis,
      nextDueDate,
      isLastEmi: currentEmi === totalEmiDuration
    };
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Filter by active tab
      const matchesTab = activeTab === "pending" ? p.status === false : p.status === true;

      const matchesSearch =
        p.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.is_referred && p.referring_center_name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "approved"
            ? p.status === true
            : p.status === false;

      const matchesPaymentType =
        filterPaymentType === "all"
          ? true
          : p.payment_type === filterPaymentType;

      const matchesCourse =
        filterCourse === "all"
          ? true
          : p.course_name === filterCourse;

      const matchesBatch =
        filterBatch === "all"
          ? true
          : getBatchName(p) === filterBatch;

      const paymentDate = new Date(p.created_at);
      const matchesMonth =
        filterMonth === "all"
          ? true
          : paymentDate.getMonth() + 1 === parseInt(filterMonth);

      const matchesYear =
        filterYear === "all"
          ? true
          : paymentDate.getFullYear() === parseInt(filterYear);

      const matchesDateRange =
        (!dateRange.start || paymentDate >= new Date(dateRange.start)) &&
        (!dateRange.end || paymentDate <= new Date(dateRange.end));

      return matchesTab && matchesSearch && matchesStatus && matchesPaymentType && 
             matchesCourse && matchesBatch && matchesMonth && 
             matchesYear && matchesDateRange;
    });
  }, [payments, searchTerm, filterStatus, filterPaymentType, filterCourse, 
      filterBatch, filterMonth, filterYear, dateRange, activeTab]);

  // Toggle row expansion
  const toggleRowExpansion = (paymentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Navbar />
        <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="flex-1 lg:ml-64 overflow-hidden">
        <div className="h-screen overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">Payment Transactions</h1>
                    <p className="text-blue-100 text-lg">Review and manage student payment transactions</p>
                  </div>
                </div>
                
                {/* Enhanced Revenue Stats */}
                <div className="hidden lg:flex space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{payments.length}</div>
                    <div className="text-blue-200 text-sm">Total Payments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{revenueStats.totalPayments}</div>
                    <div className="text-blue-200 text-sm">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">₹{revenueStats.totalRevenue.toLocaleString()}</div>
                    <div className="text-blue-200 text-sm">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">₹{Math.round(revenueStats.averagePayment).toLocaleString()}</div>
                    <div className="text-blue-200 text-sm">Avg Payment</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Search and Filter Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Payments
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by Payment ID, Student Name, Registration Number, Course, or Referring Center..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="lg:w-48">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div className="lg:w-48">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Type
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      value={filterPaymentType}
                      onChange={(e) => setFilterPaymentType(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="full">Full Payment</option>
                      <option value="emi">EMI</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Advanced Filters
                  {showFilters ? 
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg> : 
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  }
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRevenueBreakdown(!showRevenueBreakdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Revenue Breakdown
                    {showRevenueBreakdown ? 
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg> : 
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Course
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                    >
                      <option value="all">All Courses</option>
                      {uniqueCourses.map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Batch
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                    >
                      <option value="all">All Batches</option>
                      {uniqueBatches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                    >
                      <option value="all">All Months</option>
                      {uniqueMonths.map(month => (
                        <option key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                    >
                      <option value="all">All Years</option>
                      {uniqueYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Custom Date Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="Start Date"
                      />
                      <input
                        type="date"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        placeholder="End Date"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                        setFilterPaymentType("all");
                        setFilterCourse("all");
                        setFilterBatch("all");
                        setFilterMonth("all");
                        setFilterYear("all");
                        setDateRange({ start: "", end: "" });
                      }}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Revenue Breakdown Panel */}
              {showRevenueBreakdown && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                  {/* Revenue Breakdown Filters */}
                  <div className="mb-6 pb-4 border-b border-green-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Revenue Filters
                    </h3>
                    {/* First Row: Month, Batch, Course */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Month
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          value={revenueFilterMonth}
                          onChange={(e) => setRevenueFilterMonth(e.target.value)}
                        >
                          <option value="all">All Months</option>
                          {uniqueMonths.map(month => (
                            <option key={month} value={month}>
                              {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Batch
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          value={revenueFilterBatch}
                          onChange={(e) => setRevenueFilterBatch(e.target.value)}
                        >
                          <option value="all">All Batches</option>
                          {uniqueBatches.map(batch => (
                            <option key={batch} value={batch}>{batch}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Course
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          value={revenueFilterCourse}
                          onChange={(e) => setRevenueFilterCourse(e.target.value)}
                        >
                          <option value="all">All Courses</option>
                          {uniqueCourses.map(course => (
                            <option key={course} value={course}>{course}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Second Row: Date Range */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date Range
                        </label>
                        <div className="flex gap-2 lg:max-w-2xl">
                          <input
                            type="date"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            value={revenueFilterDateRange.start}
                            onChange={(e) => setRevenueFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                            placeholder="Start Date"
                          />
                          <input
                            type="date"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            value={revenueFilterDateRange.end}
                            onChange={(e) => setRevenueFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                            placeholder="End Date"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setRevenueFilterMonth("all");
                          setRevenueFilterBatch("all");
                          setRevenueFilterCourse("all");
                          setRevenueFilterDateRange({ start: "", end: "" });
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm font-medium"
                      >
                        Clear Revenue Filters
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">₹{revenueStats.totalRevenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">₹{revenueStats.fullPaymentRevenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Full Payments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">₹{revenueStats.emiRevenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">EMI Payments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">₹{Math.round(revenueStats.averagePayment).toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Average Payment</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        Revenue by Course
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(revenueStats.courseBreakdown)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([course, amount]) => (
                          <div key={course} className="flex justify-between items-center text-sm">
                            <span className="truncate">{course}</span>
                            <span className="font-medium">₹{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Revenue by Batch
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(revenueStats.batchBreakdown)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([batch, amount]) => (
                          <div key={batch} className="flex justify-between items-center text-sm">
                            <span className="truncate">{batch}</span>
                            <span className="font-medium">₹{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

            {/* Payment Transaction Tabs */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "pending"
                        ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Pending Transactions</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        activeTab === "pending"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {payments.filter(p => p.status === false).length}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("approved")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                      activeTab === "approved"
                        ? "bg-green-50 text-green-600 border-b-2 border-green-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Approved Transactions</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        activeTab === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {payments.filter(p => p.status === true).length}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Table Section */}
            {filteredPayments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm || filterStatus !== 'all' ? "No payments found" : "No payment transactions"}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm || filterStatus !== 'all' 
                    ? `No payment transactions match your current search and filter criteria. Try searching by Payment ID, Student Name, Registration Number, Course, or Referring Center.`
                    : "No payment transactions have been recorded yet. Transactions will appear here once students make payments."
                  }
                </p>
                {(searchTerm || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Payment Transactions</h2>
                        <p className="text-sm text-gray-600">{filteredPayments.length} transactions found</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Payment Details</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Student Info</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Course & Batch</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Payment Amount</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>EMI Details</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Payment Date</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Status</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <span>Actions</span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredPayments.map((payment, index) => {
                          const emiDetails = getEmiDetails(payment);
                          const isExpanded = expandedRows.has(payment.payment_id);
                          
                          return (
                            <React.Fragment key={payment.payment_id}>
                              <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                {/* Payment Details */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                      <span className="font-mono text-blue-600 text-xs">{payment.payment_id}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {payment.payment_type === 'emi' ? 'EMI Payment' : 'Full Payment'}
                                    </div>
                                    {payment.bank_rrn && (
                                      <div className="text-xs text-gray-500">
                                        RRN: {payment.bank_rrn}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Student Info */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                        {payment.student_name?.charAt(0)?.toUpperCase() || "?"}
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">{payment.student_name || "N/A"}</div>
                                        <div className="text-xs text-gray-500">{payment.registration_number || "N/A"}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {payment.email}
                                    </div>
                                    {payment.is_referred && payment.referring_center_name && (
                                      <div className="text-xs text-green-600">
                                        Referred by: {payment.referring_center_name}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Course & Batch */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="space-y-1">
                                    <div className="font-medium text-gray-900">{payment.course_name || "N/A"}</div>
                                    <div className="text-xs text-gray-500">
                                      Batch: {getBatchName(payment)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Duration: {payment.course_duration || 0} months
                                    </div>
                                  </div>
                                </td>

                                {/* Payment Amount */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="space-y-1">
                                    <div className="font-bold text-lg text-green-600">
                                      ₹{(payment.final_fees || 0).toLocaleString()}
                                    </div>
                                    {payment.original_fees && payment.original_fees !== payment.final_fees && (
                                      <div className="text-xs text-gray-500">
                                        Original: ₹{payment.original_fees.toLocaleString()}
                                      </div>
                                    )}
                                    {payment.discount_percentage > 0 && (
                                      <div className="text-xs text-green-600">
                                        {payment.discount_percentage}% discount
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* EMI Details */}
                                <td className="px-4 py-4 text-sm">
                                  {emiDetails ? (
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-600">
                                        {emiDetails.currentEmi}/{emiDetails.totalEmiDuration} installments
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Remaining: {emiDetails.remainingEmis}
                                      </div>
                                      {emiDetails.nextDueDate && !emiDetails.isLastEmi && (
                                        <div className="text-xs text-orange-600">
                                          Next due: {new Date(emiDetails.nextDueDate).toLocaleDateString()}
                                        </div>
                                      )}
                                      {emiDetails.isLastEmi && (
                                        <div className="text-xs text-green-600 font-medium">
                                          Final installment
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500">Full payment</div>
                                  )}
                                </td>

                                {/* Payment Date */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="space-y-1">
                                    <div className="text-gray-900">
                                      {new Date(payment.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(payment.created_at).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    {payment.status ? (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span className="text-green-600 font-semibold text-xs">Approved</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                        <span className="text-orange-600 font-semibold text-xs">Pending</span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => toggleRowExpansion(payment.payment_id)}
                                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                      title="View Details"
                                    >
                                      {isExpanded ? 
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                        </svg> : 
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      }
                                    </button>
                                    {!payment.status && (
                                      <button
                                        onClick={() => handleApprove(payment.payment_id)}
                                        className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEdit(payment)}
                                      className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row Details */}
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan="8" className="px-4 py-4">
                                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Payment Information */}
                                        <div>
                                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                            Payment Information
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Payment ID:</span>
                                              <span className="font-mono">{payment.payment_id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Order ID:</span>
                                              <span className="font-mono">{payment.order_id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Payment Type:</span>
                                              <span className="capitalize">{payment.payment_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Status:</span>
                                              <span className={payment.status ? "text-green-600" : "text-orange-600"}>
                                                {payment.status ? "Approved" : "Pending"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Student Information */}
                                        <div>
                                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                            Student Information
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Name:</span>
                                              <span>{payment.student_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Registration:</span>
                                              <span className="font-mono">{payment.registration_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Email:</span>
                                              <span className="text-xs">{payment.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Contact:</span>
                                              <span>{payment.contact}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Course Information */}
                                        <div>
                                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                            </svg>
                                            Course Information
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Course:</span>
                                              <span>{payment.course_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Batch:</span>
                                              <span>{getBatchName(payment)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Duration:</span>
                                              <span>{payment.course_duration} months</span>
                                            </div>
                                            {payment.is_referred && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Referred by:</span>
                                                <span className="text-green-600">{payment.referring_center_name}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Financial Details */}
                                        <div className="md:col-span-2 lg:col-span-3">
                                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Financial Details
                                          </h4>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                              <div className="text-lg font-bold text-green-600">
                                                ₹{(payment.final_fees || 0).toLocaleString()}
                                              </div>
                                              <div className="text-xs text-gray-600">Final Amount</div>
                                            </div>
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                              <div className="text-lg font-bold text-blue-600">
                                                ₹{(payment.original_fees || 0).toLocaleString()}
                                              </div>
                                              <div className="text-xs text-gray-600">Original Amount</div>
                                            </div>
                                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                              <div className="text-lg font-bold text-purple-600">
                                                {payment.discount_percentage || 0}%
                                              </div>
                                              <div className="text-xs text-gray-600">Discount</div>
                                            </div>
                                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                                              <div className="text-lg font-bold text-orange-600">
                                                {emiDetails ? `${emiDetails.currentEmi}/${emiDetails.totalEmiDuration}` : "1/1"}
                                              </div>
                                              <div className="text-xs text-gray-600">Installments</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
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

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4">
                  {filteredPayments.map((payment) => {
                    const emiDetails = getEmiDetails(payment);
                    const isExpanded = expandedRows.has(payment.payment_id);
                    
                    return (
                      <div key={payment.payment_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {payment.student_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{payment.student_name}</div>
                              <div className="text-sm text-gray-500">{payment.registration_number}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {payment.status ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Approved
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            )}
                            <button
                              onClick={() => toggleRowExpansion(payment.payment_id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? 
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                </svg> : 
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              }
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-sm text-gray-500">Course</div>
                            <div className="font-medium">{payment.course_name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Amount</div>
                            <div className="font-bold text-green-600">₹{(payment.final_fees || 0).toLocaleString()}</div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-gray-500">Payment Type</div>
                                <div className="font-medium capitalize">{payment.payment_type}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Date</div>
                                <div className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                            
                            {emiDetails && (
                              <div>
                                <div className="text-sm text-gray-500">EMI Details</div>
                                <div className="text-sm">
                                  {emiDetails.currentEmi}/{emiDetails.totalEmiDuration} installments
                                  {emiDetails.nextDueDate && !emiDetails.isLastEmi && (
                                    <div className="text-orange-600">
                                      Next due: {new Date(emiDetails.nextDueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              {!payment.status && (
                                <button
                                  onClick={() => handleApprove(payment.payment_id)}
                                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(payment)}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {editingPayment && (
              <EditTransactionModal
                payment={editingPayment}
                onClose={() => setEditingPayment(null)}
                onUpdate={handleUpdatePayment}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproveStudentsPage;