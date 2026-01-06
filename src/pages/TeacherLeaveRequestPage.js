import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getTeacherBatches } from "../services/Api";
import { createTeacherLeaveRequest, getMyLeaveRequests } from "../services/Api";

function TeacherLeaveRequestPage() {
  const [batches, setBatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get today's date in YYYY-MM-DD format for minimum date restriction
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await getTeacherBatches(token);
        setBatches(resp.data || []);
      } catch (e) { console.error(e); }
      await loadRequests();
    })();
  }, []);

  const loadRequests = async () => {
    try {
      const resp = await getMyLeaveRequests();
      setRequests(resp.data || []);
    } catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.batch_id || !form.request_type || !form.date_from || !form.date_to) {
      alert("Please fill all required fields including Request Type.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        // Backend only accepts LEAVE/SUB_TEACHER; normalize while preserving selected type
        request_type: 'LEAVE',
        leave_type: form.request_type, // send selected leave type separately
      };
      await createTeacherLeaveRequest(payload);
      setForm({ batch_id: "", request_type: "LEAVE", reason: "", date_from: "", date_to: "" });
      await loadRequests();
      setIsModalOpen(false); // Close modal on success
      alert("Request submitted");
    } catch (err) {
      alert(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const startedBatches = (batches || []).filter(b => (b.status === 'Started' || b.status === 'started'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex relative overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-64 overflow-y-auto h-screen">
        <div className="p-4 lg:p-8">
          {/* Enhanced Page Header */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-black/5"></div>
              <div className="absolute -top-2 -right-2 w-24 sm:w-32 h-24 sm:h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
              
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  <div className="flex items-center space-x-3 sm:space-x-4 group flex-1">
                    <div className="p-2 sm:p-3 lg:p-4 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                        Leave / Sub-Teacher Request
                      </h1>
                      <p className="text-blue-100 text-xs sm:text-sm lg:text-base font-medium mb-2 sm:mb-3">
                        Submit a leave or permanent leave request for your active batches
                      </p>
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs sm:text-sm md:text-base border border-white/30 hover:border-white/40 transition-all duration-200">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>Only batches with status <span className="font-bold">Started</span> are eligible</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Open Form Button */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base border border-white/30 hover:border-white/50"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <span>New Request</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Request Form Modal */}
            {isModalOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                  onClick={() => setIsModalOpen(false)}
                ></div>
                
                {/* Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
                  <div 
                    className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-blue-100 overflow-hidden relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Decorative Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                    
                    {/* Form Header */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-blue-100 sticky top-0 z-10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Create Leave Request</h2>
                            <p className="text-xs text-gray-600 mt-0.5 hidden sm:block">Fill in the details below to submit your request</p>
                          </div>
                        </div>
                        {/* Close Button */}
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-white/80 hover:bg-white rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 transition-all duration-200 hover:scale-110 shadow-md flex-shrink-0"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={submit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Batch Selection */}
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      Batch
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none cursor-pointer font-medium text-sm sm:text-base text-gray-700 hover:border-blue-300"
                        value={form.batch_id} 
                        onChange={e=>setForm(f=>({...f,batch_id:e.target.value}))}
                      >
                    <option value="">Select batch</option>
                    {startedBatches.map(b => (
                      <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                    ))}
                  </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </div>
                  {startedBatches.length === 0 && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                        ⚠️ No started batches available for requests.
                      </p>
                  )}
                </div>

                  {/* Request Type */}
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      Request Type
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none cursor-pointer font-medium text-sm sm:text-base text-gray-700 hover:border-blue-300"
                        required 
                        value={form.request_type} 
                        onChange={e=>setForm(f=>({...f,request_type:e.target.value}))}
                      >
                    <option value="LEAVE">Leave</option>
                    <option value="PERMANENT_LEAVE">Permanent Leave</option>
                  </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* From Date */}
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      From Date
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        min={today}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-sm sm:text-base text-gray-700 hover:border-blue-300"
                        value={form.date_from} 
                        onChange={e=>setForm(f=>({...f,date_from:e.target.value}))} 
                      />
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      To Date
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        min={form.date_from || today}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-sm sm:text-base text-gray-700 hover:border-blue-300"
                        value={form.date_to} 
                        onChange={e=>setForm(f=>({...f,date_to:e.target.value}))} 
                      />
                </div>
                </div>
                </div>

                {/* Reason Textarea */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Reason
                  </label>
                  <textarea 
                    className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-sm sm:text-base text-gray-700 hover:border-blue-300 resize-none"
                    rows="4" 
                    placeholder="Enter your reason for leave request..."
                    value={form.reason} 
                    onChange={e=>setForm(f=>({...f,reason:e.target.value}))} 
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-3 sm:pt-4 border-t border-gray-100">
                  <button 
                    disabled={submitting} 
                    className="group relative w-full px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg hover:shadow-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 overflow-hidden"
                  >
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
                </div>
              </>
            )}

            {/* Requests Table */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-blue-100 p-3 sm:p-4 lg:p-6 overflow-hidden">
              {/* Enhanced Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">My Requests</h3>
                    <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">View and track your leave requests</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 rounded-xl border border-blue-200 w-full sm:w-auto justify-center sm:justify-start">
                  <span className="text-xs font-medium text-gray-600">Total:</span>
                  <span className="text-sm font-bold text-blue-600">{requests.length}</span>
                </div>
              </div>

              {/* Enhanced Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-inner -mx-2 sm:mx-0">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                          </svg>
                          <span className="whitespace-nowrap">Batch</span>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                          </svg>
                          <span className="whitespace-nowrap">Type</span>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          <span className="whitespace-nowrap">From</span>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          <span className="whitespace-nowrap">To</span>
                        </div>
                      </th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span className="whitespace-nowrap">Status</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {requests.map((r, index) => (
                      <tr 
                        key={r.id} 
                        className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeIn 0.3s ease-out forwards'
                        }}
                      >
                        <td className="px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                              </svg>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                              {r.batch?.batch_name || r.batch_id || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
                          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 shadow-sm whitespace-nowrap">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                            {r.request_type === 'PERMANENT_LEAVE' ? <span className="hidden sm:inline">Permanent </span> : ''}Leave
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">{r.date_from || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">{r.date_to || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 lg:px-4 py-3 sm:py-4">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap ${
                            r.status === 'APPROVED' 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                              : r.status === 'PENDING' 
                              ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border border-yellow-200' 
                              : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200'
                          }`}>
                            {r.status === 'APPROVED' ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                              </svg>
                            ) : r.status === 'PENDING' ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            )}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td className="px-6 py-12 text-center" colSpan="5">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-medium shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              No requests yet. Submit your first leave request above.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherLeaveRequestPage;


