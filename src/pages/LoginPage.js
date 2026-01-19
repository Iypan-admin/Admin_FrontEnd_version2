import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getPublicUpcomingEvents } from "../services/Api";
import Logo from "../assets/Logo.png"; // Adjust the path if needed

const LoginPage = ({ setRole }) => {
  const [name, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showMobileAnnouncement, setShowMobileAnnouncement] = useState(false);
  const scrollContainerRef = useRef(null);
  const mobileScrollContainerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch events for announcements
  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const data = await getPublicUpcomingEvents(10);
      setEvents(data.data || []);
    } catch (err) {
      console.error('Error fetching events for announcements:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch events on component mount and set up auto-refresh
  useEffect(() => {
    fetchEvents();
    
    // Auto-refresh events every 5 minutes to get updated events
    const refreshInterval = setInterval(() => {
      fetchEvents();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Enhanced auto-scroll effect for desktop announcements - Infinite continuous scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || events.length === 0) return;

    let scrollPosition = 0;
    let isScrolling = true;
    const scrollSpeed = 0.8; // Smooth scroll speed
    let firstSetHeight = 0;
    let animationFrameId = null;

    // Initialize: measure the height of first content set
    const initializeScroll = () => {
      const firstContentSet = scrollContainer.querySelector('div > div:first-child');
      if (firstContentSet) {
        firstSetHeight = firstContentSet.scrollHeight;
        // Start from top
        scrollContainer.scrollTop = 0;
        scrollPosition = 0;
      }
    };

    // Wait a bit for DOM to render
    setTimeout(initializeScroll, 200);

    const autoScroll = () => {
      if (!isScrolling || firstSetHeight === 0) {
        animationFrameId = requestAnimationFrame(autoScroll);
        return;
      }
      
      // Scroll from top to bottom (content moves up)
      scrollPosition += scrollSpeed;
      
      // When we've scrolled through one set, reset to top seamlessly
      // Since we have duplicated content, the reset is invisible
      if (scrollPosition >= firstSetHeight) {
        scrollPosition = 0;
        scrollContainer.scrollTop = 0;
      } else {
        scrollContainer.scrollTop = scrollPosition;
      }
      
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    // Start scrolling
    animationFrameId = requestAnimationFrame(autoScroll);

    // Pause on hover
    const handleMouseEnter = () => {
      isScrolling = false;
    };

    const handleMouseLeave = () => {
      isScrolling = true;
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [events]); // Re-run when events change

  // Auto-scroll effect for mobile announcement modal - Infinite continuous scroll
  useEffect(() => {
    if (!showMobileAnnouncement || events.length === 0) return;
    
    const mobileScrollContainer = mobileScrollContainerRef.current;
    if (!mobileScrollContainer) return;

    let scrollPosition = 0;
    let isScrolling = true;
    const scrollSpeed = 0.6; // Smooth scroll speed for mobile
    let firstSetHeight = 0;
    let animationFrameId = null;

    // Initialize: measure the height of first content set
    const initializeScroll = () => {
      const firstContentSet = mobileScrollContainer.querySelector('div > div:first-child');
      if (firstContentSet) {
        firstSetHeight = firstContentSet.scrollHeight;
        // Start from top
        mobileScrollContainer.scrollTop = 0;
        scrollPosition = 0;
      }
    };

    // Wait a bit for DOM to render
    setTimeout(initializeScroll, 200);

    const autoScroll = () => {
      if (!isScrolling || !showMobileAnnouncement || firstSetHeight === 0) {
        animationFrameId = requestAnimationFrame(autoScroll);
        return;
      }
      
      // Scroll from top to bottom (content moves up)
      scrollPosition += scrollSpeed;
      
      // When we've scrolled through one set, reset to top seamlessly
      if (scrollPosition >= firstSetHeight) {
        scrollPosition = 0;
        mobileScrollContainer.scrollTop = 0;
      } else {
        mobileScrollContainer.scrollTop = scrollPosition;
      }
      
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    // Start scrolling
    animationFrameId = requestAnimationFrame(autoScroll);

    // Pause on touch start (mobile)
    const handleTouchStart = () => {
      isScrolling = false;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isScrolling = true;
      }, 2000); // Resume after 2 seconds
    };

    mobileScrollContainer.addEventListener('touchstart', handleTouchStart);
    mobileScrollContainer.addEventListener('touchend', handleTouchEnd);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      mobileScrollContainer.removeEventListener('touchstart', handleTouchStart);
      mobileScrollContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [events, showMobileAnnouncement]); // Re-run when events change or modal opens

  // Helper functions for event display
  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'meeting': return '📅';
      case 'exam': return '📝';
      case 'holiday': return '🎉';
      case 'training': return '🎓';
      case 'workshop': return '🔧';
      case 'conference': return '🎤';
      case 'leave': return '🏖️';
      case 'general': return '📅';
      default: return '📅';
    }
  };

  const getEventTypeLabel = (eventType) => {
    if (!eventType) return 'Event';
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  };

  const getEventTypeLabelColor = (eventType) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-600/20 text-blue-700 border-blue-300/50';
      case 'exam': return 'bg-red-600/20 text-red-700 border-red-300/50';
      case 'holiday': return 'bg-green-600/20 text-green-700 border-green-300/50';
      case 'training': return 'bg-purple-600/20 text-purple-700 border-purple-300/50';
      case 'workshop': return 'bg-orange-600/20 text-orange-700 border-orange-300/50';
      case 'conference': return 'bg-indigo-600/20 text-indigo-700 border-indigo-300/50';
      case 'general': return 'bg-gray-600/20 text-gray-700 border-gray-300/50';
      default: return 'bg-gray-600/20 text-gray-700 border-gray-300/50';
    }
  };

  const getEventTypeLabelColorDark = (eventType) => {
    // For dark backgrounds (desktop announcements)
    switch (eventType) {
      case 'meeting': return 'bg-blue-600/30 text-blue-200 border-blue-400/30';
      case 'exam': return 'bg-red-600/30 text-red-200 border-red-400/30';
      case 'holiday': return 'bg-green-600/30 text-green-200 border-green-400/30';
      case 'training': return 'bg-purple-600/30 text-purple-200 border-purple-400/30';
      case 'workshop': return 'bg-orange-600/30 text-orange-200 border-orange-400/30';
      case 'conference': return 'bg-indigo-600/30 text-indigo-200 border-indigo-400/30';
      case 'general': return 'bg-gray-600/30 text-gray-200 border-gray-400/30';
      default: return 'bg-gray-600/30 text-gray-200 border-gray-400/30';
    }
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'meeting': return 'from-blue-50 to-blue-100 border-blue-200/50';
      case 'exam': return 'from-red-50 to-red-100 border-red-200/50';
      case 'holiday': return 'from-green-50 to-green-100 border-green-200/50';
      case 'training': return 'from-purple-50 to-purple-100 border-purple-200/50';
      case 'workshop': return 'from-orange-50 to-orange-100 border-orange-200/50';
      case 'conference': return 'from-indigo-50 to-indigo-100 border-indigo-200/50';
      case 'general': return 'from-gray-50 to-gray-100 border-gray-200/50';
      default: return 'from-gray-50 to-gray-100 border-gray-200/50';
    }
  };

  const getEventTypeIconColor = (eventType) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-600';
      case 'exam': return 'bg-red-600';
      case 'holiday': return 'bg-green-600';
      case 'training': return 'bg-purple-600';
      case 'workshop': return 'bg-orange-600';
      case 'conference': return 'bg-indigo-600';
      case 'general': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return '';
    const start = startTime.substring(0, 5);
    const end = endTime ? endTime.substring(0, 5) : '';
    return end ? `${start} - ${end}` : start;
  };

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const data = await loginUser(name, password);
      const token = data.token;
      const decodedToken = JSON.parse(atob(token.split(".")[1]));

      let role = decodedToken.role.toLowerCase();

      localStorage.setItem("token", token);
      setRole(role);

      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "manager":
          navigate("/manager");
          break;
        case "financial":
          navigate("/finance-admin");
          break;
        case "academic":
          navigate("/academic");
          break;
        case "state":
          navigate("/state-admin");
          break;
        case "center":
          navigate("/center-admin");
          break;
        case "teacher":
          navigate("/teacher");
          break;
        case "cardadmin":
          navigate("/cardadmin");
          break;
        case "resource_manager":
          navigate("/resource-manager");
          break;
        default:
          throw new Error("Invalid role detected: " + role);
      }
    } catch (error) {
      setError(error.message || "Login failed! Please check your credentials.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Mobile and tablet: allow scrolling */
        @media (max-width: 1023px) {
          body {
            overflow-y: auto;
          }
          html {
            overflow-y: auto;
          }
        }
        /* Desktop: fixed view */
        @media (min-width: 1024px) {
          body {
            overflow: hidden;
          }
          html {
            overflow: hidden;
          }
        }
        /* Slide in from right animation */
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutToRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div className="min-h-screen bg-white flex flex-col md:flex-row relative">
      {/* Left Panel - 40% - Branding & Announcements - BERRY Style */}
      <div 
        className="w-full md:w-2/5 text-white relative overflow-hidden hidden md:flex flex-col md:h-screen"
        style={{
          background: "linear-gradient(to right, #2196f3, #1976d2)"
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative z-10 flex flex-col h-full p-8 lg:p-12">
          {/* Desktop & Tablet Layout - Logo Left, Title and Empowering in Rows */}
          <div className="mb-8">
            <div className="flex items-start space-x-3 md:space-x-4">
              {/* Logo - Aligned with Empowering row */}
              <div className="flex-shrink-0 p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/20">
                <img src={Logo} alt="ISML Logo" className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain" />
              </div>
              <div className="flex-1 flex flex-col">
                {/* Row 1: Indian School For Modern Languages */}
                <h1 className="text-sm md:text-base lg:text-2xl xl:text-3xl font-black leading-tight text-white mb-2">
                  Indian School For Modern Languages
                </h1>
                {/* Row 2: Empowering educators & learners */}
                <h1 className="text-[9px] md:text-[10px] lg:text-base xl:text-lg text-blue-200 font-medium">
                  Empowering educators & learners
                </h1>
              </div>
            </div>
          </div>

          {/* Announcements Section - BERRY Style */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-3 md:mb-4">
              <div className="flex items-center space-x-2 md:space-x-3 mb-1.5 md:mb-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md border border-white/30">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white">Announcements</h3>
                  <p className="text-blue-200 text-xs md:text-sm">Latest Events & Updates</p>
                </div>
              </div>
            </div>

            {/* Announcements Scroll Container - BERRY Style */}
            <div className="flex-1 relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-md">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent z-10 pointer-events-none" />
              <div className="h-full overflow-y-auto scrollbar-hide p-3 md:p-4 lg:p-4" ref={scrollContainerRef} style={{ scrollBehavior: 'auto', overflowY: 'auto' }}>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-6 md:py-8">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white"></div>
                    <p className="text-blue-200 text-xs md:text-sm ml-2 md:ml-3">Loading events...</p>
                  </div>
                ) : events.length > 0 ? (
                  <>
                    {/* First set of events */}
                    <div className="space-y-2 md:space-y-3">
                      {events.map((event, index) => (
                        <div key={`first-${event.id || index}`} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 md:p-3 border border-white/20 hover:bg-white/20 transition-colors shadow-sm">
                          <div className="flex items-start gap-2 md:gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 ${getEventTypeIconColor(event.event_type)} rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0 shadow-md`}>
                              {getEventTypeIcon(event.event_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                <h4 className="font-semibold text-white text-xs md:text-sm">{event.title}</h4>
                                {event.event_type && (
                                  <span className={`px-1.5 py-0.5 ${getEventTypeLabelColorDark(event.event_type)} text-[9px] md:text-[10px] font-medium rounded`}>
                                    {getEventTypeLabel(event.event_type)}
                                  </span>
                                )}
                              </div>
                              <p className="text-blue-200 text-[10px] md:text-xs line-clamp-2 mb-1.5 md:mb-2">{event.description || 'No description available'}</p>
                              <div className="flex items-center gap-1.5 md:gap-2 text-blue-300 text-[10px] md:text-xs">
                                <span>{formatEventDate(event.event_start_date)}</span>
                                {event.event_start_time && (
                                  <span>• {formatEventTime(event.event_start_time, event.event_end_time)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Duplicated set for seamless loop */}
                    <div className="space-y-2 md:space-y-3">
                      {events.map((event, index) => (
                        <div key={`second-${event.id || index}`} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 md:p-3 border border-white/20 hover:bg-white/20 transition-colors shadow-sm">
                          <div className="flex items-start gap-2 md:gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 ${getEventTypeIconColor(event.event_type)} rounded-lg flex items-center justify-center text-white text-xs md:text-sm font-bold flex-shrink-0 shadow-md`}>
                              {getEventTypeIcon(event.event_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                <h4 className="font-semibold text-white text-xs md:text-sm">{event.title}</h4>
                                {event.event_type && (
                                  <span className={`px-1.5 py-0.5 ${getEventTypeLabelColorDark(event.event_type)} text-[9px] md:text-[10px] font-medium rounded`}>
                                    {getEventTypeLabel(event.event_type)}
                                  </span>
                                )}
                              </div>
                              <p className="text-blue-200 text-[10px] md:text-xs line-clamp-2 mb-1.5 md:mb-2">{event.description || 'No description available'}</p>
                              <div className="flex items-center gap-1.5 md:gap-2 text-blue-300 text-[10px] md:text-xs">
                                <span>{formatEventDate(event.event_start_date)}</span>
                                {event.event_start_time && (
                                  <span>• {formatEventTime(event.event_start_time, event.event_end_time)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 shadow-md border border-white/30">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-blue-200 text-xs md:text-sm">No upcoming events</p>
                    <p className="text-blue-300 text-[10px] md:text-xs mt-1">Check back later for updates</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - 60% - Login Form */}
      <div className="w-full md:w-3/5 bg-gray-50 flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12 min-h-screen md:h-screen overflow-y-auto">
        {/* Login Form Card - Centered */}
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
          {/* Mobile Logo & Header - Enhanced Design */}
          <div className="md:hidden mb-6 relative">
            {/* Animated Background Elements - BERRY Style */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            
            {/* Logo with BERRY Style Design */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                {/* Glow Effect - BERRY Style */}
                <div className="absolute inset-0 bg-blue-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                {/* Logo Container */}
                <div className="relative p-4 bg-white rounded-xl border border-gray-200 shadow-md transform group-hover:scale-105 transition-transform">
                  <img src={Logo} alt="ISML Logo" className="w-20 h-20 object-contain" />
                </div>
              </div>
            </div>
            
            {/* Header Text - BERRY Style */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black mb-2 text-gray-900 tracking-tight">
                Welcome Back
              </h1>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
                <div className="h-1 w-2 bg-blue-700 rounded-full"></div>
                <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-gray-600 text-sm font-medium">Sign in to continue to your portal</p>
            </div>
          </div>

          {/* Desktop/Tablet Header - BERRY Style */}
          <div className="hidden md:block mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm md:text-base">Sign in to continue to your portal</p>
          </div>

          {/* Mobile Announcement Button - BERRY Style */}
          <div className="md:hidden mb-6">
            <button
              onClick={() => setShowMobileAnnouncement(!showMobileAnnouncement)}
              className="w-full relative group overflow-hidden rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-br from-blue-50 to-blue-100"
            >
              {/* Content */}
              <div className="relative p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Icon Container - BERRY Style */}
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-base">Announcements</p>
                    <p className="text-gray-600 text-sm font-medium">{events.length} updates available</p>
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Login Form - BERRY Style */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 lg:p-10 relative overflow-hidden">
            {/* Decorative Elements for Mobile - BERRY Style */}
            <div className="md:hidden absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -z-0"></div>
            <div className="md:hidden absolute bottom-0 left-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -z-0"></div>
            <div className="relative z-10">
            <form className="space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-blue-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Username Input - BERRY Style */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-800 mb-2.5 md:mb-2">
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-3 flex items-center pointer-events-none z-10">
                <div 
                  className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shadow-md"
                  style={{
                    background: "linear-gradient(to right, #2196f3, #1976d2)"
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <input
                type="text"
                id="username"
                value={name}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-14 md:pl-14 pr-4 py-4 md:py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm md:text-base shadow-sm hover:border-blue-300"
                placeholder="Enter your username"
              />
            </div>
          </div>

          {/* Password Input - BERRY Style */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2.5 md:mb-2">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-3 flex items-center pointer-events-none z-10">
                <div 
                  className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shadow-md"
                  style={{
                    background: "linear-gradient(to right, #2196f3, #1976d2)"
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-14 md:pl-14 pr-14 md:pr-12 py-4 md:py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm md:text-base shadow-sm hover:border-blue-300"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 md:pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button - BERRY Style */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 md:py-4 rounded-xl text-white font-bold text-base md:text-lg transition-all duration-300 relative overflow-hidden group shadow-md ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
            }`}
            style={{
              background: loading ? undefined : "linear-gradient(to right, #2196f3, #1976d2)"
            }}
          >
            {/* Animated Shine Effect for Mobile */}
            {!loading && (
              <div className="md:hidden absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
            <div className="flex items-center justify-center space-x-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign In</span>
                </>
              )}
            </div>
          </button>
            </form>
            </div>
          </div>
        </div>

        {/* Footer - BERRY Style */}
        <div className="w-full max-w-md mx-auto mt-auto pt-6 text-center">
          <div className="md:hidden mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-gradient-to-r from-transparent to-gray-300"></div>
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <div className="h-0.5 w-8 bg-gradient-to-l from-transparent to-gray-300"></div>
            </div>
          </div>
          <p className="text-xs text-gray-500 md:text-gray-500">
            2025 ISML Portal by IYPAN Educational Centre Pvt. Ltd. <br></br> Version 2.0
          </p>
        </div>
      </div>
    </div>

      {/* Mobile Announcement Modal - BERRY Style with Slide Animation */}
      {showMobileAnnouncement && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 lg:hidden flex items-end sm:items-center justify-end p-0 sm:p-3 transition-all duration-300"
          onClick={() => setShowMobileAnnouncement(false)}
        >
          <div 
            className="w-full sm:w-[90%] md:max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl bg-white shadow-md border border-gray-200 relative overflow-hidden flex flex-col transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideInFromRight 0.3s ease-out'
            }}
          >
            {/* Mobile Announcement Header - BERRY Style */}
            <div className="bg-blue-600 px-4 sm:px-6 py-3 sm:py-4 sm:rounded-t-xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center shadow-md border border-white/30">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Announcements</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">Latest Events & Updates</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileAnnouncement(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors shadow-md border border-white/30"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Events Container with Auto-scroll - BERRY Style */}
            <div className="relative flex-1 overflow-hidden min-h-0">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/10 to-transparent z-10 pointer-events-none" />
              <div className="h-full overflow-y-auto scrollbar-hide p-4 sm:p-5 md:p-6" ref={mobileScrollContainerRef} style={{ scrollBehavior: 'auto' }}>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 text-xs ml-2">Loading events...</p>
                  </div>
                ) : events.length > 0 ? (
                  <>
                    {/* First set of events */}
                    <div className="space-y-3 sm:space-y-4">
                      {events.map((event, index) => (
                        <div key={`mobile-first-${event.id || index}`} className={`bg-gradient-to-br ${getEventTypeColor(event.event_type)} rounded-xl p-3 border shadow-sm`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 ${getEventTypeIconColor(event.event_type)} rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                              {getEventTypeIcon(event.event_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 text-xs">{event.title}</h4>
                                {event.event_type && (
                                  <span className={`px-1.5 py-0.5 ${getEventTypeLabelColor(event.event_type)} text-[9px] font-medium rounded`}>
                                    {getEventTypeLabel(event.event_type)}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 text-xs mt-1 line-clamp-2">{event.description || 'No description available'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-600 text-xs font-medium">{formatEventDate(event.event_start_date)}</p>
                                {event.event_start_time && (
                                  <p className="text-gray-600 text-xs font-medium">
                                    {formatEventTime(event.event_start_time, event.event_end_time)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Duplicated set for seamless loop */}
                    <div className="space-y-3 sm:space-y-4">
                      {events.map((event, index) => (
                        <div key={`mobile-second-${event.id || index}`} className={`bg-gradient-to-br ${getEventTypeColor(event.event_type)} rounded-xl p-3 border shadow-sm`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 ${getEventTypeIconColor(event.event_type)} rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                              {getEventTypeIcon(event.event_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 text-xs">{event.title}</h4>
                                {event.event_type && (
                                  <span className={`px-1.5 py-0.5 ${getEventTypeLabelColor(event.event_type)} text-[9px] font-medium rounded`}>
                                    {getEventTypeLabel(event.event_type)}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 text-xs mt-1 line-clamp-2">{event.description || 'No description available'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-600 text-xs font-medium">{formatEventDate(event.event_start_date)}</p>
                                {event.event_start_time && (
                                  <p className="text-gray-600 text-xs font-medium">
                                    {formatEventTime(event.event_start_time, event.event_end_time)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-200 shadow-sm">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-700 text-xs">No upcoming events</p>
                    <p className="text-gray-600 text-xs mt-1">Check back later for updates</p>
                  </div>
                )}
              </div>
              
              {/* Mobile Auto-scroll indicator - BERRY Style */}
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
