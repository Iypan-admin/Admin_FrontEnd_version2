// Dynamic endpoint resolution to prevent external devices from failing on localhost
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const defaultAcademicBase = isLocal ? 'http://localhost:3005/api' : 'https://academicservice.iypan.com/api';
const ACADEMIC_BASE = process.env.REACT_APP_ACADEMIC_API_URL || defaultAcademicBase;

const resolveApiUrl = (envUrl, endpoint) => {
  if (envUrl && (!envUrl.includes('localhost') || isLocal)) {
    return envUrl;
  }
  return `${ACADEMIC_BASE}/${endpoint}`;
};

const LIVE_CLASSES_URL = resolveApiUrl(process.env.REACT_APP_LIVE_CLASSES_API_URL, 'live-classes');
const RECORDINGS_URL = resolveApiUrl(process.env.REACT_APP_RECORDINGS_API_URL, 'recordings');

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const scheduleLiveClass = async (classData) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/schedule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(classData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to schedule live class');
  }
  return response.json();
};

export const getLiveClasses = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${LIVE_CLASSES_URL}?${query}` : LIVE_CLASSES_URL;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch live classes');
  return response.json();
};

export const getLiveClassById = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch live class');
  return response.json();
};

export const startLiveClass = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/start`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to start live class');
  }
  return response.json();
};

export const joinLiveClass = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/join`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to join live class');
  }
  return response.json();
};

export const endLiveClass = async (id, data = {}) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/end`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to end live class');
  }
  return response.json();
};

export const resetLiveClassTimer = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/reset-timer`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) return { success: false };
  return response.json();
};

export const updateLiveClass = async (id, data) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update live class schedule');
  }
  return response.json();
};

export const checkScheduleConflict = async (params) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/check-conflict`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });
  if (!response.ok) return { conflict: null };
  return response.json();
};

export const deleteLiveClass = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete live class');
  return response.json();
};

// Recordings API
export const getBatchRecordings = async (batchId) => {
  const response = await fetch(`${RECORDINGS_URL}/batch/${batchId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch recordings');
  return response.json();
};

export const getAllRecordings = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${RECORDINGS_URL}/all?${query}` : `${RECORDINGS_URL}/all`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch master recordings');
  return response.json();
};

export const getRecordingStreamUrl = async (id) => {
  const response = await fetch(`${RECORDINGS_URL}/${id}/stream`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch recording stream URL');
  }
  return response.json();
};

export const uploadRecordingVideo = async (classOrRecId, formData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${RECORDINGS_URL}/${classOrRecId}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload video recording');
  }
  return response.json();
};

// Admissions & Waiting Room
export const getJoinRequests = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/join-requests`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch join requests');
  return response.json();
};

export const admitStudent = async (id, student_id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/admit-student`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ student_id })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to admit student');
  }
  return response.json();
};

export const admitAllStudents = async (id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/admit-all`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to admit all students');
  }
  return response.json();
};

export const rejectStudent = async (id, student_id) => {
  const response = await fetch(`${LIVE_CLASSES_URL}/${id}/reject-student`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ student_id })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reject student');
  }
  return response.json();
};

