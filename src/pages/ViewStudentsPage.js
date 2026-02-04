import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getStudentsByCenter, getCenterById, getCenterByAdminId, getCurrentUserProfile } from '../services/Api';
import StateNotificationBell from "../components/StateNotificationBell";
import CenterHeader from '../components/CenterHeader';
import { Users, Search } from 'lucide-react';


function ViewStudentsPage() {
  const { centerId: paramCenterId } = useParams(); // From URL (state admin login)
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const userRole = decodedToken?.role?.toLowerCase();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [centerId, setCenterId] = useState(paramCenterId || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });


  // Format date helper function
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // Format phone helper
  const formatPhone = (phone) =>
    phone ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : 'N/A';

  // Load center info
  useEffect(() => {
    const loadCenter = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        if (paramCenterId) {
          // ✅ State admin login (centerId comes from URL)
          if (location.state?.centerName) {
            setSelectedCenter({
              center_id: paramCenterId,
              center_name: location.state.centerName,
            });
            setCenterId(paramCenterId);
            return;
          }

          const centerResponse = await getCenterById(paramCenterId, token);
          if (!centerResponse || !centerResponse.success) {
            throw new Error(centerResponse?.message || 'Failed to fetch center info');
          }

          const center = centerResponse.data;
          setSelectedCenter({
            center_id: center.center_id,
            center_name: center.center_name,
          });
          setCenterId(center.center_id);
        } else {
          // ✅ Center login (no centerId in URL → fetch by admin)
          const centerResponse = await getCenterByAdminId(token);
          if (!centerResponse || !centerResponse.success) {
            throw new Error(centerResponse?.message || 'Failed to fetch center info');
          }

          const center = Array.isArray(centerResponse.data)
            ? centerResponse.data[0]
            : centerResponse.data;

          setSelectedCenter({
            center_id: center.center_id,
            center_name: center.center_name,
          });
          setCenterId(center.center_id);
        }
      } catch (err) {
        console.error('Failed to load center info:', err);
        setSelectedCenter({ center_id: 'unknown', center_name: 'Unknown Center' });
      }
    };

    loadCenter();
  }, [paramCenterId, location.state]);

  // Sync mobile menu state with Navbar
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

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange);
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent('toggleMobileMenu', { detail: newState }));
  };

  const getDisplayName = () => {
    return profileInfo?.full_name || "State Admin";
  };


  // Load students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!centerId) return;

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        const response = await getStudentsByCenter(centerId, token);

        if (!response || !response.success) {
          throw new Error(response?.message || 'Failed to fetch students');
        }

        setStudents(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err.message || 'Failed to load students');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [centerId]);

  // Filter and pagination logic
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };


  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Navbar showCenterViewOptions={!!selectedCenter} selectedCenter={selectedCenter} />
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        
        {userRole === 'center' ? (
          <CenterHeader 
            title="Center Students" 
            subtitle={selectedCenter ? `Viewing students for ${selectedCenter.center_name}` : 'Enrolled students overview'} 
            icon={Users}
          />
        ) : (
          /* Top Header Bar - BERRY Style (State Admin) */
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-3 sm:py-4 min-h-[4rem]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <button 
                    onClick={toggleMobileMenu}
                    className="lg:hidden p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                    style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate">Center Students</h1>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate">
                      {selectedCenter ? `Viewing students for ${selectedCenter.center_name}` : 'Enrolled students overview'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                  <StateNotificationBell />
                  <div className="relative">
                    <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center focus:outline-none">
                      {profilePictureUrl ? (
                        <img src={profilePictureUrl} alt="Profile" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-blue-300 transition-all" />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md">
                          {getDisplayName()?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {isProfileDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden text-left">
                          <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                            <h3 className="font-bold text-gray-800 text-base">Welcome, {getDisplayName() || "User"}</h3>
                            <p className="text-sm text-gray-500 mt-1 capitalize">State Admin</p>
                          </div>
                          <div className="py-2">
                            <button onClick={() => { navigate('/state/account-settings'); setIsProfileDropdownOpen(false); }} className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                              <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span className="text-sm text-gray-700">Account Settings</span>
                            </button>
                            <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); setIsProfileDropdownOpen(false); }} className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-gray-200">
                              <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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
        )}

        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Search and Header - BERRY Style */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md bg-white border border-gray-100">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Students List</h2>
                  <p className="text-sm text-gray-500">{filteredStudents.length} students enrolled</p>
                </div>
              </div>
              
              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  placeholder="Search by name, reg # or email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-20 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Students</h3>
                  <p className="mt-2 text-sm text-gray-500">Please wait while we fetch students data...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registration #</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                        <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="hidden lg:table-cell px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center">
                              <Users className="w-12 h-12 text-gray-300 mb-4" />
                              <h4 className="text-lg font-semibold text-gray-600">No Students Found</h4>
                              <p className="text-gray-500">Try adjusting your search filters</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((student) => (
                          <tr key={student.student_id} className="hover:bg-blue-50/30 transition-colors duration-200 group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                                  {student.registration_number || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                  {student.name?.charAt(0).toUpperCase()}
                                </div>
                                <button
                                  onClick={() => navigate(`/student/${student.student_id}`)}
                                  className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors hover:underline cursor-pointer"
                                >
                                  {student.name}
                                </button>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">{student.email}</span>
                            </td>
                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">{formatPhone(student.phone)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${student.status ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${student.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {student.status ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-medium">
                              {formatDate(student.created_at)}
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
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span> of <span className="font-medium">{filteredStudents.length}</span> results
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                        
                        {getPageNumbers().map((page, idx) => (
                          <button key={idx} onClick={() => typeof page === 'number' ? goToPage(page) : null} className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-all ${page === currentPage ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'} ${page === '...' ? 'cursor-default border-transparent bg-transparent' : ''}`}>
                            {page}
                          </button>
                        ))}

                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        </button>
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

export default ViewStudentsPage;
