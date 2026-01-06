import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import {
  createUser,
  getAllUsers,
  editUser,
  deleteUser,
  forceDeleteUser,
  assignTeacher,
  assignAcademicCoordinator,
  assignManager,
  assignFinancialPartner
} from "../services/Api";
import CreateUserModal from "../components/CreateUserModal";
import EditUserModal from "../components/EditUserModal";
import AssignTeacherModal from "../components/AssignTeacherModal";
import AssignAdminModal from "../components/AssignAdminModal";
import AssignAcademicModal from "../components/AssignAcademicModal";
import AssignManagerModal from "../components/AssignManagerModal";
import AssignFinancialModal from "../components/AssignFinancialModal";
import TutorInfoModal from "../components/TutorInfoModal";
import { ROLE_CONFIG } from "../config/roleConfig";

const ManageUsersPage = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Enhanced Header Section */}
              <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative p-8 lg:p-12">
                  <div className="flex flex-col lg:flex-row items-center justify-between">
                    <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                          {role === "academic" ? "Manage Teachers" : "Manage Users"}
                        </h1>
                        <p className="text-blue-100 text-lg lg:text-xl">
                          {role === "academic" ? "Add and manage teacher accounts" : "Create and manage user accounts efficiently"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg font-semibold border border-white/30"
                    >
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      {role === "academic" ? "Add Teacher" : "Create User"}
                    </button>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
              </div>
              {/* Enhanced Search and Filter Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Search & Filter</h2>
                    <p className="text-sm text-gray-500">Find users by name, role, or other criteria</p>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                    />
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="lg:w-64">
                    <select
                      value={filterRole}
                      onChange={(e) => handleFilterRoleChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                    >
                      {getRoleOptions()}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 p-4 rounded-xl shadow-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">{error}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Table Container */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">User Management</h3>
                        <p className="text-sm text-gray-500">{getFilteredUsers().length} users found</p>
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
                    <table className="min-w-[1000px] divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                        <tr>
                          {/* User Details */}
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            User Details
                          </th>
                          {/* Role */}
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Role & Status
                          </th>
                          {/* Created At - hidden on mobile */}
                          <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Created At
                          </th>
                          {/* Actions */}
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative">
                                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                </div>
                                <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Users</h3>
                                <p className="mt-2 text-gray-500">Please wait while we fetch user data...</p>
                              </div>
                            </td>
                          </tr>
                        ) : getFilteredUsers().length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Users Found</h3>
                                <p className="text-gray-500 mb-6 max-w-md text-center">
                                  {searchTerm ? 'No users match your search criteria. Try adjusting your search terms.' : 'Get started by creating your first user.'}
                                </p>
                                {!searchTerm && (
                                  <button
                                    onClick={() => setShowCreateUserModal(true)}
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
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
                          getFilteredUsers().map((user) => (
                            <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                              {/* User Details */}
                              <td className="px-6 py-6">
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                      {user.name?.charAt(0)?.toUpperCase() || user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-800 truncate">
                                      {user.name}
                                    </p>
                                    {user.full_name && (
                                      <p className="text-xs text-gray-500 group-hover:text-gray-600 truncate">
                                        {user.full_name}
                                      </p>
                                    )}
                                    {/* View Full Info button for tutors */}
                                    {user.role === 'teacher' && (
                                      <button
                                        onClick={() => handleViewTutorInfo(user.id, user.name)}
                                        className="mt-2 inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
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

                              {/* Role & Status */}
                              <td className="px-6 py-6">
                                <div className="space-y-2">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800">
                                    {user.role}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${user.status ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    <span className={`text-xs font-medium ${user.status ? 'text-green-600' : 'text-red-600'}`}>
                                      {user.status ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Created At - hidden on mobile */}
                              <td className="hidden md:table-cell px-6 py-6">
                                <div className="text-sm text-gray-600 group-hover:text-gray-800">
                                  <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                                  <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleTimeString()}</p>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-6">
                                <div className="flex items-center space-x-2">
                                  {/* Edit */}
                                  <button
                                    className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>

                                  {/* Assign (conditions) */}
                                  {(role === "manager" || role === "admin") &&
                                    !user.status &&
                                    (user.role === "state" || user.role === "center") && (
                                      <button
                                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setShowAssignAdminModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "academic" && (
                                      <button
                                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        onClick={() => {
                                          setSelectedAcademicId(user.id);
                                          setShowAssignAcademicModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "manager" && (
                                      <button
                                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        onClick={() => {
                                          setSelectedManagerId(user.id);
                                          setShowAssignManagerModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {role === "admin" &&
                                    !user.status &&
                                    user.role === "financial" && (
                                      <button
                                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        onClick={() => {
                                          setSelectedFinancialId(user.id);
                                          setShowAssignFinancialModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {(role === "academic" || role === "admin") &&
                                    user.role === "teacher" &&
                                    !user.status && (
                                      <button
                                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                        onClick={() => {
                                          setSelectedTeacherId(user.id);
                                          setShowAssignModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Assign
                                      </button>
                                    )}

                                  {/* Delete Button - Admin Only */}
                                  {role === "admin" && (
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                      title="Delete User (May be blocked if user has active references)"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  )}

                                  {/* Force Delete Button - Only show if regular delete failed */}
                                  {role === "admin" && failedDeleteUser && failedDeleteUser.id === user.id && (
                                    <button
                                      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                      onClick={() => handleForceDeleteUser(user.id, user.name)}
                                      title="Force Delete User (Removes all references first)"
                                    >
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                      Force Delete
                                    </button>
                                  )}

                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

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
        <TutorInfoModal
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