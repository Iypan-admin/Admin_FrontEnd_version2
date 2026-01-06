import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getTeachersByCenter, getCenterByAdminId, getCenterById } from '../services/Api';

function ViewTeachersPage() {
  const { centerId: paramCenterId } = useParams(); // From URL (state admin login)
  const location = useLocation();
  const [teachers, setTeachers] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerId, setCenterId] = useState(paramCenterId || null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  // Fetch teachers for the center
  useEffect(() => {
    const fetchTeachers = async () => {
      if (!centerId) return; // Wait for centerId to be set

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        const teachersResponse = await getTeachersByCenter(centerId, token);
        if (!teachersResponse || !teachersResponse.success) {
          throw new Error(teachersResponse?.message || 'Failed to fetch teachers data');
        }
        if (!Array.isArray(teachersResponse.data)) {
          throw new Error('Invalid teachers data format received');
        }

        setTeachers(teachersResponse.data);
      } catch (err) {
        console.error('Error details:', err);
        setError(err.message || 'Failed to load data');
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [centerId]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar showCenterViewOptions={!!selectedCenter} selectedCenter={selectedCenter} />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header - Center Admin Style */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black opacity-10"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                      Center Teachers
                    </h1>
                    <p className="text-blue-100 text-lg">
                      {selectedCenter ? `Teachers at ${selectedCenter.center_name}` : 'View all teachers in this center'}
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-blue-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {teachers.length} {teachers.length === 1 ? 'Teacher' : 'Teachers'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            {error && (
              <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <h4 className="text-xl font-semibold text-gray-600 mb-2">Loading Teachers</h4>
                <p className="text-gray-500">Please wait while we fetch the teachers data...</p>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                {teachers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No Teachers Found</h4>
                    <p className="text-gray-500">No teachers are assigned to this center</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200/50">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Teacher Name</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Joined Date</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-200/50">
                          {teachers.map((teacher) => (
                            <tr key={teacher.teacher_id} className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">
                                      {teacher.teacher_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                                      {teacher.teacher_name}
                                    </div>
                                    <div className="text-xs text-gray-500">Teacher</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formatDate(teacher.created_at)}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

export default ViewTeachersPage;
