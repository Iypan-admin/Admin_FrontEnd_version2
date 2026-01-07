import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
    getPendingGiveaways,
    approveGiveaway,
    declineGiveaway,
} from "../services/Api";

const GiveawayApprovalPage = () => {
    const [giveaways, setGiveaways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Search & filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // all | success | approved | declined

    const loadPendingGiveaways = async () => {
        try {
            setLoading(true);
            const data = await getPendingGiveaways();
            setGiveaways(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error loading giveaways:", error);
            setGiveaways([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this giveaway?")) return;
        try {
            setActionLoading(id);
            const response = await approveGiveaway(id);
            alert(`✅ ${response?.message || "Giveaway approved successfully!"}`);
            await loadPendingGiveaways();
        } catch (err) {
            console.error(`Approval failed [ID: ${id}]:`, err);
            alert(`❌ Failed to approve giveaway: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (id) => {
        if (!window.confirm("Are you sure you want to decline this giveaway?")) return;
        try {
            setActionLoading(id);
            const response = await declineGiveaway(id);
            alert(`🚫 ${response?.message || "Giveaway declined successfully!"}`);
            await loadPendingGiveaways();
        } catch (err) {
            console.error(`Decline failed [ID: ${id}]:`, err);
            alert(`❌ Failed to decline giveaway: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        loadPendingGiveaways();
    }, []);


    // Filter & search logic
    const filteredGiveaways = giveaways.filter((g) => {
        const matchesSearch =
            g.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.name_on_the_pass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === "all" ? true : g.status.toLowerCase() === filterStatus;

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden">
                <Navbar />
                <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading giveaway data...</p>
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
                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
                        {/* Enhanced Header Section */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                <div className="flex items-center space-x-4">
                                    <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                        </svg>
                                    </div>
                        <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Giveaway Approvals</h1>
                                        <p className="text-blue-100 text-lg">Manage giveaway entries and approvals</p>
                                    </div>
                                </div>
                                
                                {/* Quick Stats */}
                                <div className="hidden lg:flex space-x-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{giveaways.length}</div>
                                        <div className="text-blue-200 text-sm">Total Entries</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{giveaways.filter(g => g.status === 'success').length}</div>
                                        <div className="text-blue-200 text-sm">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{giveaways.filter(g => g.status === 'approved').length}</div>
                                        <div className="text-blue-200 text-sm">Approved</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Search and Filter Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Search Giveaways
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                            <input
                                type="text"
                                            placeholder="Search by Reference ID, Name, Card, City, Email, Contact..."
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                                    </div>
                                </div>
                                <div className="lg:w-64">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Filter by Status
                                    </label>
                            <select
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                        <option value="all">All Status</option>
                                <option value="success">Pending Approval</option>
                                <option value="approved">Approved</option>
                                <option value="declined">Declined</option>
                            </select>
                                </div>
                        </div>
                    </div>

                        {/* Enhanced Table Section */}
                        {filteredGiveaways.length === 0 ? (
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
                                            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {searchTerm || filterStatus !== 'all' ? "No giveaways found" : "No giveaway entries"}
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    {searchTerm || filterStatus !== 'all' 
                                        ? `No giveaway entries match your current search and filter criteria. Try adjusting your search terms or filters.`
                                        : "No giveaway entries have been submitted yet. Entries will appear here once students submit their applications."
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
                                                <h2 className="text-xl font-bold text-gray-800">Giveaway Entries</h2>
                                                <p className="text-sm text-gray-600">{filteredGiveaways.length} entries found</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <div className="max-h-[500px] overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Reference ID</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Name</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Card</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>City</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Email</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Contact</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.949.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <div className="flex items-center space-x-2">
                                                            <span>Status</span>
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                                                {filteredGiveaways.map((g, index) => (
                                                    <tr key={g.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                                        <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                                <span className="text-blue-600">{g.reference_id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                                                    {g.name_on_the_pass?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                                <span className="font-medium">{g.name_on_the_pass || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                                <span className="font-medium">{g.card_name || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span>{g.city || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                <span className="truncate max-w-[200px]">{g.customer_email || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.949.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                <span>{g.customer_phone || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                                g.status.toLowerCase() === "approved" 
                                                                    ? "bg-green-100 text-green-800 border border-green-200" 
                                                                    : g.status.toLowerCase() === "declined"
                                                                    ? "bg-red-100 text-red-800 border border-red-200"
                                                                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                            }`}>
                                                                {g.status.toLowerCase() === "approved" ? (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Approved
                                                                    </>
                                                                ) : g.status.toLowerCase() === "declined" ? (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Declined
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                                        </svg>
                                                                        Pending
                                                                    </>
                                                                )}
                                                            </span>
                                                </td>
                                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                            {g.status.toLowerCase() === "success" ? (
                                                    <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleApprove(g.id)}
                                                                    disabled={actionLoading === g.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === g.id ? (
                                                                            <>
                                                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Approving...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                Approve
                                                                            </>
                                                                        )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDecline(g.id)}
                                                                    disabled={actionLoading === g.id}
                                                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {actionLoading === g.id ? (
                                                                            <>
                                                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Declining...
                                                            </>
                                                        ) : (
                                                                            <>
                                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                                Decline
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center text-gray-500">
                                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    <span className="text-sm font-medium">
                                                                        {g.status.toLowerCase() === "approved" ? "Approved" : "Declined"}
                                                            </span>
                                                                </div>
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
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
    );
};

export default GiveawayApprovalPage;
