import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { getOfflineCenters, getLeadsByCenter } from "../services/Api";

const AllLeadsPage = () => {
    const [centers, setCenters] = useState([]);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [centerLeads, setCenterLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLead, setSelectedLead] = useState(null);
    const [showLeadDetails, setShowLeadDetails] = useState(false);

    const token = localStorage.getItem("token");

    const formatDate = (dateString) =>
        dateString
            ? new Date(dateString).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
              })
            : "N/A";

    // Fetch offline centers
    const fetchOfflineCenters = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getOfflineCenters(token);
            setCenters(data || []);
        } catch (err) {
            setError(err.message || "Failed to fetch offline centers");
            console.error("Error fetching offline centers:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Fetch leads for a center
    const fetchCenterLeads = useCallback(async (centerId) => {
        if (!centerId || centerId === "null" || centerId === "undefined") {
            setError("Invalid center ID. Please select a valid center.");
            setCenterLeads([]);
            return;
        }
        try {
            setLeadsLoading(true);
            setError(null);
            const leads = await getLeadsByCenter(centerId, token);
            setCenterLeads(leads || []);
        } catch (err) {
            setError(err.message || "Failed to fetch leads");
            console.error("Error fetching center leads:", err);
            setCenterLeads([]);
        } finally {
            setLeadsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setError("No token found. Please login.");
            return;
        }
        fetchOfflineCenters();
    }, [token, fetchOfflineCenters]);

    const handleCenterClick = (center) => {
        if (!center || !center.center_id) {
            setError("Invalid center data. Please try again.");
            return;
        }
        setSelectedCenter(center);
        setSearchQuery("");
        fetchCenterLeads(center.center_id);
    };

    const handleBackToCenters = () => {
        setSelectedCenter(null);
        setCenterLeads([]);
        setSearchQuery("");
        setSelectedLead(null);
        setShowLeadDetails(false);
    };

    const handleLeadClick = (lead) => {
        setSelectedLead(lead);
        setShowLeadDetails(true);
    };

    const filteredCenters = centers.filter((center) =>
        center.center_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLeads = centerLeads.filter((lead) => {
        const query = searchQuery.toLowerCase();
        return (
            lead.name?.toLowerCase().includes(query) ||
            lead.phone?.toString().includes(query) ||
            lead.email?.toLowerCase().includes(query) ||
            lead.course?.toLowerCase().includes(query) ||
            lead.status?.toLowerCase().includes(query)
        );
    });

    // Center List View
    if (!selectedCenter) {
        return (
            <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
                <Navbar />
                <div className="flex-1 lg:ml-64 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-full lg:max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                All Leads - Offline Centers
                            </h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                    Total Centers: {centers.length}
                                </span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="mb-4 flex justify-center">
                            <div className="relative w-full max-w-md">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search centers..."
                                    className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                                </svg>
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
                        ) : filteredCenters.length === 0 ? (
                            <div className="bg-white shadow-md rounded-lg overflow-hidden p-8 text-center">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-gray-600">
                                    {searchQuery ? `No centers found matching "${searchQuery}"` : "No offline centers found"}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCenters.map((center) => (
                                    <div
                                        key={center.center_id}
                                        onClick={() => handleCenterClick(center)}
                                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 cursor-pointer border border-gray-200 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {center.center_name?.charAt(0)?.toUpperCase() || "C"}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {center.center_name}
                                        </h3>
                                        {center.state_name && (
                                            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {center.state_name}
                                            </p>
                                        )}
                                        {center.center_admin_name && (
                                            <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {center.center_admin_name}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Center Leads View
    const getStatusBadgeColor = (status) => {
        const statusColors = {
            data_entry: "bg-gray-100 text-gray-800",
            not_connected_1: "bg-yellow-100 text-yellow-800",
            not_connected_2: "bg-yellow-100 text-yellow-800",
            not_connected_3: "bg-yellow-100 text-yellow-800",
            interested: "bg-blue-100 text-blue-800",
            need_follow: "bg-purple-100 text-purple-800",
            junk_lead: "bg-red-100 text-red-800",
            demo_schedule: "bg-indigo-100 text-indigo-800",
            lost_lead: "bg-orange-100 text-orange-800",
            enrolled: "bg-green-100 text-green-800",
            closed_lead: "bg-gray-100 text-gray-800",
        };
        return statusColors[status] || "bg-gray-100 text-gray-800";
    };

    const formatStatus = (status) => {
        return status
            ?.split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ") || "N/A";
    };

    return (
        <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
            <Navbar />
            <div className="flex-1 lg:ml-64 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-full lg:max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                        <div>
                            <button
                                onClick={handleBackToCenters}
                                className="flex items-center text-blue-600 hover:text-blue-800 mb-2 text-sm font-medium"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Centers
                            </button>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                Leads - {selectedCenter.center_name}
                            </h1>
                            <p className="text-gray-600 text-sm">
                                All leads created by this center (New and Old)
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                Total Leads: {centerLeads.length}
                            </span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative w-full max-w-md">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search leads by name, phone, email, course, or status..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 text-red-700 border-l-4 border-red-500 p-4 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {leadsLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden p-8 text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-gray-600">
                                {searchQuery
                                    ? `No leads found matching "${searchQuery}"`
                                    : "No leads found for this center"}
                            </p>
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
                                        {filteredLeads.map((lead) => (
                                            <tr
                                                key={lead.lead_id}
                                                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 border-b"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {lead.name?.charAt(0)?.toUpperCase() || "L"}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 text-sm">{lead.name || "N/A"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        {lead.email || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        {lead.phone || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                        {lead.course || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.source || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{lead.remark || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {formatDate(lead.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-2 items-start">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-semibold w-full text-center
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
                                                            {lead.status
                                                                ?.split("_")
                                                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                                .join(" ") || "N/A"}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleLeadClick(lead);
                                                            }}
                                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors w-full"
                                                        >
                                                            View Details
                                                        </button>
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
            </div>

            {/* Lead Details Modal */}
            {showLeadDetails && selectedLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Lead Details</h2>
                                <button
                                    onClick={() => {
                                        setShowLeadDetails(false);
                                        setSelectedLead(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name
                                    </label>
                                    <p className="text-gray-900">{selectedLead.name || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <p className="text-gray-900">{selectedLead.phone || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <p className="text-gray-900">{selectedLead.email || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Course
                                    </label>
                                    <p className="text-gray-900">{selectedLead.course || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Source
                                    </label>
                                    <p className="text-gray-900">{selectedLead.source || "N/A"}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                                            selectedLead.status
                                        )}`}
                                    >
                                        {formatStatus(selectedLead.status)}
                                    </span>
                                </div>

                                {selectedLead.remark && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remark
                                        </label>
                                        <p className="text-gray-900">{selectedLead.remark}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Created At
                                    </label>
                                    <p className="text-gray-900">
                                        {formatDate(selectedLead.created_at)}
                                    </p>
                                </div>

                                {selectedLead.updated_at && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Updated
                                        </label>
                                        <p className="text-gray-900">
                                            {formatDate(selectedLead.updated_at)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => {
                                        setShowLeadDetails(false);
                                        setSelectedLead(null);
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllLeadsPage;
