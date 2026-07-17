import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getReferredStudents, getCenterByAdminId } from '../services/Api';
import CenterHeader from '../components/CenterHeader';
import { UserCheck } from 'lucide-react';

function ReferredStudentsPage() {
  const [referredStudents, setReferredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true' ? '6rem' : '16rem';
    }
    return '16rem';
  });
  const [isMobile, setIsMobile] = useState(false);

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
      } catch (err) {
        console.error('Failed to load center info:', err);
        setSelectedCenter({ center_id: 'unknown', center_name: 'Unknown Center' });
      }
    };

    loadCenter();

    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleSidebarToggle = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarWidth(saved === 'true' ? '6rem' : '16rem');
    };
    window.addEventListener('sidebarToggle', handleSidebarToggle);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
    };
  }, []);

  // Load referred students
  useEffect(() => {
    const fetchReferredStudents = async () => {
      if (!selectedCenter?.center_id) return;

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        const response = await getReferredStudents(selectedCenter.center_id, token);

        if (!response || !response.success) {
          throw new Error(response?.message || 'Failed to fetch referred students');
        }

        setReferredStudents(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching referred students:', err);
        setError(err.message || 'Failed to load referred students');
        setReferredStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReferredStudents();
  }, [selectedCenter]);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Navbar showCenterViewOptions={!!selectedCenter} selectedCenter={selectedCenter} />
      <div 
        className="flex-1 overflow-y-auto transition-all duration-300" 
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        <CenterHeader 
          title="Referred Students" 
          subtitle={selectedCenter ? `Students referred by ${selectedCenter.center_name}` : 'Referral tracking overview'} 
          icon={UserCheck}
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-end">
              <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
                {referredStudents.length} {referredStudents.length === 1 ? 'Student' : 'Students'} Referred
              </div>
            </div>

              {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>
              )}

              {loading ? (
                <div className="flex justify-center py-8 sm:py-12">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  {referredStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <svg
                        className="mx-auto h-16 w-16 text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Referred Students</h3>
                      <p className="text-gray-500">You haven't referred any students yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reg #
                              </th>
                              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="hidden sm:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="hidden md:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                              </th>
                              <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Referred Date
                              </th>
                              <th className="hidden xl:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Center
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {referredStudents.map((student) => (
                              <tr key={student.student_id} className="hover:bg-gray-50">
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-none">
                                  {student.registration_number || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 truncate max-w-[100px] sm:max-w-none">
                                  {student.name}
                                </td>
                                <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 truncate max-w-[150px] md:max-w-none">
                                  {student.email}
                                </td>
                                <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                  {formatPhone(student.phone)}
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                  <span
                                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${student.status
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                      }`}
                                  >
                                    {student.status ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                  {formatDate(student.created_at)}
                                </td>
                                <td className="hidden xl:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                  {student.center_name || 'N/A'}
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

export default ReferredStudentsPage;



















