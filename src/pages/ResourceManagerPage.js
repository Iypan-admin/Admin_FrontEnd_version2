// src/pages/ResourceManagerPage.js
import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import MiniCalendarWidget from "../components/MiniCalendarWidget";
import CalendarNotificationBar from "../components/CalendarNotificationBar";
import { getAllCourses, getLSRWByCourse, getSpeakingByCourse, getReadingByCourse, getWritingByCourse } from "../services/Api";

const ResourceManagerPage = () => {
    const navigate = useNavigate();
    const calendarRef = useRef(null);

    const [listeningResources, setListeningResources] = useState(0);
    const [speakingResources, setSpeakingResources] = useState(0);
    const [readingResources, setReadingResources] = useState(0);
    const [writingResources, setWritingResources] = useState(0);
    const [loading, setLoading] = useState(true);

    // Get current user's name from token
    const token = localStorage.getItem("token");
    const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
    const userName = (decodedToken?.full_name && 
                      decodedToken.full_name !== null && 
                      decodedToken.full_name !== undefined && 
                      String(decodedToken.full_name).trim() !== '') 
      ? decodedToken.full_name 
      : (decodedToken?.name || 'Resource Manager');

    // Scroll to calendar function
    const scrollToCalendar = () => {
        if (calendarRef.current) {
            calendarRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    };

    // Helper function to get color classes
    const getColorClasses = (color) => {
        switch (color) {
            case "green":
                return {
                    bgGradient: "from-green-50 to-green-100",
                    iconGradient: "from-green-500 to-green-600",
                    dot: "bg-green-400",
                    textValue: "text-green-700",
                    textValueHover: "group-hover:text-green-800",
                    textTitle: "text-green-600",
                    textTitleHover: "group-hover:text-green-700"
                };
            case "yellow":
                return {
                    bgGradient: "from-yellow-50 to-yellow-100",
                    iconGradient: "from-yellow-500 to-yellow-600",
                    dot: "bg-yellow-400",
                    textValue: "text-yellow-700",
                    textValueHover: "group-hover:text-yellow-800",
                    textTitle: "text-yellow-600",
                    textTitleHover: "group-hover:text-yellow-700"
                };
            case "red":
                return {
                    bgGradient: "from-red-50 to-red-100",
                    iconGradient: "from-red-500 to-red-600",
                    dot: "bg-red-400",
                    textValue: "text-red-700",
                    textValueHover: "group-hover:text-red-800",
                    textTitle: "text-red-600",
                    textTitleHover: "group-hover:text-red-700"
                };
            case "blue":
                return {
                    bgGradient: "from-blue-50 to-blue-100",
                    iconGradient: "from-blue-500 to-blue-600",
                    dot: "bg-blue-400",
                    textValue: "text-blue-700",
                    textValueHover: "group-hover:text-blue-800",
                    textTitle: "text-blue-600",
                    textTitleHover: "group-hover:text-blue-700"
                };
            case "purple":
                return {
                    bgGradient: "from-purple-50 to-purple-100",
                    iconGradient: "from-purple-500 to-purple-600",
                    dot: "bg-purple-400",
                    textValue: "text-purple-700",
                    textValueHover: "group-hover:text-purple-800",
                    textTitle: "text-purple-600",
                    textTitleHover: "group-hover:text-purple-700"
                };
            case "orange":
                return {
                    bgGradient: "from-orange-50 to-orange-100",
                    iconGradient: "from-orange-500 to-orange-600",
                    dot: "bg-orange-400",
                    textValue: "text-orange-700",
                    textValueHover: "group-hover:text-orange-800",
                    textTitle: "text-orange-600",
                    textTitleHover: "group-hover:text-orange-700"
                };
            default:
                return {
                    bgGradient: "from-gray-50 to-gray-100",
                    iconGradient: "from-gray-500 to-gray-600",
                    dot: "bg-gray-400",
                    textValue: "text-gray-700",
                    textValueHover: "group-hover:text-gray-800",
                    textTitle: "text-gray-600",
                    textTitleHover: "group-hover:text-gray-700"
                };
        }
    };

    // Fetch course-based resource counts
    const loadResourceCounts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No authentication token found");
                setLoading(false);
                return;
            }

            // Fetch all courses
            const coursesResponse = await getAllCourses(token);
            console.log("Courses response:", coursesResponse);
            
            if (!coursesResponse || !coursesResponse.success) {
                console.error("Failed to fetch courses:", coursesResponse);
                setLoading(false);
                return;
            }

            const courses = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
            console.log(`Found ${courses.length} courses`);
            
            if (courses.length === 0) {
                console.warn("No courses found");
                setLoading(false);
                return;
            }

            // Fetch resources for each course and count them
            const BATCH_SIZE = 5; // Reduced batch size for better reliability
            const courseCounts = [];
            
            for (let i = 0; i < courses.length; i += BATCH_SIZE) {
                const batch = courses.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(async (course) => {
                    const counts = { listening: 0, speaking: 0, reading: 0, writing: 0 };
                    try {
                        // Fetch Listening resources - Count unique sessions (grouped by lsrw_id)
                        const listeningRes = await Promise.race([
                            getLSRWByCourse(course.id, token, 'listening'),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]).catch((err) => {
                            console.warn(`Timeout/Error fetching listening for course ${course.course_name}:`, err);
                            return null;
                        });
                        
                        if (listeningRes && listeningRes.success && Array.isArray(listeningRes.data)) {
                            // Group by lsrw_id (unique sessions) - same as LSRWFileViewPage
                            const sessionMap = new Map();
                            listeningRes.data.forEach(item => {
                                const sessionKey = item.lsrw_id || item.id;
                                if (!sessionMap.has(sessionKey)) {
                                    sessionMap.set(sessionKey, true);
                                }
                            });
                            counts.listening = sessionMap.size;
                            if (counts.listening > 0) {
                                console.log(`Course ${course.course_name}: ${counts.listening} listening sessions`);
                            }
                        }

                        // Fetch Speaking resources - Count unique sessions (grouped by id)
                        const speakingRes = await Promise.race([
                            getSpeakingByCourse(course.id, token),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]).catch((err) => {
                            console.warn(`Timeout/Error fetching speaking for course ${course.course_name}:`, err);
                            return null;
                        });
                        
                        if (speakingRes && speakingRes.success && Array.isArray(speakingRes.data)) {
                            // Group by id (unique sessions) - same as LSRWFileViewPage
                            const sessionMap = new Map();
                            speakingRes.data.forEach(item => {
                                const sessionKey = item.id;
                                if (!sessionMap.has(sessionKey)) {
                                    sessionMap.set(sessionKey, true);
                                }
                            });
                            counts.speaking = sessionMap.size;
                            if (counts.speaking > 0) {
                                console.log(`Course ${course.course_name}: ${counts.speaking} speaking sessions`);
                            }
                        }

                        // Fetch Reading resources - Count direct array (no grouping)
                        const readingRes = await Promise.race([
                            getReadingByCourse(course.id, token),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]).catch((err) => {
                            console.warn(`Timeout/Error fetching reading for course ${course.course_name}:`, err);
                            return null;
                        });
                        
                        if (readingRes && readingRes.success && Array.isArray(readingRes.data)) {
                            // Direct count - same as LSRWFileViewPage
                            counts.reading = readingRes.data.length;
                            if (counts.reading > 0) {
                                console.log(`Course ${course.course_name}: ${counts.reading} reading resources`);
                            }
                        }

                        // Fetch Writing resources - Count unique sessions (grouped by session_number)
                        const writingRes = await Promise.race([
                            getWritingByCourse(course.id, token),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]).catch((err) => {
                            console.warn(`Timeout/Error fetching writing for course ${course.course_name}:`, err);
                            return null;
                        });
                        
                        if (writingRes && writingRes.success && Array.isArray(writingRes.data)) {
                            // Group by session_number (unique sessions) - same as LSRWFileViewPage
                            const sessionMap = new Map();
                            writingRes.data.forEach(item => {
                                const sessionNumber = item.session_number || 1;
                                const sessionKey = sessionNumber;
                                if (!sessionMap.has(sessionKey)) {
                                    sessionMap.set(sessionKey, true);
                                }
                            });
                            counts.writing = sessionMap.size;
                            if (counts.writing > 0) {
                                console.log(`Course ${course.course_name}: ${counts.writing} writing sessions`);
                            }
                        }
                    } catch (err) {
                        console.warn(`Error fetching resources for course ${course.course_name || course.id}:`, err);
                    }
                    return counts;
                });

                const batchResults = await Promise.all(batchPromises);
                courseCounts.push(...batchResults);
            }

            // Sum up all counts
            const listeningCount = courseCounts.reduce((sum, c) => sum + c.listening, 0);
            const speakingCount = courseCounts.reduce((sum, c) => sum + c.speaking, 0);
            const readingCount = courseCounts.reduce((sum, c) => sum + c.reading, 0);
            const writingCount = courseCounts.reduce((sum, c) => sum + c.writing, 0);

            console.log("Final counts - Listening:", listeningCount, "Speaking:", speakingCount, "Reading:", readingCount, "Writing:", writingCount);
            
            setListeningResources(listeningCount);
            setSpeakingResources(speakingCount);
            setReadingResources(readingCount);
            setWritingResources(writingCount);
        } catch (err) {
            console.error("Failed to fetch resource counts:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadResourceCounts();
    }, []);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
            <Navbar />
            <CalendarNotificationBar onScrollToCalendar={scrollToCalendar} />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
          <div className="p-4 lg:p-8">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Professional Welcome Section - Modern Design */}
                <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="relative p-5 sm:p-6 lg:p-7">
                    <div className="flex items-start space-x-5">
                      {/* Icon Container with Enhanced Design */}
                      <div className="relative group flex-shrink-0">
                        <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                        <div className="relative p-4 bg-white/25 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                          <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" 
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>

                      {/* Content Section with Professional Typography */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-1.5">
                          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
                            <span className="text-white">Welcome back, </span>
                            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent font-black drop-shadow-lg">
                              {userName}
                            </span>
                            <span className="text-white">!</span>
                          </h1>
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95 leading-tight tracking-tight">
                            Resource Manager Dashboard
                          </h2>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <p className="text-blue-50 text-sm sm:text-base font-medium leading-relaxed">
                            Manage resources, materials, and educational content efficiently
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      title: "Listening Course Resource",
                      value: loading ? "..." : listeningResources,
                      color: "blue",
                      icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
                      description: "Audio & video materials",
                    },
                    {
                      title: "Speaking Course Resource",
                      value: loading ? "..." : speakingResources,
                      color: "purple",
                      icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
                      description: "Text materials & prompts",
                    },
                    {
                      title: "Reading Course Resource",
                      value: loading ? "..." : readingResources,
                      color: "green",
                      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
                      description: "Passages & MCQs",
                    },
                    {
                      title: "Writing Course Resource",
                      value: loading ? "..." : writingResources,
                      color: "orange",
                      icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
                      description: "Prompts & tasks",
                    },
                  ].map((stat, idx) => {
                                const colors = getColorClasses(stat.color);
                                return (
                                <div
                                    key={idx}
                      className="group relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
                    >
                      {/* Background gradient */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${colors.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
                      ></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`p-3 bg-gradient-to-br ${colors.iconGradient} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300`}
                          >
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
                                d={stat.icon}
                              />
                            </svg>
                          </div>
                          <div
                            className={`w-3 h-3 ${colors.dot} rounded-full animate-pulse`}
                          ></div>
                        </div>

                        <div className="space-y-2">
                          <h3
                            className={`text-3xl font-bold ${colors.textValue} ${colors.textValueHover} transition-colors duration-300`}
                          >
                            {loading ? "..." : (stat.value !== undefined && stat.value !== null ? stat.value : 0)}
                          </h3>
                          <p
                            className={`${colors.textTitle} ${colors.textTitleHover} font-semibold text-sm transition-colors duration-300`}        
                          >
                                            {stat.title}
                                        </p>
                          <p className="text-gray-500 text-xs group-hover:text-gray-600 transition-colors duration-300">
                            {stat.description}
                          </p>
                        </div>
                      </div>
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%]"></div>
                    </div>
                                );
                            })}
                </div>

                {/* LSRW Module Cards */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
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
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          LSRW Content Management
                        </h3>
                        <p className="text-sm text-gray-500">
                          Upload and manage learning materials
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Listening Module */}
                      <div
                        onClick={() => navigate("/lsrw-upload/listening")}
                        className="group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-blue-800 group-hover:text-blue-900">Listening</h4>
                            <p className="text-sm text-blue-600 mt-1">Upload audio & questions</p>
                          </div>
                        </div>
                      </div>

                      {/* Speaking Module */}
                      <div
                        onClick={() => navigate("/lsrw-upload/speaking")}
                        className="group relative bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-purple-800 group-hover:text-purple-900">Speaking</h4>
                            <p className="text-sm text-purple-600 mt-1">Upload text materials</p>
                          </div>
                        </div>
                      </div>

                      {/* Reading Module */}
                      <div
                        onClick={() => navigate("/lsrw-upload/reading")}
                        className="group relative bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:border-green-400 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-green-800 group-hover:text-green-900">Reading</h4>
                            <p className="text-sm text-green-600 mt-1">Upload passages & MCQs</p>
                          </div>
                        </div>
                      </div>

                      {/* Writing Module */}
                      <div
                        onClick={() => navigate("/lsrw-upload/writing")}
                        className="group relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 hover:border-orange-400 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-orange-800 group-hover:text-orange-900">Writing</h4>
                            <p className="text-sm text-orange-600 mt-1">Upload prompts & tasks</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Calendar Widget */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Event Calendar</h3>
                        <p className="text-sm text-gray-500">View upcoming events</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <MiniCalendarWidget scrollRef={calendarRef} />
                  </div>
                </div>
              </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceManagerPage;


