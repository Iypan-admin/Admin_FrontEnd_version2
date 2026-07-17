import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { uploadGiveawayCSV, getAllGiveaways, addGiveawayManual, getCurrentUserProfile } from "../services/Api";
import CardAdminNotificationBell from "../components/CardAdminNotificationBell";

const ActivateCardPage = () => {
    const navigate = useNavigate();
    const [allData, setAllData] = useState([]);
    const [uploadMessage, setUploadMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [profileInfo, setProfileInfo] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved === 'true' ? '6rem' : '16rem';
        }
        return '16rem';
    });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [formData, setFormData] = useState({
        name: "",
        cardName: "",
        city: "",
        email: "",
        contact: "",
    });

    // ✅ Fetch data
    const fetchData = async () => {
        try {
            const response = await getAllGiveaways();
            if (response && Array.isArray(response)) {
                setAllData(
                    response.map((item) => ({
                        referenceId: item.reference_id,
                        name: item.name_on_the_pass,
                        cardName: item.card_name,
                        city: item.city,
                        email: item.customer_email,
                        contact: item.customer_phone,
                        status:
                            item.status === "success"
                                ? "Success"
                                : item.status === "card_generated"
                                    ? "Card Generated"
                                    : item.status === "approved"
                                        ? "Approved"
                                        : item.status,
                        createdAt: new Date(item.created_at).toLocaleDateString(),
                    }))
                );
            }
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Get current user's name from token
    const token = localStorage.getItem("token");
    const userName = token ? (() => {
        try {
            const decodedToken = JSON.parse(atob(token.split(".")[1]));
            return (decodedToken?.full_name && 
                              decodedToken.full_name !== null && 
                              decodedToken.full_name !== undefined && 
                              String(decodedToken.full_name).trim() !== '') 
                ? decodedToken.full_name 
                : (decodedToken?.name || 'Admin');
        } catch (error) {
            console.error('Error decoding token:', error);
            return 'Admin';
        }
    })() : 'Admin';

    // Fetch user profile
    const fetchUserProfile = async () => {
        try {
            const profile = await getCurrentUserProfile();
            if (profile && profile.data) {
                setProfileInfo(profile.data);
                if (profile.data.profile_picture) {
                    setProfilePictureUrl(profile.data.profile_picture);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    // Profile update listener
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUserProfile();
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    // Load data on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUserProfile();
    }, [navigate]);

    // Mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Listen for sidebar toggle
    useEffect(() => {
        const handleSidebarToggle = () => {
            const saved = localStorage.getItem('sidebarCollapsed');
            setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
        };
        
        window.addEventListener('sidebarToggle', handleSidebarToggle);
        handleSidebarToggle();
        
        return () => {
            window.removeEventListener('sidebarToggle', handleSidebarToggle);
        };
    }, []);

    // Sync mobile menu state with Navbar
    useEffect(() => {
        const handleMobileMenuStateChange = (event) => {
            setIsMobileMenuOpen(event.detail);
        };
        window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
        return () => window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    }, []);

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        const newState = !isMobileMenuOpen;
        setIsMobileMenuOpen(newState);
        window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
    };

    // ✅ CSV Upload
    const handleCSVUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const res = await uploadGiveawayCSV(file);

            if (res?.status === "duplicate_found") {
                // duplicate mail found
                const proceed = window.confirm(
                    `⚠️ ${res.duplicates.length} duplicate(s) found:\n${res.duplicates.join(
                        ", "
                    )}\n\nDo you want to skip duplicates and insert remaining?`
                );
                if (proceed) {
                    // call backend again with skip flag
                    const res2 = await uploadGiveawayCSV(file, true); // true = skipDuplicates
                    if (res2?.status === "ok") {
                        alert(`✅ ${res2.inserted} rows uploaded successfully (duplicates skipped)!`);
                        fetchData();
                    } else {
                        alert("❌ Failed to insert remaining data.");
                    }
                } else {
                    alert("❌ Upload cancelled due to duplicates.");
                }
            } else if (res?.status === "ok") {
                setUploadMessage(`✅ ${res.inserted} rows uploaded successfully!`);
                fetchData();
            } else {
                setUploadMessage("❌ Upload failed. Check your CSV format.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            setUploadMessage("❌ Upload failed. Try again.");
        }
    };



    // ✅ Input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ✅ Manual Insert
    const handleInsertGiveaway = async (e) => {
        e.preventDefault();
        try {
            const newEntry = {
                name_on_the_pass: formData.name,
                card_name: formData.cardName,
                city: formData.city,
                customer_email: formData.email,
                customer_phone: formData.contact,
            };

            const res = await addGiveawayManual(newEntry);

            if (res?.status === "duplicate_found") {
                alert(`⚠️ Duplicate entry found for email: ${formData.email}`);
                return;
            }

            if (res && !res.error) {
                alert(res.message || "✅ Giveaway entry added successfully!");
                fetchData();
                setIsModalOpen(false);
                setFormData({
                    name: "",
                    cardName: "",
                    city: "",
                    email: "",
                    contact: "",
                });
            } else {
                alert(`❌ Failed to insert giveaway. ${res.error || ""}`);
            }
        } catch (error) {
            console.error("Manual Insert Error:", error);
            alert("❌ Something went wrong. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Navbar />
            
            <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
                {/* Berry Style Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            {/* Left: Hamburger Menu & Welcome Text */}
                            <div className="flex items-center space-x-3 sm:space-x-4">
                                <button 
                                    onClick={toggleMobileMenu}
                                    className="lg:hidden p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                                    title={isMobileMenuOpen ? "Close menu" : "Open menu"}
                                >
                                    {isMobileMenuOpen ? (
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    )}
                                </button>
                                
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                        Activate Cards
                                    </h1>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                        Manage card activation and giveaway entries
                                    </p>
                                </div>
                            </div>

                            {/* Right: Notification Bell & Profile Dropdown */}
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <CardAdminNotificationBell />
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                        className="flex items-center focus:outline-none"
                                    >
                                        {profilePictureUrl ? (
                                            <img
                                                src={profilePictureUrl}
                                                alt="Profile"
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                                                {userName?.charAt(0)?.toUpperCase() || 'A'}
                                            </div>
                                        )}
                                    </button>
                                    
                                    {/* Profile Dropdown */}
                                    {showProfileDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {profileInfo?.full_name || userName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {profileInfo?.email || 'admin@example.com'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigate('/account-settings');
                                                    setShowProfileDropdown(false);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Account Settings
                                            </button>
                                            <button
                                                onClick={() => {
                                                    localStorage.removeItem('token');
                                                    navigate('/login');
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-4 sm:p-6 lg:p-8">
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
                                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                                                    Card Activation
                </h1>
                                                <p className="text-blue-100 text-lg lg:text-xl">
                                                    Manage giveaway data and activate cards for customers
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

                            {/* Enhanced Controls Section */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                        </svg>
                                    </div>
                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Data Management</h2>
                                        <p className="text-sm text-gray-500">Upload, search, and manage giveaway data</p>
                                    </div>
                                </div>

                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* Upload CSV */}
                                    <div className="group">
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Upload CSV File
                        </label>
                                        <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                        </div>
                        {uploadMessage && (
                                            <div className={`mt-2 p-2 rounded-lg text-xs ${
                                                uploadMessage.includes('✅') 
                                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                {uploadMessage}
                                            </div>
                        )}
                    </div>

                    {/* Search */}
                                    <div className="group">
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Search Data
                        </label>
                                        <div className="relative">
                        <input
                            type="text"
                                                placeholder="Reference ID or Name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                            />
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                        </div>
                    </div>

                                    {/* Download Sample */}
                                    <div className="group">
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Sample Template
                        </label>
                        <a
                            href="/giveaway.csv"
                            download
                                            className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                            Download Sample
                        </a>
                    </div>

                                    {/* Insert New */}
                                    <div className="group">
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Add New Entry
                        </label>
                        <button
                            onClick={() => setIsModalOpen(true)}
                                            className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                            Insert Giveaway
                        </button>
                    </div>
                </div>
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
                                                <h3 className="text-lg font-bold text-gray-800">Giveaway Data</h3>
                                                <p className="text-sm text-gray-500">
                                                    {allData.filter(
                                                        (item) =>
                                                            item.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            item.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                                    ).length} entries found
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-600 font-medium">Live Data</span>
                                        </div>
                    </div>
                </div>

                                <div className="overflow-x-auto">
                                    <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        <table className="min-w-[900px] divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        S.No
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Ref ID
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Customer
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Card Details
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Contact Info
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                </tr>
                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                {allData.filter(
                                    (item) =>
                                        item.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length > 0 ? (
                                    allData
                                        .filter(
                                            (item) =>
                                                item.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                item.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((item, index) => (
                                                            <tr key={index} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg">
                                                                        {index + 1}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="bg-gray-100 px-3 py-2 rounded-lg">
                                                                        <p className="text-sm font-mono text-gray-700 group-hover:text-gray-800">
                                                                            {item.referenceId}
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                                                                            {item.name?.charAt(0)?.toUpperCase() || 'C'}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                {item.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                {item.city || 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                                            </svg>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                                                                                {item.cardName}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 group-hover:text-gray-600">
                                                                                Card Type
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
                                                                            <p className="text-sm text-gray-600 group-hover:text-gray-800">{item.email}</p>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                            </svg>
                                                                            <p className="text-sm text-gray-600 group-hover:text-gray-800">{item.contact}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className={`w-3 h-3 rounded-full ${
                                                                            item.status === 'Success' || item.status === 'Approved' 
                                                                                ? 'bg-green-400' 
                                                                                : item.status === 'Card Generated'
                                                                                    ? 'bg-red-400'
                                                                                    : 'bg-gray-400'
                                                                        }`}></div>
                                                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                                                            item.status === 'Success' || item.status === 'Approved'
                                                                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                                                : item.status === 'Card Generated'
                                                                                    ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                                                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                                                        } shadow-sm`}>
                                                        {item.status}
                                                    </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-6">
                                                                    <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                                                        {item.createdAt}
                                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                                        <td colSpan="7" className="px-6 py-20 text-center">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                    </svg>
                                                                </div>
                                                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Data Available</h3>
                                                                <p className="text-gray-500 mb-6 max-w-md text-center">
                                                                    Upload a CSV file or add new entries to get started with giveaway data management.
                                                                </p>
                                                                <button
                                                                    onClick={() => setIsModalOpen(true)}
                                                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                                                                >
                                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                                    </svg>
                                                                    Add First Entry
                                                                </button>
                                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

                            {/* Enhanced Modal */}
            {isModalOpen && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                                        {/* Modal Header */}
                                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                    <h2 className="text-lg font-bold text-gray-800">Add New Giveaway</h2>
                                                </div>
                                                <button
                                                    onClick={() => setIsModalOpen(false)}
                                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <form onSubmit={handleInsertGiveaway} className="p-6 space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name on Pass</label>
                                                    <input 
                                                        type="text" 
                                                        name="name" 
                                                        value={formData.name} 
                                                        onChange={handleChange} 
                                                        placeholder="Enter customer's name on pass" 
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                                        required 
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                                                    <select 
                                                        name="cardName" 
                                                        value={formData.cardName} 
                                                        onChange={handleChange} 
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                                        required
                                                    >
                                                        <option value="">-- Select Card Type --</option>
                                <option value="EduPass">EduPass</option>
                                <option value="ScholarPass">ScholarPass</option>
                                <option value="InfinitePass">InfinitePass</option>
                            </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                                    <input 
                                                        type="text" 
                                                        name="city" 
                                                        value={formData.city} 
                                                        onChange={handleChange} 
                                                        placeholder="Enter city name" 
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email</label>
                                                    <input 
                                                        type="email" 
                                                        name="email" 
                                                        value={formData.email} 
                                                        onChange={handleChange} 
                                                        placeholder="Enter customer email" 
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone</label>
                                                    <input 
                                                        type="text" 
                                                        name="contact" 
                                                        value={formData.contact} 
                                                        onChange={handleChange} 
                                                        placeholder="Enter customer phone number" 
                                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsModalOpen(false)} 
                                                    className="flex-1 px-4 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                                >
                                    Cancel
                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                                                >
                                                    Add Giveaway
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default ActivateCardPage;

