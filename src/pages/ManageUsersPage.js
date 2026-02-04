import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import AcademicNotificationBell from "../components/AcademicNotificationBell";
import ManagerNotificationBell from "../components/ManagerNotificationBell";
import AdminNotificationBell from "../components/AdminNotificationBell";
import {
  createUser,
  getAllUsers,
  editUser,
  deleteUser,
  forceDeleteUser,
  assignTeacher,
  assignAcademicCoordinator,
  assignManager,
  assignFinancialPartner,
  getCurrentUserProfile
} from "../services/Api";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";
import AssignTeacherModal from "../components/AssignTeacherModal";
import AssignAdminModal from "../components/AssignAdminModal";
import AssignAcademicModal from "../components/AssignAcademicModal";
import AssignManagerModal from "../components/AssignManagerModal";
import AssignFinancialModal from "../components/AssignFinancialModal";
import TutorInfoSlidePanel from "../components/TutorInfoSlidePanel";
import { ROLE_CONFIG } from "../config/roleConfig";

const ManageUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAssignAcademicModal, setShowAssignAcademicModal] = useState(false);
  const [selectedAcademicId, setSelectedAcademicId] = useState(null);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [showAssignFinancialModal, setShowAssignFinancialModal] = useState(false);
  const [selectedFinancialId, setSelectedFinancialId] = useState(null);
  const [showTutorInfoModal, setShowTutorInfoModal] = useState(false);
  const [selectedTutorId, setSelectedTutorId] = useState(null);
  const [selectedTutorName, setSelectedTutorName] = useState('');
  const [failedDeleteUser, setFailedDeleteUser] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});

  // Get current user's name from token
  const token = localStorage.getItem("token");
  const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const tokenFullName = decodedToken?.full_name || null;
  
  // Get display name
  const getDisplayName = () => {
    if (tokenFullName && tokenFullName.trim() !== '') {
      return tokenFullName;
    }
    return "Academic Coordinator";
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Fetch user profile picture
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getCurrentUserProfile();
        if (response.success && response.data) {
          setProfilePictureUrl(response.data.profile_picture || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const useDebounce = (callback, delay) => {
    const debouncedFn = useCallback(
      (...args) => {
        const timeoutId = setTimeout(() => callback(...args), delay);
        return () => clearTimeout(timeoutId);
      },
      [callback, delay]
    );
    return debouncedFn;
  };

  const getRoleOptions = () => {
    switch (role) {
      case "admin":
        return (
          <>
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="financial">Financial</option>
            <option value="academic">Academic</option>
            <option value="state">State</option>
            <option value="center">Center</option>
            <option value="teacher">Teacher</option>
            <option value="cardadmin">cardadmin</option>
            <option value="resource_manager">Resource Manager</option>
          </>
        );
      case "manager":
        return (
          <>
            <option value="all">All Roles</option>
            <option value="state">State</option>
            <option value="center">Center</option>
          </>
        );
      case "academic":
        return <option value="teacher">Teacher</option>;
      case "financial":
        return (
          <>
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="academic">Academic</option>
            <option value="state">State</option>
            <option value="center">Center</option>
            <option value="teacher">Teacher</option>
          </>
        );
      default:
        return (
          <option value="all">All Roles</option>
        );
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const searchParams = {
        pagination: false,
        limit: 9999,
      };

      if (debouncedSearchTerm) {
        searchParams.search = debouncedSearchTerm;
      }

      // Role-specific filtering
      if (role === "academic") {
        searchParams.role = "teacher";
      } else if (role === "manager") {
        if (filterRole !== "all") {
          searchParams.role = filterRole;
        }
        // We'll filter for state/center in the frontend
      } else if (filterRole !== "all") {
        searchParams.role = filterRole;
      }

      const response = await getAllUsers(1, 9999, searchParams);

      if (response && response.data) {
        let filteredData = Array.isArray(response.data) ? response.data : [];

        // Additional role-specific filtering
        if (role === "manager") {
          filteredData = filteredData.filter((user) =>
            ["state", "center"].includes(user.role?.toLowerCase())
          );
        } else if (role === "academic") {
          filteredData = filteredData.filter((user) =>
            user.role?.toLowerCase() === "teacher"
          );
        }

        setUsers(filteredData);
      } else {
        setError("No data received from server");
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(error.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterRole, role]);

  const debouncedSetSearchTerm = useDebounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSetSearchTerm(value);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setRole(decodedToken.role.toLowerCase());
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  useEffect(() => {
    console.log("Current role:", role);
    console.log("Available roles:", ROLE_CONFIG[role]?.allowedRoles);
  }, [role]);

  useEffect(() => {
    fetchUsers(1);
  }, [debouncedSearchTerm, filterRole, fetchUsers]);

  const handleCreateUser = async (userData) => {
    try {
      setError(null);
      await createUser(userData);
      fetchUsers();
      setShowCreateUserModal(false);
    } catch (error) {
      setError(error.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    // Frontend role check - only admin can delete users
    if (role !== 'admin') {
      setError('Only admin users can delete other users');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setFailedDeleteUser(null);
      const token = localStorage.getItem('token');
      await deleteUser(userId, token);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      // Handle specific error messages from backend
      const errorMessage = error.message || 'Failed to delete user';
      setError(errorMessage);
      
      // Show additional info for reference errors
      if (errorMessage.includes('referenced in:')) {
        console.warn('User has foreign key references:', errorMessage);
        setFailedDeleteUser({ id: userId, name: userName, error: errorMessage });
      }
    }
  };

  const handleForceDeleteUser = async (userId, userName) => {
    // Frontend role check - only admin can force delete users
    if (role !== 'admin') {
      setError('Only admin users can force delete other users');
      return;
    }

    // Confirmation dialog with warning
    const confirmed = window.confirm(
      `⚠️ FORCE DELETE WARNING ⚠️\n\n` +
      `Are you sure you want to FORCE DELETE user "${userName}"?\n\n` +
      `This will:\n` +
      `• Remove ALL references to this user\n` +
      `• Delete the user permanently\n` +
      `• This action CANNOT be undone\n\n` +
      `Type "FORCE DELETE" to confirm:`
    );

    if (!confirmed) return;

    // Additional confirmation
    const forceConfirm = window.prompt(
      `Type "FORCE DELETE" to confirm force deletion of user "${userName}":`
    );

    if (forceConfirm !== "FORCE DELETE") {
      setError('Force delete cancelled - confirmation text did not match');
      return;
    }

    try {
      setError(null);
      setFailedDeleteUser(null);
      const token = localStorage.getItem('token');
      await forceDeleteUser(userId, token);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      const errorMessage = error.message || 'Failed to force delete user';
      setError(errorMessage);
    }
  };


  const handleFilterRoleChange = (value) => {
    setFilterRole(value);
  };

  const getFilteredUsers = useCallback(() => {
    if (!Array.isArray(users)) {
      console.error("Users is not an array:", users);
      return [];
    }

    const filteredUsers = users.filter((user) => {
      if (!user) return false;

      const matchesSearch = user.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // For academic role, only show teachers
      if (role === "academic") {
        return matchesSearch && user.role?.toLowerCase() === "teacher";
      }

      // For manager role
      if (role === "manager") {
        if (filterRole === "all") {
          return (
            matchesSearch &&
            ["state", "center"].includes(user.role?.toLowerCase())
          );
        }
        return (
          matchesSearch &&
          user.role?.toLowerCase() === filterRole.toLowerCase() &&
          ["state", "center"].includes(user.role?.toLowerCase())
        );
      }

      // For other roles
      if (filterRole === "all") {
        return matchesSearch;
      }
      return (
        matchesSearch && user.role?.toLowerCase() === filterRole.toLowerCase()
      );
    });

    // Sort users: inactive first (status: false), then active (status: true)
    return filteredUsers.sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status ? 1 : -1; // If a is active (true), move it after b
    });
  }, [users, searchTerm, filterRole, role]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  // Pagination calculations
  const filteredUsers = getFilteredUsers();
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Pagination helper functions
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      await editUser(userId, userData, token);
      fetchUsers();
      setShowEditUserModal(false);
      setEditingUser(null);
    } catch (error) {
      setError(error.message || 'Failed to update user');
    }
  };

  const handleAssignTeacher = async (teacherId, centerId) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      await assignTeacher({ userId: teacherId, centerId }, token);
      setShowAssignModal(false);
      await fetchUsers();
    } catch (error) {
      setError(error.message || 'Failed to assign teacher');
    }
  };

  const handleAssignAdmin = async () => {
    await fetchUsers();
    setShowAssignAdminModal(false);
    setSelectedUser(null);
  };

  const handleAssignAcademicCoordinator = async (academicId, managerId) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      await assignAcademicCoordinator({ userId: academicId, managerId }, token);
      setShowAssignAcademicModal(false);
      await fetchUsers();
    } catch (error) {
      setError(error.message || 'Failed to assign academic coordinator');
    }
  };

  const handleAssignManager = async (managerId) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      await assignManager({ userId: managerId }, token);
      setShowAssignManagerModal(false);
      await fetchUsers();
    } catch (error) {
      setError(error.message || 'Failed to assign manager');
    }
  };

  const handleAssignFinancialPartner = async (financialId, managerId) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      await assignFinancialPartner({ userId: financialId, managerId }, token);
      setShowAssignFinancialModal(false);
      await fetchUsers();
    } catch (error) {
      setError(error.message || 'Failed to assign financial partner');
    }
  };

  const handleViewTutorInfo = (userId, userName) => {
    setSelectedTutorId(userId);
    setSelectedTutorName(userName);
    setShowTutorInfoModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar />
      
      {/* Main Content Area - BERRY Style */}
      <div className="flex-1 overflow-y-auto transition-all duration-300" style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}>
        {/* Top Header Bar - BERRY Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Hamburger Menu & Title */}
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
                          {role === "academic" ? "Manage Teachers" : "Manage Users"}
                        </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          {role === "academic" ? "Add and manage teacher accounts" : "Create and manage user accounts efficiently"}
                        </p>
                      </div>
                    </div>

              {/* Right: Notifications, Profile */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {role === "manager" && <ManagerNotificationBell />}
                {role === "admin" && <AdminNotificationBell />}
                {role === "academic" && <AcademicNotificationBell />}

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
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all shadow-md">
                        {getDisplayName()?.charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                          <h3 className="font-bold text-gray-800 text-base">
                            Welcome, {getDisplayName()?.split(' ')[0] || "User"}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 capitalize">{role || "Academic Coordinator"}</p>
                        </div>

                        <div className="py-2">
                          <button
                            onClick={() => {
                              const settingsPaths = {
                                'academic': '/account-settings',
                                'manager': '/manager/account-settings',
                                'admin': '/admin/account-settings'
                              };
                              const path = settingsPaths[role] || '/account-settings';
                              navigate(path);
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
                              navigate("/");
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors border-t border-gray-200"
                          >
                            <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm text-gray-700">Logout</span>
                    </button>
                  </div>
                </div>
                    </>
                  )}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Header Section with Create Button - BERRY Style */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                      {role === "academic" ? "Teachers" : "Users"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredUsers.length} {role === "academic" ? "teachers" : "users"} found
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  style={{ backgroundColor: '#2196f3' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  {role === "academic" ? "Add Teacher" : "Create User"}
                </button>
                </div>
                
            {/* Search and Filter Section - BERRY Style */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="sm:w-64">
                    <select
                      value={filterRole}
                      onChange={(e) => handleFilterRoleChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      {getRoleOptions()}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">{error}</span>
                    </div>
                  </div>
                )}
              </div>

            {/* Table Container - BERRY Style */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Created At
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan="5" className="px-4 sm:px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Users</h3>
                                <p className="mt-2 text-sm text-gray-500">Please wait while we fetch user data...</p>
                              </div>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 sm:px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Users Found</h3>
                                <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
                                  {searchTerm ? 'No users match your search criteria. Try adjusting your search terms.' : 'Get started by creating your first user.'}
                                </p>
                                {!searchTerm && (
                                  <button
                                    onClick={() => setShowCreateUserModal(true)}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                    style={{ backgroundColor: '#2196f3' }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                                  >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Your First User
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                      {user.name?.charAt(0)?.toUpperCase() || user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {user.name}
                                    </p>
                                    {user.full_name && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {user.full_name}
                                      </p>
                                    )}
                                    {user.role === 'teacher' && (
                                      <button
                                        onClick={() => handleViewTutorInfo(user.id, user.name)}
                                        className="mt-1 inline-flex items-center px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Full Info
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Role Column with Icon */}
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  {/* Role Icon based on role type */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    user.role === 'admin' ? 'bg-red-100' :
                                    user.role === 'manager' ? 'bg-purple-100' :
                                    user.role === 'academic' ? 'bg-blue-100' :
                                    user.role === 'teacher' ? 'bg-green-100' :
                                    user.role === 'financial' ? 'bg-yellow-100' :
                                    user.role === 'state' ? 'bg-indigo-100' :
                                    user.role === 'center' ? 'bg-pink-100' :
                                    'bg-gray-100'
                                  }`}>
                                    {user.role === 'admin' ? (
                                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    ) : user.role === 'manager' ? (
                                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                      </svg>
                                    ) : user.role === 'academic' ? (
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                    ) : user.role === 'teacher' ? (
                                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                    ) : user.role === 'financial' ? (
                                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : user.role === 'state' ? (
                                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : user.role === 'center' ? (
                                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900 capitalize">
                                    {user.role}
                                  </span>
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="px-4 sm:px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${user.status ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                  <span className={`text-sm font-medium ${user.status ? 'text-green-600' : 'text-red-600'}`}>
                                      {user.status ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                              </td>

                              <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                                  <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleTimeString()}</p>
                                </div>
                              </td>

                              <td className="px-4 sm:px-6 py-4">
                                <div className="relative">
                                  {/* 3-Dot Menu Button */}
                                  <button
                                    ref={el => actionButtonRefs.current[user.id] = el}
                                    onClick={(e) => {
                                      const button = e.currentTarget;
                                      const rect = button.getBoundingClientRect();
                                      setDropdownPosition({
                                        top: rect.bottom + 8,
                                        left: rect.right - 160 // Adjust based on dropdown width
                                      });
                                      setOpenActionMenu(openActionMenu === user.id ? null : user.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Action Dropdown Menu */}
                                  {openActionMenu === user.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[100]"
                                        onClick={() => setOpenActionMenu(null)}
                                      ></div>
                                      <div 
                                        className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[101] overflow-hidden min-w-[160px]"
                                        style={{
                                          top: `${dropdownPosition.top}px`,
                                          left: `${dropdownPosition.left}px`
                                        }}
                                      >
                                        {/* Edit Button */}
                                        <button
                                          onClick={() => {
                                            handleEditUser(user);
                                            setOpenActionMenu(null);
                                          }}
                                          className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                  >
                                          <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>

                                        {/* Assign Buttons - Conditional */}
                                  {(role === "manager" || role === "admin") &&
                                    !user.status &&
                                    (user.role === "state" || user.role === "center") && (
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setShowAssignAdminModal(true);
                                                setOpenActionMenu(null);
                                        }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                      >
                                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "academic" && (
                                      <button
                                        onClick={() => {
                                          setSelectedAcademicId(user.id);
                                          setShowAssignAcademicModal(true);
                                                setOpenActionMenu(null);
                                        }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                      >
                                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "manager" && (
                                      <button
                                        onClick={() => {
                                          setSelectedManagerId(user.id);
                                          setShowAssignManagerModal(true);
                                                setOpenActionMenu(null);
                                        }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                      >
                                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "financial" && (
                                      <button
                                        onClick={() => {
                                          setSelectedFinancialId(user.id);
                                          setShowAssignFinancialModal(true);
                                                setOpenActionMenu(null);
                                        }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                      >
                                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {(role === "academic" || role === "admin") &&
                                    user.role === "teacher" &&
                                    !user.status && (
                                      <button
                                        onClick={() => {
                                          setSelectedTeacherId(user.id);
                                          setShowAssignModal(true);
                                                setOpenActionMenu(null);
                                        }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                                      >
                                              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {/* Delete Button - Admin Only */}
                                  {role === "admin" && (
                                          <>
                                            <div className="border-t border-gray-200 my-1"></div>
                                    <button
                                              onClick={() => {
                                                handleDeleteUser(user.id, user.name);
                                                setOpenActionMenu(null);
                                              }}
                                              className="w-full flex items-center px-4 py-2.5 text-left hover:bg-red-50 transition-colors text-sm text-red-600"
                                    >
                                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                          </>
                                  )}

                                  {/* Force Delete Button - Only show if regular delete failed */}
                                  {role === "admin" && failedDeleteUser && failedDeleteUser.id === user.id && (
                                    <button
                                            onClick={() => {
                                              handleForceDeleteUser(user.id, user.name);
                                              setOpenActionMenu(null);
                                            }}
                                            className="w-full flex items-center px-4 py-2.5 text-left hover:bg-orange-50 transition-colors text-sm text-orange-600"
                                    >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                      Force Delete
                                    </button>
                                  )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                {/* Pagination - BERRY Style */}
                {filteredUsers.length > 0 && (
                  <div className="flex items-center justify-between mt-6 px-4 sm:px-6 py-4 border-t border-gray-200">
                    {/* Left: Showing entries info */}
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} entries
              </div>

                    {/* Right: Pagination buttons - Only show when more than 1 page */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        {/* Previous button */}
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        {/* Page numbers */}
                        {getPageNumbers().map((page, idx) => {
                          if (page === '...') {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}

                        {/* Next button */}
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
            </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onCreateUser={handleCreateUser}
          currentUserRole={role}
          forcedRole={role === "academic" ? "teacher" : undefined}
        />
      )}

      {showEditUserModal && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setShowEditUserModal(false);
            setEditingUser(null);
          }}
          onUpdate={handleUpdateUser}
        />
      )}

      {showAssignModal && (
        <AssignTeacherModal
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTeacherId(null);
          }}
          onAssign={handleAssignTeacher}
          teacherId={selectedTeacherId}
        />
      )}

      {showAssignAdminModal && selectedUser && (
        <AssignAdminModal
          user={selectedUser}
          onClose={() => {
            setShowAssignAdminModal(false);
            setSelectedUser(null);
          }}
          onAssign={handleAssignAdmin}
        />
      )}

      {showAssignAcademicModal && (
        <AssignAcademicModal
          onClose={() => {
            setShowAssignAcademicModal(false);
            setSelectedAcademicId(null);
          }}
          onAssign={handleAssignAcademicCoordinator}
          academicId={selectedAcademicId}
        />
      )}

      {showAssignManagerModal && (
        <AssignManagerModal
          onClose={() => {
            setShowAssignManagerModal(false);
            setSelectedManagerId(null);
          }}
          onAssign={handleAssignManager}
          managerId={selectedManagerId}
        />
      )}

      {showAssignFinancialModal && (
        <AssignFinancialModal
          onClose={() => {
            setShowAssignFinancialModal(false);
            setSelectedFinancialId(null);
          }}
          onAssign={handleAssignFinancialPartner}
          financialId={selectedFinancialId}
        />
      )}

      {showTutorInfoModal && (
        <TutorInfoSlidePanel
          isOpen={showTutorInfoModal}
          onClose={() => {
            setShowTutorInfoModal(false);
            setSelectedTutorId(null);
            setSelectedTutorName('');
          }}
          userId={selectedTutorId}
          userName={selectedTutorName}
        />
      )}
    </div>
  );
};

export default ManageUsersPage;