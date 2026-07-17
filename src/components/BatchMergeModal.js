import React, { useState, useEffect } from 'react';
import { X, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { getBatchesForMerge, createMergeGroup } from '../services/Api';

const BatchMergeModal = ({ isOpen, onClose, onSuccess }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [formData, setFormData] = useState({
        merge_name: '',
        batch_ids: [],
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchEligibleBatches();
            // Reset form when modal opens
            setFormData({
                merge_name: '',
                batch_ids: [],
                notes: ''
            });
            setError(null);
            // Trigger slide-in animation after modal is shown
            setTimeout(() => setIsVisible(true), 10);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const fetchEligibleBatches = async () => {
        try {
            setFetching(true);
            const token = localStorage.getItem('token');
            const response = await getBatchesForMerge(token);
            
            if (response.success) {
                setBatches(response.data || []);
            }
        } catch (err) {
            console.error('Error fetching batches for merge:', err);
            setError('Failed to fetch batches');
        } finally {
            setFetching(false);
        }
    };

    const handleBatchToggle = (batchId) => {
        setFormData(prev => {
            const batchIds = prev.batch_ids;
            
            // If unchecking, remove it
            if (batchIds.includes(batchId)) {
                return {
                    ...prev,
                    batch_ids: batchIds.filter(id => id !== batchId)
                };
            } 
            // If checking, no validation needed - any batches can be merged
            else {
                return {
                    ...prev,
                    batch_ids: [...batchIds, batchId]
                };
            }
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.merge_name.trim()) {
            setError('Merge name is required');
            return;
        }

        if (formData.batch_ids.length < 2) {
            setError('Please select at least 2 batches to merge');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await createMergeGroup(formData, token);
            
            if (response.success) {
                onSuccess(response);
                handleClose();
            }
        } catch (err) {
            console.error('Error creating merge group:', err);
            setError(err.message || 'Failed to create merge group');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for animation to complete
    };

    if (!isOpen) return null;

    // Group batches by course for better organization
    const batchesByCourse = batches.reduce((acc, batch) => {
        const course = batch.course_name || 'Unknown Course';
        if (!acc[course]) acc[course] = [];
        acc[course].push(batch);
        return acc;
    }, {});

    const selectedBatches = batches.filter(b => formData.batch_ids.includes(b.batch_id));

    return (
        <div 
            className={`fixed inset-0 bg-black z-50 overflow-y-auto transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleClose}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
            {/* Right Side Modal - BERRY Style with Smooth Slide Animation */}
            <div 
                className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[36rem] lg:w-[40rem] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
                    isVisible ? 'translate-x-0' : 'translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header - BERRY Style */}
                <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #2196f3, #1976d2)' }}>
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Merge Batches</h2>
                    </div>
                    <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                    >
                            <X className="w-5 h-5 text-gray-500" />
                    </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Merge Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Merge Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.merge_name}
                                onChange={(e) => setFormData({ ...formData, merge_name: e.target.value })}
                                placeholder="e.g., Weekend English Merge"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Notes (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add any additional notes about this merge..."
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Selected Batches Summary */}
                        {selectedBatches.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">
                                        {selectedBatches.length} batch{selectedBatches.length !== 1 ? 'es' : ''} selected:
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedBatches.map(batch => (
                                        <span 
                                            key={batch.batch_id}
                                            className="px-3 py-1 bg-white border border-blue-300 rounded-lg text-sm text-blue-900"
                                        >
                                            {batch.batch_name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Batch Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Select Batches to Merge <span className="text-red-500">*</span>
                                <span className="text-gray-500 text-xs font-normal block mt-1">
                                    Select 2+ batches to merge (any course or level). Only batches with "Started" status can be merged.
                                </span>
                            </label>

                            {fetching ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-3"></div>
                                    <p className="text-sm text-gray-500">Loading batches...</p>
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">
                                    No eligible batches found. Batches must have "Started" status to be merged.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-4">
                                    {Object.entries(batchesByCourse).map(([course, courseBatches]) => (
                                        <div key={course} className="mb-4">
                                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <h3 className="font-semibold text-blue-900 text-xs">
                                                    📚 {course}
                                                </h3>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    Select 2+ batches from this course
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                {courseBatches.map(batch => {
                                                    const isSelected = formData.batch_ids.includes(batch.batch_id);
                                                    const isMerged = batch.is_merged;
                                                    
                                                    return (
                                                        <label
                                                            key={batch.batch_id}
                                                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                                                                isSelected 
                                                                    ? 'bg-blue-50 border-blue-300' 
                                                                    : 'hover:bg-gray-50 border-gray-200'
                                                            } ${isMerged ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleBatchToggle(batch.batch_id)}
                                                                disabled={isMerged}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm text-gray-900 break-words">
                                                                    {batch.batch_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                                                    {batch.level && (
                                                                        <div>
                                                                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                            Level: {batch.level}
                                                                        </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="break-words">
                                                                        Teacher: {batch.teacher_name || 'N/A'}
                                                                    </div>
                                                                    <div className="break-words">
                                                                    Center: {batch.center_name || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isMerged && (
                                                                <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded flex-shrink-0">
                                                                    Merged
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-gray-600 min-w-0">
                                    <p className="font-medium mb-1">Important: Batch Merge Rules</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs ml-1">
                                        <li>No restrictions - any batches can be merged together</li>
                                        <li>Only batches with "Started" status can be merged</li>
                                        <li>Tutors from all merged batches will share the same chat/communication channel</li>
                                        <li>Students will receive messages from all tutors in the merge group</li>
                                        <li>Students will not know their batch is merged - it's invisible to them</li>
                                        <li>Batch data (enrollment, attendance, etc.) remains separate</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shadow-sm">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading || formData.batch_ids.length < 2}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Creating...
                            </>
                        ) : (
                            'Create Merge'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchMergeModal;

