import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { Users, Plus, X, UploadCloud, Mail, Phone, Tag, Globe, FileText } from "lucide-react";
import CenterHeader from "../components/CenterHeader";
import { getAllLeads, createLead, updateLeadStatus, getLeadDemoDetails, getDemoBatches, uploadLeadsCSV } from "../services/Api";

const CentersLeadsPage = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [csvUploadMessage, setCsvUploadMessage] = useState("");
    const [csvUploadLoading, setCsvUploadLoading] = useState(false);
    const [csvValidationErrors, setCsvValidationErrors] = useState([]);
    const [csvDuplicates, setCsvDuplicates] = useState([]);
    const [csvValidRows, setCsvValidRows] = useState(null);
    const [leadDemoDetails, setLeadDemoDetails] = useState({});
    const [showStudentListModal, setShowStudentListModal] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedBatchName, setSelectedBatchName] = useState("");
    const [currentDemo, setCurrentDemo] = useState(null);
    const [currentCenterStudents, setCurrentCenterStudents] = useState([]);
    const [comingSoon, setComingSoon] = useState(false);
    // Tab counts
    const afterGroupStatuses = ["enrolled", "lost_lead", "closed_lead", "junk_lead"];
    const beforeCount = (leads || []).filter(l => l.status !== "demo_schedule" && !afterGroupStatuses.includes(l.status)).length;
    const scheduledCount = (leads || []).filter(l => l.status === "demo_schedule").length;
    const afterCount = (leads || []).filter(l => afterGroupStatuses.includes(l.status)).length;
    const [expandedLeads, setExpandedLeads] = useState(new Set());
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        source: "",
        remark: "",
        course: "",
    });
    // Tabs and search
    const [activeTab, setActiveTab] = useState("before"); // before | scheduled | after
    const [searchQuery, setSearchQuery] = useState("");

    const token = localStorage.getItem("token");

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    // ✅ Fetch leads
    const fetchLeadsHandler = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getAllLeads(token);
            setLeads(result || []);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setError("No token found. Please login.");
            return;
        }
        fetchLeadsHandler();
    }, [fetchLeadsHandler, token]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.course || !formData.source) {
                alert("Please select both language and lead source.");
                return;
            }

            await createLead(formData, token);
            await fetchLeadsHandler();
            alert("Lead created successfully!");
            setShowModal(false);
            setFormData({
                name: "",
                email: "",
                phone: "",
                source: "",
                remark: "",
                course: "",
            });
        } catch (err) {
            console.error(err);
            alert(err.message || "Something went wrong. Please try again.");
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await updateLeadStatus(id, status, token);
            await fetchLeadsHandler();
            await fetchCenterDemoHeader();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    // ✅ CSV Upload Handler
    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setCsvUploadLoading(true);
            setCsvUploadMessage("");
            setCsvValidationErrors([]);
            setCsvDuplicates([]);
            setCsvValidRows(null);

            const res = await uploadLeadsCSV(file, false, null, token);

            if (res?.status === "validation_errors") {
                // Validation errors found
                setCsvValidationErrors(res.errors || []);
                setCsvUploadMessage(`❌ Found ${res.errors?.length || 0} validation error(s). Please fix them and try again.`);
                setCsvValidRows(res.validRows || null);
            } else if (res?.status === "duplicate_found") {
                // Duplicates found
                setCsvDuplicates(res.duplicates || []);
                setCsvValidRows(res.validRows || null);
                setCsvUploadMessage(
                    `⚠️ Found ${res.duplicateCount || 0} duplicate(s). ${res.validCount || 0} valid row(s) ready to insert.`
                );
            } else if (res?.status === "ok") {
                // Success - all rows inserted
                setCsvUploadMessage(`✅ ${res.inserted || 0} leads uploaded successfully!`);
                await fetchLeadsHandler();
                setTimeout(() => {
                    setShowCSVModal(false);
                    setCsvUploadMessage("");
                    setCsvValidationErrors([]);
                    setCsvDuplicates([]);
                    setCsvValidRows(null);
                }, 2000);
            } else {
                setCsvUploadMessage(`❌ ${res.message || "Upload failed. Check your CSV format."}`);
            }
        } catch (err) {
            console.error("Upload error:", err);
            setCsvUploadMessage(`❌ Upload failed: ${err.message || "Please try again."}`);
        } finally {
            setCsvUploadLoading(false);
        }
    };

    // ✅ Handle skip duplicates and insert
    const handleSkipDuplicatesAndInsert = async () => {
        if (!csvValidRows || csvValidRows.length === 0) {
            alert("No valid rows to insert");
            return;
        }

        try {
            setCsvUploadLoading(true);
            const res = await uploadLeadsCSV(null, true, csvValidRows, token);

            if (res?.status === "ok") {
                setCsvUploadMessage(`✅ ${res.inserted || 0} leads inserted successfully (duplicates skipped)!`);
                await fetchLeadsHandler();
                setTimeout(() => {
                    setShowCSVModal(false);
                    setCsvUploadMessage("");
                    setCsvValidationErrors([]);
                    setCsvDuplicates([]);
                    setCsvValidRows(null);
                }, 2000);
            } else {
                setCsvUploadMessage(`❌ Failed to insert: ${res.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Insert error:", err);
            setCsvUploadMessage(`❌ Insert failed: ${err.message || "Please try again."}`);
        } finally {
            setCsvUploadLoading(false);
        }
    };

    // ✅ Fetch demo details for a specific lead
    const fetchLeadDemoDetails = async (lead_id) => {
        try {
            if (leadDemoDetails[lead_id]) {
                // Already fetched, just toggle display
                toggleLeadExpansion(lead_id);
                return;
            }

            const details = await getLeadDemoDetails(lead_id, token);
            setLeadDemoDetails(prev => ({ ...prev, [lead_id]: details }));
            toggleLeadExpansion(lead_id);
        } catch (err) {
            console.error("Error fetching demo details:", err);
        }
    };

    // ✅ Toggle lead expansion
    const toggleLeadExpansion = (lead_id) => {
        setExpandedLeads(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lead_id)) {
                newSet.delete(lead_id);
            } else {
                newSet.add(lead_id);
            }
            return newSet;
        });
    };

    // ✅ Format time
    const formatTime = (timeString) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // ✅ Build the demo header for this center by matching batch students to our leads
    const fetchCenterDemoHeader = useCallback(async () => {
        try {
            const batches = await getDemoBatches(null, null, null, null, token);
            const leadIdSet = new Set((leads || []).map(l => l.lead_id));
            if (!batches || batches.length === 0 || leadIdSet.size === 0) {
                setCurrentDemo(null);
                setCurrentCenterStudents([]);
                return;
            }

            // Filter batches that include at least one of our center's leads
            const centerBatches = batches.filter(b => Array.isArray(b.demo_batch_students) && b.demo_batch_students.some(s => leadIdSet.has(s.lead_id)));

            if (centerBatches.length === 0) {
                setCurrentDemo(null);
                setCurrentCenterStudents([]);
                setComingSoon(true);
                return;
            }

            const now = new Date();
            const getRange = (batch) => {
                const start = new Date(batch.demo_date);
                if (batch.start_time) {
                    const [hs, ms] = batch.start_time.split(":");
                    start.setHours(parseInt(hs), parseInt(ms), 0, 0);
                } else {
                    start.setHours(0, 0, 0, 0);
                }
                const end = new Date(batch.demo_date);
                if (batch.end_time) {
                    const [he, me] = batch.end_time.split(":");
                    end.setHours(parseInt(he), parseInt(me), 0, 0);
                } else if (batch.start_time) {
                    const [hs2, ms2] = batch.start_time.split(":");
                    end.setHours(parseInt(hs2) + 1, parseInt(ms2), 0, 0);
                } else {
                    end.setHours(23, 59, 59, 999);
                }
                return { start, end };
            };

            // Only consider scheduled batches whose end is in the future
            const upcoming = centerBatches
                .filter(b => b.status === "scheduled")
                .map(b => ({ b, r: getRange(b) }))
                .filter(({ r }) => r.end >= now)
                .sort((a, b) => a.r.start - b.r.start);

            let chosen = upcoming.length > 0 ? upcoming[0].b : null;
            setComingSoon(!chosen);

            if (!chosen) {
                setCurrentDemo(null);
                setCurrentCenterStudents([]);
                setComingSoon(true);
                return;
            }

            // Center-specific students = only students in this batch who are part of our leads list
            const centerStudents = chosen.demo_batch_students.filter(s => leadIdSet.has(s.lead_id));
            setCurrentDemo(chosen);
            setCurrentCenterStudents(centerStudents);
        } catch (e) {
            // Non-blocking
            // console.error("Error building center demo header", e);
            setCurrentDemo(null);
            setCurrentCenterStudents([]);
        }
    }, [leads, token]);

    // Refresh header when leads load or change
    useEffect(() => {
        if (leads && leads.length > 0) {
            fetchCenterDemoHeader();
        } else {
            setCurrentDemo(null);
            setCurrentCenterStudents([]);
        }
    }, [leads, fetchCenterDemoHeader]);

    // Optional lightweight polling to reflect teacher status updates
    useEffect(() => {
        const id = setInterval(() => {
            if (leads && leads.length > 0) {
                fetchCenterDemoHeader();
            }
        }, 30000); // 30s
        return () => clearInterval(id);
    }, [leads, fetchCenterDemoHeader]);

    return (
        <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
            <Navbar />
        <div className="flex-1 lg:ml-64 overflow-y-auto">
            <CenterHeader 
                title="Center Leads" 
                subtitle={`Total Leads: ${leads.length}`} 
                icon={Users}
            />
            
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-full lg:max-w-7xl mx-auto">
                    {/* Actions Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-3 mb-6">
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Lead
                        </button>
                        <button
                            onClick={() => setShowCSVModal(true)}
                            className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload CSV
                        </button>
                    </div>

                    

                    {/* Demo Header Banner */}
                    {currentDemo ? (
                        <div className="mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-lg p-4 text-white">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{currentDemo.demo_name}</div>
                                        <div className="text-blue-100 text-sm flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatDate(currentDemo.demo_date)} • {formatTime(currentDemo.start_time)}{currentDemo.end_time ? ` - ${formatTime(currentDemo.end_time)}` : ""}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {currentDemo.class_link ? (
                                        <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <a href={currentDemo.class_link} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[220px]">
                                                {currentDemo.class_link}
                                            </a>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(currentDemo.class_link); }}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white bg-opacity-20 hover:bg-opacity-30 text-xs"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8M8 16a2 2 0 01-2-2V6a2 2 0 012-2h8m-8 12l-3 3m0 0l3 3m-3-3h12"/></svg>
                                                Copy
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-blue-100">No class link added yet</span>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSelectedStudents(currentCenterStudents);
                                            setSelectedBatchName(currentDemo.demo_name || "Demo Batch");
                                            setShowStudentListModal(true);
                                        }}
                                        className="inline-flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-2 text-sm hover:bg-opacity-20"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                        Students: {currentCenterStudents.length}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : comingSoon ? (
                        <div className="mb-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl shadow p-4">
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="p-2 bg-white rounded-xl border">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-semibold">Demo class coming soon</div>
                                    <div className="text-sm text-gray-600">Your next demo will appear here once scheduled.</div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Search - now shown after the banner */}
                    <div className="mb-4 flex justify-center">
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, phone, course..."
                                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                        </div>
                    </div>

                    {/* Tabs - now shown after the banner */}
                    <div className="mb-4 flex justify-center">
                        <div className="inline-flex rounded-xl p-1 shadow border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                            <button
                                onClick={() => setActiveTab("before")}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${activeTab === "before" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-gray-700 hover:bg-white"}`}
                            >
                                <span>Before Demo</span>
                                <span className={`${activeTab === "before" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"} px-2 py-0.5 rounded-full text-xs font-bold`}>{beforeCount}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("scheduled")}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${activeTab === "scheduled" ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow" : "text-gray-700 hover:bg-white"}`}
                            >
                                <span>Demo Scheduled</span>
                                <span className={`${activeTab === "scheduled" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"} px-2 py-0.5 rounded-full text-xs font-bold`}>{scheduledCount}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("after")}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${activeTab === "after" ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow" : "text-gray-700 hover:bg-white"}`}
                            >
                                <span>After Demo</span>
                                <span className={`${activeTab === "after" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"} px-2 py-0.5 rounded-full text-xs font-bold`}>{afterCount}</span>
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 text-red-700 border-l-4 border-red-500 p-4 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden w-full">
                            <div className="overflow-x-auto rounded-md border border-gray-200 w-full">
                                <table className="w-full min-w-[800px] table-auto text-sm">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Name</th>
                                            <th className="px-4 py-3 text-left">Email</th>
                                            <th className="px-4 py-3 text-left">Phone</th>
                                            <th className="px-4 py-3 text-left">Course</th>
                                            <th className="px-4 py-3 text-left">Source</th>
                                            <th className="px-4 py-3 text-left">Remarks</th>
                                            <th className="px-4 py-3 text-left">Created</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const afterStatuses = ["enrolled", "lost_lead", "closed_lead", "junk_lead"];
                                            let tabFiltered = leads;
                                            if (activeTab === "before") {
                                                tabFiltered = leads.filter(l => l.status !== "demo_schedule" && !afterStatuses.includes(l.status));
                                            } else if (activeTab === "scheduled") {
                                                tabFiltered = leads.filter(l => l.status === "demo_schedule");
                                            } else if (activeTab === "after") {
                                                tabFiltered = leads.filter(l => afterStatuses.includes(l.status));
                                            }
                                            const q = searchQuery.trim().toLowerCase();
                                            const filteredLeads = q
                                                ? tabFiltered.filter(l => [l.name, l.email, l.phone, l.course].some(v => (v || "").toLowerCase().includes(q)))
                                                : tabFiltered;

                                            if (filteredLeads.length === 0) {
                                                return (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="text-center py-6 text-gray-500"
                                                >
                                                    No leads found
                                                </td>
                                            </tr>
                                            );
                                            }
                                            return filteredLeads.map((lead) => (
                                                <React.Fragment key={lead.lead_id}>
                                                    <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                                    {lead.name?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                                <span className="font-semibold text-gray-900 text-sm">{lead.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                                                {lead.email}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                                {lead.phone}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                                {lead.course}
                                                            </span>
                                                        </td>
                                                    <td className="px-4 py-3">{lead.source}</td>
                                                    <td className="px-4 py-3">{lead.remark || "-"}</td>
                                                    <td className="px-4 py-3">
                                                        {lead.created_at
                                                            ? formatDate(lead.created_at)
                                                            : "-"}
                                                    </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col sm:flex-row gap-2 items-start">
                                                        <select
                                                            value={lead.status}
                                                            onChange={(e) =>
                                                                handleStatusChange(
                                                                    lead.lead_id,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className={`px-2 py-1 rounded text-xs font-semibold w-full
                                ${lead.status === "enrolled"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : lead.status === "lost_lead"
                                                                        ? "bg-red-100 text-red-700"
                                                                        : lead.status === "demo_schedule"
                                                                            ? "bg-blue-100 text-blue-700"
                                                                            : lead.status === "interested"
                                                                                ? "bg-yellow-100 text-yellow-700"
                                                                                : lead.status === "closed_lead"
                                                                                    ? "bg-gray-300 text-gray-800"
                                                                                    : "bg-gray-100 text-gray-700"
                                                                }`}
                                                        >
                                                            <option value="data_entry">Data Entry</option>
                                                            <option value="not_connected_1">
                                                                Not Connected 1
                                                            </option>
                                                            <option value="not_connected_2">
                                                                Not Connected 2
                                                            </option>
                                                            <option value="not_connected_3">
                                                                Not Connected 3
                                                            </option>
                                                            <option value="interested">Interested</option>
                                                            <option value="need_follow">
                                                                Need Follow-up
                                                            </option>
                                                            <option value="demo_schedule">
                                                                Demo Schedule
                                                            </option>
                                                            <option value="junk_lead">Junk Lead</option>
                                                            <option value="lost_lead">Lost Lead</option>
                                                            <option value="enrolled">Enrolled</option>
                                                            <option value="closed_lead">Closed Lead</option>
                                                        </select>

                                                        {lead.status === "closed_lead" && (
                                                            <button
                                                                onClick={() => setShowRegisterModal(true)}
                                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mt-1 sm:mt-0"
                                                            >
                                                                Convert to Student
                                                            </button>
                                                        )}

                                                                {(lead.status === "demo_schedule" || lead.demo_link) && (
                                                                    <button
                                                                        onClick={() => fetchLeadDemoDetails(lead.lead_id)}
                                                                        className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 mt-1 sm:mt-0"
                                                                    >
                                                                        {expandedLeads.has(lead.lead_id) ? "Hide" : "View"} Demo
                                                                    </button>
                                                                )}
                                                            </div>
                                                    </td>
                                                </tr>
                                                    
                                                    {/* Demo Details Row */}
                                                    {expandedLeads.has(lead.lead_id) && leadDemoDetails[lead.lead_id] && (
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-4 bg-purple-50">
                                                                <div className="space-y-3">
                                                                    <h4 className="font-semibold text-purple-800 mb-2">
                                                                        Demo Details
                                                                    </h4>
                                                                    {leadDemoDetails[lead.lead_id].length > 0 ? (
                                                                        leadDemoDetails[lead.lead_id].map((demo, idx) => (
                                                                            <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Demo Name:</span>
                                                                                        <span className="ml-2">{demo.demo_batches?.demo_name || "N/A"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Date:</span>
                                                                                        <span className="ml-2">{demo.demo_batches?.demo_date ? formatDate(demo.demo_batches.demo_date) : "N/A"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Time:</span>
                                                                                        <span className="ml-2">{demo.demo_batches?.start_time ? formatTime(demo.demo_batches.start_time) : "N/A"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Tutor:</span>
                                                                                        <span className="ml-2">{demo.demo_batches?.tutors?.users?.name || demo.demo_batches?.tutors?.users?.full_name || "N/A"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Status:</span>
                                                                                        <span className="ml-2">{demo.demo_batches?.status || "N/A"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-gray-700">Attendance:</span>
                                                                                        <span className="ml-2">{demo.attendance_status || "Pending"}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {demo.demo_batches?.class_link && (
                                                                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                                                                        <div className="flex flex-wrap items-center gap-3">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="font-medium text-gray-700">Class Link:</span>
                                                                                                <a 
                                                                                                    href={demo.demo_batches.class_link} 
                                                                                                    target="_blank" 
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-blue-600 hover:text-blue-800 underline break-all"
                                                                                                >
                                                                                                    {demo.demo_batches.class_link}
                                                                                                </a>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    navigator.clipboard.writeText(demo.demo_batches.class_link);
                                                                                                    alert("Link copied");
                                                                                                }}
                                                                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 text-xs"
                                                                                            >
                                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8M8 16a2 2 0 01-2-2V6a2 2 0 012-2h8m-8 12l-3 3m0 0l3 3m-3-3h12"/></svg>
                                                                                                Copy Link
                                                                                            </button>

                                                                                            {/* Center-specific student count */}
                                                                                            {(() => {
                                                                                                // Find this lead in the batch to extract center_id
                                                                                                const me = (demo.demo_batches?.demo_batch_students || []).find(s => s.lead_id === lead.lead_id);
                                                                                                const myCenterId = me?.leads?.centers?.center_id;
                                                                                                const centerStudents = (demo.demo_batches?.demo_batch_students || []).filter(s => s.leads?.centers?.center_id === myCenterId);
                                                                                                const count = centerStudents.length;
                                                                                                return (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            setSelectedStudents(centerStudents);
                                                                                                            setSelectedBatchName(demo.demo_batches?.demo_name || "Demo Batch");
                                                                                                            setShowStudentListModal(true);
                                                                                                        }}
                                                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 text-xs"
                                                                                                        title="Click to view students from your center"
                                                                                                    >
                                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                                                                                        {count}
                                                                                                    </button>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-gray-500 text-sm italic">
                                                                            No demo information available yet. Demo will appear here once scheduled by Academic Admin.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ Student Register Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] shadow-lg flex flex-col">
                        <div className="flex justify-between items-center px-4 py-2 border-b">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Student Registration
                            </h2>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1">
                            <iframe
                                src="https://studentportal.iypan.com/register"
                                title="Student Register"
                                className="w-full h-full rounded-b-lg"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}

        {/* ✅ Center Students List Modal */}
        {showStudentListModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">{selectedBatchName}</h2>
                            <p className="text-sm text-gray-600 mt-1">Students ({selectedStudents.length})</p>
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
                                    <div className="space-y-1">
                                        <div className="font-medium text-lg">{student.leads?.name || "N/A"}</div>
                                        {student.leads?.centers?.center_name && (
                                            <div className="text-sm text-gray-600">📍 Center: {student.leads.centers.center_name}</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">No students found.</div>
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

            {/* ✅ Add Lead Side Drawer - BERRY Style */}
            <div 
                className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
                    showModal ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setShowModal(false)}
                ></div>
                
                {/* Panel */}
                <div 
                    className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[28rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
                        showModal ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Add New Lead</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Drawer Body */}
                    <div className="p-6 flex-1 overflow-y-auto">
                        <form id="add-lead-form" onSubmit={handleFormSubmit} className="space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Users className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter lead name"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter email address"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Enter phone number"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Language Course</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Globe className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 appearance-none"
                                        value={formData.course}
                                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                                    >
                                        <option value="">Choose language</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Japanese">Japanese</option>
                                    </select>
                                </div>
                            </div>

                            {/* Lead Source */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Tag className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 appearance-none"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        <option value="">Choose source</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Website">Website</option>
                                        <option value="Google">Google</option>
                                        <option value="Justdial">Justdial</option>
                                        <option value="Associate Reference">Associate Reference</option>
                                        <option value="Student Reference">Student Reference</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="ISML Leads">ISML Leads</option>
                                    </select>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none">
                                        <FileText className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <textarea
                                        rows={3}
                                        placeholder="Add any additional notes..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        value={formData.remark}
                                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    {/* Drawer Footer */}
                    <div className="p-6 border-t border-gray-200 flex-shrink-0">
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-lead-form"
                                type="submit"
                                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition duration-200"
                                style={{ backgroundColor: '#2196f3' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor='#1976d2'}
                                onMouseLeave={(e) => e.target.style.backgroundColor='#2196f3'}
                            >
                                Submit Lead
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ CSV Upload Side Drawer - BERRY Style */}
            <div 
                className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
                    showCSVModal ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setShowCSVModal(false)}
                ></div>
                
                {/* Panel */}
                <div 
                    className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[32rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
                        showCSVModal ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #4caf50, #388e3c)' }}>
                                    <UploadCloud className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Upload Leads CSV</h2>
                            </div>
                            <button
                                onClick={() => setShowCSVModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Drawer Body */}
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Format Guide */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                                <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4" />
                                    CSV Format Requirements
                                </h3>
                                <ul className="space-y-2 text-sm text-emerald-800">
                                    <li className="flex gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                        <span><strong>Required Columns:</strong> name, phone, course, source</span>
                                    </li>
                                    <li className="flex gap-2 text-xs opacity-75 mt-2 italic bg-white/50 p-2 rounded">
                                        Example: name,phone,course,source...
                                    </li>
                                </ul>
                            </div>

                            {/* Template Link - Moved above upload section */}
                            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Need the format?</p>
                                <a 
                                    href="/leads-template.csv" 
                                    download 
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-100 rounded-xl text-blue-700 font-bold text-sm hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm w-full justify-center"
                                >
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Download Starter Template
                                </a>
                            </div>

                            {/* File Picker */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Select File</label>
                                <label className="relative group cursor-pointer block">
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        onChange={handleCSVUpload}
                                        disabled={csvUploadLoading}
                                        className="hidden" 
                                    />
                                    <div className="w-full py-10 px-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 group-hover:bg-emerald-50 group-hover:border-emerald-500 transition-all text-center">
                                        <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-emerald-500 mx-auto mb-3 transition-colors" />
                                        <p className="text-sm font-bold text-gray-700">Click to Browse or Drag & Drop</p>
                                        <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB (CSV only)</p>
                                    </div>
                                </label>
                            </div>

                            {/* Status Messages */}
                            {(csvUploadLoading || csvUploadMessage) && (
                                <div className="space-y-4">
                                    {csvUploadLoading && (
                                        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-3"></div>
                                            <span className="text-sm font-bold text-gray-700">Processing file...</span>
                                        </div>
                                    )}

                                    {csvUploadMessage && (
                                        <div className={`p-4 rounded-xl border flex gap-3 ${
                                            csvUploadMessage.includes("✅") ? "bg-green-50 border-green-200 text-green-800" :
                                            csvUploadMessage.includes("⚠️") ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
                                            "bg-red-50 border-red-200 text-red-800"
                                        }`}>
                                            <div className="shrink-0 pt-0.5">
                                                {csvUploadMessage.includes("✅") ? <Users className="w-5 h-5" /> : 
                                                 csvUploadMessage.includes("⚠️") ? <Users className="w-5 h-5" /> : 
                                                 <Users className="w-5 h-5" />}
                                            </div>
                                            <p className="text-sm font-bold leading-snug">{csvUploadMessage}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Details */}
                            {csvValidationErrors.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                                        <X className="w-4 h-4" />
                                        Validation Failures
                                    </h4>
                                    <div className="bg-red-50 rounded-xl p-3 max-h-40 overflow-y-auto border border-red-100">
                                        {csvValidationErrors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-800 py-1 border-b border-red-100 last:border-0">• {err}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Duplicates Handler */}
                            {csvDuplicates.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-yellow-700">Existing Leads Identified</h4>
                                    <div className="bg-yellow-50 rounded-xl p-3 max-h-40 overflow-y-auto border border-yellow-100">
                                        {csvDuplicates.map((dup, i) => (
                                            <p key={i} className="text-xs text-yellow-800 py-1 border-b border-yellow-100 last:border-0">• {dup}</p>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleSkipDuplicatesAndInsert}
                                        disabled={csvUploadLoading}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                                    >
                                        Skip Duplicates & Save {csvValidRows?.length || 0} Leads
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                    
                    {/* Drawer Footer */}
                    <div className="p-6 border-t border-gray-200 flex-shrink-0">
                        <button
                            onClick={() => setShowCSVModal(false)}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                        >
                            Close Drawer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default CentersLeadsPage;
