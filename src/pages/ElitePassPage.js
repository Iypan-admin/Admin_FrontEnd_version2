import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
    getPendingEliteCards,
    getApprovedEliteCards,
    getCardStats,
} from "../services/Api";

const ElitePassPage = () => {
    const [allCards, setAllCards] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "active"

    const loadAllCards = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            
            // Load stats
            const cardStats = await getCardStats();
            setStats(cardStats);
            
            // Load all cards
            const pending = await getPendingEliteCards(token);
            const approved = await getApprovedEliteCards(token);
            setAllCards([...(pending || []), ...(approved || [])]);
        } catch (error) {
            console.error("Error loading cards:", error);
            setAllCards([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllCards();
    }, []);

    // Filter cards based on search and status
    const filteredCards = allCards.filter((card) => {
        const matchesSearch =
            card.name_on_the_pass?.toLowerCase().includes(search.toLowerCase()) ||
            card.card_number?.toLowerCase().includes(search.toLowerCase()) ||
            card.email?.toLowerCase().includes(search.toLowerCase()) ||
            card.card_name?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "pending" && card.status === "card_generated") ||
            (statusFilter === "active" && card.status === "approved");

        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
            <Navbar />
            <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
                <div className="p-4 lg:p-8">
                    <div className="mt-16 lg:mt-0">
                        <div className="max-w-7xl mx-auto space-y-8">
                            {/* Enhanced Welcome Section */}
                            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="relative p-8 lg:p-12">
                                    <div className="flex flex-col lg:flex-row items-center justify-between">
                                        <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                                            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                                <svg
                                                    className="w-10 h-10 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                                                    Elite Pass
                                                </h1>
                                                <p className="text-blue-100 text-lg lg:text-xl">
                                                    Manage and monitor all elite cards
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-400 font-medium">Live Dashboard</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
                            </div>

                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Total Cards */}
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                                            <svg
                                                className="w-6 h-6 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Total Elite Cards</h3>
                                    <p className="text-sm text-gray-500">All elite cards in the system</p>
                                </div>

                                {/* Active Cards */}
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                                            <svg
                                                className="w-6 h-6 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-800">{stats.active}</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Active Elite Cards</h3>
                                    <p className="text-sm text-gray-500">Cards approved and active</p>
                                </div>

                                {/* Pending Cards */}
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
                                            <svg
                                                className="w-6 h-6 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-800">{stats.pending}</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Pending Elite Cards</h3>
                                    <p className="text-sm text-gray-500">Cards awaiting approval</p>
                                </div>
                            </div>

                            {/* Enhanced Search and Filter Section */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg
                                            className="w-5 h-5 text-blue-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Search & Filter</h2>
                                        <p className="text-sm text-gray-500">Find specific elite cards</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by name, card number, email, or card type..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        />
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                            <svg
                                                className="w-5 h-5 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* Status Filter */}
                                    <div>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Table Section */}
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <svg
                                                    className="w-5 h-5 text-blue-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">Elite Cards</h3>
                                                <p className="text-sm text-gray-500">
                                                    {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""} found
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-600 font-medium">Live Data</span>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                                                <svg
                                                    className="w-8 h-8 text-blue-600 animate-spin"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Cards</h3>
                                            <p className="text-gray-500">Please wait while we fetch the elite card data...</p>
                                        </div>
                                    </div>
                                ) : filteredCards.length === 0 ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                <svg
                                                    className="w-10 h-10 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Cards Found</h3>
                                            <p className="text-gray-500 mb-6 max-w-md text-center">
                                                {search || statusFilter !== "all"
                                                    ? "No cards match your search or filter criteria."
                                                    : "No elite cards have been created yet."}
                                            </p>
                                            {(search || statusFilter !== "all") && (
                                                <button
                                                    onClick={() => {
                                                        setSearch("");
                                                        setStatusFilter("all");
                                                    }}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                            <table className="min-w-[1000px] divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            S.No
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Cardholder
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Card Details
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Validity
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Email
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Pass
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {filteredCards.map((card, index) => (
                                                        <React.Fragment key={card.id}>
                                                            <tr className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg">
                                                                        {index + 1}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                                                            {card.name_on_the_pass?.charAt(0)?.toUpperCase() || "E"}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                {card.name_on_the_pass || "N/A"}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 group-hover:text-gray-600">Cardholder</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                                                <svg
                                                                                    className="w-4 h-4 text-white"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    viewBox="0 0 24 24"
                                                                                >
                                                                                    <path
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        strokeWidth="2"
                                                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                                                    />
                                                                                </svg>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                    {card.card_name || "N/A"}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                    {card.card_number || "N/A"}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="space-y-1">
                                                                        <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                                                            <span className="font-medium">From:</span> {formatDate(card.valid_from)}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                                                            <span className="font-medium">To:</span> {formatDate(card.valid_thru)}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <p className="text-sm text-gray-600 group-hover:text-gray-800">{card.email || "N/A"}</p>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    {card.pdf_url ? (
                                                                        <button
                                                                            onClick={() =>
                                                                                setExpandedRowId(expandedRowId === card.id ? null : card.id)
                                                                            }
                                                                            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                                        >
                                                                            <svg
                                                                                className="w-4 h-4 mr-1"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth="2"
                                                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                                                />
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    strokeWidth="2"
                                                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                                                />
                                                                            </svg>
                                                                            {expandedRowId === card.id ? "Hide Pass" : "View Pass"}
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-sm">No Pass</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div
                                                                            className={`w-3 h-3 rounded-full ${
                                                                                card.status === "approved"
                                                                                    ? "bg-green-400"
                                                                                    : card.status === "card_generated"
                                                                                    ? "bg-yellow-400"
                                                                                    : "bg-gray-400"
                                                                            }`}
                                                                        ></div>
                                                                        <span
                                                                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                                                                card.status === "approved"
                                                                                    ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                                                                                    : card.status === "card_generated"
                                                                                    ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800"
                                                                                    : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800"
                                                                            } shadow-sm`}
                                                                        >
                                                                            {card.status === "approved"
                                                                                ? "Active"
                                                                                : card.status === "card_generated"
                                                                                ? "Pending"
                                                                                : card.status}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* PDF Row Expand */}
                                                            {expandedRowId === card.id && card.pdf_url && (
                                                                <tr>
                                                                    <td colSpan="7" className="px-6 py-6 bg-gradient-to-r from-gray-50 to-blue-50">
                                                                        <div className="bg-white rounded-lg shadow-lg p-4">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <h4 className="text-lg font-semibold text-gray-800">Pass Preview</h4>
                                                                                <button
                                                                                    onClick={() => setExpandedRowId(null)}
                                                                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                                                >
                                                                                    <svg
                                                                                        className="w-5 h-5 text-gray-500"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <path
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            strokeWidth="2"
                                                                                            d="M6 18L18 6M6 6l12 12"
                                                                                        />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                            <iframe
                                                                                src={card.pdf_url}
                                                                                title="PDF Preview"
                                                                                className="w-full h-[400px] border rounded-lg shadow-sm"
                                                                            ></iframe>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
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

export default ElitePassPage;

