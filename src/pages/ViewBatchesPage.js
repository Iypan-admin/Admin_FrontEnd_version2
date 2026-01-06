import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCenterByAdminId, getBatchesByCenter, getCenterById } from '../services/Api';

function ViewBatchesPage() {
  const { centerId: paramCenterId } = useParams(); // From URL (state admin login)
  const location = useLocation();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [centerId, setCenterId] = useState(paramCenterId || null);


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

  // Fetch batches for the center
  useEffect(() => {
    const fetchBatches = async () => {
      if (!centerId) return; // Wait for centerId to be set

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        // Fetch batches for the center
        const batchRes = await getBatchesByCenter(centerId, token);
        
        if (!batchRes?.success) {
          throw new Error(batchRes?.message || 'Failed to fetch batches');
        }

        setBatches(Array.isArray(batchRes.data) ? batchRes.data : []);
      } catch (err) {
        console.error('Error fetching batches:', err);
        setError(err.message || 'Failed to load batches');
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [centerId]);



  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Fixed Navbar */}
      <div className="fixed inset-y-0 left-0 z-40">
        <Navbar
          showCenterViewOptions={!!selectedCenter}
          selectedCenter={selectedCenter}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Enhanced Header Section */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                          Center Batches
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base">
                          View and manage all batches for {selectedCenter?.center_name || 'this center'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-xs text-blue-100 mb-1">Total Batches</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : batches.length}</p>
                      </div>
                      <div className="flex items-center space-x-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-white font-medium">Live</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
              </div>
              
              {/* Enhanced Error Display */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-6 shadow-lg flex items-center space-x-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Error Loading Batches</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Enhanced Table Card */}
              {!error && (loading ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-16">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading batches...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                          <tr>
                            <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Batch Name
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Course
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                              Type
                            </th>
                            <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Teacher
                              </div>
                            </th>
                            <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Duration
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {batches.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 sm:px-6 text-center py-16">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                  </div>
                                  <p className="text-gray-500 font-medium text-lg">No batches found</p>
                                  <p className="text-gray-400 text-sm mt-2">No batches have been created for this center yet</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            batches.map((batch) => (
                              <tr key={batch.batch_id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-l-4 border-transparent hover:border-blue-400">
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900">{batch.batch_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{batch.course_name}</div>
                                  <div className="text-xs text-gray-500 mt-1">{batch.mode || 'N/A'}</div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    batch.course_type === 'Immersion'
                                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                                      : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {batch.course_type}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  {batch.teacher_name ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700">{batch.teacher_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400 italic">Not Assigned</span>
                                  )}
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-gray-700 font-medium">{batch.duration} months</span>
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewBatchesPage;
