import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { listSubTutorRequests, approveSubTutorRequest, rejectSubTutorRequest } from "../services/Api";
import { getTeachersByCenter } from "../services/Api";

function AcademicSubTutorRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [centerTeachers, setCenterTeachers] = useState({}); // centerId -> teachers
  const [selectedSubs, setSelectedSubs] = useState({}); // requestId -> teacherId
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    load();
  }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await listSubTutorRequests(statusFilter);
      setRequests(resp.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const ensureCenterTeachers = async (centerId) => {
    if (centerTeachers[centerId]) return;
    try {
      const token = localStorage.getItem('token');
      const data = await getTeachersByCenter(centerId, token);
      setCenterTeachers(prev => ({ ...prev, [centerId]: data.data || [] }));
    } catch (e) { console.error(e); }
  };

  const approve = async (req) => {
    const subId = selectedSubs[req.id];
    if (!subId) return alert('Select a sub teacher');
    try {
      await approveSubTutorRequest(req.id, subId);
      await load();
    } catch (e) { alert(e.message || 'Failed'); }
  };

  const reject = async (req) => {
    try {
      await rejectSubTutorRequest(req.id);
      await load();
    } catch (e) { alert(e.message || 'Failed'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex relative overflow-hidden">
      <Navbar />
      {/* Keep navbar fixed; only content scrolls */}
      <div className="flex-1 lg:ml-64 overflow-y-auto h-screen">
        <div className="p-4 lg:p-8">
          {/* Page Heading */}
          <div className="mb-4">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              Sub-Tutor Requests
            </h1>
            <p className="text-sm text-gray-600">Review pending approvals, assign sub teachers, and track approved requests.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Sub-Tutor Requests</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusFilter==='PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {statusFilter === 'PENDING' ? 'Pending' : 'Approved'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-gray-100 rounded-full p-0.5 shadow-inner">
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${statusFilter==='PENDING' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}
                    onClick={()=>setStatusFilter('PENDING')}
                  >Pending</button>
                  <button
                    className={`ml-1 px-3 py-1.5 rounded-full text-xs sm:text-sm ${statusFilter==='APPROVED' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}
                    onClick={()=>setStatusFilter('APPROVED')}
                  >Approved</button>
                </div>
                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e)=>setSearchQuery(e.target.value)}
                    placeholder="Search by batch or teacher..."
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                </div>
                <button onClick={load} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm text-xs sm:text-sm">Refresh</button>
              </div>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-gray-600">
                      <th className="p-2 whitespace-nowrap">Batch</th>
                      <th className="p-2 whitespace-nowrap hidden md:table-cell">Requesting Teacher</th>
                      <th className="p-2 whitespace-nowrap hidden sm:table-cell">Type</th>
                      <th className="p-2 whitespace-nowrap">From</th>
                      <th className="p-2 whitespace-nowrap">To</th>
                      <th className="p-2 whitespace-nowrap">{statusFilter === 'PENDING' ? 'Select Sub Teacher' : 'Assigned Sub Teacher'}</th>
                      {statusFilter === 'PENDING' && (<th className="p-2 whitespace-nowrap">Actions</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests
                      .filter(r => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        const batch = (r.batch?.batch_name || r.batch?.batch_id || '').toLowerCase();
                        const mainName = (r.main_teacher?.teacher_info?.full_name || r.main_teacher?.teacher_info?.name || '').toLowerCase();
                        const subName = (r.sub_teacher?.teacher_info?.full_name || r.sub_teacher?.teacher_info?.name || '').toLowerCase();
                        return batch.includes(q) || mainName.includes(q) || subName.includes(q);
                      })
                      .map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="p-2 sm:p-3 font-medium text-gray-900 whitespace-nowrap">{r.batch?.batch_name || r.batch?.batch_id}</td>
                        <td className="p-2 sm:p-3 text-gray-800 hidden md:table-cell">{r.main_teacher?.teacher_info?.full_name || r.main_teacher?.teacher_info?.name || r.main_teacher?.teacher_id}</td>
                        <td className="p-2 sm:p-3 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                            {r.request_type}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 whitespace-nowrap"><span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-gray-700">{r.date_from}</span></td>
                        <td className="p-2 sm:p-3 whitespace-nowrap"><span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-gray-700">{r.date_to}</span></td>
                        <td className="p-2 sm:p-3">
                          {statusFilter === 'PENDING' ? (
                            <div className="flex gap-2 items-center">
                              <button
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 whitespace-nowrap"
                                onClick={() => ensureCenterTeachers(r.batch?.center)}
                              >Load Teachers</button>
                              <select
                                className="border rounded px-2 py-1 bg-white shadow-sm text-xs"
                                value={selectedSubs[r.id] || ''}
                                onChange={e=>setSelectedSubs(prev=>({...prev,[r.id]:e.target.value}))}
                              >
                                <option value="">Select</option>
                                {(centerTeachers[r.batch?.center] || []).map(t => (
                                  <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_full_name || t.teacher_name || t.teacher_id}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-gray-800 text-xs sm:text-sm">{
                              r.sub_teacher?.teacher_info?.full_name ||
                              r.sub_teacher?.teacher_info?.name ||
                              (r.sub_teacher?.teacher_id || '—')
                            }</span>
                          )}
                        </td>
                        {statusFilter === 'PENDING' && (
                          <td className="p-2 space-x-2 whitespace-nowrap">
                            <button className="px-2 sm:px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow hover:opacity-90 text-xs sm:text-sm" onClick={()=>approve(r)}>Approve</button>
                            <button className="px-2 sm:px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-rose-500 to-red-600 shadow hover:opacity-90 text-xs sm:text-sm" onClick={()=>reject(r)}>Reject</button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {requests.length===0 && (
                      <tr>
                        <td className="p-6 text-center" colSpan="7">
                          <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            No {statusFilter.toLowerCase()} requests
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcademicSubTutorRequestsPage;


