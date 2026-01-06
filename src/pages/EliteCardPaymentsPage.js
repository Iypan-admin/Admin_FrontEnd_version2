import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
    getPendingEliteCards,
    getApprovedEliteCards,
    approveEliteCard,
    rejectEliteCard,
} from "../services/Api";

const EliteCardPaymentsPage = () => {
    const [allCards, setAllCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [search, setSearch] = useState(""); // ✅ search state
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: "all", // all, card_generated, approved, expired
        cardName: "all", // all, or specific card name
        cardNumber: "",
        dateFrom: "",
        dateTo: ""
    });

    const loadAllCards = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
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

    const handleApprove = async (id) => {
        if (!window.confirm("Approve this card?")) return;
        try {
            setActionLoading(id);
            const token = localStorage.getItem("token");
            await approveEliteCard(id, token);
            alert("✅ Card approved!");
            await loadAllCards();
        } catch (err) {
            console.error("Approval failed:", err);
            alert("❌ Failed to approve.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Reject this card?")) return;
        try {
            setActionLoading(id);
            const token = localStorage.getItem("token");
            await rejectEliteCard(id, token);
            alert("🚫 Card rejected!");
            await loadAllCards();
        } catch (err) {
            console.error("Reject failed:", err);
            alert("❌ Failed to reject.");
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        loadAllCards();
    }, []);

        // ✅ Get unique card names for filter dropdown
    const uniqueCardNames = [...new Set(allCards.map(card => card.card_name).filter(Boolean))];

    // ✅ Filtered cards based on search and filters
    const filteredCards = allCards.filter((card) => {
        // Name search
        const matchesName = card.name_on_the_pass?.toLowerCase().includes(search.toLowerCase());
        
        // Status filter
        const matchesStatus = filters.status === "all" || card.status === filters.status;
        
        // Card name filter
        const matchesCardName = filters.cardName === "all" || card.card_name === filters.cardName;
        
        // Card number filter
        const matchesCardNumber = !filters.cardNumber || 
            card.card_number?.toLowerCase().includes(filters.cardNumber.toLowerCase());
        
        // Date range filters
        const matchesDateFrom = !filters.dateFrom || 
            (card.valid_from && card.valid_from >= filters.dateFrom);
        const matchesDateTo = !filters.dateTo || 
            (card.valid_thru && card.valid_thru <= filters.dateTo);
        
        return matchesName && matchesStatus && matchesCardName && matchesCardNumber && 
               matchesDateFrom && matchesDateTo;
    });

    // Reset filters
    const handleResetFilters = () => {
        setFilters({
            status: "all",
            cardName: "all",
            cardNumber: "",
            dateFrom: "",
            dateTo: ""
        });
        setSearch("");
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
                                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                                                    Elite Cards
                                                </h1>
                                                <p className="text-blue-100 text-lg lg:text-xl">
                                                    Manage and process elite card applications and payments
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

                            {/* Enhanced Search Section */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-800">Search & Filter</h2>
                                            <p className="text-sm text-gray-500">Find specific elite card applications</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
                                        </span>
                                    </button>
                                </div>
                                
                                {/* Basic Search */}
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search by cardholder name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Advanced Filters */}
                                {showAdvancedFilters && (
                                    <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Status Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Status
                                                </label>
                                                <select
                                                    value={filters.status}
                                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="card_generated">Pending</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="expired">Expired</option>
                                                </select>
                                            </div>

                                            {/* Card Name Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Type
                                                </label>
                                                <select
                                                    value={filters.cardName}
                                                    onChange={(e) => setFilters({...filters, cardName: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="all">All Card Types</option>
                                                    {uniqueCardNames.map((name) => (
                                                        <option key={name} value={name}>
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Card Number Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Card Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Search by card number..."
                                                    value={filters.cardNumber}
                                                    onChange={(e) => setFilters({...filters, cardNumber: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Date From Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valid From (Start Date)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.dateFrom}
                                                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Date To Filter */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valid To (End Date)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.dateTo}
                                                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Reset Filters Button */}
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleResetFilters}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                                            >
                                                Reset All Filters
                                            </button>
                                        </div>

                                        {/* Active Filters Count */}
                                        {(filters.status !== "all" || filters.cardName !== "all" || 
                                          filters.cardNumber || filters.dateFrom || filters.dateTo) && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-sm text-gray-600">
                                                    Showing <span className="font-semibold text-blue-600">{filteredCards.length}</span> of{" "}
                                                    <span className="font-semibold">{allCards.length}</span> cards
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Table Section */}
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">Elite Card Applications</h3>
                                                <p className="text-sm text-gray-500">{filteredCards.length} applications found</p>
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
                                                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Applications</h3>
                                            <p className="text-gray-500">Please wait while we fetch the elite card data...</p>
                                        </div>
                                    </div>
                ) : filteredCards.length === 0 ? (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Applications Found</h3>
                                            <p className="text-gray-500 mb-6 max-w-md text-center">
                                                {search ? 'No applications match your search criteria.' : 'No elite card applications have been submitted yet.'}
                                            </p>
                                            {search && (
                                                <button
                                                    onClick={() => setSearch('')}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    Clear Search
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
                                                            Pass
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Actions
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
                                                                            {card.name_on_the_pass?.charAt(0)?.toUpperCase() || 'E'}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                {card.name_on_the_pass}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                Cardholder
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                                </svg>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                    {card.card_name}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                    {card.card_number || 'N/A'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="text-sm text-gray-600 group-hover:text-gray-800 space-y-1">
                                                                        <div className="whitespace-nowrap">
                                                                            <span className="font-medium">From:</span> {card.valid_from || 'N/A'}
                                                                        </div>
                                                                        <div className="whitespace-nowrap">
                                                                            <span className="font-medium">To:</span> {card.valid_thru || 'N/A'}
                                                                        </div>
                                                                    </div>      
                                                                </td>
                                                                <td className="px-6 py-6">
                                                    {card.pdf_url ? (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedRowId(
                                                                    expandedRowId === card.id ? null : card.id
                                                                )
                                                            }
                                                                            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                                        >
                                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                            {expandedRowId === card.id ? "Hide Pass" : "View Pass"}
                                                        </button>
                                                    ) : (
                                                                        <span className="text-gray-400 text-sm">No Pass</span>
                                                    )}
                                                </td>
                                                                                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className={`w-3 h-3 rounded-full ${
                                                                            card.status === 'approved' ? 'bg-green-400' : 
                                                                            card.status === 'card_generated' ? 'bg-yellow-400' : 
                                                                            card.status === 'expired' ? 'bg-red-400' :
                                                                            'bg-gray-400'
                                                                        }`}></div>
                                                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                                                            card.status === 'approved' 
                                                                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                                                : card.status === 'card_generated'
                                                                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                                                    : card.status === 'expired'
                                                                                        ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                                                        } shadow-sm`}>
                                                                            {card.status}
                                                                        </span>
                                                                    </div>      
                                                                </td>
                                                                <td className="px-6 py-6">
                                                    {card.status === "card_generated" && (
                                                        <div className="flex flex-col space-y-2">
                                                            <button
                                                                onClick={() => handleApprove(card.id)}
                                                                disabled={actionLoading === card.id}
                                                                                className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                                                            >
                                                                                {actionLoading === card.id ? (
                                                                                    <svg className="w-4 h-4 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                )}
                                                                {actionLoading === card.id ? "Approving..." : "Approve"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(card.id)}
                                                                disabled={actionLoading === card.id}
                                                                                className="inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                                                            >
                                                                                {actionLoading === card.id ? (
                                                                                    <svg className="w-4 h-4 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                                    </svg>
                                                                                )}
                                                                {actionLoading === card.id ? "Rejecting..." : "Reject"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {card.status === "expired" && (
                                                        <span className="text-xs text-red-600 font-medium">Card Expired</span>
                                                    )}
                                                </td>
                                            </tr>

                                                            {/* Enhanced PDF Row Expand */}
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
                                                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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

export default EliteCardPaymentsPage;
