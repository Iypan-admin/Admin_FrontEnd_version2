import React, { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import {
  getLiveClasses,
  scheduleLiveClass,
  updateLiveClass,
  checkScheduleConflict,
  deleteLiveClass
} from "../services/liveClassApi";
import { getBatches, getAllCourses, getAllTeachers } from "../services/Api";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const refreshLiveClasses = async () => {
    try {
      const classRes = await getLiveClasses();
      setClasses(classRes?.liveClasses || (Array.isArray(classRes) ? classRes : []));
    } catch (_) {}
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

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");

    // Fetch live classes
    try {
      const classRes = await getLiveClasses();
      setClasses(classRes?.liveClasses || (Array.isArray(classRes) ? classRes : []));
    } catch (err) {
      console.error("Error loading live classes:", err);
    }

    // Fetch batches
    try {
      const batchRes = await getBatches(token);
      console.log("Loaded batches:", batchRes);
      const batchList = Array.isArray(batchRes) 
        ? batchRes 
        : (batchRes?.data || batchRes?.batches || []);
      setBatches(batchList);
    } catch (err) {
      console.error("Error loading batches:", err);
    }

    // Fetch courses
    try {
      const courseRes = await getAllCourses(token);
      const courseList = Array.isArray(courseRes) 
        ? courseRes 
        : (courseRes?.data || courseRes?.courses || []);
      setCourses(courseList);
    } catch (err) {
      console.error("Error loading courses:", err);
    }

    // Fetch teachers
    try {
      const teacherRes = await getAllTeachers();
      console.log("Loaded teachers:", teacherRes);
      const teacherList = Array.isArray(teacherRes) 
        ? teacherRes 
        : (teacherRes?.data || teacherRes?.teachers || []);
      setTeachers(teacherList);
    } catch (err) {
      console.error("Error loading teachers:", err);
    }

    setLoading(false);
  };

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

  const openScheduleModal = () => {
    setFormData({
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

      setPopupModal({
        type: "success",
        title: "Live Class Scheduled Successfully!",
        message: "Your new live class is now scheduled. Assigned tutors and students can view it on their portals.",
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

  const filteredClasses = classes.filter((c) => {
    const startMs = new Date(c.scheduled_start).getTime();
    const endMs = new Date(c.scheduled_end).getTime();
    const isLive = c.status === "LIVE";
    const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs + 60 * 60 * 1000;
    const isExpired = !isLive && (c.status === "COMPLETED" || currentTimeMs > endMs + 60 * 60 * 1000);
    const isUpcoming = c.status === "SCHEDULED" && currentTimeMs < startMs - 15 * 60 * 1000;
    const isCompleted = c.status === "COMPLETED" && !isLive;

    let matchesStatus = true;
    if (statusFilter === "LIVE") {
      matchesStatus = isLive || (c.status === "SCHEDULED" && isInSlot);
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
    return matchesStatus && matchesSearch;
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
                {isTeacher ? "My Live Classes" : "Live Classes & Recordings"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isTeacher
                  ? "View assigned live sessions and launch your Live Studio"
                  : "Schedule live sessions and oversee class recordings"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate(isTeacher ? "/teacher/recordings" : "/academic/recordings")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <Film className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{isTeacher ? "Recordings" : "Recordings Archive"}</span>
            </button>

            {!isTeacher && (
              <button
                onClick={openScheduleModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Schedule Class</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row - 2x2 on Mobile, 4 columns on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5 sm:mt-1">{classes.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Now</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => {
                  const startMs = new Date(c.scheduled_start).getTime();
                  const endMs = new Date(c.scheduled_end).getTime();
                  const isExpired = currentTimeMs > endMs;
                  const isInSlot = currentTimeMs >= startMs && !isExpired;
                  return (c.status === "LIVE" || isInSlot) && !isExpired;
                }).length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl animate-pulse">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => {
                  const startMs = new Date(c.scheduled_start).getTime();
                  const endMs = new Date(c.scheduled_end).getTime();
                  return c.status === "SCHEDULED" && currentTimeMs < startMs && currentTimeMs <= endMs;
                }).length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Recordings</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-0.5 sm:mt-1">
                {classes.filter((c) => c.recording_enabled).length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, batch name, or tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {["ALL", "LIVE", "SCHEDULED", "COMPLETED", "CANCELLED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Classes Content */}
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
                  ? "No live classes scheduled for you right now. Your Academic Coordinator will schedule your sessions."
                  : "Schedule your first class using the button above."}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md+) */}
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
                      const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs + 60 * 60 * 1000;
                      const isExpired = !isLive && (item.status === "COMPLETED" || currentTimeMs > endMs + 60 * 60 * 1000);

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
                          {(item.status === "LIVE" || isInSlot) && !isExpired && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                              <Radio className="w-3.5 h-3.5 text-emerald-600" />
                              {item.status === "LIVE" ? "LIVE NOW" : "IN SESSION"}
                            </span>
                          )}
                          {item.status === "COMPLETED" && !isExpired && !isInSlot && (
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
                                title={`Schedule ended at ${formatISTTime(item.scheduled_end)}`}
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Schedule Ended</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/live-studio/${item.id}`)}
                                className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                                  item.status === "LIVE" || isInSlot
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20"
                                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                                }`}
                                title={`Active schedule window (closes at ${formatISTTime(item.scheduled_end)})`}
                              >
                                <Video className="w-3.5 h-3.5" />
                                {isTeacher ? "🚀 Launch Studio" : "Enter Studio"}
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
                                  title="Cancel Class"
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

              {/* MOBILE CARDS VIEW (visible on mobile < md, clean responsive Berry style) */}
              <div className="md:hidden p-3 space-y-3.5 bg-slate-50/50">
                {filteredClasses.map((item) => {
                  const startMs = new Date(item.scheduled_start).getTime();
                  const endMs = new Date(item.scheduled_end).getTime();
                  const isLive = item.status === "LIVE";
                  const isInSlot = currentTimeMs >= startMs - 15 * 60 * 1000 && currentTimeMs <= endMs + 60 * 60 * 1000;
                  const isExpired = !isLive && (item.status === "COMPLETED" || currentTimeMs > endMs + 60 * 60 * 1000);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                    >
                      {/* Card Header: Title, Session & Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm truncate">
                              {item.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              #{item.session_number}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.batches?.batch_name || "General Batch"} • {item.courses?.course_name || "Course"}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {item.status === "CANCELLED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                              <XCircle className="w-3 h-3" />
                              Cancelled
                            </span>
                          )}
                          {item.status !== "CANCELLED" && isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                              <CheckCircle className="w-3 h-3" />
                              Ended
                            </span>
                          )}
                          {(item.status === "LIVE" || isInSlot) && !isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                              <Radio className="w-3 h-3 text-emerald-600" />
                              {item.status === "LIVE" ? "LIVE NOW" : "IN SESSION"}
                            </span>
                          )}
                          {item.status === "COMPLETED" && !isExpired && !isInSlot && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                          {item.status === "SCHEDULED" && !isInSlot && !isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                              <Clock className="w-3 h-3" />
                              Scheduled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Details: Tutor, Timing, Auto Rec */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(item.teachers?.full_name || item.teachers?.name || "T")[0]}
                          </div>
                          <span className="truncate font-medium">
                            {item.teachers?.full_name || item.teachers?.name || "Tutor"}
                          </span>
                        </div>

                        <div className="flex items-center justify-end">
                          {item.recording_enabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                              Auto Rec ON
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Rec Off</span>
                          )}
                        </div>

                        <div className="col-span-2 flex items-center gap-1.5 text-slate-600 text-[11px] pt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">{formatISTDate(item.scheduled_start)}</span>
                          <span className="text-slate-400">•</span>
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatISTTime(item.scheduled_start)} - {formatISTTime(item.scheduled_end)}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        {isExpired ? (
                          <button
                            disabled
                            className="flex-1 py-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Schedule Ended</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/live-studio/${item.id}`)}
                            className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              item.status === "LIVE" || isInSlot
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/30"
                                : "bg-blue-600 shadow-blue-500/30"
                            }`}
                          >
                            <Video className="w-4 h-4" />
                            <span>{isTeacher ? "🚀 Launch Studio" : "Enter Live Studio"}</span>
                          </button>
                        )}

                        {!isTeacher && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                              title="Edit Schedule"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.title)}
                              className="p-2 text-slate-400 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
                              title="Cancel Class"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Schedule New Live Class</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up an in-app interactive class with automatic recording
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
                        <strong>Batch Slot (from DB):</strong> {formData.start_time ? formatTime12(formData.start_time) : "--"} to {formData.end_time ? formatTime12(formData.end_time) : "--"} (Asia/Kolkata)
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

                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-base leading-none">🕒</span>
                  <span className="leading-relaxed">
                    <strong>Asia/Kolkata (IST) Strict Window:</strong> Live studio entry is only active during the scheduled slot. Once the end time passes (e.g. 10:01 AM for a 10:00 AM class), the join button automatically disables for students and faculty.
                  </span>
                </div>

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

                <div className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Instant Schedule Synchronization:</strong> Once saved, the new timing will update immediately for all students and tutors enrolled in this batch without needing a page refresh.
                  </span>
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

        {/* Modern Popup Modal (Replaces browser alert/confirm) */}
        {popupModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Decorative top gradient accent */}
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

              {/* Close X */}
              <button
                onClick={() => setPopupModal(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>

              {/* Icon Container with glowing ring */}
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

              {/* Title & Message */}
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                {popupModal.title}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
                {popupModal.message}
              </p>

              {/* Highlight summary card if provided */}
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

              {/* Buttons */}
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
