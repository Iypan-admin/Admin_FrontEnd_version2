import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Radio,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Film,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Lock,
  Edit3,
  AlertTriangle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutList,
  Sparkles,
  Layers,
  GraduationCap
} from "lucide-react";
import {
  getLiveClasses,
  scheduleLiveClass,
  updateLiveClass,
  checkScheduleConflict,
  deleteLiveClass
} from "../services/liveClassApi";
import { getBatches, getAllCourses, getAllTeachers } from "../services/Api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const AcademicLiveClassesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const decoded = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const isTeacher = decoded?.role === "teacher";
  const teacherId = decoded?.id || decoded?.user_id;

  const [classes, setClasses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // View Toggle: 1st preference is List View, 2nd preference is Calendar View
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'calendar'

  // Responsive Mobile Navigation State
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener("mobileMenuStateChange", handleMobileMenuStateChange);
    return () => window.removeEventListener("mobileMenuStateChange", handleMobileMenuStateChange);
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent("toggleMobileMenu", { detail: newState }));
  };

  // IST Date String Helpers
  const toISTDateString = (isoString) => {
    if (!isoString) return new Date().toISOString().split("T")[0];
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(isoString));
    } catch (_) {
      return new Date().toISOString().split("T")[0];
    }
  };

  const toISTTimeString = (isoString) => {
    if (!isoString) return "";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date(isoString));
    } catch (_) {
      return "";
    }
  };

  const formatISTDate = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (_) {
      return "";
    }
  };

  const formatISTTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) + " IST";
    } catch (_) {
      return "";
    }
  };

  // Calendar State (supports navigating across months and years including 2026, 2027, 2028)
  const todayIST = useMemo(() => toISTDateString(new Date().toISOString()), []);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0 - 11
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => todayIST);

  // Edit Schedule & Conflict Checking State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    session_number: 1,
    teacher_id: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    recording_enabled: true
  });
  const [editConflict, setEditConflict] = useState(null);
  const [scheduleConflict, setScheduleConflict] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [popupModal, setPopupModal] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    batch_id: "",
    course_id: "",
    teacher_id: "",
    title: "",
    description: "",
    session_number: 1,
    scheduled_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    recording_enabled: true
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true" ? "6rem" : "16rem";
  });

  // Real-time ticker to auto-disable buttons exactly on expiration (Asia/Kolkata)
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const refreshLiveClasses = async () => {
    try {
      const classRes = await getLiveClasses();
      setClasses(classRes?.liveClasses || (Array.isArray(classRes) ? classRes : []));
    } catch (_) {}
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const [classRes, batchRes, courseRes, teacherRes] = await Promise.all([
        getLiveClasses().catch(() => ({ liveClasses: [] })),
        getBatches(token).catch(() => []),
        getAllCourses(token).catch(() => []),
        getAllTeachers(token).catch(() => [])
      ]);

      setClasses(classRes?.liveClasses || (Array.isArray(classRes) ? classRes : []));

      const batchList = Array.isArray(batchRes)
        ? batchRes
        : (batchRes?.data || batchRes?.batches || []);
      setBatches(batchList);

      const courseList = Array.isArray(courseRes)
        ? courseRes
        : (courseRes?.data || courseRes?.courses || []);
      setCourses(courseList);

      const teacherList = Array.isArray(teacherRes)
        ? teacherRes
        : (teacherRes?.data || teacherRes?.teachers || []);
      setTeachers(teacherList);
    } catch (err) {
      console.error("Failed to load initial data for live classes:", err);
      setError("Failed to load live classes schedule. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const pollInterval = setInterval(refreshLiveClasses, 5000);
    const handleFocus = () => refreshLiveClasses();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Real-time conflict check for Schedule Modal
  useEffect(() => {
    if (!formData.batch_id || !formData.scheduled_date || !formData.start_time || !formData.end_time) {
      setScheduleConflict(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const scheduled_start = new Date(`${formData.scheduled_date}T${formData.start_time}:00+05:30`).toISOString();
        const scheduled_end = new Date(`${formData.scheduled_date}T${formData.end_time}:00+05:30`).toISOString();
        const res = await checkScheduleConflict({
          batchId: formData.batch_id,
          teacherId: formData.teacher_id || null,
          scheduledStart: scheduled_start,
          scheduledEnd: scheduled_end
        });
        setScheduleConflict(res?.conflict || null);
      } catch (_) {
        setScheduleConflict(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.batch_id, formData.teacher_id, formData.scheduled_date, formData.start_time, formData.end_time]);

  // Real-time conflict check for Edit Modal
  useEffect(() => {
    if (!editingClass || !editFormData.scheduled_date || !editFormData.start_time || !editFormData.end_time) {
      setEditConflict(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const scheduled_start = new Date(`${editFormData.scheduled_date}T${editFormData.start_time}:00+05:30`).toISOString();
        const scheduled_end = new Date(`${editFormData.scheduled_date}T${editFormData.end_time}:00+05:30`).toISOString();
        const res = await checkScheduleConflict({
          excludeClassId: editingClass.id,
          batchId: editingClass.batch_id,
          teacherId: editFormData.teacher_id || null,
          scheduledStart: scheduled_start,
          scheduledEnd: scheduled_end
        });
        setEditConflict(res?.conflict || null);
      } catch (_) {
        setEditConflict(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [editingClass, editFormData.teacher_id, editFormData.scheduled_date, editFormData.start_time, editFormData.end_time]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const convert12to24 = (time12) => {
    if (!time12) return "";
    const cleaned = time12.replace(/\s+/g, "").toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
    if (!match) return "";
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3];

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  };

  const formatTime12 = (time24) => {
    if (!time24) return "";
    const parts = time24.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  };

  const extractBatchTimes = (batch) => {
    if (!batch) return { startTime: "", endTime: "" };

    let startTime = "";
    let endTime = "";

    if (batch.time_from) {
      const tf = String(batch.time_from).trim();
      if (tf.includes(":")) {
        if (!tf.toLowerCase().includes("am") && !tf.toLowerCase().includes("pm")) {
          const parts = tf.split(":");
          startTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        } else {
          startTime = convert12to24(tf);
        }
      }
    }

    if (batch.time_to) {
      const tt = String(batch.time_to).trim();
      if (tt.includes(":")) {
        if (!tt.toLowerCase().includes("am") && !tt.toLowerCase().includes("pm")) {
          const parts = tt.split(":");
          endTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        } else {
          endTime = convert12to24(tt);
        }
      }
    }

    if ((!startTime || !endTime) && batch.batch_name) {
      const match = batch.batch_name.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))-(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
      if (match) {
        if (!startTime) startTime = convert12to24(match[1]);
        if (!endTime) endTime = convert12to24(match[2]);
      }
    }

    return { startTime, endTime };
  };

  const openScheduleModal = (initialDate = null) => {
    const targetDate = initialDate || selectedCalendarDate || todayIST;
    let initialCourseId = "";
    let initialTeacherId = "";
    let initialStartTime = "";
    let initialEndTime = "";

    if (batchFilter) {
      const selectedBatch = batches.find((b) => (b.batch_id || b.id) === batchFilter);
      if (selectedBatch) {
        initialCourseId = selectedBatch.course_id || selectedBatch.course || "";
        initialTeacherId = selectedBatch.teacher_id || selectedBatch.teacher || "";
        const times = extractBatchTimes(selectedBatch);
        initialStartTime = times.startTime || "";
        initialEndTime = times.endTime || "";
      }
    }

    setFormData({
      batch_id: batchFilter || "",
      course_id: initialCourseId,
      teacher_id: initialTeacherId,
      title: "",
      description: "",
      session_number: 1,
      scheduled_date: targetDate,
      start_time: initialStartTime,
      end_time: initialEndTime,
      recording_enabled: true
    });
    setScheduleConflict(null);
    setShowScheduleModal(true);
  };

  const handleBatchSelect = (e) => {
    const selectedBatchId = e.target.value;
    const selectedBatch = batches.find((b) => (b.batch_id || b.id) === selectedBatchId);
    
    // Smartly match teacher by teacher_id, user_id, or name
    const matchedTeacher = teachers.find(
      (t) =>
        t.teacher_id === selectedBatch?.teacher_id ||
        t.teacher_id === selectedBatch?.teacher ||
        t.user_id === selectedBatch?.teacher_id ||
        t.user_id === selectedBatch?.teacher ||
        t.teacher === selectedBatch?.teacher ||
        (selectedBatch?.teacher_name && (
          t.full_name === selectedBatch.teacher_name ||
          t.teacher_name === selectedBatch.teacher_name ||
          (t.full_name && selectedBatch.teacher_name.includes(t.full_name))
        ))
    );

    const resolvedTeacherId = matchedTeacher
      ? (matchedTeacher.teacher_id || matchedTeacher.user_id || matchedTeacher.teacher)
      : (selectedBatch?.teacher_id || selectedBatch?.teacher || "");

    const { startTime, endTime } = extractBatchTimes(selectedBatch);

    setFormData((prev) => ({
      ...prev,
      batch_id: selectedBatchId,
      course_id: selectedBatch?.course_id || selectedBatch?.course || prev.course_id,
      teacher_id: resolvedTeacherId || prev.teacher_id,
      start_time: startTime || prev.start_time || "",
      end_time: endTime || prev.end_time || ""
    }));
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.batch_id || !formData.title || !formData.start_time || !formData.end_time) {
      setPopupModal({
        type: "warning",
        title: "Missing Required Fields",
        message: "Please select a batch and verify that the class title, start time, and end time are set."
      });
      return;
    }

    if (scheduleConflict) {
      setPopupModal({
        type: "confirm",
        title: "Schedule Conflict Detected",
        message: `${scheduleConflict.message}\n\nDo you still wish to schedule this class?`,
        confirmText: "Schedule Anyway",
        cancelText: "Change Time",
        onConfirm: () => executeSchedule()
      });
      return;
    }

    executeSchedule();
  };

  const executeSchedule = async () => {
    setSubmitting(true);
    try {
      // Explicitly anchor to Asia/Kolkata (+05:30) timezone
      const scheduled_start = new Date(`${formData.scheduled_date}T${formData.start_time}:00+05:30`).toISOString();
      const scheduled_end = new Date(`${formData.scheduled_date}T${formData.end_time}:00+05:30`).toISOString();

      await scheduleLiveClass({
        batch_id: formData.batch_id,
        course_id: formData.course_id || null,
        teacher_id: formData.teacher_id || null,
        title: formData.title,
        description: formData.description,
        session_number: Number(formData.session_number),
        scheduled_start,
        scheduled_end,
        recording_enabled: formData.recording_enabled
      });

      const selectedBatch = batches.find((b) => (b.batch_id || b.id) === formData.batch_id);
      setShowScheduleModal(false);
      await fetchInitialData();

      // Ensure calendar is in sync with scheduled date's month & year
      const [sYear, sMonth] = formData.scheduled_date.split("-").map(Number);
      if (sYear && sMonth) {
        setCalYear(sYear);
        setCalMonth(sMonth - 1);
        setSelectedCalendarDate(formData.scheduled_date);
      }

      setPopupModal({
        type: "success",
        title: "Live Class Scheduled Successfully!",
        message: "Your new live class is now scheduled. Assigned tutors and students can view it on their portals immediately.",
        highlight: {
          batch: selectedBatch?.batch_name || "Selected Batch",
          classTitle: formData.title,
          session: formData.session_number,
          date: formData.scheduled_date,
          timeSlot: `${formatTime12(formData.start_time)} - ${formatTime12(formData.end_time)} IST`
        }
      });
    } catch (err) {
      setPopupModal({
        type: "error",
        title: "Scheduling Failed",
        message: err.message || "Failed to schedule live class."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (item) => {
    setEditingClass(item);
    setEditFormData({
      title: item.title || "",
      description: item.description || "",
      session_number: item.session_number || 1,
      teacher_id: item.teacher_id || item.teachers?.id || "",
      scheduled_date: toISTDateString(item.scheduled_start),
      start_time: toISTTimeString(item.scheduled_start),
      end_time: toISTTimeString(item.scheduled_end),
      recording_enabled: item.recording_enabled !== false
    });
    setEditConflict(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.title || !editFormData.start_time || !editFormData.end_time) {
      setPopupModal({
        type: "warning",
        title: "Missing Required Fields",
        message: "Please ensure class title, start time, and end time are filled."
      });
      return;
    }

    if (editConflict) {
      setPopupModal({
        type: "confirm",
        title: "Schedule Conflict Detected",
        message: `${editConflict.message}\n\nDo you still wish to force this schedule update?`,
        confirmText: "Update Anyway",
        cancelText: "Adjust Timing",
        onConfirm: () => executeUpdate()
      });
      return;
    }

    executeUpdate();
  };

  const executeUpdate = async () => {
    setEditSubmitting(true);
    try {
      const scheduled_start = new Date(`${editFormData.scheduled_date}T${editFormData.start_time}:00+05:30`).toISOString();
      const scheduled_end = new Date(`${editFormData.scheduled_date}T${editFormData.end_time}:00+05:30`).toISOString();

      await updateLiveClass(editingClass.id, {
        title: editFormData.title,
        description: editFormData.description,
        session_number: Number(editFormData.session_number),
        teacher_id: editFormData.teacher_id || null,
        scheduled_start,
        scheduled_end,
        recording_enabled: editFormData.recording_enabled
      });

      const batchName = editingClass.batches?.batch_name || "General Batch";
      const startFormatted = formatTime12(editFormData.start_time);
      const endFormatted = formatTime12(editFormData.end_time);

      setShowEditModal(false);
      setEditingClass(null);
      await fetchInitialData();

      setPopupModal({
        type: "success",
        title: "Schedule Updated Successfully!",
        message: "The new session timing is now active and instantly synchronized across all enrolled students and assigned tutors without needing a page refresh.",
        highlight: {
          batch: batchName,
          classTitle: editFormData.title,
          session: editFormData.session_number,
          date: editFormData.scheduled_date,
          timeSlot: `${startFormatted} - ${endFormatted} IST`
        }
      });
    } catch (err) {
      setPopupModal({
        type: "error",
        title: "Schedule Update Failed",
        message: err.message || "Failed to update live class schedule."
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = (id, classTitle) => {
    setPopupModal({
      type: "confirm",
      title: "Cancel Live Class?",
      message: `Are you sure you want to cancel "${classTitle || "this live class"}"? This will cancel the session for students and tutor.`,
      confirmText: "Yes, Cancel Class",
      cancelText: "Keep Class",
      onConfirm: async () => {
        try {
          await deleteLiveClass(id);
          await fetchInitialData();
          setPopupModal({
            type: "success",
            title: "Live Class Cancelled",
            message: "The live class has been cancelled successfully."
          });
        } catch (err) {
          setPopupModal({
            type: "error",
            title: "Cancellation Failed",
            message: err.message || "Failed to cancel live class."
          });
        }
      }
    });
  };

  // Calendar Navigation Handlers
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedCalendarDate(todayIST);
  };

  // Generate Year Options (e.g., 2025, 2026, 2027, 2028, 2029)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  }, []);

  // Compute 35 or 42 Month Grid Cells
  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayWeekday = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const cells = [];

    // Leading padding days from prev month
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = calMonth === 0 ? 11 : calMonth - 1;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const mStr = String(prevM + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      cells.push({
        dayNumber: dayNum,
        month: prevM,
        year: prevY,
        dateString: `${prevY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const mStr = String(calMonth + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      cells.push({
        dayNumber: dayNum,
        month: calMonth,
        year: calYear,
        dateString: `${calYear}-${mStr}-${dStr}`,
        isCurrentMonth: true
      });
    }

    // Trailing padding days to fill grid
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = calMonth === 11 ? 0 : calMonth + 1;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const mStr = String(nextM + 1).padStart(2, "0");
      const dStr = String(dayNum).padStart(2, "0");
      cells.push({
        dayNumber: dayNum,
        month: nextM,
        year: nextY,
        dateString: `${nextY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    return cells;
  }, [calYear, calMonth]);

  // Batch class counts
  const batchClassCounts = useMemo(() => {
    const counts = {};
    classes.forEach((c) => {
      const bId = c.batch_id || c.batches?.batch_id;
      if (bId) {
        counts[bId] = (counts[bId] || 0) + 1;
      }
    });
    return counts;
  }, [classes]);

  // Only batches that actually have live classes scheduled
  const batchesWithClasses = useMemo(() => {
    return batches.filter((b) => {
      const bId = b.batch_id || b.id;
      return (batchClassCounts[bId] || 0) > 0;
    });
  }, [batches, batchClassCounts]);

  // Index classes by YYYY-MM-DD
  const classesByDate = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      const bId = c.batch_id || c.batches?.batch_id;
      if (batchFilter && bId !== batchFilter) return;

      const matchesSearch = !searchTerm ||
        (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.batches?.batch_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.teachers?.full_name || c.teachers?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return;

      const d = toISTDateString(c.scheduled_start);
      if (!map[d]) map[d] = [];
      map[d].push(c);
    });
    return map;
  }, [classes, batchFilter, searchTerm]);

  // Classes for the selected calendar day
  const selectedDayClasses = useMemo(() => {
    const list = classesByDate[selectedCalendarDate] || [];
    return list.slice().sort((a, b) => {
      return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
    });
  }, [classesByDate, selectedCalendarDate]);

  // Formatted selected calendar date label
  const formattedSelectedDate = useMemo(() => {
    if (!selectedCalendarDate) return "";
    try {
      return new Date(`${selectedCalendarDate}T12:00:00+05:30`).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (_) {
      return selectedCalendarDate;
    }
  }, [selectedCalendarDate]);

  // Filtered classes for Table / List View
  const filteredClasses = classes.filter((c) => {
    const startMs = new Date(c.scheduled_start).getTime();
    const endMs = new Date(c.scheduled_end).getTime();
    const isLive = c.status === "LIVE";
    const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs;
    const isExpired = !isLive && currentTimeMs > endMs;
    const isUpcoming = c.status === "SCHEDULED" && currentTimeMs < startMs - 15 * 60 * 1000;
    const isCompleted = c.status === "COMPLETED" && !isLive;

    let matchesStatus = true;
    if (statusFilter === "LIVE") {
      matchesStatus = isLive || (isInSlot && !isExpired);
    } else if (statusFilter === "SCHEDULED") {
      matchesStatus = isUpcoming || (c.status === "SCHEDULED" && !isExpired);
    } else if (statusFilter === "COMPLETED") {
      matchesStatus = isCompleted || isExpired;
    } else if (statusFilter === "CANCELLED") {
      matchesStatus = c.status === "CANCELLED";
    } else {
      matchesStatus = true;
    }

    const matchesSearch =
      (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.batches?.batch_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.teachers?.full_name || c.teachers?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const bId = c.batch_id || c.batches?.batch_id;
    const matchesBatch = !batchFilter || bId === batchFilter;

    return matchesStatus && matchesSearch && matchesBatch;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Navbar setSidebarWidth={setSidebarWidth} />

      <main
        className="flex-1 transition-all duration-300 p-3 sm:p-5 md:p-8 min-w-0 overflow-x-hidden"
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Hamburger Menu Toggle (Mobile/Tablet Only) */}
            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 sm:p-2.5 rounded-lg transition-all duration-200 shrink-0"
              style={{ backgroundColor: '#e3f2fd' }}
              title={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-blue-600" />
              ) : (
                <Menu className="w-5 h-5 text-blue-600" />
              )}
            </button>

            <div className={`p-2 sm:p-2.5 ${isTeacher ? 'bg-indigo-600' : 'bg-blue-600'} text-white rounded-xl shadow-md shrink-0`}>
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
                {isTeacher ? "My Live Classes" : "Live Classes & Timetable"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isTeacher
                  ? "Interactive monthly calendar, assigned sessions & live studio launcher"
                  : "Comprehensive yearly timetable schedule & interactive live classes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* View Mode Switcher (1st preference: List View, 2nd preference: Calendar) */}
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="List / Table View"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-blue-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Interactive Calendar View"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>

            <button
              onClick={() => navigate(isTeacher ? "/teacher/recordings" : "/academic/recordings")}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
            >
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span className="hidden sm:inline">{isTeacher ? "Recordings" : "Recordings Archive"}</span>
            </button>

            {!isTeacher && (
              <button
                onClick={() => openScheduleModal()}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Schedule Class</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row (Small & Clean in mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs sm:shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5 sm:mt-1">{classes.length}</p>
            </div>
            <div className="p-1.5 sm:p-3 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs sm:shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Now</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => {
                  const startMs = new Date(c.scheduled_start).getTime();
                  const endMs = new Date(c.scheduled_end).getTime();
                  const isExpired = currentTimeMs > endMs;
                  const isInSlot = currentTimeMs >= startMs && !isExpired;
                  return (c.status === "LIVE" || isInSlot) && !isExpired;
                }).length}
              </p>
            </div>
            <div className="p-1.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl animate-pulse">
              <Radio className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs sm:shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => {
                  const startMs = new Date(c.scheduled_start).getTime();
                  const endMs = new Date(c.scheduled_end).getTime();
                  return c.status === "SCHEDULED" && currentTimeMs < startMs && currentTimeMs <= endMs;
                }).length}
              </p>
            </div>
            <div className="p-1.5 sm:p-3 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl">
              <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs sm:shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Recordings</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => c.recording_enabled).length}
              </p>
            </div>
            <div className="p-1.5 sm:p-3 bg-purple-50 text-purple-600 rounded-lg sm:rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* 🌟 FILTER & SEARCH BAR WITH BATCH DROPDOWN (Strict Dropdown) */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs sm:shadow-sm mb-4 sm:mb-6 flex flex-col md:flex-row gap-2.5 sm:gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-3.5 top-2.5 sm:top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, batch name, or tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            {/* Batch Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 w-full sm:w-auto shrink-0 shadow-xs">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer w-full sm:w-auto sm:max-w-[220px] truncate text-xs"
              >
                <option value="">All Batches ({batchesWithClasses.length})</option>
                {batchesWithClasses.map((b) => {
                  const bId = b.batch_id || b.id;
                  const count = batchClassCounts[bId] || 0;
                  return (
                    <option key={bId} value={bId}>
                      {b.batch_name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Filters */}
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
              {["ALL", "LIVE", "SCHEDULED", "COMPLETED", "CANCELLED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === status
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 1. CALENDAR VIEW MODE */}
        {viewMode === "calendar" ? (
          <div className="space-y-6">
            {/* Calendar Controls & Month/Year Switcher */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Prev & Next Month buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Month Dropdown */}
                <select
                  value={calMonth}
                  onChange={(e) => setCalMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 focus:outline-none cursor-pointer transition-colors"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>

                {/* Year Dropdown (Allows selecting Next Year e.g. 2027 easily!) */}
                <select
                  value={calYear}
                  onChange={(e) => setCalYear(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 focus:outline-none cursor-pointer transition-colors"
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>

                {/* Jump to Today Button */}
                <button
                  onClick={handleGoToToday}
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-medium text-slate-700">Live Class</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="font-medium text-slate-700">Scheduled</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span className="font-medium text-slate-700">Completed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span className="font-medium text-slate-700">Auto Rec</span>
                </span>
              </div>
            </div>

            {/* Calendar Grid & Selected Day Schedule Panel Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* 7-Column Month Grid (8 Cols on Desktop) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-3 sm:p-5">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2 pb-2 border-b border-slate-100">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                    <div
                      key={day}
                      className={`text-xs font-bold uppercase tracking-wider py-1 ${
                        idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarCells.map((cell) => {
                    const isToday = cell.dateString === todayIST;
                    const isSelected = cell.dateString === selectedCalendarDate;
                    const cellClasses = classesByDate[cell.dateString] || [];
                    const hasLive = cellClasses.some((c) => c.status === "LIVE");
                    const hasScheduled = cellClasses.some((c) => c.status === "SCHEDULED");

                    return (
                      <div
                        key={cell.dateString}
                        onClick={() => setSelectedCalendarDate(cell.dateString)}
                        className={`min-h-[75px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                          isSelected
                            ? "bg-purple-50/70 border-purple-500 shadow-md ring-2 ring-purple-500/30"
                            : isToday
                            ? "bg-blue-50/50 border-blue-300 hover:border-blue-400"
                            : cell.isCurrentMonth
                            ? "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70"
                            : "bg-slate-50/20 border-slate-100/60 text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isToday
                                ? "bg-blue-600 text-white font-extrabold shadow-sm"
                                : isSelected
                                ? "bg-purple-600 text-white font-extrabold shadow-sm"
                                : cell.isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {/* Quick indicators */}
                          <div className="flex items-center gap-1">
                            {hasLive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Now" />
                            )}
                            {cellClasses.length > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                isSelected ? "bg-purple-200 text-purple-900" : "bg-slate-200 text-slate-700"
                              }`}>
                                {cellClasses.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Class Preview Chips inside cell */}
                        <div className="mt-1 space-y-1 overflow-hidden">
                          {cellClasses.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border leading-tight ${
                                item.status === "LIVE"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : item.status === "SCHEDULED"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                              title={`${formatISTTime(item.scheduled_start)} - ${item.title}`}
                            >
                              {formatISTTime(item.scheduled_start).replace(" IST", "")} {item.title}
                            </div>
                          ))}
                          {cellClasses.length > 2 && (
                            <div className="text-[9px] font-bold text-slate-400 pl-1">
                              +{cellClasses.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Schedule Panel (4 Cols on Desktop) */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                <div>
                  {/* Panel Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Selected Date Schedule</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                        {formattedSelectedDate}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedDayClasses.length} {selectedDayClasses.length === 1 ? "class" : "classes"} scheduled for this date
                      </p>
                    </div>

                    {!isTeacher && (
                      <button
                        onClick={() => openScheduleModal(selectedCalendarDate)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                        title="Schedule class on this specific day"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule</span>
                      </button>
                    )}
                  </div>

                  {/* Day Classes List */}
                  {selectedDayClasses.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-100 my-4">
                      <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No Classes on this Date</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                        No scheduled live sessions for {formattedSelectedDate}.
                      </p>
                      {!isTeacher && (
                        <button
                          onClick={() => openScheduleModal(selectedCalendarDate)}
                          className="mt-3 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-semibold shadow-sm transition-all"
                        >
                          + Schedule Class on this Day
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                      {selectedDayClasses.map((item) => {
                        const startMs = new Date(item.scheduled_start).getTime();
                        const endMs = new Date(item.scheduled_end).getTime();
                        const isLive = item.status === "LIVE";
                        const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs;
                        const isExpired = !isLive && currentTimeMs > endMs;
                        const canLaunch = (isLive || isInSlot) && !isExpired;

                        return (
                          <div
                            key={item.id}
                            className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all shadow-xs sm:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1 sm:mb-1.5">
                              <div className="min-w-0">
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                  Session #{item.session_number}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">
                                  {item.title}
                                </h4>
                              </div>

                              {isLive ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] sm:text-[10px] animate-pulse shrink-0">
                                  LIVE NOW
                                </span>
                              ) : isInSlot ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] sm:text-[10px] animate-pulse shrink-0">
                                  {item.status === "COMPLETED" ? "RE-JOINABLE" : "IN SESSION"}
                                </span>
                              ) : isExpired ? (
                                <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[9px] sm:text-[10px] font-semibold shrink-0">
                                  Schedule Ended
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] sm:text-[10px] font-semibold border border-blue-200 shrink-0">
                                  Scheduled
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] sm:text-xs text-slate-600 font-medium mb-1 truncate">
                              Batch: <strong>{item.batches?.batch_name || "General Batch"}</strong>
                            </p>

                            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                              <span>{formatISTTime(item.scheduled_start)} - {formatISTTime(item.scheduled_end)}</span>
                            </div>

                            <div className="pt-1.5 sm:pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                              <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                                Tutor: {item.teachers?.full_name || item.teachers?.name || "Instructor"}
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                {isExpired ? (
                                  <button
                                    disabled
                                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-200 text-slate-400 text-[11px] sm:text-xs rounded-lg cursor-not-allowed font-medium flex items-center gap-1"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Ended</span>
                                  </button>
                                ) : canLaunch ? (
                                  <button
                                    onClick={() => navigate(`/live-studio/${item.id}`)}
                                    className="px-2.5 py-1 sm:px-3 sm:py-1 text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                                  >
                                    <Video className="w-3 h-3" />
                                    <span>{isTeacher ? (item.status === "COMPLETED" ? "Reopen" : "Launch") : "Studio"}</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 text-slate-400 text-[11px] sm:text-xs rounded-lg cursor-not-allowed font-medium border border-slate-200 flex items-center gap-1"
                                    title="Session is scheduled. Live studio will be available when class starts."
                                  >
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Scheduled</span>
                                  </button>
                                )}

                                {!isTeacher && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="p-1 text-slate-500 hover:text-blue-600 rounded-md sm:rounded-lg hover:bg-blue-50"
                                      title="Edit schedule"
                                    >
                                      <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id, item.title)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md sm:rounded-lg hover:bg-rose-50"
                                      title="Cancel session"
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Quick Action */}
                {!isTeacher && (
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => openScheduleModal(selectedCalendarDate)}
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Schedule Another Class on {selectedCalendarDate}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 📋 2. TABLE / LIST VIEW MODE */
          <div>
            {/* Classes Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
                  <p>Loading live class schedule...</p>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="p-8 sm:p-12 text-center">
                  <Video className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-700 font-semibold text-base mb-1">
                    {isTeacher ? "No Live Classes Assigned" : "No live classes found"}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    {isTeacher
                      ? "No live classes scheduled for you right now."
                      : "Schedule your first class using the button above."}
                  </p>
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-4 px-6">Class Title & Session</th>
                          <th className="py-4 px-6">Batch & Course</th>
                          <th className="py-4 px-6">Tutor</th>
                          <th className="py-4 px-6">Schedule Time</th>
                          <th className="py-4 px-6">Auto Recording</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredClasses.map((item) => {
                          const startMs = new Date(item.scheduled_start).getTime();
                          const endMs = new Date(item.scheduled_end).getTime();
                          const isLive = item.status === "LIVE";
                          const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs;
                          const isExpired = !isLive && currentTimeMs > endMs;
                          const canLaunch = (isLive || isInSlot) && !isExpired;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-semibold text-slate-800">{item.title}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Session #{item.session_number} • Room: {item.room_name}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-medium text-slate-800">{item.batches?.batch_name || "General Batch"}</div>
                                <div className="text-xs text-slate-400">
                                  {item.courses?.course_name ? `${item.courses.course_name} (${item.courses.language})` : "Modern Languages"}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                    {(item.teachers?.full_name || item.teachers?.name || "T")[0]}
                                  </div>
                                  <span className="font-medium text-slate-700">
                                    {item.teachers?.full_name || item.teachers?.name || "Assigned Tutor"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="font-medium text-slate-800">
                                  {formatISTDate(item.scheduled_start)}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                  {formatISTTime(item.scheduled_start)} - {formatISTTime(item.scheduled_end)}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {item.recording_enabled ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                    Auto Rec ON
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">Disabled</span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                {item.status === "CANCELLED" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                                    <XCircle className="w-3 h-3" />
                                    Cancelled
                                  </span>
                                )}
                                {item.status !== "CANCELLED" && isExpired && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    <CheckCircle className="w-3 h-3 text-slate-500" />
                                    Schedule Ended
                                  </span>
                                )}
                                {item.status === "LIVE" && !isExpired && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                                    LIVE NOW
                                  </span>
                                )}
                                {item.status !== "LIVE" && isInSlot && !isExpired && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                                    {item.status === "COMPLETED" ? "RE-JOINABLE" : "IN SESSION"}
                                  </span>
                                )}
                                {item.status === "COMPLETED" && !isInSlot && !isExpired && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    Completed
                                  </span>
                                )}
                                {item.status === "SCHEDULED" && !isInSlot && !isExpired && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                    <Clock className="w-3 h-3" />
                                    Scheduled
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isExpired ? (
                                    <button
                                      disabled
                                      className="px-3.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed border border-slate-200 shadow-none"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Ended</span>
                                    </button>
                                  ) : canLaunch ? (
                                    <button
                                      onClick={() => navigate(`/live-studio/${item.id}`)}
                                      className="px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      {isTeacher ? (item.status === "COMPLETED" ? "Reopen Studio" : "Launch Studio") : "Enter Studio"}
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="px-3.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed border border-slate-200 shadow-none"
                                      title="Session is scheduled. Live studio will be available when class starts."
                                    >
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Scheduled</span>
                                    </button>
                                  )}
                                  {!isTeacher && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditModal(item)}
                                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                        title="Edit Schedule & Timings"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item.id, item.title)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                        title="Cancel Live Class"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS VIEW (Clean, Simple, Good & Small) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredClasses.map((item) => {
                      const startMs = new Date(item.scheduled_start).getTime();
                      const endMs = new Date(item.scheduled_end).getTime();
                      const isLive = item.status === "LIVE";
                      const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs;
                      const isExpired = !isLive && currentTimeMs > endMs;
                      const canLaunch = (isLive || isInSlot) && !isExpired;

                      return (
                        <div key={item.id} className="p-2.5 space-y-1.5 bg-white">
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                Session #{item.session_number}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs mt-0.5 truncate">{item.title}</h4>
                              <p className="text-[11px] text-slate-500 truncate">{item.batches?.batch_name || "General Batch"}</p>
                            </div>
                            {isLive ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold animate-pulse shrink-0">
                                LIVE
                              </span>
                            ) : isInSlot ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold animate-pulse shrink-0">
                                {item.status === "COMPLETED" ? "RE-JOINABLE" : "IN SESSION"}
                              </span>
                            ) : isExpired ? (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-medium shrink-0">Ended</span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold shrink-0">Scheduled</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatISTDate(item.scheduled_start)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatISTTime(item.scheduled_start)} - {formatISTTime(item.scheduled_end)}</span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center gap-1.5">
                            {isExpired ? (
                              <button disabled className="flex-1 py-1 px-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Ended</span>
                              </button>
                            ) : canLaunch ? (
                              <button
                                onClick={() => navigate(`/live-studio/${item.id}`)}
                                className="flex-1 py-1 px-2.5 text-white text-xs font-bold rounded-lg shadow-xs transition-all bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1"
                              >
                                <Video className="w-3 h-3" />
                                <span>{isTeacher ? (item.status === "COMPLETED" ? "Reopen Studio" : "Launch Studio") : "Enter Studio"}</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex-1 py-1 px-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1"
                                title="Session is scheduled. Live studio will be available when class starts."
                              >
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Scheduled</span>
                              </button>
                            )}

                            {!isTeacher && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                                  title="Edit schedule"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id, item.title)}
                                  className="p-1.5 bg-slate-100 text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                                  title="Cancel class"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Schedule New Live Class</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up an interactive class with Asia/Kolkata strict schedule & auto recording
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Batch *</label>
                  <select
                    name="batch_id"
                    value={formData.batch_id}
                    onChange={handleBatchSelect}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Choose Batch --</option>
                    {batches.map((b) => {
                      const bId = b.batch_id || b.id;
                      const bCourse = b.course_name ? ` (${b.course_name})` : '';
                      const bTeacher = b.teacher_name ? ` - Tutor: ${b.teacher_name}` : '';
                      return (
                        <option key={bId} value={bId}>
                          {b.batch_name}{bCourse}{bTeacher}
                        </option>
                      );
                    })}
                  </select>

                  {formData.batch_id && (formData.start_time || formData.end_time) && (
                    <div className="mt-2.5 flex items-center gap-2 px-3.5 py-2 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-800">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        <strong>Batch Slot:</strong> {formData.start_time ? formatTime12(formData.start_time) : "--"} to {formData.end_time ? formatTime12(formData.end_time) : "--"} (Asia/Kolkata)
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class Title *</label>
                    <input
                      type="text"
                      name="title"
                      placeholder="e.g. French Grammar Basics"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Session Number</label>
                    <input
                      type="number"
                      name="session_number"
                      min="1"
                      value={formData.session_number}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
                    <input
                      type="date"
                      name="scheduled_date"
                      value={formData.scheduled_date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Time (IST) *</label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Time (IST) *</label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Friendly formatted schedule confirmation */}
                {formData.scheduled_date && (
                  <div className="text-[11px] text-blue-900 bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      <strong>Schedule Target:</strong>{" "}
                      {new Date(`${formData.scheduled_date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}{" "}
                      (Asia/Kolkata IST)
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assigned Tutor</label>
                  <select
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Auto-inherit from batch or choose --</option>
                    {teachers.map((t) => {
                      const tId = t.teacher_id || t.id || t.user_id || t.teacher;
                      const cleanName = (t.full_name || t.teacher_name || t.name || "Instructor").trim();
                      return (
                        <option key={tId} value={tId}>
                          {cleanName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Topics / Agenda</label>
                  <textarea
                    name="description"
                    rows="2"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Topics covered in this session..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Auto Recording Checkbox */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-900">Auto Recording</p>
                    <p className="text-[11px] text-purple-600">
                      Session will be recorded & saved for student replay
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="recording_enabled"
                    checked={formData.recording_enabled}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </div>

                {/* Schedule conflict warning banner */}
                {scheduleConflict && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800">
                        {scheduleConflict.type === "BATCH_CONFLICT" ? "Batch Schedule Overlap Detected" : "Tutor Schedule Overlap Detected"}
                      </p>
                      <p className="mt-0.5 leading-relaxed text-amber-700">{scheduleConflict.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {submitting ? "Scheduling..." : "Confirm & Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Schedule Modal */}
        {showEditModal && editingClass && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    Edit Live Class Schedule
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Batch: <span className="font-semibold text-slate-700">{editingClass.batches?.batch_name || "General Batch"}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Conflict warning banner */}
              {editConflict && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800">
                      {editConflict.type === "BATCH_CONFLICT" ? "Batch Schedule Overlap" : "Tutor Schedule Overlap"}
                    </p>
                    <p className="mt-0.5 leading-relaxed text-amber-700">{editConflict.message}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Session Number</label>
                    <input
                      type="number"
                      name="session_number"
                      min="1"
                      value={editFormData.session_number}
                      onChange={handleEditInputChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
                    <input
                      type="date"
                      name="scheduled_date"
                      value={editFormData.scheduled_date}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Time (IST) *</label>
                    <input
                      type="time"
                      name="start_time"
                      value={editFormData.start_time}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Time (IST) *</label>
                    <input
                      type="time"
                      name="end_time"
                      value={editFormData.end_time}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assigned Tutor</label>
                  <select
                    name="teacher_id"
                    value={editFormData.teacher_id}
                    onChange={handleEditInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- Keep Current Tutor --</option>
                    {teachers.map((t) => {
                      const tId = t.teacher_id || t.id || t.user_id || t.teacher;
                      const cleanName = (t.full_name || t.teacher_name || t.name || "Instructor").trim();
                      return (
                        <option key={tId} value={tId}>
                          {cleanName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Topics / Agenda</label>
                  <textarea
                    name="description"
                    rows="2"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    placeholder="Topics covered in this session..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-900">Auto Recording</p>
                    <p className="text-[11px] text-purple-600">
                      Session will be recorded & saved for student replay
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="recording_enabled"
                    checked={editFormData.recording_enabled}
                    onChange={handleEditInputChange}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingClass(null);
                    }}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {editSubmitting ? "Saving Changes..." : "Save Schedule Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modern Popup Modal */}
        {popupModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div
                className={`absolute top-0 left-0 right-0 h-2 ${
                  popupModal.type === "success"
                    ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"
                    : popupModal.type === "error"
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : popupModal.type === "warning" || popupModal.type === "confirm"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600"
                }`}
              />

              <button
                onClick={() => setPopupModal(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex justify-center mb-4 mt-2">
                {popupModal.type === "success" && (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/70 shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="w-9 h-9 stroke-[2.2]" />
                  </div>
                )}
                {popupModal.type === "error" && (
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/70 shadow-lg shadow-rose-500/10">
                    <XCircle className="w-9 h-9 stroke-[2.2]" />
                  </div>
                )}
                {(popupModal.type === "warning" || popupModal.type === "confirm") && (
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center ring-8 ring-amber-50/70 shadow-lg shadow-amber-500/10">
                    <AlertTriangle className="w-9 h-9 stroke-[2.2]" />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                {popupModal.title}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
                {popupModal.message}
              </p>

              {popupModal.highlight && (
                <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-2 text-xs">
                  {popupModal.highlight.classTitle && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Class:</span>
                      <span className="font-semibold text-slate-800 truncate">
                        {popupModal.highlight.classTitle} {popupModal.highlight.session ? `(#${popupModal.highlight.session})` : ""}
                      </span>
                    </div>
                  )}
                  {popupModal.highlight.batch && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Batch:</span>
                      <span className="font-semibold text-slate-700 truncate">
                        {popupModal.highlight.batch}
                      </span>
                    </div>
                  )}
                  {popupModal.highlight.timeSlot && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Timing (IST):</span>
                      <span className="font-bold text-blue-600">
                        {popupModal.highlight.timeSlot}
                      </span>
                    </div>
                  )}
                  {popupModal.highlight.date && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Date:</span>
                      <span className="font-semibold text-slate-700">
                        {popupModal.highlight.date}
                      </span>
                    </div>
                  )}
                  <div className="pt-2.5 mt-1 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Instant sync applied for Tutors & Students</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-3">
                {popupModal.type === "confirm" ? (
                  <>
                    <button
                      onClick={() => setPopupModal(null)}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {popupModal.cancelText || "Cancel"}
                    </button>
                    <button
                      onClick={() => {
                        const action = popupModal.onConfirm;
                        setPopupModal(null);
                        if (action) action();
                      }}
                      className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                    >
                      {popupModal.confirmText || "Confirm"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setPopupModal(null)}
                    className={`w-full py-2.5 px-4 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                      popupModal.type === "success"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                        : popupModal.type === "error"
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                    }`}
                  >
                    Got It
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AcademicLiveClassesPage;
