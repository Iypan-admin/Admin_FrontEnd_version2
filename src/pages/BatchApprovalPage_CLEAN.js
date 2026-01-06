import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RejectionModal from "../components/RejectionModal";
import EditBatchModal from "../components/EditBatchModal";
import CreateBatchModal from "../components/CreateBatchModal";
import EnrolledStudentsModal from "../components/EnrolledStudentsModal";
import { getBatches, approveBatch, rejectBatch, updateBatch, createBatch, deleteBatch } from "../services/Api";

const BatchApprovalPage = () => {
  const navigate = useNavigate();
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, batchId:垮, batchName: '' });
  const [editingBatch, setEditingBatch] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [enrolledStudentsModal, setEnrolledStudentsModal] = useState({ isOpen: false, batchId: null, batchName: null });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'completed'

  // Filter batches by search term
  const filteredBatches = allBatches.filter((batch) => {
    const query = searchTerm.toLowerCase();
    return (
      batch.batch_name?.toLowerCase().includes(query) ||
      batch.center_name?.toLowerCase().includes(query) ||
      batch.course_name?.toLowerCase().includes(query) ||
      batch.teacher_name?.toLowerCase().includes(query) ||
      batch.created_by?.toLowerCase().includes(query)
    );
  });

  // Get user role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        setUserRole(decodedToken.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  // Role-based permission helpers
  const canCreate = () => ['admin', 'manager', 'academic'].includes(userRole);
  const canEdit = () => ['admin', 'manager', 'academic'].includes(userRole);
  const canDelete = () => userRole === 'admin';
  const canApprove = () => ['admin', 'manager'].includes(userRole);

  // Organize batches by status
  const pendingBatches = filteredBatches.filter(batch => batch.status === 'Pending');
  const approvedBatches = filteredBatches.filter(batch => 
    ['Approved', 'Started'].includes(batch.status)
  );
  const completedBatches = filteredBatches.filter(batch => batch.status === 'Completed');
  const rejectedBatches = filteredBatches.filter(batch => batch.status === 'Rejected');

  // Filter batches based on active tab
  const getTabBatches = () => {
    switch (activeTab) {
      case 'pending':
        return pendingBatches;
      case 'approved':
        return approvedBatches;
      case 'completed':
        return completedBatches;
      default:
        return [];
    }
  };

  const fetchAllBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await getBatches(token);
      
      console.log("🔄 Frontend: Fetched batches response:", response);
      
      if (response?.success && Array.isArray(response.data)) {
        console.log("🔄 Frontend: Setting batches data:", response.data);
        setAllBatches(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setError("Failed to load batches: " + error.message);
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBatches();
  }, []);

  const handleApprove = async (batchId) => {
    try {
      setActionLoading(prev => ({ ...prev, [batchId]: 'approving' }));
      const token = localStorage.getItem("token");
      
      const response = await approveBatch(token, batchId);
      
      if (response?.success) {
        alert("Batch approved successfully!");
        await fetchAllBatches();
      } else {
        throw new Error(response?.message || "Failed to approve batch");
      }
    } catch (error) {
      console.error("Approve batch error:", error);
      alert("Failed to approve batch. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [batchId]: null }));
    }
  };

  const handleRejectClick = (batchId, batchName) => {
    setRejectionModal({
      isOpen: true,
      batchId,
      batchName
    });
  };

  const handleRejectConfirm = async (rejectionReason) => {
    try {
      setActionLoading(prev => ({ ...prev, [rejectionModal.batchId]: 'rejecting' }));
      const token = localStorage.getItem("token");
      
      const response = await rejectBatch(token, rejectionModal.batchId, rejectionReason);
      
      if (response?.success) {
        alert("Batch rejected successfully!");
        setRejectionModal({ isOpen: false, batchId: null, batchName: '' });
        await fetchAllBatches();
      } else {
        throw new Error(response?.message || "Failed to reject batch");
      }
    } catch (error) {
      console.error("Reject batch error:", error);
      alert("Failed to reject batch. Please try again.");
    } finally {
      setActionLoading(prev => ({ ...prev, [rejectionModal.batchId]: null }));
    }
  };

  const handleRejectCancel = () => {
    setRejectionModal({ isOpen: false, batchId: null, batchName: '' });
  };

  const handleUpdateBatch = async (batchId, updateData) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");

      console.log("🔄 Frontend: Updating batch:", { batchId, updateData });
      console.log("🔄 Frontend: max_students value:", updateData.max_students, typeof updateData.max_students);

      const response = await updateBatch(token, batchId, updateData);

      if (response && response.success) {
        console.log("✅ Frontend: Update successful, refreshing data...");
        alert("Batch updated successfully!");
        await fetchAllBatches();
        setEditingBatch(null);
      } else {
        throw new Error(response?.message || "Failed to update batch");
      }
    } catch (error) {
      console.error("Update batch error:", error);
      setError(`Failed to update batch: ${error.message}`);
      alert("Failed to update batch. Please try again.");
    }
  };

  const handleCreateBatch = async (batchData) => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      await createBatch(token, batchData);
      await fetchAllBatches();
      setShowCreateModal(false);
      alert("Batch created successfully!");
    } catch (error) {
      console.error("Failed to create batch:", error);
      setError("Failed to create batch: " + error.message);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      setActionLoading(prev => ({ ...prev, [batchId]: 'deleting' }));
      const token = localStorage.getItem("token");
      
      const response = await deleteBatch(token, batchId);
      
      if (response?.success) {
        // Remove the batch from the local state
        setAllBatches(prev => prev.filter(batch => batch.batch_id !== batchId));
        alert('Batch deleted successfully');
      } else {
        throw new Error(response?.error || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [batchId]: null }));
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return timeString;
  };

  const formatDate =// ... (keeping the first 828 lines as-is) ...





