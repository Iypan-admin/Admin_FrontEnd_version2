import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import {
    getDemoBatches,
    getDemoBatchById,
    updateDemoBatchClassLink,
    updateDemoBatch,
    updateDemoAttendance,
} from "../services/Api";
import { getMyTeacherId } from "../services/Api";

const TeacherDemoClassesPage = () => {
    const token = localStorage.getItem("token");
    const [demoBatches, setDemoBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teacherId, setTeacherId] = useState(null);
    
    const [showClassLinkModal, setShowClassLinkModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [classLink, setClassLink] = useState("");
    
    const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
    const [viewBatch, setViewBatch] = useState(null);

    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedBatchName, setSelectedBatchName] = useState("");

    // Fetch teacher_id
    const fetchTeacherId = useCallback(async () => {
        try {
            const id = await getMyTeacherId(token);
            setTeacherId(id);
        } catch (err) {
            console.error("Error fetching teacher ID:", err);
            setError("Failed to fetch teacher information");
        }
    }, [token]);

    // Fetch demo batches for current teacher
    const fetchDemoBatches = useCallback(async () => {
        try {
            setLoading(true);
            if (teacherId) {
                const data = await getDemoBatches(
                    null, // status
                    teacherId, // tutor_id
                    null, // date_from
                    null, // date_to
                    token
                );
                setDemoBatches(data || []);
            }
        } catch (err) {
            console.error("Error fetching demo batches:", err);
            setError(err.message || "Failed to load demo classes");
        } finally {
            setLoading(false);
        }
    }, [teacherId, token]);

    useEffect(() => {
        if (!token) {
            alert("No token found. Please login.");
            return;
        }
        fetchTeacherId();
    }, [token, fetchTeacherId]);

    useEffect(() => {
        if (teacherId) {
            fetchDemoBatches();
        }
    }, [teacherId, fetchDemoBatches]);

    // Format date
    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    // Format time
    const formatTime = (timeString) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Get course flag emoji
    const getCourseFlag = (course) => {
        const flags = {
            "French": "🇫🇷",
            "German": "🇩🇪",
            "Japanese": "🇯🇵"
        };
        return flags[course] || "📚";
    };

    // Handle class link modal open
    const handleOpenClassLinkModal = (batch) => {
        setSelectedBatch(batch);
        setClassLink(batch.class_link || "");
        setShowClassLinkModal(true);
    };

    // Handle class link update
    const handleUpdateClassLink = async () => {
        try {
            await updateDemoBatchClassLink(selectedBatch.demo_batch_id, classLink, token);
            alert("Class link updated successfully!");
            setShowClassLinkModal(false);
            setSelectedBatch(null);
            setClassLink("");
            await fetchDemoBatches();
        } catch (err) {
            console.error("Error updating class link:", err);
            alert(err.message || "Failed to update class link");
        }
    };

    // Handle view batch details
    const handleViewBatchDetails = async (batch_id) => {
        try {
            const batch = await getDemoBatchById(batch_id, token);
            setViewBatch(batch);
            setShowBatchDetailsModal(true);
        } catch (err) {
            console.error("Error fetching batch details:", err);
            alert("Failed to fetch batch details");
        }
    };

    // Handle view student list
    const handleViewStudentList = (batch) => {
        setSelectedStudents(batch.demo_batch_students || []);
        setSelectedBatchName(batch.demo_name);
        setShowStudentListModal(true);
    };

    // Handle attendance update
    const handleUpdateAttendance = async (batch_id, lead_id, attendance_status) => {
        try {
            await updateDemoAttendance(
                {
                    demo_batch_id: batch_id,
                    lead_id: lead_id,
                    attendance_status: attendance_status,
                },
                token
            );
            alert("Attendance updated successfully!");
            await fetchDemoBatches();
        } catch (err) {
            console.error("Error updating attendance:", err);
            alert("Failed to update attendance");
        }
    };

    // Handle status update
    const handleUpdateStatus = async (batch_id, new_status) => {
        try {
            await updateDemoBatch(batch_id, { status: new_status }, token);
            alert(`Demo batch status updated to ${new_status}!`);
            await fetchDemoBatches();
            // Close modal if open
            if (showBatchDetailsModal) {
                setShowBatchDetailsModal(false);
            }
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update demo batch status");
        }
    };

    // Filter state
    const [selectedFilter, setSelectedFilter] = useState("all");

    // Filter batches by status
    const scheduledBatches = demoBatches.filter(b => b.status === "scheduled");
    const completedBatches = demoBatches.filter(b => b.status === "completed");
    const cancelledBatches = demoBatches.filter(b => b.status === "cancelled");

    // Get filtered batches based on selected filter
    const getFilteredBatches = () => {
        switch (selectedFilter) {
            case "scheduled":
                return scheduledBatches;
            case "completed":
                return completedBatches;
            case "cancelled":
                return cancelledBatches;
            default:
                return demoBatches;
        }
    };

    const filteredBatches = getFilteredBatches();

    return (
        <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
            <Navbar />
            <div className="flex-1 lg:ml-64 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-full lg:max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                                    Demo Classes
                                </h1>
                                <p className="text-blue-100 text-lg">
                                    Manage your scheduled demo sessions and track student attendance
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 text-red-700 border-l-4 border-red-500 p-4 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-blue-100 text-sm font-medium mb-2">Total Demos</div>
                                    <div className="text-3xl font-bold">
                                        {demoBatches.length}
                                    </div>
                                </div>
                                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-cyan-100 text-sm font-medium mb-2">Scheduled</div>
                                    <div className="text-3xl font-bold">
                                        {scheduledBatches.length}
                                    </div>
                                </div>
                                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-green-100 text-sm font-medium mb-2">Completed</div>
                                    <div className="text-3xl font-bold">
                                        {completedBatches.length}
                                    </div>
                                </div>
                                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-5 text-white hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-gray-100 text-sm font-medium mb-2">Cancelled</div>
                                    <div className="text-3xl font-bold">
                                        {cancelledBatches.length}
                                    </div>
                                </div>
                                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="mb-6">
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setSelectedFilter("all")}
                                    className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                                        selectedFilter === "all"
                                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    All ({demoBatches.length})
                                </button>
                                <button
                                    onClick={() => setSelectedFilter("scheduled")}
                                    className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                                        selectedFilter === "scheduled"
                                            ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    Scheduled ({scheduledBatches.length})
                                </button>
                                <button
                                    onClick={() => setSelectedFilter("completed")}
                                    className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                                        selectedFilter === "completed"
                                            ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    Completed ({completedBatches.length})
                                </button>
                                <button
                                    onClick={() => setSelectedFilter("cancelled")}
                                    className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                                        selectedFilter === "cancelled"
                                            ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                    }`}
                                >
                                    Cancelled ({cancelledBatches.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : demoBatches.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <div className="text-gray-500 text-lg mb-2">
                                No demo classes assigned yet
                            </div>
                            <div className="text-gray-400 text-sm">
                                Demo classes will appear here once scheduled by Academic Admin
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Demo Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Students</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Class Link</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBatches.map((batch) => (
                                            <tr
                                                key={batch.demo_batch_id}
                                                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-lg ${
                                                            batch.status === "scheduled" ? "bg-blue-100" :
                                                            batch.status === "completed" ? "bg-green-100" :
                                                            "bg-gray-100"
                                                        }`}>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <span className="font-semibold text-gray-900 text-sm">
                                                            {batch.demo_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                        <span className="text-base">{getCourseFlag(batch.course)}</span>
                                                        {batch.course}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatDate(batch.demo_date)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="font-medium">
                                                            {formatTime(batch.start_time)}
                                                            {batch.end_time && ` - ${formatTime(batch.end_time)}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleViewStudentList(batch)}
                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors text-xs"
                                                        title="Click to view students"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        {batch.demo_batch_students?.length || 0}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {batch.class_link ? (
                                                        <a
                                                            href={batch.class_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors text-xs"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            Join
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs">
                                                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            Not added
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                        batch.status === "scheduled" ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200" :
                                                        batch.status === "completed" ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200" :
                                                        "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                            batch.status === "scheduled" ? "bg-blue-500" :
                                                            batch.status === "completed" ? "bg-green-500" :
                                                            "bg-gray-500"
                                                        }`}></span>
                                                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenClassLinkModal(batch)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs transition-colors"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                {batch.class_link ? "Edit" : "Add"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewBatchDetails(batch.demo_batch_id)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium text-xs transition-colors"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View
                                                            </button>
                                                        </div>
                                                        {batch.status === "scheduled" && (
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm("Mark this demo as Completed?")) {
                                                                            handleUpdateStatus(batch.demo_batch_id, "completed");
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-medium text-xs transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Complete
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm("Mark this demo as Cancelled?")) {
                                                                            handleUpdateStatus(batch.demo_batch_id, "cancelled");
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Class Link Modal */}
                {showClassLinkModal && selectedBatch && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-semibold mb-4">
                                {selectedBatch.class_link ? "Update Class Link" : "Add Class Link"}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Class Link (Google Meet, Zoom, etc.)
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full border px-3 py-2 rounded"
                                        placeholder="https://meet.google.com/..."
                                        value={classLink}
                                        onChange={(e) => setClassLink(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowClassLinkModal(false)}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateClassLink}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        {selectedBatch.class_link ? "Update" : "Add"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch Details Modal */}
                {showBatchDetailsModal && viewBatch && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-5 text-white">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white bg-opacity-20 rounded-xl">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">{viewBatch.demo_name}</h2>
                                            <p className="text-blue-100 text-sm mt-1">Demo Batch Details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowBatchDetailsModal(false)}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {/* Batch Info */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">{getCourseFlag(viewBatch.course)}</span>
                                            <span className="text-xs font-semibold text-purple-600 uppercase">Course</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{viewBatch.course}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-blue-600 uppercase">Date</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">{formatDate(viewBatch.demo_date)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-green-600 uppercase">Time</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatTime(viewBatch.start_time)}
                                            {viewBatch.end_time && ` - ${formatTime(viewBatch.end_time)}`}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-cyan-600 uppercase">Status</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 capitalize">{viewBatch.status}</p>
                                    </div>
                                </div>

                                {/* Status Update Buttons - Only show for scheduled batches */}
                                {viewBatch.status === "scheduled" && (
                                    <div className="flex gap-3 mb-6">
                                        <button
                                            onClick={() => handleUpdateStatus(viewBatch.demo_batch_id, "completed")}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Mark as Completed
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(viewBatch.demo_batch_id, "cancelled")}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Mark as Cancelled
                                        </button>
                                    </div>
                                )}

                                {/* Class Link */}
                                {viewBatch.class_link && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Class Link</p>
                                                <a
                                                    href={viewBatch.class_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-700 font-semibold hover:text-green-800 hover:underline block truncate"
                                                >
                                                    {viewBatch.class_link}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {viewBatch.notes && (
                                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200 mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-yellow-100 rounded-lg">
                                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">Notes</p>
                                                <p className="text-gray-800">{viewBatch.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Students List */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            Students ({viewBatch.demo_batch_students?.length || 0})
                                        </h3>
                                    </div>
                                    <div className="space-y-3">
                                        {viewBatch.demo_batch_students?.map((student, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                                                {student.leads?.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{student.leads?.name}</div>
                                                                <div className="text-sm text-gray-600 flex items-center gap-4">
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                        {student.leads?.email}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                        {student.leads?.phone}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {student.note && (
                                                            <div className="text-sm text-gray-600 mt-2 pl-2 border-l-2 border-yellow-300">
                                                                {student.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <select
                                                            value={student.attendance_status}
                                                            onChange={(e) =>
                                                                handleUpdateAttendance(
                                                                    viewBatch.demo_batch_id,
                                                                    student.lead_id,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className={`text-xs px-3 py-2 rounded-lg border-2 font-semibold transition-colors ${
                                                                student.attendance_status === "present" ? "bg-green-50 border-green-300 text-green-700" :
                                                                student.attendance_status === "absent" ? "bg-red-50 border-red-300 text-red-700" :
                                                                "bg-yellow-50 border-yellow-300 text-yellow-700"
                                                            }`}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="present">Present</option>
                                                            <option value="absent">Absent</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end">
                                <button
                                    onClick={() => setShowBatchDetailsModal(false)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student List Modal */}
                {showStudentListModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold">{selectedBatchName}</h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Students ({selectedStudents.length})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowStudentListModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {selectedStudents.length > 0 ? (
                                    selectedStudents.map((student, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border hover:bg-gray-100 transition">
                                            <div className="font-medium text-base">
                                                {student.leads?.name || "N/A"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No students found in this batch.
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowStudentListModal(false)}
                                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDemoClassesPage;
