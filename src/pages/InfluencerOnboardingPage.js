import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getInfluencerCount, getAllInfluencers, submitInfluencer } from "../services/Api";


const InfluencerOnboardingPage = () => {
    const [totalInfluencers, setTotalInfluencers] = useState(0);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", role: "" });
    const [step, setStep] = useState("form"); // "form" | "confirm"

    useEffect(() => {
        fetchInfluencerData();
    }, []);

    const fetchInfluencerData = async () => {
        try {
            const countRes = await getInfluencerCount();
            setTotalInfluencers(countRes?.count || 0);

            const allRes = await getAllInfluencers();
            setInfluencers(Array.isArray(allRes) ? allRes : []);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleConfirm = () => {
        const { name, email, phone, role } = formData;
        if (!name || !email || !phone || !role) {
            alert("⚠️ Please fill all the fields");
            return;
        }
        setStep("confirm");
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await submitInfluencer(formData);
            alert("✅ Mail sent to " + formData.email);
            setFormData({ name: "", email: "", phone: "", role: "" });
            setStep("form");
            setShowModal(false);
            fetchInfluencerData();
        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
            <Navbar />
            <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
                <div className="p-4 lg:p-8">
                    <div className="mt-16 lg:mt-0">
                        <div className="max-w-7xl mx-auto space-y-8">
                            {/* Enhanced Welcome Section */}
                            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="relative p-8 lg:p-12">
                                    <div className="flex flex-col lg:flex-row items-center justify-between">
                                        <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                                            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                                                    Influencer Onboarding
                                                </h1>
                                                <p className="text-indigo-100 text-lg lg:text-xl">
                                                    Manage and onboard influencers for your campaigns
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

                            {/* Enhanced Stats Card */}
                            <div className="group relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                                {/* Background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-100 opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-bold text-indigo-700 group-hover:text-indigo-800 transition-colors duration-300">
                                            {totalInfluencers}
                                        </h3>
                                        <p className="text-indigo-600 font-semibold text-sm group-hover:text-indigo-700 transition-colors duration-300">
                                            Total Influencers
                                        </p>
                                        <p className="text-gray-500 text-xs group-hover:text-gray-600 transition-colors duration-300">
                                            Active influencer network
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Hover effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%]"></div>
                            </div>

                            {/* Enhanced Table Header with Button */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800">Influencer Management</h2>
                                            <p className="text-sm text-gray-500">{influencers.length} influencers registered</p>
                                        </div>
                                    </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                                >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Influencer
                                </button>
                                </div>
                            </div>


                            {/* Enhanced Table Section */}
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">Influencer Directory</h3>
                                                <p className="text-sm text-gray-500">{influencers.length} influencers registered</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-600 font-medium">Live Data</span>
                                        </div>
                                    </div>
                                </div>

                                {influencers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                            <table className="min-w-[800px] divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            S.No
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Influencer
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Contact Info
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                            Role
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {influencers.map((inf, index) => (
                                                        <tr key={inf.influencer_id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg">
                                                                    {index + 1}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                                                        {inf.name?.charAt(0)?.toUpperCase() || 'I'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                            {inf.name}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                            Influencer
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center space-x-2">
                                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <p className="text-sm text-gray-600 group-hover:text-gray-800">{inf.email}</p>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                        <p className="text-sm text-gray-600 group-hover:text-gray-800">{inf.phone}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className={`w-3 h-3 rounded-full ${
                                                                        inf.role === 'Moms' ? 'bg-pink-400' : 'bg-blue-400'
                                                                    }`}></div>
                                                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                                                        inf.role === 'Moms' 
                                                                            ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800' 
                                                                            : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                                                                    } shadow-sm`}>
                                                                        {inf.role}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Influencers Yet</h3>
                                            <p className="text-gray-500 mb-6 max-w-md text-center">
                                                Start building your influencer network by adding your first influencer.
                                            </p>
                                            <button
                                                onClick={() => setShowModal(true)}
                                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add First Influencer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Enhanced Modal */}
                            {showModal && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                                        {/* Modal Header */}
                                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-800">
                                                        {step === "form" ? "Add New Influencer" : "Confirm Details"}
                                                    </h3>
                                                </div>
                                                <button
                                                    onClick={() => { setShowModal(false); setStep("form"); }}
                                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {step === "form" && (
                                                <>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="name"
                                                                placeholder="Enter influencer's full name"
                                                                value={formData.name}
                                                                onChange={handleChange}
                                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                        
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                placeholder="Enter email address"
                                                                value={formData.email}
                                                                onChange={handleChange}
                                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                        
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                                            <input
                                                                type="tel"
                                                                name="phone"
                                                                placeholder="Enter phone number"
                                                                value={formData.phone}
                                                                onChange={handleChange}
                                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-3">Select Role *</label>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                                    formData.role === "Moms" 
                                                                        ? "border-pink-300 bg-pink-50" 
                                                                        : "border-gray-200 hover:border-pink-200"
                                                                }`}>
                                                                    <input
                                                                        type="radio"
                                                                        name="role"
                                                                        value="Moms"
                                                                        checked={formData.role === "Moms"}
                                                                        onChange={handleChange}
                                                                        className="sr-only"
                                                                    />
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                                                            formData.role === "Moms" 
                                                                                ? "border-pink-500 bg-pink-500" 
                                                                                : "border-gray-300"
                                                                        }`}>
                                                                            {formData.role === "Moms" && (
                                                                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-700">Moms</span>
                                                                    </div>
                                                                </label>
                                                                
                                                                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                                    formData.role === "Ambassador" 
                                                                        ? "border-blue-300 bg-blue-50" 
                                                                        : "border-gray-200 hover:border-blue-200"
                                                                }`}>
                                                                    <input
                                                                        type="radio"
                                                                        name="role"
                                                                        value="Ambassador"
                                                                        checked={formData.role === "Ambassador"}
                                                                        onChange={handleChange}
                                                                        className="sr-only"
                                                                    />
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                                                            formData.role === "Ambassador" 
                                                                                ? "border-blue-500 bg-blue-500" 
                                                                                : "border-gray-300"
                                                                        }`}>
                                                                            {formData.role === "Ambassador" && (
                                                                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-700">Ambassador</span>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleConfirm}
                                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                                    >
                                                        Confirm Details
                                                    </button>
                                                </>
                                            )}

                                            {step === "confirm" && (
                                                <>
                                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                                        <h4 className="font-semibold text-gray-800 mb-3">Influencer Details</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Name:</span>
                                                                <span className="font-medium text-gray-800">{formData.name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Email:</span>
                                                                <span className="font-medium text-gray-800">{formData.email}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Phone:</span>
                                                                <span className="font-medium text-gray-800">{formData.phone}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Role:</span>
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                                    formData.role === 'Moms' 
                                                                        ? 'bg-pink-100 text-pink-800' 
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {formData.role}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={handleSubmit}
                                                            disabled={loading}
                                                            className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                                                                loading ? "opacity-50 cursor-not-allowed" : ""
                                                            }`}
                                                        >
                                                            {loading ? (
                                                                <div className="flex items-center justify-center">
                                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Submitting...
                                                                </div>
                                                            ) : (
                                                                "Submit & Send Mail"
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setStep("form")}
                                                            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfluencerOnboardingPage;
