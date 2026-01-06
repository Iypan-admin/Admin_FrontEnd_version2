import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { fetchEliteCards, addEliteCard, getStudentByRegisterNumber, getCardNameByNumber } from "../services/Api";

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
            
            {/* Scrollable Content Area */}
            <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mt-16 lg:mt-0">
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* Enhanced Header Section */}
                            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-black opacity-10"></div>
                                <div className="relative z-10">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                                                    Elite Card Members
                                                </h1>
                                                <p className="text-blue-100 text-sm sm:text-base">
                                                    Manage student elite cards and memberships
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                                                <p className="text-xs text-blue-100 mb-1">Total Cards</p>
                                                <p className="text-2xl font-bold text-white">{eliteCards.length}</p>
                                            </div>
                                            <button
                                                onClick={() => setShowModal(true)}
                                                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                Connect Elite Card
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
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
            </div>

            {/* Enhanced Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-6 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold">Connect Elite Card</h2>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="px-6 py-6">
                        <form onSubmit={handleFormSubmit} className="space-y-5">

                            {/* Student Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name</label>
                                <input
                                    type="text"
                                    required
                                    readOnly
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                    value={formData.student_name}
                                />
                            </div>

                            {/* Register Number */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Register Number</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                    value={formData.register_number}
                                    onChange={async (e) => {
                                        const regNo = e.target.value;

                                        setFormData((prev) => ({
                                            ...prev,
                                            register_number: regNo,
                                            student_name: "",
                                        }));

                                        if (regNo.length >= 3) {
                                            try {
                                                const name = await getStudentByRegisterNumber(regNo);
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    student_name: name || "",
                                                }));
                                            } catch (err) {
                                                console.warn("Student not found:", regNo);
                                                setFormData((prev) => ({ ...prev, student_name: "" }));
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Card Number */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono transition-all"
                                    value={formData.card_number}
                                    onChange={async (e) => {
                                        const cardNumber = e.target.value;

                                        setFormData((prev) => ({
                                            ...prev,
                                            card_number: cardNumber,
                                            card_type: "",
                                        }));

                                        if (cardNumber.length >= 3) {
                                            try {
                                                const cardName = await getCardNameByNumber(cardNumber);
                                                if (cardName) {
                                                    setFormData((prev) => ({ ...prev, card_type: cardName }));
                                                }
                                            } catch (err) {
                                                console.warn("Card not found:", cardNumber);
                                                setFormData((prev) => ({ ...prev, card_type: "" }));
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Card Type (read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Card Type</label>
                                <input
                                    type="text"
                                    readOnly
                                    required
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                    value={formData.card_type}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Connect Card
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewCenterEliteCard;
