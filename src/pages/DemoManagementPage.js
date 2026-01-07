import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import {
    getDemoRequests,
    getDemoBatches,
    createDemoBatch,
    getDemoBatchById,
} from "../services/Api";
import { getAllTeachers } from "../services/Api";

const DemoManagementPage = () => {
    const token = localStorage.getItem("token");
    const [activeTab, setActiveTab] = useState("requests"); // "requests" or "batches"
    
    // Demo Requests State
    const [demoRequests, setDemoRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    
    // Demo Batches State
    const [demoBatches, setDemoBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(true);
    
    // Teachers for dropdown
    const [teachers, setTeachers] = useState([]);
    
    // Filter States
    const [batchFilter, setBatchFilter] = useState("all"); // "all", "scheduled", "completed", "cancelled"
    const [courseFilter, setCourseFilter] = useState("all"); // "all", "French", "German", "Japanese"
    
    // Search States
    const [requestSearch, setRequestSearch] = useState("");
    const [batchSearch, setBatchSearch] = useState("");
    
    // Modal States
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
    const [showViewBatchModal, setShowViewBatchModal] = useState(false);
    
    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedBatchName, setSelectedBatchName] = useState("");
    
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [batchFormData, setBatchFormData] = useState({
        demo_name: "",
        course: "",
        demo_date: "",
        start_time: "",
        end_time: "",
        tutor_id: "",
        notes: "",
    });
    const [viewBatch, setViewBatch] = useState(null);

    // Fetch demo requests
    const fetchDemoRequests = useCallback(async () => {
        try {
            setRequestsLoading(true);
            const data = await getDemoRequests("pending", null, token);
            setDemoRequests(data || []);
        } catch (err) {
            console.error("Error fetching demo requests:", err);
        } finally {
            setRequestsLoading(false);
        }
    }, [token]);

    // Fetch demo batches
    const fetchDemoBatches = useCallback(async () => {
        try {
            setBatchesLoading(true);
            const data = await getDemoBatches(null, null, null, null, token);
            setDemoBatches(data || []);
        } catch (err) {
            console.error("Error fetching demo batches:", err);
        } finally {
            setBatchesLoading(false);
        }
    }, [token]);

    // Fetch teachers
    const fetchTeachers = useCallback(async () => {
        try {
            const data = await getAllTeachers();
            setTeachers(data || []);
        } catch (err) {
            console.error("Error fetching teachers:", err);
        }
    }, []);

    useEffect(() => {
        if (!token) {
            alert("No token found. Please login.");
            return;
        }
        fetchDemoRequests();
        fetchDemoBatches();
        fetchTeachers();
    }, [token, fetchDemoRequests, fetchDemoBatches, fetchTeachers]);

    // Handle request selection
    const toggleRequestSelection = (request_id) => {
        setSelectedRequests(prev =>
            prev.includes(request_id)
                ? prev.filter(id => id !== request_id)
                : [...prev, request_id]
        );
    };

    // Handle create batch modal open
    const handleCreateBatchFromRequests = () => {
        if (selectedRequests.length === 0) {
            alert("Please select at least one demo request to create a batch");
            return;
        }
        
        // Group selected requests by course
        const selectedData = demoRequests.filter(r => selectedRequests.includes(r.demo_request_id));
        const firstRequest = selectedData[0];
        
        setBatchFormData({
            demo_name: `${firstRequest.leads.course} Demo Batch`,
            course: firstRequest.leads.course,
            demo_date: "",
            start_time: "",
            end_time: "",
            tutor_id: "",
            notes: "",
        });
        setShowCreateBatchModal(true);
    };

    // Handle create batch form submit
    const handleCreateBatch = async (e) => {
        e.preventDefault();
        try {
            const lead_ids = demoRequests
                .filter(r => selectedRequests.includes(r.demo_request_id))
                .map(r => r.lead_id);

            await createDemoBatch(
                {
                    ...batchFormData,
                    lead_ids,
                },
                token
            );
            
            alert("Demo batch created successfully!");
            setShowCreateBatchModal(false);
            setSelectedRequests([]);
            setBatchFormData({
                demo_name: "",
                course: "",
                demo_date: "",
                start_time: "",
                end_time: "",
                tutor_id: "",
                notes: "",
            });
            
            // Refresh data
            await fetchDemoRequests();
            await fetchDemoBatches();
        } catch (err) {
            console.error("Error creating demo batch:", err);
            alert(err.message || "Failed to create demo batch");
        }
    };

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

    // Filter functions
    const filteredBatches = demoBatches.filter(batch => {
        const matchesStatus = batchFilter === "all" || batch.status === batchFilter;
        const matchesCourse = courseFilter === "all" || batch.course === courseFilter;
        return matchesStatus && matchesCourse;
    });

    // Search filtering
    const displayedRequests = demoRequests.filter((request) => {
        const query = requestSearch.trim().toLowerCase();
        if (!query) return true;
        const fields = [
            request.leads?.name,
            request.leads?.email,
            request.leads?.phone,
            request.leads?.course,
            request.centers?.center_name,
            request.notes,
        ].map(v => (v || "").toString().toLowerCase());
        return fields.some(f => f.includes(query));
    });

    const displayedBatches = filteredBatches.filter((batch) => {
        const query = batchSearch.trim().toLowerCase();
        if (!query) return true;
        const tutorName = batch.tutors?.users?.name || batch.tutors?.users?.full_name || "";
        const fields = [
            batch.demo_name,
            batch.course,
            tutorName,
            batch.status,
        ].map(v => (v || "").toString().toLowerCase());
        return fields.some(f => f.includes(query));
    });

    // Get course flag emoji
    const getCourseFlag = (course) => {
        const flags = {
            "French": "🇫🇷",
            "German": "🇩🇪",
            "Japanese": "🇯🇵"
        };
        return flags[course] || "📚";
    };

    // View batch details
    const handleViewBatch = async (batch_id) => {
        try {
            const batch = await getDemoBatchById(batch_id, token);
            setViewBatch(batch);
            setShowViewBatchModal(true);
        } catch (err) {
            console.error("Error fetching batch details:", err);
            alert("Failed to fetch batch details");
        }
    };

    return (
        <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
            <Navbar />
            <div className="flex-1 lg:ml-64 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-full lg:max-w-7xl mx-auto">
                    <div className="mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-1">Demo Management</h1>
                                <p className="text-blue-100 text-sm sm:text-base">Manage requests from centers and organize demo batches</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="sticky top-0 z-20 mb-6">
                        <div className="flex space-x-1 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur rounded-xl p-1 shadow-md border border-white/50">
                        <button
                            onClick={() => setActiveTab("requests")}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                activeTab === "requests"
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                                    : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            <span className="inline-flex items-center gap-2 justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Demo Requests
                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    {demoRequests.length}
                                </span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("batches")}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                                activeTab === "batches"
                                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow"
                                    : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            <span className="inline-flex items-center gap-2 justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Demo Batches
                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                    {demoBatches.length}
                                </span>
                            </span>
                        </button>
                        </div>
                    </div>

                    {/* Demo Requests Tab */}
                    {activeTab === "requests" && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="p-4 border-b flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold flex-1">Demo Requests</h2>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={requestSearch}
                                            onChange={(e) => setRequestSearch(e.target.value)}
                                            placeholder="Search requests..."
                                            className="pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                        </svg>
                                    </div>
                                    {selectedRequests.length > 0 && (
                                        <button
                                            onClick={handleCreateBatchFromRequests}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                        >
                                            Create Batch ({selectedRequests.length})
                                        </button>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600">Showing {displayedRequests.length} of {demoRequests.length} requests</div>
                            </div>

                            {requestsLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : demoRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No demo requests found
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequests.length === displayedRequests.length && displayedRequests.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRequests(displayedRequests.map(r => r.demo_request_id));
                                                            } else {
                                                                setSelectedRequests([]);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lead Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Phone</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Center</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requested</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedRequests.map((request) => (
                                                <tr
                                                    key={request.demo_request_id}
                                                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b"
                                                >
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRequests.includes(request.demo_request_id)}
                                                            onChange={() => toggleRequestSelection(request.demo_request_id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                {(request.leads?.name || "-").charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-semibold text-gray-900 text-sm">{request.leads?.name || "-"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                                            {request.leads?.email || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                            {request.leads?.phone || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                            <span className="text-base">{getCourseFlag(request.leads?.course)}</span>
                                                            {request.leads?.course || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657A8 8 0 117.343 6.343 8 8 0 0117.657 16.657z"/></svg>
                                                            {request.centers?.center_name || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                            {formatDate(request.requested_at)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {request.notes ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                                {request.notes}
                                                            </span>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Demo Batches Tab */}
                    {activeTab === "batches" && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="p-4 border-b flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold flex-1">Demo Batches</h2>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={batchSearch}
                                            onChange={(e) => setBatchSearch(e.target.value)}
                                            placeholder="Search batches..."
                                            className="pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                        </svg>
                                    </div>
                                </div>
                                
                                {/* Filter Options */}
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-2.5 py-1.5">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                            Status
                                        </span>
                                        <select
                                            value={batchFilter}
                                            onChange={(e) => setBatchFilter(e.target.value)}
                                            className="bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border border-blue-200 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            <option value="all">All</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl px-2.5 py-1.5">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6l-2 4H6l3.5 2.5L8 17l4-2.5L16 17l-1.5-4.5L18 10h-4l-2-4z"/></svg>
                                            Course
                                        </span>
                                        <select
                                            value={courseFilter}
                                            onChange={(e) => setCourseFilter(e.target.value)}
                                            className="bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur border border-purple-200 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        >
                                            <option value="all">All</option>
                                            <option value="French">🇫🇷 French</option>
                                            <option value="German">🇩🇪 German</option>
                                            <option value="Japanese">🇯🇵 Japanese</option>
                                        </select>
                                    </div>
                                    <div className="text-sm text-gray-600 ml-auto">
                                        Showing {displayedBatches.length} of {filteredBatches.length} filtered ({demoBatches.length} total)
                                    </div>
                                </div>
                            </div>

                            {batchesLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : filteredBatches.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No demo batches found
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Demo Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Course</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tutor</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Students</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedBatches.map((batch) => (
                                                <tr
                                                    key={batch.demo_batch_id}
                                                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-blue-100">
                                                                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                            </div>
                                                            <span className="font-semibold text-gray-900 text-sm">{batch.demo_name}</span>
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
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                                            {formatDate(batch.demo_date)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                            <span className="font-medium">
                                                                {formatTime(batch.start_time)}
                                                                {batch.end_time && ` - ${formatTime(batch.end_time)}`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 10-6 0 3 3 0 006 0z"/></svg>
                                                            {batch.tutors?.users?.name || batch.tutors?.users?.full_name || "Not assigned"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStudents(batch.demo_batch_students || []);
                                                                setSelectedBatchName(batch.demo_name);
                                                                setShowStudentListModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors text-xs"
                                                            title="Click to view students"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                            {batch.demo_batch_students?.length || 0}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-1.5 rounded-full text-xs font-semibold border ${
                                                            batch.status === "scheduled" ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200" :
                                                            batch.status === "completed" ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200" :
                                                            "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                                batch.status === "scheduled" ? "bg-blue-500" :
                                                                batch.status === "completed" ? "bg-green-500" :
                                                                "bg-gray-500"
                                                            }`}></span>
                                                            {batch.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleViewBatch(batch.demo_batch_id)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium text-sm transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Batch Modal */}
            {showCreateBatchModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Create Demo Batch</h2>
                        <form onSubmit={handleCreateBatch} className="space-y-4">
                            <input
                                type="text"
                                required
                                placeholder="Demo Name"
                                className="w-full border px-3 py-2 rounded"
                                value={batchFormData.demo_name}
                                onChange={(e) =>
                                    setBatchFormData({ ...batchFormData, demo_name: e.target.value })
                                }
                            />
                            <input
                                type="text"
                                required
                                placeholder="Course"
                                className="w-full border px-3 py-2 rounded"
                                value={batchFormData.course}
                                onChange={(e) =>
                                    setBatchFormData({ ...batchFormData, course: e.target.value })
                                }
                            />
                            <input
                                type="date"
                                required
                                className="w-full border px-3 py-2 rounded"
                                value={batchFormData.demo_date}
                                onChange={(e) =>
                                    setBatchFormData({ ...batchFormData, demo_date: e.target.value })
                                }
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="time"
                                    required
                                    placeholder="Start Time"
                                    className="w-full border px-3 py-2 rounded"
                                    value={batchFormData.start_time}
                                    onChange={(e) =>
                                        setBatchFormData({ ...batchFormData, start_time: e.target.value })
                                    }
                                />
                                <input
                                    type="time"
                                    placeholder="End Time"
                                    className="w-full border px-3 py-2 rounded"
                                    value={batchFormData.end_time}
                                    onChange={(e) =>
                                        setBatchFormData({ ...batchFormData, end_time: e.target.value })
                                    }
                                />
                            </div>
                            <select
                                required
                                className="w-full border px-3 py-2 rounded"
                                value={batchFormData.tutor_id}
                                onChange={(e) =>
                                    setBatchFormData({ ...batchFormData, tutor_id: e.target.value })
                                }
                            >
                                <option value="">Select Tutor</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                                        {teacher.teacher_name || teacher.name || "Unknown"}
                                    </option>
                                ))}
                            </select>
                            <textarea
                                rows={3}
                                placeholder="Notes (optional)"
                                className="w-full border px-3 py-2 rounded"
                                value={batchFormData.notes}
                                onChange={(e) =>
                                    setBatchFormData({ ...batchFormData, notes: e.target.value })
                                }
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateBatchModal(false)}
                                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Create Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Batch Modal */}
            {showViewBatchModal && viewBatch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{viewBatch.demo_name}</h2>
                            <button
                                onClick={() => setShowViewBatchModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium text-gray-700">Course:</span>
                                    <span className="ml-2">{viewBatch.course}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Date:</span>
                                    <span className="ml-2">{formatDate(viewBatch.demo_date)}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Time:</span>
                                    <span className="ml-2">
                                        {formatTime(viewBatch.start_time)}
                                        {viewBatch.end_time && ` - ${formatTime(viewBatch.end_time)}`}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Tutor:</span>
                                    <span className="ml-2">{viewBatch.tutors?.users?.name || viewBatch.tutors?.users?.full_name || "Not assigned"}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Status:</span>
                                    <span className="ml-2">{viewBatch.status}</span>
                                </div>
                                {viewBatch.class_link && (
                                    <div>
                                        <span className="font-medium text-gray-700">Class Link:</span>
                                        <a
                                            href={viewBatch.class_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {viewBatch.class_link}
                                        </a>
                                    </div>
                                )}
                            </div>
                            {viewBatch.notes && (
                                <div>
                                    <span className="font-medium text-gray-700">Notes:</span>
                                    <p className="mt-1 text-gray-600">{viewBatch.notes}</p>
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold mb-2">Students ({viewBatch.demo_batch_students?.length || 0})</h3>
                                <div className="space-y-2">
                                    {viewBatch.demo_batch_students?.map((student, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded">
                                            <div className="font-medium">{student.leads?.name}</div>
                                            <div className="text-sm text-gray-600">
                                                {student.leads?.email} | {student.leads?.phone}
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">Attendance:</span>
                                                <span className="ml-1">{student.attendance_status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                        
                        <div className="space-y-3">
                            {selectedStudents.length > 0 ? (
                                selectedStudents.map((student, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition">
                                        <div className="space-y-2">
                                            <div className="font-medium text-lg">
                                                {student.leads?.name || "N/A"}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <span className="mr-4">
                                                    📧 {student.leads?.email || "N/A"}
                                                </span>
                                                <span>
                                                    📱 {student.leads?.phone || "N/A"}
                                                </span>
                                            </div>
                                            {student.leads?.course && (
                                                <div className="text-sm text-gray-600">
                                                    📚 Course: {student.leads.course}
                                                </div>
                                            )}
                                            {student.leads?.centers?.center_name && (
                                                <div className="text-sm text-gray-600">
                                                    📍 Center: {student.leads.centers.center_name}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Attendance:
                                                    </span>
                                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                                        student.attendance_status === "present"
                                                            ? "bg-green-100 text-green-700"
                                                            : student.attendance_status === "absent"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                        {student.attendance_status?.toUpperCase() || "PENDING"}
                                                    </span>
                                                </div>
                                            </div>
                                            {student.note && (
                                                <div className="text-sm text-gray-600 mt-2 pt-2 border-t">
                                                    <span className="font-medium">Note:</span> {student.note}
                                                </div>
                                            )}
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
    );
};

export default DemoManagementPage;
