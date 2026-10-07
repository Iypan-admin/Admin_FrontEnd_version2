import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import {
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  BookOpen,
  XCircle,
  X,
  Save,
  Loader2,
  TrendingUp,
  ArrowLeft
} from "lucide-react";
import {
  getAcademicAttendanceOverview,
  getBatchAttendanceData,
  bulkUpdateAttendanceRecords
} from "../services/Api";

const AcademicAttendancePage = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to format date as YYYY-MM-DD in Asia/Kolkata
  const getTodayISTDate = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch (_) {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Filters
  const [selectedDate, setSelectedDate] = useState(getTodayISTDate);
  const [overviewSummary, setOverviewSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'scheduled' | 'marked' | 'pending' | 'no_class'
  const [courseFilter, setCourseFilter] = useState("all");

  const isTodaySelected = selectedDate === getTodayISTDate();

  // Selected Batch for Full-Screen View
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [savingRecords, setSavingRecords] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Custom Responsive Modal Feedback (Replaces browser alert/confirm)
  const [modalFeedback, setModalFeedback] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "OK",
    cancelText: "Cancel"
  });

  // Helper to format ISO timestamp to IST 12-hour format
  const formatISTTime = (isoString) => {
    if (!isoString) return "";
    try {
      const s = String(isoString);
      const timePart = s.split("T")[1] || s.split(" ")[1] || "";
      const withZ = timePart.endsWith("Z") || timePart.includes("+") || timePart.includes("-")
        ? s
        : `${s.replace(" ", "T")}Z`;
      return (
        new Date(withZ).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        }) + " IST"
      );
    } catch (_) {
      return isoString || "";
    }
  };

  // Layout / Responsive sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed");
      return saved === "true" ? "6rem" : "16rem";
    }
    return "16rem";
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem("sidebarCollapsed");
      setSidebarWidth(saved === "true" ? "6rem" : "16rem");
    };
    window.addEventListener("sidebarToggle", handleSidebarToggle);
    return () => window.removeEventListener("sidebarToggle", handleSidebarToggle);
  }, []);

  // Fetch Academic Overview
  const fetchOverview = async (isManualRefresh = false, targetDate = selectedDate) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const res = await getAcademicAttendanceOverview(token, targetDate);

      if (res && res.success) {
        const batchList = res.data?.overview || (Array.isArray(res.data) ? res.data : []);
        setBatches(batchList);
        if (res.data?.summary) {
          setOverviewSummary(res.data.summary);
        }
      } else {
        throw new Error(res?.error || "Failed to load academic attendance overview");
      }
    } catch (err) {
      console.error("Error fetching academic attendance overview:", err);
      setError(err.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(false, selectedDate);
  }, [selectedDate]);

  // Calculate Overall Statistics based on scheduled classes vs marked
  const stats = useMemo(() => {
    const total = overviewSummary?.total_batches ?? batches.length;
    const scheduledClasses =
      overviewSummary?.total_scheduled_classes ??
      batches.reduce((acc, b) => acc + (b.scheduled_classes_count || 1), 0);
    const scheduled = overviewSummary?.scheduled_today ?? batches.filter((b) => b.has_scheduled_class).length;
    const marked = overviewSummary?.marked_today ?? batches.filter((b) => b.today_status === "marked").length;
    const pending = overviewSummary?.pending_today ?? batches.filter((b) => b.today_status === "pending").length;
    const noClass = overviewSummary?.no_class_today ?? batches.filter((b) => b.today_status === "no_class").length;
    const rate = scheduled > 0 ? Math.round((marked / scheduled) * 100) : (marked > 0 ? 100 : 0);
    const totalStudents = batches.reduce((acc, b) => acc + (b.total_enrolled || 0), 0);

    return { total, scheduledClasses, scheduled, marked, pending, noClass, rate, totalStudents };
  }, [batches, overviewSummary]);

  // Extract Courses for Dropdown Filter
  const availableCourses = useMemo(() => {
    const set = new Set();
    batches.forEach((b) => {
      if (b.course_name) set.add(b.course_name);
    });
    return Array.from(set).sort();
  }, [batches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        !searchTerm ||
        (b.batch_name && b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.course_name && b.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.teacher_name && b.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "marked") matchesStatus = b.today_status === "marked";
      else if (statusFilter === "pending") matchesStatus = b.today_status === "pending";
      else if (statusFilter === "scheduled") matchesStatus = Boolean(b.has_scheduled_class);
      else if (statusFilter === "no_class") matchesStatus = b.today_status === "no_class";

      const matchesCourse = courseFilter === "all" || b.course_name === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [batches, searchTerm, statusFilter, courseFilter]);

  // Open Batch Attendance Details in Full-Screen View
  const handleOpenBatchDetails = async (batchItem) => {
    try {
      setSelectedBatch(batchItem);
      setBatchDetailsLoading(true);
      setUnsavedChanges(false);
      setStudentSearch("");

      const token = localStorage.getItem("token");
      const res = await getBatchAttendanceData(batchItem.batch_id, token);

      if (res && res.success) {
        setBatchDetails(res.data);
        const sessionsList = (res.data.sessions || []).filter(s => {
          const sDate = s.session_date ? s.session_date.split('T')[0] : '';
          return sDate >= '2026-10-07';
        });
        if (sessionsList.length > 0) {
          const defaultSession =
            sessionsList.find(
              (s) => (s.session_date ? s.session_date.split("T")[0] : "") === selectedDate
            ) || sessionsList[0];
          setSelectedSession(defaultSession);
          setSessionRecords((defaultSession.records || []).map((r) => ({ ...r })));
        } else {
          setSelectedSession(null);
          setSessionRecords([]);
        }
      } else {
        throw new Error(res?.error || "Failed to load batch sessions");
      }
    } catch (err) {
      console.error("Error loading batch details:", err);
      setModalFeedback({
        isOpen: true,
        type: "error",
        title: "Unable to Load Batch Records",
        message: err.message || "Could not retrieve batch sessions from server.",
        confirmText: "Dismiss"
      });
    } finally {
      setBatchDetailsLoading(false);
    }
  };

  // Back to All Batches handler
  const handleBackToBatches = () => {
    if (unsavedChanges) {
      setModalFeedback({
        isOpen: true,
        type: "warning",
        title: "Unsaved Changes",
        message: "You have adjusted attendance records that are not yet saved. Discard these adjustments?",
        confirmText: "Discard Changes",
        cancelText: "Keep Editing",
        onConfirm: () => {
          setUnsavedChanges(false);
          setSelectedBatch(null);
          setBatchDetails(null);
          setSelectedSession(null);
          setModalFeedback((prev) => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setSelectedBatch(null);
      setBatchDetails(null);
      setSelectedSession(null);
    }
  };

  // Switch Selected Session inside Batch View
  const handleSelectSession = (session) => {
    if (unsavedChanges) {
      setModalFeedback({
        isOpen: true,
        type: "warning",
        title: "Switch Session?",
        message: "You have unsaved changes in the current session. Switching sessions will discard them.",
        confirmText: "Discard & Switch",
        cancelText: "Stay on Current",
        onConfirm: () => {
          setSelectedSession(session);
          setSessionRecords((session.records || []).map((r) => ({ ...r })));
          setUnsavedChanges(false);
          setModalFeedback((prev) => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }
    setSelectedSession(session);
    setSessionRecords((session.records || []).map((r) => ({ ...r })));
    setUnsavedChanges(false);
  };

  // Toggle student status (allows toggling or unmarking back to null)
  const handleStatusChange = (studentId, newStatus) => {
    setSessionRecords((prev) =>
      prev.map((r) => {
        if (r.student_id === studentId) {
          const nextStatus = r.status === newStatus ? null : newStatus;
          return {
            ...r,
            status: nextStatus,
            marked_at: nextStatus ? new Date().toISOString() : null
          };
        }
        return r;
      })
    );
    setUnsavedChanges(true);
  };

  // 1-Click Quick Mark All
  const handleMarkAllStudents = (status) => {
    const now = new Date().toISOString();
    setSessionRecords((prev) => prev.map((r) => ({ ...r, status, marked_at: now })));
    setUnsavedChanges(true);
  };

  // 1-Click Clear / Unmark All
  const handleClearAllStudents = () => {
    setSessionRecords((prev) => prev.map((r) => ({ ...r, status: null, marked_at: null })));
    setUnsavedChanges(true);
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!selectedSession?.id) return;
    try {
      setSavingRecords(true);
      const token = localStorage.getItem("token");
      const recordsToUpdate = sessionRecords.map((r) => ({
        id: r.id,
        session_id: selectedSession.id,
        student_id: r.student_id,
        status: r.status
      }));

      const res = await bulkUpdateAttendanceRecords(recordsToUpdate, token);
      if (res && res.success) {
        setUnsavedChanges(false);
        await fetchOverview(true);
        if (selectedBatch) {
          const updated = await getBatchAttendanceData(selectedBatch.batch_id, token);
          if (updated?.success) {
            setBatchDetails(updated.data);
            const found = (updated.data.sessions || []).find((s) => s.id === selectedSession.id);
            if (found) {
              setSelectedSession(found);
              setSessionRecords((found.records || []).map((r) => ({ ...r })));
            }
          }
        }
        setModalFeedback({
          isOpen: true,
          type: "success",
          title: "Attendance Updated!",
          message: "Attendance adjustments have been successfully recorded.",
          confirmText: "Great!"
        });
      } else {
        throw new Error(res?.error || "Failed to update attendance records");
      }
    } catch (err) {
      console.error("Failed to save changes:", err);
      setModalFeedback({
        isOpen: true,
        type: "error",
        title: "Adjustment Failed",
        message: err.message || "An error occurred while updating attendance records.",
        confirmText: "Dismiss"
      });
    } finally {
      setSavingRecords(false);
    }
  };

  // Filtered session records by search inside batch view
  const filteredSessionRecords = useMemo(() => {
    if (!studentSearch.trim()) return sessionRecords;
    const q = studentSearch.toLowerCase();
    return sessionRecords.filter(
      (r) =>
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.student_email && r.student_email.toLowerCase().includes(q)) ||
        (r.student_reg_no && r.student_reg_no.toLowerCase().includes(q))
    );
  }, [sessionRecords, studentSearch]);

  const assignedTutorName = selectedBatch?.teacher_name || batchDetails?.batch?.teacher_name || "Unassigned";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Navbar />
      <div
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: isMobile ? "0" : sidebarWidth === "6rem" ? "96px" : "256px" }}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* CONDITIONAL RENDER: Full-Screen Batch Details Workspace VS Batches Overview */}
          {selectedBatch ? (
            /* FULL-SCREEN RESPONSIVE BATCH ATTENDANCE VIEW */
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
              {/* Top Navigation Bar */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToBatches}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                    title="Back to All Batches"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {selectedBatch.batch_name}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-semibold text-slate-600">
                        Course: {selectedBatch.course_name}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        Tutor: {assignedTutorName}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      Batch Attendance Records
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enrolled: {selectedBatch.total_enrolled || batchDetails?.enrolled_students?.length || 0} Students &bull; Total Sessions: {batchDetails?.sessions?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenBatchDetails(selectedBatch)}
                    disabled={batchDetailsLoading}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${batchDetailsLoading ? "animate-spin text-indigo-600" : ""}`} />
                    <span>Refresh</span>
                  </button>
                  {unsavedChanges && (
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={savingRecords}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingRecords ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Adjustments</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {batchDetailsLoading ? (
                <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200/80 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-sm font-semibold">Loading batch sessions and student records...</p>
                </div>
              ) : (
                <>
                  {/* Sessions Carousel / Horizontal Pills Strip */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Sessions Strip ({batchDetails?.sessions?.length || 0}):</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Tap any date to view attendance
                      </span>
                    </div>

                    {!batchDetails?.sessions || batchDetails.sessions.length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                        No attendance sessions recorded yet for this batch.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        {batchDetails.sessions.map((s) => {
                          const isSelected = selectedSession?.id === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectSession(s)}
                              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer flex flex-col items-start gap-1 border ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02]"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span>
                                {new Date(s.session_date).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-medium ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                  {s.present_count || 0}/{s.total_students || 0} P
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {s.attendance_percentage || 0}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Session Details & Student Records Workspace */}
                  {selectedSession && (
                    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
                      {/* Session Top Bar: Metrics & Bulk Actions */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              Session Date: {new Date(selectedSession.session_date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                            </h3>
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                              Rate: {selectedSession.attendance_percentage || 0}%
                            </span>
                          </div>
                          {selectedSession.notes && (
                            <p className="text-xs text-slate-500 mt-1">
                              Notes: {selectedSession.notes}
                            </p>
                          )}
                        </div>

                        {/* Quick Actions Strip */}
                        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleMarkAllStudents("present")}
                            className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            ⚡ All Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAllStudents("absent")}
                            className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            All Absent
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllStudents}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                            title="Reset all students to unmarked default state"
                          >
                            Clear / Unmark
                          </button>
                        </div>
                      </div>

                      {/* Search Filter Inside Session */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Search student by name or reg no..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          {studentSearch && (
                            <button
                              type="button"
                              onClick={() => setStudentSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 self-end sm:self-center font-medium">
                          Showing {filteredSessionRecords.length} of {sessionRecords.length} students
                        </div>
                      </div>

                      {/* Responsive Student Records: Mobile Cards vs Desktop Table */}
                      {/* 1. Mobile Cards Layout (< 768px) */}
                      <div className="block md:hidden space-y-3 pb-16">
                        {filteredSessionRecords.map((record) => (
                          <div
                            key={record.student_id}
                            className={`p-4 rounded-2xl border transition-all ${
                              record.status === "present"
                                ? "bg-emerald-50/40 border-emerald-200"
                                : record.status === "absent"
                                ? "bg-red-50/40 border-red-200"
                                : record.status === "late"
                                ? "bg-amber-50/40 border-amber-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-sm">
                                  {record.student_name ? record.student_name.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-900 text-sm truncate">
                                    {record.student_name || "Student"}
                                  </h4>
                                  <p className="text-xs text-slate-500 truncate">
                                    {record.student_reg_no ? `Reg: ${record.student_reg_no}` : record.student_email || ""}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5 pt-2 border-t border-slate-100">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Marked:</span>
                                <span className="font-semibold text-slate-700">
                                  {record.status && record.marked_at ? formatISTTime(record.marked_at) : "Not marked yet"}
                                </span>
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  record.status === "present"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : record.status === "absent"
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : record.status === "late"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {record.status === "present"
                                  ? "Present"
                                  : record.status === "absent"
                                  ? "Absent"
                                  : record.status === "late"
                                  ? "Late"
                                  : "Unmarked"}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(record.student_id, "present")}
                                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  record.status === "present"
                                    ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(record.student_id, "absent")}
                                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  record.status === "absent"
                                    ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-700"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(record.student_id, "late")}
                                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  record.status === "late"
                                    ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                                }`}
                              >
                                Late
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 2. Desktop Table Layout (>= 768px) */}
                      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-left">
                          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3.5">S.No</th>
                              <th className="px-5 py-3.5">Student</th>
                              <th className="px-5 py-3.5">Registration / Email</th>
                              <th className="px-5 py-3.5">Marked At (IST)</th>
                              <th className="px-5 py-3.5 text-right">Adjustment Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredSessionRecords.map((record, index) => (
                              <tr key={record.student_id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-4 font-semibold text-slate-500">
                                  {index + 1}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                      {record.student_name ? record.student_name.charAt(0).toUpperCase() : "S"}
                                    </div>
                                    <span className="font-bold text-slate-900">{record.student_name || "Student"}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-slate-600">
                                  {record.student_reg_no ? `Reg: ${record.student_reg_no}` : record.student_email || "-"}
                                </td>
                                <td className="px-5 py-4 text-slate-600">
                                  {record.status && record.marked_at ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {formatISTTime(record.marked_at)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Not marked yet</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                      record.status === "present"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : record.status === "absent"
                                        ? "bg-red-100 text-red-800 border border-red-200"
                                        : record.status === "late"
                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                    }`}
                                  >
                                    {record.status === "present"
                                      ? "Present"
                                      : record.status === "absent"
                                      ? "Absent"
                                      : record.status === "late"
                                      ? "Late"
                                      : "Unmarked"}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(record.student_id, "present")}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        record.status === "present"
                                          ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500"
                                          : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                                      }`}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(record.student_id, "absent")}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        record.status === "absent"
                                          ? "bg-red-600 text-white shadow-xs ring-1 ring-red-500"
                                          : "text-slate-600 hover:text-red-700 hover:bg-white"
                                      }`}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(record.student_id, "late")}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        record.status === "late"
                                          ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-500"
                                          : "text-slate-600 hover:text-amber-700 hover:bg-white"
                                      }`}
                                    >
                                      Late
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Sticky Bottom Save Bar on Mobile if unsaved changes exist */}
                      {unsavedChanges && (
                        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-40 flex items-center justify-between gap-3 md:hidden">
                          <span className="text-xs font-medium text-slate-700">
                            ⚠️ Unsaved adjustments
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveChanges}
                            disabled={savingRecords}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {savingRecords ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Save Adjustments</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ALL BATCHES OVERVIEW PAGE */
            <>
              {/* Header Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                    Academic Administration &bull; Attendance Portal
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Batch Attendance Overview
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Monitor and verify manual attendance records across all course batches in real time.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fetchOverview(true)}
                    disabled={refreshing}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Batches {isTodaySelected ? "Today" : "on Date"}
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalStudents} Enrolled Students</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Live Classes Booked
                    </p>
                    <p className="text-2xl font-black text-indigo-600 mt-1">{stats.scheduledClasses || stats.scheduled}</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">Scheduled on {isTodaySelected ? "Today" : "Date"}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Marked {isTodaySelected ? "Today" : "on Date"}
                    </p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{stats.marked}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Attendance complete</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Pending {isTodaySelected ? "Today" : "on Date"}
                    </p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Scheduled classes pending</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Interactive Filters Bar with Calendar Date Filter */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by batch name, course, or tutor..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  {/* Calendar Date Picker Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-500 hidden sm:inline">Date:</span>
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    />
                    {!isTodaySelected && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(getTodayISTDate())}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors cursor-pointer shrink-0"
                        title="Jump to today"
                      >
                        Today
                      </button>
                    )}
                  </div>

                  {/* Course Dropdown Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-500">Course:</span>
                    </div>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
                    >
                      <option value="all">All Courses</option>
                      {availableCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto w-full sm:w-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        statusFilter === "all"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      All Scheduled ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("marked")}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        statusFilter === "marked"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-emerald-700"
                      }`}
                    >
                      Marked ({stats.marked})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("pending")}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        statusFilter === "pending"
                          ? "bg-white text-amber-700 shadow-sm"
                          : "text-slate-500 hover:text-amber-700"
                      }`}
                    >
                      Pending ({stats.pending})
                    </button>
                  </div>
                </div>
              </div>

              {/* Batches View: Mobile Cards & Desktop Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="py-20 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-sm font-semibold">Loading academic attendance records...</p>
                  </div>
                ) : error ? (
                  <div className="py-16 text-center text-red-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                    <p className="text-sm font-bold">{error}</p>
                    <button
                      onClick={() => fetchOverview()}
                      className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filteredBatches.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No live classes scheduled on this date</p>
                    <p className="text-xs text-slate-400 mt-1">Pick another date from the calendar or schedule a live class in Live Classes.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Batches Cards (< 768px) */}
                    <div className="block md:hidden divide-y divide-slate-100 p-2">
                      {filteredBatches.map((b) => (
                        <div key={b.batch_id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{b.batch_name}</p>
                              <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                                {b.course_name || "General Course"}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 shrink-0">
                              {b.total_enrolled} enrolled
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 text-[11px]">Assigned Tutor:</span>
                              <p className="font-bold text-slate-800">{b.teacher_name || "Unassigned"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[11px]">{isTodaySelected ? "Today" : "Date"}:</span>
                              <div>
                                {b.today_status === "marked" ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    Marked ({b.today_present || 0}P / {b.today_absent || 0}A)
                                  </span>
                                ) : b.today_status === "pending" ? (
                                  <span className="text-amber-700 font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Pending Attendance
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    No Class Scheduled
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                            <span className="text-[11px] text-slate-500">
                              {b.total_sessions_count} sessions {b.last_session_date ? `(Last: ${b.last_session_date})` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenBatchDetails(b)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Records
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Batches Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4 sm:px-6">Batch Name &amp; Course</th>
                            <th className="py-3.5 px-4">Assigned Tutor</th>
                            <th className="py-3.5 px-4 text-center">Enrolled</th>
                            <th className="py-3.5 px-4">Today's Attendance</th>
                            <th className="py-3.5 px-4 text-center">Total Sessions</th>
                            <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredBatches.map((b) => (
                            <tr key={b.batch_id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-4 sm:px-6">
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{b.batch_name}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-semibold text-indigo-600">{b.course_name || "General Course"}</span>
                                    {b.course_language && (
                                      <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600">
                                        {b.course_language}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <p className="font-bold text-slate-800">{b.teacher_name || "Unassigned"}</p>
                                <p className="text-[11px] text-slate-400">Tutor</p>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                  {b.total_enrolled}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                {b.today_status === "marked" ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      Marked
                                    </span>
                                    {b.today_present !== undefined && (
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        ({b.today_present}P / {b.today_absent}A)
                                      </span>
                                    )}
                                  </div>
                                ) : b.today_status === "pending" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Pending Attendance
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    No Class Scheduled
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="text-xs font-semibold text-slate-700">
                                  {b.total_sessions_count} sessions
                                </span>
                                {b.last_session_date && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Last: {b.last_session_date}
                                  </p>
                                )}
                              </td>

                              <td className="py-4 px-4 sm:px-6 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenBatchDetails(b)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View Records
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Responsive Custom Feedback & Confirmation Modal */}
          {modalFeedback.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="relative bg-white rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
                <div
                  className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                  style={{
                    backgroundColor:
                      modalFeedback.type === "success"
                        ? "#ecfdf5"
                        : modalFeedback.type === "error"
                        ? "#fef2f2"
                        : "#fffbeb"
                  }}
                >
                  {modalFeedback.type === "success" ? (
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  ) : modalFeedback.type === "error" ? (
                    <XCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                  {modalFeedback.title}
                </h3>

                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  {modalFeedback.message}
                </p>

                <div className="flex items-center justify-center gap-3">
                  {modalFeedback.onConfirm && modalFeedback.type === "warning" && (
                    <button
                      type="button"
                      onClick={() => setModalFeedback((prev) => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      {modalFeedback.cancelText || "Cancel"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (modalFeedback.onConfirm) {
                        modalFeedback.onConfirm();
                      } else {
                        setModalFeedback((prev) => ({ ...prev, isOpen: false }));
                      }
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                      modalFeedback.type === "error"
                        ? "bg-red-600 hover:bg-red-700"
                        : modalFeedback.type === "warning"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {modalFeedback.confirmText || "OK"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicAttendancePage;
