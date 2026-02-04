import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from 'lucide-react';
import Navbar from "../components/Navbar";
import { getCentersForStateAdmin, getCurrentUserProfile } from "../services/Api"; 
import StateNotificationBell from "../components/StateNotificationBell";


function ViewCentersPage() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;



  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });


  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userName = (decodedToken?.full_name && 
                    decodedToken.full_name !== null && 
                    decodedToken.full_name !== undefined && 
                    String(decodedToken.full_name).trim() !== '') 
    ? decodedToken.full_name 
    : (decodedToken?.name || 'State Admin');




  const getDisplayName = () => {
    if (profileInfo?.full_name && profileInfo.full_name.trim() !== '') {
      return profileInfo.full_name;
    }
    if (userName && userName.trim() !== '') {
      return userName;
    }
    return "State Admin";
  };




  // Format date helper function
  const formatDate = (dateString) => {

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    const handleMobileMenuStateChange = (event) => setIsMobileMenuOpen(event.detail);
    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
    window.addEventListener('sidebarToggle', handleSidebarToggle);

    const fetchProfileInfo = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfileInfo(response.data);
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfileInfo();

    window.addEventListener('profileUpdated', fetchProfileInfo);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      window.removeEventListener('profileUpdated', fetchProfileInfo);
    };
  }, []);



  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  useEffect(() => {

    const fetchCenters = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await getCentersForStateAdmin(token);

        if (!response || !response.success) {
          throw new Error(response?.message || 'Failed to fetch centers');
        }

        // Sort centers by created_at date (newest first)
        const sortedCenters = response.data.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );

        setCenters(sortedCenters);
      } catch (error) {
        console.error("Error fetching centers:", error);
        setError(error.message || "Failed to load centers");
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  // Filter centers based on search
  const filteredCenters = centers.filter(center => 
    center.center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.center_admin_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCenters = filteredCenters.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleCenterClick = (center) => {

    if (!center.center_admin) {
      setError("This center doesn't have an admin assigned yet");
      return;
    }

    setSelectedCenter({
      center_id: center.center_id,
      center_name: center.center_name,
      // No state_name in API response, only state ID
    });

    localStorage.setItem(
      "selectedCenterView",
      JSON.stringify({
        center_id: center.center_id,
        center_name: center.center_name,
      })
    );

    try {
      navigate(`/state-admin/center/${center.center_id}/students`);
    } catch (error) {
      console.error("Navigation error:", error);
      setError("Failed to navigate to center view");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar
        showCenterViewOptions={!!selectedCenter}
        selectedCenter={selectedCenter}
      />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>


        {/* Top Header Bar - BERRY Style */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                {/* Mobile Toggle */}
                <button 
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}
                >
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Centers Overview</h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate">View and manage all centers in your state</p>
                </div>
              </div>

              {/* Right: Notifications & Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <StateNotificationBell />
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center focus:outline-none"
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {isProfileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName() || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">State Admin</p>
                        </div>


                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/state/account-settings');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"

                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-700">Account Settings</span>
                          </button>

                          <button
                            onClick={() => {
                              localStorage.removeItem("token");
                              navigate("/login");
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-gray-200"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">Logout</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>


        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Search and Action Header - BERRY Style */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Centers</h2>
                  <p className="text-sm text-gray-500">{filteredCenters.length} centers found</p>
                </div>
              </div>
              
              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  placeholder="Search centers..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-lg shadow-sm animate-shake">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-20 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Centers</h3>
                  <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the centers data...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Center Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Center Admin
                        </th>
                        <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Created Date
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedCenters.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center">
                              <Building2 className="w-12 h-12 text-gray-300 mb-4" />
                              <h4 className="text-lg font-semibold text-gray-600">No Centers Found</h4>
                              <p className="text-gray-500">Try adjusting your search terms</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedCenters.map((center) => (
                          <tr
                            key={center.center_id}
                            className="hover:bg-blue-50/50 transition-colors duration-200 group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                  {center.center_name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {center.center_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {center.center_admin_name || center.center_admin || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500 uppercase tracking-tighter">Admin</span>
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                ${center.center_admin 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${center.center_admin ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {center.center_admin ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                <p className="font-medium">{formatDate(center.created_at)}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleCenterClick(center)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                              >
                                View Details
                                <svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Section - BERRY Style */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredCenters.length)}</span> of <span className="font-medium">{filteredCenters.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {getPageNumbers().map((page, idx) => (
                            <button
                              key={idx}
                              onClick={() => typeof page === 'number' ? goToPage(page) : null}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } ${page === '...' ? 'cursor-default' : ''}`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewCentersPage;