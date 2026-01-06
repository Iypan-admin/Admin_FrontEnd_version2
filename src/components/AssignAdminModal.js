import React, { useState, useEffect } from 'react';
import { getAllStates, getAllCenters, assignStateAdmin, assignCenterAdmin, getAllAcademicCoordinators } from '../services/Api';

const AssignAdminModal = ({ user, onClose, onAssign }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState('');
  const [academicCoordinatorId, setAcademicCoordinatorId] = useState('');
  const [academicCoordinators, setAcademicCoordinators] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'state') {
          // Fetch states
          const statesResponse = await getAllStates();
          if (statesResponse.success) {
            const unassignedStates = statesResponse.data.filter(state => !state.state_admin);
            setPlaces(unassignedStates);
          }

          // Fetch academic coordinators
          const coordinatorsResponse = await getAllAcademicCoordinators();
          if (coordinatorsResponse.success) {
            setAcademicCoordinators(coordinatorsResponse.data);
          }
        } else if (user.role === 'center') {
          const response = await getAllCenters();
          if (response.success) {
            const unassignedCenters = response.data.filter(center => !center.center_admin);
            setPlaces(unassignedCenters);
          }
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (user.role === 'state') {
        await assignStateAdmin({
          stateId: selectedPlace,
          userId: user.id,
          academicCoordinatorId: academicCoordinatorId
        }, token);
      } else if (user.role === 'center') {
        await assignCenterAdmin({
          centerId: selectedPlace,
          userId: user.id
        }, token);
      }

      onAssign();
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Assign {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Admin</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">×</button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select {user.role === 'state' ? 'State' : 'Center'}
            </label>
            <select
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Select...</option>
              {places.map((place) => (
                <option 
                  key={user.role === 'state' ? place.state_id : place.center_id}
                  value={user.role === 'state' ? place.state_id : place.center_id}
                >
                  {user.role === 'state' ? place.state_name : place.center_name}
                </option>
              ))}
            </select>
          </div>

          {user.role === 'state' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Coordinator
              </label>
              <select
                value={academicCoordinatorId}
                onChange={(e) => setAcademicCoordinatorId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Academic Coordinator</option>
                {academicCoordinators.map((coordinator) => (
                  <option 
                    key={coordinator.academic_coordinator_id} 
                    value={coordinator.academic_coordinator_id}
                  >
                    {coordinator.coordinator_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={loading}
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignAdminModal;