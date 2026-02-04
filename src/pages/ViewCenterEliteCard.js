import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import CenterHeader from "../components/CenterHeader";
import { fetchEliteCards, addEliteCard, getStudentByRegisterNumber, getCardNameByNumber } from "../services/Api";
import { Plus, CreditCard, Search } from "lucide-react";

const ViewCenterEliteCard = () => {
    const [eliteCards, setEliteCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        student_name: "",
        register_number: "",
        card_number: "",
        card_type: ""
    });

    const token = localStorage.getItem("token");

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    const fetchEliteCardsHandler = async () => {
        try {
            setLoading(true);
            const data = await fetchEliteCards();
            setEliteCards(data);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            setError("No token found. Please login.");
            return;
        }
        fetchEliteCardsHandler();
    }, [token]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            // Fetch student name from register number if not already present
            if (!formData.student_name && formData.register_number) {
                const name = await getStudentByRegisterNumber(formData.register_number);
                if (!name) {
                    alert("Student not found for this register number.");
                    return;
                }
                setFormData((prev) => ({ ...prev, student_name: name }));
            }

            if (!formData.student_name) {
                alert("Student name is required.");
                return;
            }

            if (!formData.card_type) {
                alert("Invalid card number. Please enter a valid one.");
                return;
            }

            await addEliteCard(formData);
            await fetchEliteCardsHandler(); // refresh list
            alert("Elite card added successfully!");
            setShowModal(false);
            setFormData({
                student_name: "",
                register_number: "",
                card_number: "",
                card_type: ""
            });
        } catch (err) {
            console.error(err);
            alert(err.message || "Something went wrong. Please try again.");
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Fixed Navbar */}
            <div className="fixed inset-y-0 left-0 z-40">
                <Navbar />
            </div>
            
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
            <CenterHeader 
                title="Elite Card Members" 
                subtitle="Manage student elite cards and memberships" 
                icon={CreditCard}
            />
            
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Actions Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-3 flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Plus className="w-5 h-5 pointer-events-none" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Cards</p>
                                <p className="text-xl font-bold text-gray-900">{eliteCards.length}</p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Connect Elite Card
                        </button>
                    </div>

                            {/* Enhanced Error Display */}
                            {error && (
                                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-6 shadow-lg flex items-center space-x-4">
                                    <div className="p-2 bg-red-100 rounded-full">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-red-800 font-semibold">Error</h3>
                                        <p className="text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Table Card */}
                            {loading ? (
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-16">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                                        <p className="text-gray-600 font-medium">Loading elite cards...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Student Name</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Register Number</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Card Number</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Card Type</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Created</th>
                                                </tr>
                                            </thead>

                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {eliteCards.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-16">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                    </svg>
                                                                </div>
                                                                <p className="text-gray-500 font-medium text-lg">No elite cards found</p>
                                                                <p className="text-gray-400 text-sm mt-2">Click "Connect Elite Card" to add one</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    eliteCards.map((card) => (
                                                        <tr key={card.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>{card.student_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                                    {card.register_number}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                                                                {card.card_number}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                                                                    {card.card_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                                                                <div className="flex items-center space-x-2">
                                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span>{formatDate(card.created_at)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* Side Drawer - Berry Style (Matches CreateUserModal) */}
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
                    {/* Sticky Header - BERRY Style */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Connect Elite Card</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Drawer Body - BERRY Style */}
                    <div className="p-6 flex-1 overflow-y-auto">
                        <form id="elite-card-form" onSubmit={handleFormSubmit} className="space-y-6">
                            {/* Registration Number Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Register Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter registration number"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                        value={formData.register_number}
                                        onChange={async (e) => {
                                            const regNo = e.target.value;
                                            setFormData((prev) => ({ ...prev, register_number: regNo, student_name: "" }));
                                            if (regNo.length >= 3) {
                                                try {
                                                    const name = await getStudentByRegisterNumber(regNo);
                                                    setFormData((prev) => ({ ...prev, student_name: name || "" }));
                                                } catch (err) {
                                                    setFormData((prev) => ({ ...prev, student_name: "" }));
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Student Name Field (Read Only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Plus className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                                        value={formData.student_name}
                                        placeholder="Auto-detected from Reg No"
                                    />
                                </div>
                            </div>

                            {/* Card Number Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <CreditCard className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter card number"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 font-mono"
                                        value={formData.card_number}
                                        onChange={async (e) => {
                                            const cardNumber = e.target.value;
                                            setFormData((prev) => ({ ...prev, card_number: cardNumber, card_type: "" }));
                                            if (cardNumber.length >= 3) {
                                                try {
                                                    const cardName = await getCardNameByNumber(cardNumber);
                                                    if (cardName) setFormData((prev) => ({ ...prev, card_type: cardName }));
                                                } catch (err) {
                                                    setFormData((prev) => ({ ...prev, card_type: "" }));
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Card Type Field (Read Only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                                        value={formData.card_type}
                                        placeholder="Auto-detected from Card No"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    {/* Drawer Footer - BERRY Style */}
                    <div className="p-6 border-t border-gray-200 flex-shrink-0">
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                form="elite-card-form"
                                type="submit"
                                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 shadow-sm hover:shadow-md"
                                style={{ backgroundColor: '#2196f3' }}
                                onMouseEnter={(e) => { e.target.style.backgroundColor = '#1976d2'; }}
                                onMouseLeave={(e) => { e.target.style.backgroundColor = '#2196f3'; }}
                            >
                                Connect Card
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCenterEliteCard;
