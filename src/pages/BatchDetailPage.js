import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getBatchById, getTeacherBatchStudents } from '../services/Api';

function BatchDetailPage() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        const [batchResponse, studentsResponse] = await Promise.all([
          getBatchById(token, batchId),
          getTeacherBatchStudents(batchId, token)
        ]);

        if (batchResponse && batchResponse.success) {
          setBatch(batchResponse.data);
        }

        if (studentsResponse && studentsResponse.success && Array.isArray(studentsResponse.data)) {
          setStudents(studentsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Navbar />
        <div className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="flex-grow flex items-center justify-center h-screen bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Navbar />
        <div className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="flex-grow p-8 bg-gray-100">
                  <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Navbar />
      <div className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              <div className="responsive-padding">
                {batch && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-800">{batch.batch_name}</h1>
                      <p className="text-gray-600 mt-1">Batch Details</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Basic Information</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500">Duration</p>
                            <p className="font-medium text-gray-800">{batch.duration} months</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Center</p>
                            <p className="font-medium text-gray-800">{batch.center_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Course Details</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500">Course ID</p>
                            <p className="font-medium text-gray-800">{batch.course_id}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Created At</p>
                            <p className="font-medium text-gray-800">
                              {new Date(batch.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Additional Info</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-500">Batch ID</p>
                            <p className="font-medium text-gray-800">{batch.batch_id}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Center ID</p>
                            <p className="font-medium text-gray-800">{batch.center}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">Enrolled Students</h2>
                      <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                          <div className="align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Reg. Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Phone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Center
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {students.map((student) => (
                                    <tr key={student.enrollment_id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.registration_number}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {student.email}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {student.phone}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {student.center_name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                          student.status 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {student.status ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                      {students.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No students enrolled in this batch
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchDetailPage;
