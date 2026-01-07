// api.js

const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ENV variable: ${key}`);
  }
  return value;
};

export const AUTH_API_URL = getEnv("REACT_APP_AUTH_API_URL");
export const USER_API_URL = getEnv("REACT_APP_USER_API_URL");
export const LIST_API_URL = getEnv("REACT_APP_LIST_API_URL");
export const ASSIGN_API_URL = getEnv("REACT_APP_ASSIGN_API_URL");
export const FINANCE_API_URL = getEnv("REACT_APP_FINANCE_API_URL");
export const CHAT_API_URL = getEnv("REACT_APP_CHAT_API_URL");

export const BATCHES_URL = getEnv("REACT_APP_BATCHES_URL");
export const COURSES_API_URL = getEnv("REACT_APP_COURSES_API_URL");
export const COURSE_FEES_API_URL = getEnv("REACT_APP_COURSE_FEES_API_URL");
export const EVENTS_API_URL = getEnv("REACT_APP_EVENTS_API_URL");
export const GMEETS_API_URL = getEnv("REACT_APP_GMEETS_API_URL");
export const NOTES_API_URL = getEnv("REACT_APP_NOTES_API_URL");

export const LSRW_API_URL = getEnv("REACT_APP_LSRW_API_URL");
export const SPEAKING_API_URL = getEnv("REACT_APP_SPEAKING_API_URL");
export const READING_API_URL = getEnv("REACT_APP_READING_API_URL");
export const WRITING_API_URL = getEnv("REACT_APP_WRITING_API_URL");
export const ATTENDANCE_API_URL = getEnv("REACT_APP_ATTENDANCE_API_URL");
// ----------------------
// Authentication Functions
// ----------------------

// Function for logging in user (authentication API)
export const loginUser = async (name, password) => {
    try {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        localStorage.setItem("token", data.token);
        return data;
    } catch (error) {
        throw error;
    }
};

// ----------------------
// User Management Functions
// ----------------------

// Function for creating a new user (user management API)
export const createUser = async (userData) => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${USER_API_URL}/user/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        return data;
    } catch (error) {
        throw error;
    }
};



/**
 * Edit user details like name and/or password.
 * @param {string} userId - ID of the user to be edited.
 * @param {Object} userData - Object containing `name` and/or `password`.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Message response on success.
 * @throws {Error} - Throws error if the request fails.
 */
export const editUser = async (userId, userData, token) => {
    try {
        const response = await fetch(`${USER_API_URL}/user/edit/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Required for auth
            },
            body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to update user.");
        }

        return result;
    } catch (error) {
        throw new Error(`Edit User Error: ${error.message}`);
    }
};

/**
 * Delete a user (Admin only)
 * @param {string} userId - ID of the user to be deleted
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing deletion status
 * @throws {Error} - Throws error if the request fails
 */
export const deleteUser = async (userId, token) => {
    try {
        const response = await fetch(`${USER_API_URL}/user/delete/${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to delete user");
        }

        return result;
    } catch (error) {
        throw new Error(`Delete User Error: ${error.message}`);
    }
};

/**
 * Force delete a user (removes all references first)
 * @param {string} userId - ID of the user to be force deleted
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing deletion status
 * @throws {Error} - Throws error if the request fails
 */
export const forceDeleteUser = async (userId, token) => {
    try {
        const response = await fetch(`${USER_API_URL}/user/force-delete/${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to force delete user");
        }

        return result;
    } catch (error) {
        throw new Error(`Force Delete User Error: ${error.message}`);
    }
};


// ----------------------
// Listing Service Functions
// ----------------------

// Helper function to get listing service auth headers
const getListAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
});



/**
 * Fetch all users with optional filters
 */
export const getAllUsers = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams({
            ...params
        });

        const response = await fetch(`${LIST_API_URL}/users?${queryParams}`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch users");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all students associated with a specific center.
 * @param {string} centerId - The ID of the center.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object[]>} - List of transformed student objects.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getStudentsByCenter = async (centerId, token) => {
    try {
        if (!centerId) throw new Error('Center ID is required');
        if (!token) throw new Error('Token is required');

        const response = await fetch(`${LIST_API_URL}/students/center/${centerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;

    } catch (error) {
        console.error('getStudentsByCenter error:', error);
        throw error;
    }
};

/**
 * Fetch all students referred by a specific center
 */
export const getReferredStudents = async (centerId, token) => {
    try {
        if (!centerId) throw new Error('Center ID is required');
        if (!token) throw new Error('Token is required');

        const response = await fetch(`${LIST_API_URL}/students/referred/${centerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;

    } catch (error) {
        console.error('getReferredStudents error:', error);
        throw error;
    }
};



/**
 * Fetch all batches associated with a specific center.
 * @param {string} centerId - The ID of the center.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object[]>} - Transformed list of batch objects.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getBatchesByCenter = async (centerId, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/center/${centerId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('getBatchesByCenter fetch error:', error);
        return {
            success: false,
            error: error.message || 'Network error occurred'
        };
    }
};

/**
 * Fetch user by ID
 */
export const getUserById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/users/${id}`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "User not found");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all academic coordinators
 */
export const getAllAcademicCoordinators = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/academic-coordinators`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch academic coordinators");

        // Check the response structure and return formatted data
        if (data && data.success && Array.isArray(data.data)) {
            return {
                success: true,
                data: data.data
            };
        }

        return {
            success: false,
            data: []
        };
    } catch (error) {
        throw error;
    }
};
export const fetchStudentByRegisterNumber = async (registerNumber) => {
    try {
        const response = await fetch(`${LIST_API_URL}/student/register-number/${registerNumber}`, {
            method: "GET",
            headers: getListAuthHeaders(), // same headers as other secure endpoints
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Student not found");
        return data;
    } catch (error) {
        throw error;
    }
};


/**
 * Fetch all centers
 */
export const getAllCenters = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/centers`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch centers");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all offline centers (for academic admin)
 */
export const getOfflineCenters = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/centers/offline`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || "Failed to fetch offline centers");
        return data.data || [];
    } catch (error) {
        throw new Error(`Get Offline Centers Error: ${error.message}`);
    }
};

/**
 * Fetch center by ID
 */
export const getCenterById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/centers/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch center details');
        }

        const data = await response.json();
        // Make sure we're returning an object with center_name
        return {
            center_id: id,
            center_name: data.name || data.center_name || 'Unknown Center',
            ...data
        };
    } catch (error) {
        console.error("Error in getCenterById:", error);
        // Return a default object if fetch fails
        return {
            center_id: id,
            center_name: 'Unknown Center'
        };
    }
};

/**
 * Get center details based on the currently authenticated center admin.
 * @param {string} token - Authentication token (Bearer).
 * @returns {Promise<Object>} - The center details.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getCenterByAdminId = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/centers/admin/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text(); // Get raw response as text
        console.log("Raw getCenterByAdminId Response:", text); // Debug log

        const data = JSON.parse(text); // Parse the response as JSON

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch center details');
        }

        return data;
    } catch (error) {
        console.error('getCenterByAdminId error:', error);
        throw error;
    }
};

/**
 * Fetch all centers for the state where the authenticated user is the state_admin.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - API response with centers data.
 */
export const getCentersForStateAdmin = async (token) => {
    try {
        const response = await fetch(
            `${LIST_API_URL}/centers/state/admin/me`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch centers for state admin");
        return data;
    } catch (error) {
        console.error("getCentersForStateAdmin error:", error);
        return {
            success: false,
            message: error.message || "Network error occurred",
            data: [],
        };
    }
};

/**
 * Fetch all enrollments
 */
export const getAllEnrollments = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/enrollments`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch enrollments");
        return data;
    } catch (error) {
        throw error;
    }
};


/**
 * Fetch all financial partners
 */
export const getAllFinancialPartners = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/financial-partners`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch financial partners");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all managers
 */
export const getAllManagers = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/managers`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch managers");

        // Check the response structure and return formatted data
        if (data && data.success && Array.isArray(data.data)) {
            return {
                success: true,
                data: data.data
            };
        }

        return {
            success: false,
            data: []
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all states
 */
export const getAllStates = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/states`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Return the full state data
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch state by ID
 */
export const getStateById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/states/${id}`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "State not found");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all students
 */
export const getAllStudents = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/students`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch students");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch student by ID
 */
export const getStudentById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/students/${id}`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Student not found");
        return data;
    } catch (error) {
        throw error;
    }
};
export const getStudentByRegisterNumber = async (registerNumber) => {
    const res = await fetch(`${LIST_API_URL}/by-register/${registerNumber}`, {
        method: 'GET',
        headers: getListAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Student not found');

    return data.name; // since your response is { name: "..." }
};
/**
 * Fetch all teachers
 */
export const getAllTeachers = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/teachers`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch teachers");
        return data.data || data; // Return the nested data array
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch teacher by ID
 */
export const getTeacherById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/teachers/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch teacher details');
        }

        const data = await response.json();
        // Make sure we're returning an object with name
        return {
            teacher_id: id,
            name: data.name || data.teacher_name || 'Unknown Teacher',
            ...data
        };
    } catch (error) {
        console.error("Error in getTeacherById:", error);
        // Return a default object if fetch fails
        return {
            teacher_id: id,
            name: 'Unknown Teacher'
        };
    }
};
/**
 * Fetch logged-in tutor's info
 */
export const getMyTutorInfo = async () => {
  try {
    const response = await fetch(`${LIST_API_URL}/tutor-info`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch tutor info");
    return data.data; // return only the tutor info object
  } catch (error) {
    console.error("Error fetching tutor info:", error);
    throw error;
  }
};

// Get teacher_id for the logged-in teacher
export const getMyTeacherId = async (token) => {
  try {
    const response = await fetch(`${LIST_API_URL}/teacher/my-id`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch teacher ID");
    }
    return data.teacher_id;
  } catch (error) {
    console.error("Error fetching teacher ID:", error);
    throw error;
  }
};

/**
 * Create tutor info
 */
export const createTutorInfo = async (infoData) => {
  try {
    const response = await fetch(`${LIST_API_URL}/tutor-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(infoData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data.data || data;
  } catch (error) {
    console.error("Error creating tutor info:", error);
    throw new Error(`Tutor Info Creation Error: ${error.message}`);
  }
};

/**
 * Fetch student batch history
 */
export const getStudentBatchHistory = async (studentId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${LIST_API_URL}/enrollments/student/${studentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to fetch batch history");
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching student batch history:", error);
    throw error;
  }
};

/**
 * Update tutor info
 */
export const updateTutorInfo = async (infoData) => {
  try {
    const response = await fetch(`${LIST_API_URL}/tutor-info`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(infoData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data.data || data;
  } catch (error) {
    console.error("Error updating tutor info:", error);
    throw new Error(`Tutor Info Update Error: ${error.message}`);
  }
};

/**
 * Delete tutor info
 */
export const deleteTutorInfo = async () => {
  try {
    const response = await fetch(`${LIST_API_URL}/tutor-info`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to delete tutor info");
    return data;
  } catch (error) {
    console.error("Error deleting tutor info:", error);
    throw error;
  }
};

/**
 * Upload tutor profile photo
 * @param {File} file - File object from input[type="file"]
 * @returns {string} URL of uploaded profile photo
 */
export const uploadTutorProfilePhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${LIST_API_URL}/tutor-info/upload-profile`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        // Do NOT set Content-Type when using FormData
      },
      body: formData,
    });

    const data = await response.json();
    console.log("Upload response:", data);

    if (!response.ok)
      throw new Error(data.message || "Failed to upload profile photo");

    // Backend returns { success: true, data: publicUrl }
    console.log("Returning public URL:", data.data);
    return data.data; // This is the actual public URL
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    throw error;
  }
};

/**
 * Get tutor info by user ID (for admin/manager use)
 */
export const getTutorInfoByUserId = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/tutor-info/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch tutor info");
    }
    return data.data; // return only the tutor info object
  } catch (error) {
    console.error("Error fetching tutor info by user ID:", error);
    throw error;
  }
};

/**
 * Fetch transaction by Payment ID
 */
export const getTransactionById = async (id) => {
    try {
        const response = await fetch(`${LIST_API_URL}/transactions/${id}`, {
            method: "GET",
            headers: getListAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Transaction not found");
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all batches assigned to a teacher
 */
export const getTeacherBatches = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/teacher/batches`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch teacher batches");

        // Return transformed data
        return data;
    } catch (error) {
        throw new Error(`Get Teacher Batches Error: ${error.message}`);
    }
};

/**
 * Fetch all students assigned to a teacher
 */
export const getStudentsByTeacher = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/students`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch students assigned to teacher");

        // Return transformed data
        return data;
    } catch (error) {
        throw new Error(`Get Students By Teacher Error: ${error.message}`);
    }
};

/**
 * Get students in a specific batch assigned to the authenticated teacher.
 * @param {string} batchId - ID of the batch.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object[]>} - List of students in the batch.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getTeacherBatchStudents = async (batchId, token) => {
    try {
        if (!batchId) {
            throw new Error("Batch ID is required");
        }

        if (!token) {
            throw new Error("Authentication token is required");
        }

        // Fix: Updated API endpoint to match the correct route
        const response = await fetch(`${LIST_API_URL}/teacher/batch/${batchId}/students`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}`);
        }

        return result;

    } catch (error) {
        console.error("Error fetching batch students:", error);
        throw error;
    }
};

export const getBatchById = async (token, batchId) => {
    try {
        const response = await fetch(`${LIST_API_URL}/batches/${batchId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch batch details');
        }

        return data;
    } catch (error) {
        console.error('getBatchById error:', error);
        throw error;
    }
};


/**
 * Fetch all teachers assigned to a specific center.
 * @param {string} centerId - The ID of the center.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object[]>} - List of teachers assigned to the center.
 * @throws {Error} - Throws an error if the request fails.
 */
export const getTeachersByCenter = async (centerId, token) => {
    try {
        if (!centerId) {
            throw new Error('Center ID is required');
        }

        const response = await fetch(`${LIST_API_URL}/center/${centerId}/teachers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch teachers');
        }

        return data;
    } catch (error) {
        console.error('getTeachersByCenter error:', error);
        throw error;
    }
};
export const fetchEliteCards = async () => {
    const token = localStorage.getItem("token"); // Retrieve the JWT token

    const response = await fetch(`${LIST_API_URL}/elite-cards`, {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || "Failed to fetch elite cards");
    }

    return result.data;
};

export const addEliteCard = async (formData) => {
    const token = localStorage.getItem("token"); // Retrieve the JWT token

    const response = await fetch(`${LIST_API_URL}/elite-cards`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || "Failed to add elite card");
    }

    return result;
};
// Get card_name by card_number
export const getCardNameByNumber = async (cardNumber) => {
    const token = localStorage.getItem("token"); // Retrieve the JWT token

    const response = await fetch(`${LIST_API_URL}/elite-cards/card-name?card_number=${cardNumber}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });

    const result = await response.json();

    if (!result.success) {
        return null; // Card not found
    }

    return result.card_name; // Return card_name
};


export const getInfluencerCount = async () => {
    const res = await fetch(`${LIST_API_URL}/influencers/count`);
    if (!res.ok) throw new Error("Failed to fetch count");
    return await res.json(); // { count: number }
};

// ✅ Get ALL influencers (updated to remove /latest)
export const getAllInfluencers = async () => {
    const res = await fetch(`${LIST_API_URL}/influencers`);
    if (!res.ok) throw new Error("Failed to fetch influencer list");
    return await res.json(); // array of all influencer objects
};

// Submit new influencer (form)
export const submitInfluencer = async (formData) => {
    const res = await fetch(`${LIST_API_URL}/influencers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit influencer");
    return data;
};
// ✅ Get all pending elite cards (Card Admin verification list)
export const getPendingEliteCards = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/card-admin/pending`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}`);
        }

        return result.cards; // backend la {cards: [...]} return pannum nu assume panniruken
    } catch (error) {
        console.error("Error fetching pending elite cards:", error);
        throw error;
    }
};

// ✅ Approve elite card
export const approveEliteCard = async (id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/card-admin/approve/${id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error("Error approving elite card:", error);
        throw error;
    }
};

// ✅ Reject elite card
export const rejectEliteCard = async (id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/card-admin/reject/${id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error("Error rejecting elite card:", error);
        throw error;
    }
};

// ✅ Get all approved elite cards
export const getApprovedEliteCards = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/card-admin/approved`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}`);
        }

        return result.cards;
    } catch (error) {
        console.error("Error fetching approved elite cards:", error);
        throw error;
    }
};

// ----------------------
// Role Assigning Service Functions
// ----------------------

/**
 * Create a new state.
 * @param {Object} payload - { stateName }
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const createState = async (payload, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/state/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create state");

        return data;
    } catch (error) {
        throw new Error(`Create State Error: ${error.message}`);
    }
};

/**
 * Create a new center.
 * @param {Object} payload - { centerName, stateId }
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const createCenter = async (payload, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/center/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create center");

        return data;
    } catch (error) {
        throw new Error(`Create Center Error: ${error.message}`);
    }
};

/**
 * Assign a state admin.
 * @param {Object} payload - { stateId, userId, academicCoordinatorId }
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
// ==================== CENTER REQUEST MANAGEMENT APIs ====================

/**
 * Create a center request (State Admin)
 * @param {Object} payload - { centerName, stateId, justification }
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const createCenterRequest = async (payload, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/state/center-request/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create center request");
        return data;
    } catch (error) {
        console.error("Error creating center request:", error);
        throw error;
    }
};

/**
 * Get center requests for current state admin
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const getMyCenterRequests = async (token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/state/center-requests/my`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch center requests");
        return data;
    } catch (error) {
        console.error("Error fetching center requests:", error);
        throw error;
    }
};

/**
 * Get all center requests for state admin (for approval page)
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const getAllCenterRequestsForState = async (token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/state/center-requests/all`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch center requests");
        return data;
    } catch (error) {
        console.error("Error fetching center requests:", error);
        throw error;
    }
};

/**
 * Get center request by ID
 * @param {string} requestId - Request ID.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const getCenterRequestById = async (requestId, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/state/center-request/${requestId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch center request");
        return data;
    } catch (error) {
        console.error("Error fetching center request:", error);
        throw error;
    }
};

/**
 * Get all center requests (Manager/Admin)
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from server.
 */
export const getCenterRequests = async (token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/center-requests`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch center requests");
        return data;
    } catch (error) {
        console.error("Error fetching center requests:", error);
        throw error;
    }
};

/**
 * Approve center request (Manager/Admin)
 * @param {string} token - Authentication token.
 * @param {string} requestId - Request ID to approve.
 * @returns {Promise<Object>} - Response from server.
 */
export const approveCenterRequest = async (token, requestId) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/center-request/approve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ requestId })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to approve center request");
        return data;
    } catch (error) {
        console.error("Error approving center request:", error);
        throw error;
    }
};

/**
 * Reject center request (Manager/Admin)
 * @param {string} token - Authentication token.
 * @param {string} requestId - Request ID to reject.
 * @param {string} rejectionReason - Reason for rejection.
 * @returns {Promise<Object>} - Response from server.
 */
export const rejectCenterRequest = async (token, requestId, rejectionReason) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/center-request/reject`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ requestId, rejectionReason })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to reject center request");
        return data;
    } catch (error) {
        console.error("Error rejecting center request:", error);
        throw error;
    }
};

export const assignStateAdmin = async (payload, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/state/assign-admin`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to assign state admin");

        return data;
    } catch (error) {
        throw new Error(`Assign State Admin Error: ${error.message}`);
    }
};

/**
 * Assign a center admin
 * @param {Object} payload - { centerId, userId }
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Response from server
 */
export const assignCenterAdmin = async (payload, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/manager/center/assign-admin`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to assign center admin");

        return data;
    } catch (error) {
        throw new Error(`Assign Center Admin Error: ${error.message}`);
    }
};



/**
 * Assign a teacher to a center.
 * @param {Object} assignmentData - The data required for the assignment.
 * @param {string} assignmentData.userId - The ID of the teacher.
 * @param {string} assignmentData.centerId - The ID of the center.
 * @param {string} token - Authentication token for API access.
 * @returns {Promise<Object>} - Response containing the assignment status.
 * @throws {Error} - Throws an error if the request fails.
 */
export const assignTeacher = async (assignmentData, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/academic/assign-teacher`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(assignmentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to assign teacher.");
        }

        return result; // Contains the success message or additional data
    } catch (error) {
        throw new Error(`Assign Teacher Error: ${error.message}`);
    }
};

/**
 * Assigns a user with an academic role to a manager
 * @param {Object} assignmentData - The assignment data.
 * @param {string} assignmentData.userId - The ID of the academic coordinator.
 * @param {string} assignmentData.managerId - The ID of the manager.
 * @param {string} token - Authentication token for API access.
 * @returns {Promise<Object>} - Response containing the assignment status.
 * @throws {Error} - Throws an error if the request fails.
 */
export const assignAcademicCoordinator = async (assignmentData, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/admin/assign-academic-coordinator`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(assignmentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to assign academic coordinator.");
        }

        return result;
    } catch (error) {
        throw new Error(`Assign Academic Coordinator Error: ${error.message}`);
    }
};

/**
 * Assigns a user with the manager role
 * @param {Object} assignmentData - The assignment data.
 * @param {string} assignmentData.userId - The ID of the user to be assigned as manager.
 * @param {string} token - Authentication token for API access.
 * @returns {Promise<Object>} - Response containing the assignment status.
 * @throws {Error} - Throws an error if the request fails.
 */
export const assignManager = async (assignmentData, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/admin/assign-manager`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(assignmentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to assign manager.");
        }

        return result;
    } catch (error) {
        throw new Error(`Assign Manager Error: ${error.message}`);
    }
};

/**
 * Assigns a user with the financial partner role to a manager
 * @param {Object} assignmentData - The assignment data.
 * @param {string} assignmentData.userId - The ID of the user to be assigned as financial partner.
 * @param {string} assignmentData.managerId - The ID of the manager to assign the financial partner to.
 * @param {string} token - Authentication token for API access.
 * @returns {Promise<Object>} - Response containing the assignment status.
 * @throws {Error} - Throws an error if the request fails.
 */
export const assignFinancialPartner = async (assignmentData, token) => {
    try {
        const response = await fetch(`${ASSIGN_API_URL}/admin/assign-financial-partner`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(assignmentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to assign financial partner.");
        }

        return result;
    } catch (error) {
        throw new Error(`Assign Financial Partner Error: ${error.message}`);
    }
};

export const approvePayment = async (payment_id) => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/approve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ payment_id }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        return data;
    } catch (error) {
        console.error("Failed to approve payment:", error);
        throw error;
    }
};

export const getAllPayments = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/payments`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        console.log("Payments response:", data); // Add logging
        return data;
    } catch (error) {
        console.error("Failed to fetch payments:", error); // Add error logging
        throw error;
    }
};

export const editPaymentDuration = async (payment_id, new_course_duration) => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/payment/edit`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ payment_id, new_course_duration }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        return data;
    } catch (error) {
        console.error("Failed to edit payment duration:", error);
        throw error;
    }
};

export const getCenterPayments = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/center/payments`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        console.log("Center payments response:", data);
        return data;
    } catch (error) {
        console.error("Failed to fetch center payments:", error);
        throw error;
    }
};

// 🔹 Invoice API Functions
export const getCyclePayments = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/cycle-payments`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch cycle payments");

        return data;
    } catch (error) {
        console.error("Failed to fetch cycle payments:", error);
        throw error;
    }
};

export const generateInvoice = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate invoice");

        return data;
    } catch (error) {
        console.error("Failed to generate invoice:", error);
        throw error;
    }
};

export const getCenterInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        throw error;
    }
};

export const getInvoiceItems = async (invoiceId) => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/${invoiceId}/items`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch invoice items");

        return data;
    } catch (error) {
        console.error("Failed to fetch invoice items:", error);
        throw error;
    }
};

// 🔹 Invoice Approval API Functions

/**
 * Get pending invoices for State Admin
 * GET /api/financial/invoices/state-admin/pending
 */
export const getStateAdminInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/state-admin/pending`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch pending invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch pending invoices:", error);
        throw error;
    }
};

/**
 * Get verified invoices for Finance Admin
 * GET /api/financial/invoices/finance-admin/verified
 */
export const getFinanceAdminInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/finance-admin/verified`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch verified invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch verified invoices:", error);
        throw error;
    }
};

/**
 * Get finance accepted invoices for Manager/Admin
 * GET /api/financial/invoices/manager-admin/accepted
 */
export const getManagerAdminInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/manager-admin/accepted`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch finance accepted invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch finance accepted invoices:", error);
        throw error;
    }
};

/**
 * Get verified invoices for State Admin (Approved Tab)
 * GET /api/financial/invoices/state-admin/verified
 */
export const getStateAdminVerifiedInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/state-admin/verified`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch verified invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch verified invoices:", error);
        throw error;
    }
};

/**
 * Get accepted invoices for Finance Admin (Approved Tab)
 * GET /api/financial/invoices/finance-admin/accepted
 */
export const getFinanceAdminAcceptedInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/finance-admin/accepted`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch accepted invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch accepted invoices:", error);
        throw error;
    }
};

/**
 * Get paid invoices for Manager/Admin (Approved Tab)
 * GET /api/financial/invoices/manager-admin/paid
 */
export const getManagerAdminPaidInvoices = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/manager-admin/paid`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch paid invoices");

        return data;
    } catch (error) {
        console.error("Failed to fetch paid invoices:", error);
        throw error;
    }
};

/**
 * Update invoice status (Verify/Approve)
 * PATCH /api/financial/invoices/:invoice_id/status
 * Body: { status: 'MF Verified' | 'Finance Accepted' | 'Invoice Paid', notes?: string }
 */
export const updateInvoiceStatus = async (invoiceId, status, notes = "") => {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${FINANCE_API_URL}/invoices/${invoiceId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status, notes }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update invoice status");

        return data;
    } catch (error) {
        console.error("Failed to update invoice status:", error);
        throw error;
    }
};

export const getPendingElitePayments = async () => {
    try {
        const res = await fetch(`${FINANCE_API_URL}/elite-payments/pending-approvals`);
        if (!res.ok) throw new Error("Failed to fetch pending elite payments");

        const json = await res.json();
        return Array.isArray(json.data) ? json.data : []; // return only array
    } catch (error) {
        console.error("Error fetching pending elite payments:", error);
        return []; // fallback empty array so .map won't crash
    }
};


// 🔹 Approve elite payment
export const approveElitePayment = async (id) => {
    try {
        const res = await fetch(`${FINANCE_API_URL}/elite-payments/${id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to approve payment");
        return await res.json();
    } catch (error) {
        console.error("Error approving payment:", error);
        throw error;
    }
};

// 🔹 Decline elite payment
export const declineElitePayment = async (id) => {
    try {
        const res = await fetch(`${FINANCE_API_URL}/elite-payments/${id}/decline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to decline payment");
        return await res.json();
    } catch (error) {
        console.error("Error declining payment:", error);
        throw error;
    }
};
// 🔹 Get all pending/approved/declined giveaways
export const getPendingGiveaways = async () => {
    try {
        const res = await fetch(`${FINANCE_API_URL}/giveaways/pending-approvals`);
        if (!res.ok) throw new Error("Failed to fetch pending giveaways");

        const json = await res.json();
        return Array.isArray(json.data) ? json.data : []; // return only array
    } catch (error) {
        console.error("Error fetching pending giveaways:", error);
        return []; // fallback empty array so .map won't crash
    }
};

// 🔹 Approve giveaway
export const approveGiveaway = async (id) => {
    if (!id) throw new Error("Giveaway ID is required");

    try {
        const res = await fetch(`${FINANCE_API_URL}/giveaways/${id}/approve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        // Some APIs return 204 No Content
        let data = null;
        if (res.status !== 204) {
            try {
                data = await res.json();
            } catch {
                data = null;
            }
        }

        if (!res.ok) {
            const message = data?.error || data?.message || "Failed to approve giveaway";
            throw new Error(message);
        }

        return data;
    } catch (error) {
        console.error(`Error approving giveaway [ID: ${id}]:`, error.message);
        throw error;
    }
};


export const declineGiveaway = async (id) => {
    try {
        const res = await fetch(`${FINANCE_API_URL}/giveaways/${id}/decline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok) {
            const message = data?.error || "Failed to decline giveaway";
            throw new Error(message);
        }
        return data;
    } catch (error) {
        console.error(`Error declining giveaway [ID: ${id}]:`, error.message);
        throw error;
    }
};


// ----------------------
// Academic Service Functions
// ----------------------

// ==================== BATCH REQUEST MANAGEMENT APIs ====================

/**
 * Create a batch request (Center Admin)
 * @param {Object} payload - { duration, teacher_id, course_id, time_from, time_to, max_students, mode, justification }
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response from server
 */
export const createBatchRequest = async (payload, token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create batch request");
        return data;
    } catch (error) {
        console.error("Error creating batch request:", error);
        throw error;
    }
};

/**
 * Get batch requests for state admin
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response from server
 */
export const getBatchRequestsForState = async (token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/state`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch batch requests");
        return data;
    } catch (error) {
        console.error("Error fetching batch requests:", error);
        throw error;
    }
};

/**
 * Get batch requests for academic admin
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response from server
 */
export const getBatchRequestsForAcademic = async (token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/academic`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch batch requests");
        return data;
    } catch (error) {
        console.error("Error fetching batch requests:", error);
        throw error;
    }
};


/**
 * Approve batch request (State Admin)
 * @param {string} token - Authentication token
 * @param {string} requestId - Request ID to approve
 * @param {string} notes - Optional approval notes
 * @returns {Promise<Object>} - Response from server
 */
export const approveBatchRequest = async (token, requestId, notes = '') => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/${requestId}/approve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ notes })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to approve batch request");
        return data;
    } catch (error) {
        console.error("Error approving batch request:", error);
        throw error;
    }
};


/**
 * Reject batch request (State Admin or Academic Admin)
 * @param {string} token - Authentication token
 * @param {string} requestId - Request ID to reject
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} - Response from server
 */
export const rejectBatchRequest = async (token, requestId, reason) => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/${requestId}/reject`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to reject batch request");
        return data;
    } catch (error) {
        console.error("Error rejecting batch request:", error);
        throw error;
    }
};

/**
 * Create batch from approved request (Academic Admin)
 * @param {string} token - Authentication token
 * @param {string} requestId - Request ID to create batch from
 * @returns {Promise<Object>} - Response from server
 */
export const createBatchFromRequest = async (token, requestId) => {
    try {
        const response = await fetch(`${BATCHES_URL}/requests/${requestId}/create-batch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create batch from request");
        return data;
    } catch (error) {
        console.error("Error creating batch from request:", error);
        throw error;
    }
};

// Create Batch
export const createBatch = async (token, batchDetails) => {
    try {
        const response = await fetch(`${BATCHES_URL}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(batchDetails),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        return data;
    } catch (error) {
        throw error;
    }
};


// Get All Batches
export const getBatches = async (token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        console.log("Batches fetched from API:", data);

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch batches');
        }

        return data; // Return the data directly since it already has the correct structure
    } catch (error) {
        console.error("Error in getBatches:", error);
        throw error;
    }
};

// Update Batch
export const updateBatch = async (token, id, batchDetails) => {
    try {
        console.log("🌐 API Service: Sending update request:", { id, batchDetails });
        console.log("🌐 API Service: max_students in request:", batchDetails.max_students, typeof batchDetails.max_students);
        
        const response = await fetch(`${BATCHES_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(batchDetails),
        });

        const data = await response.json();
        
        console.log("🌐 API Service: Backend response:", data);

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        console.log("🌐 API Service: Update successful, returning:", {
            success: true,
            message: "Batch updated successfully",
            data: data.batch
        });

        return {
            success: true,
            message: "Batch updated successfully",
            data: data.batch
        };
    } catch (error) {
        console.error("Update batch error:", error);
        throw new Error(error.message || "Failed to update batch");
    }
};

// Delete Batch
export const deleteBatch = async (token, id) => {
    try {
        console.log(`Deleting batch ${id} from ${BATCHES_URL}/${id}`); // Debug log

        const response = await fetch(`${BATCHES_URL}/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("Delete API response:", response); // Debug log

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Delete batch API error:", error); // Debug log
        throw error;
    }
};

// Get Pending Batches for Approval
export const getPendingBatches = async (token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/pending`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch pending batches');
        }

        return data;
    } catch (error) {
        console.error("Error in getPendingBatches:", error);
        throw error;
    }
};

// Approve Batch
export const approveBatch = async (token, batchId) => {
    try {
        const response = await fetch(`${BATCHES_URL}/${batchId}/approve`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to approve batch');
        }

        return data;
    } catch (error) {
        console.error("Error in approveBatch:", error);
        throw error;
    }
};

// Reject Batch
export const rejectBatch = async (token, batchId, rejectionReason) => {
    try {
        const response = await fetch(`${BATCHES_URL}/${batchId}/reject`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                rejection_reason: rejectionReason
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to reject batch');
        }

        return data;
    } catch (error) {
        console.error("Error in rejectBatch:", error);
        throw error;
    }
};

export const approveStudent = async (token, student_id) => {
    try {
        // Validate input
        if (!student_id) {
            throw new Error("Student ID is required");
        }

        // API request
        const response = await fetch(`${BATCHES_URL}/approve`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ student_id }),
        });

        // Parse response
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");

        // Return data
        return data;
    } catch (error) {
        throw new Error(`Approve Student Error: ${error.message}`);
    }
};

// ==================== BATCH MERGE FUNCTIONS ====================

/**
 * Get eligible batches for merging (must be Started status)
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - List of eligible batches
 */
export const getBatchesForMerge = async (token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/merge/eligible`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch batches for merge");

        return data;
    } catch (error) {
        throw new Error(`Get Batches For Merge Error: ${error.message}`);
    }
};

/**
 * Create a new merge group
 * @param {Object} mergeData - Object containing merge_name, batch_ids, notes
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Created merge group details
 */
export const createMergeGroup = async (mergeData, token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/merge/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(mergeData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create merge group");

        return data;
    } catch (error) {
        throw new Error(`Create Merge Group Error: ${error.message}`);
    }
};

/**
 * Get all merge groups
 * @param {string} token - Authentication token
 * @param {string} status - Optional status filter ('active' or 'archived')
 * @returns {Promise<Object>} - List of merge groups
 */
export const getMergeGroups = async (token, status = null) => {
    try {
        let url = `${BATCHES_URL}/merge/list`;
        if (status) {
            url += `?status=${status}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch merge groups");

        return data;
    } catch (error) {
        throw new Error(`Get Merge Groups Error: ${error.message}`);
    }
};

/**
 * Delete a merge group
 * @param {string} merge_group_id - Merge group ID to delete
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteMergeGroup = async (merge_group_id, token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/merge/${merge_group_id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to delete merge group");

        return data;
    } catch (error) {
        throw new Error(`Delete Merge Group Error: ${error.message}`);
    }
};

/**
 * Create a GMeet
 * @param {Object} gmeetData - Data for the new GMeet
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Created GMeet details
 */
export const createGMeet = async (gmeetData, token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(gmeetData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create GMeet");

        return data;
    } catch (error) {
        throw new Error(`Create GMeet Error: ${error.message}`);
    }
};

/**
 * Get all GMeets for a specific batch
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - List of GMeets for the batch
 */
export const getGMeetsByBatch = async (batchId, token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/${batchId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch GMeets by batch");

        return data;
    } catch (error) {
        throw new Error(`Get GMeets By Batch Error: ${error.message}`);
    }
};

/**
 * Get a specific GMeet by ID
 * @param {string} meetId - GMeet ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Details of the GMeet
 */
export const getGMeetById = async (meetId, token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/meet/${meetId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch GMeet by ID");

        return data;
    } catch (error) {
        throw new Error(`Get GMeet By ID Error: ${error.message}`);
    }
};

/**
 * Update a GMeet
 * @param {string} meetId - GMeet ID
 * @param {Object} updates - Updates for the GMeet
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Updated GMeet details
 */
export const updateGMeet = async (meetId, updates, token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/${meetId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update GMeet");

        return data;
    } catch (error) {
        throw new Error(`Update GMeet Error: ${error.message}`);
    }
};

/**
 * Get all today's live classes for all batches (Admin/Manager/Academic Admin)
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - List of today's live classes
 */
export const getTodayLiveClasses = async (token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/today/live`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch today's live classes");

        return data;
    } catch (error) {
        throw new Error(`Get Today Live Classes Error: ${error.message}`);
    }
};

/**
 * Get all classes for all batches (Admin/Manager/Academic Admin) - for history view
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - List of all classes
 */
export const getAllClasses = async (token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/all`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch all classes");

        return data;
    } catch (error) {
        throw new Error(`Get All Classes Error: ${error.message}`);
    }
};

/**
 * Delete a GMeet
 * @param {string} meetId - GMeet ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteGMeet = async (meetId, token) => {
    try {
        const response = await fetch(`${GMEETS_API_URL}/${meetId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to delete GMeet");

        return data;
    } catch (error) {
        throw new Error(`Delete GMeet Error: ${error.message}`);
    }
};



/**
 * Create a new note
 * @param {Object} noteData - Note details (link, batch_id, title, note)
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Created note details
 */
export const createNote = async (noteData, token) => {
    try {
        const response = await fetch(`${NOTES_API_URL}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(noteData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create note");

        return data;
    } catch (error) {
        throw new Error(`Create Note Error: ${error.message}`);
    }
};

/**
 * Create a note with file uploads
 * @param {Object} noteData - Note details (batch_id, title, note)
 * @param {File[]} files - Array of File objects to upload
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Created note details
 */
export const createNoteWithFiles = async (noteData, files, token) => {
    try {
        const formData = new FormData();
        
        // Add note data fields
        formData.append('batch_id', noteData.batch_id);
        formData.append('title', noteData.title || '');
        if (noteData.note) {
            formData.append('note', noteData.note);
        }
        
        // Append files
        files.forEach((file) => {
            formData.append('files', file);
        });

        const response = await fetch(`${NOTES_API_URL}/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create note with files");

        return data;
    } catch (error) {
        throw new Error(`Create Note With Files Error: ${error.message}`);
    }
};

/**
 * Get all notes for a specific batch
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - List of notes for the batch
 */
export const getNotes = async (batchId, token) => {
    try {
        const response = await fetch(`${NOTES_API_URL}/?batch_id=${batchId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch notes");

        return data;
    } catch (error) {
        throw new Error(`Get Notes Error: ${error.message}`);
    }
};

/**
 * Get a note by its ID
 * @param {string} noteId - Note ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Details of the note
 */
export const getNoteById = async (noteId, token) => {
    try {
        const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch note by ID");

        return data;
    } catch (error) {
        throw new Error(`Get Note By ID Error: ${error.message}`);
    }
};

/**
 * Update a note by its ID
 * @param {string} noteId - Note ID
 * @param {Object} noteData - Updated note details (link, batch_id, title, note)
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Updated note details
 */
export const updateNote = async (noteId, noteData, token) => {
    try {
        const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(noteData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update note");

        return data;
    } catch (error) {
        throw new Error(`Update Note Error: ${error.message}`);
    }
};

/**
 * Delete a note by its ID
 * @param {string} noteId - Note ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Deletion confirmation
 */
export const deleteNote = async (noteId, token) => {
    try {
        const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to delete note");

        return data;
    } catch (error) {
        throw new Error(`Delete Note Error: ${error.message}`);
    }
};



/**
 * Create a new course.
 * @param {Object} courseData - The data for the course to be created.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response containing the created course or an error message.
 * @throws {Error} - Throws an error if the request fails.
 */
export const createCourse = async (courseData, token) => {
    try {
        const response = await fetch(`${COURSES_API_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create course");

        return {
            success: true,
            data: data.course[0] // Backend returns array of inserted records
        };
    } catch (error) {
        throw new Error(`Create Course Error: ${error.message}`);
    }
};

/**
 * Update an existing course
 * @param {string} courseId - ID of the course to update
 * @param {Object} courseData - Updated course data
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Response containing updated course data
 */
export const updateCourse = async (courseId, courseData, token) => {
    try {
        const response = await fetch(`${COURSES_API_URL}/${courseId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update course");

        return {
            success: true,
            data: data.course
        };
    } catch (error) {
        throw new Error(`Update Course Error: ${error.message}`);
    }
};

/**
 * Delete a course
 * @param {string} courseId - ID of the course to delete
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Response containing success message
 */
export const deleteCourse = async (courseId, token) => {
    try {
        const response = await fetch(`${COURSES_API_URL}/${courseId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to delete course");

        return {
            success: true,
            message: data.message
        };
    } catch (error) {
        throw new Error(`Delete Course Error: ${error.message}`);
    }
};

/**
 * ==================== COURSE FEES API FUNCTIONS ====================
 */

/**
 * Get all course fees
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing course fees data
 */
export const getAllCourseFees = async (token) => {
    try {
        const response = await fetch(`${COURSE_FEES_API_URL}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch course fees");

        return {
            success: true,
            data: data.data || []
        };
    } catch (error) {
        throw new Error(`Get Course Fees Error: ${error.message}`);
    }
};

/**
 * Create a new course fee
 * @param {Object} courseFeeData - The data for the course fee to be created
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing the created course fee
 */
export const createCourseFee = async (courseFeeData, token) => {
    try {
        const response = await fetch(`${COURSE_FEES_API_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(courseFeeData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create course fee");

        return {
            success: true,
            data: data.data
        };
    } catch (error) {
        throw new Error(`Create Course Fee Error: ${error.message}`);
    }
};

/**
 * Update an existing course fee
 * @param {string} courseFeeId - ID of the course fee to update
 * @param {Object} courseFeeData - Updated course fee data
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing updated course fee data
 */
export const updateCourseFee = async (courseFeeId, courseFeeData, token) => {
    try {
        const response = await fetch(`${COURSE_FEES_API_URL}/${courseFeeId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(courseFeeData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update course fee");

        return {
            success: true,
            data: data.data
        };
    } catch (error) {
        throw new Error(`Update Course Fee Error: ${error.message}`);
    }
};

/**
 * Delete a course fee
 * @param {string} courseFeeId - ID of the course fee to delete
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing success message
 */
export const deleteCourseFee = async (courseFeeId, token) => {
    try {
        const response = await fetch(`${COURSE_FEES_API_URL}/${courseFeeId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to delete course fee");

        return {
            success: true,
            message: data.message
        };
    } catch (error) {
        throw new Error(`Delete Course Fee Error: ${error.message}`);
    }
};

/**
 * Fetch all courses with optional pagination
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing courses data
 * @throws {Error} - Throws an error if the request fails
 */
export const getAllCourses = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/courses`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch courses");
        }

        return {
            success: true,
            data: data.data || [] // Ensure we always return an array
        };
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw new Error(`Get Courses Error: ${error.message}`);
    }
};

/**
 * Fetch a single course by ID
 * @param {string} id - Course ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing course details
 * @throws {Error} - Throws an error if the request fails
 */
export const getCourseById = async (id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/courses/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Course not found");
        }

        return data;
    } catch (error) {
        console.error("Error fetching course:", error);
        throw new Error(`Get Course Error: ${error.message}`);
    }
};

// ----------------------
// Chat Service Functions
// ----------------------

/**
 * Create a new chat message.
 * @param {Object} chatData - Data for the new chat message.
 * @param {string} chatData.text - Text of the chat message.
 * @param {string} chatData.batch_id - Batch ID associated with the message.
 * @returns {Promise<Object>} - Response from the API.
 * @throws {Error} - Throws an error if the request fails.
 */
export const createChatMessage = async (chatData) => {
    try {
        const response = await fetch(`${CHAT_API_URL}/chats`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(chatData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to create chat message.");
        }

        return result;
    } catch (error) {
        throw new Error(`Create Chat Message Error: ${error.message}`);
    }
};

/**
 * Fetch previous chat messages for a specific batch.
 * @param {string} batchId - ID of the batch.
 * @returns {Promise<Array>} - List of chat messages.
 * @throws {Error} - Throws an error if the request fails.
 */
export const fetchChatMessages = async (batchId) => {
    try {
        const response = await fetch(`${CHAT_API_URL}/chats/${batchId}`, {
            method: "GET",
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to fetch chat messages.");
        }

        return result;
    } catch (error) {
        throw new Error(`Fetch Chat Messages Error: ${error.message}`);
    }
};

/**
 * Update an existing chat message.
 * @param {string} messageId - ID of the chat message to update.
 * @param {Object} updateData - Data to update the chat message.
 * @param {string} updateData.text - Updated text for the chat message.
 * @returns {Promise<Object>} - Response from the API.
 * @throws {Error} - Throws an error if the request fails.
 */
export const updateChatMessage = async (messageId, updateData) => {
    try {
        const response = await fetch(`${CHAT_API_URL}/chats/${messageId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to update chat message.");
        }

        return result;
    } catch (error) {
        throw new Error(`Update Chat Message Error: ${error.message}`);
    }
};

/**
 * Delete a chat message.
 * @param {string} messageId - ID of the chat message to delete.
 * @returns {Promise<Object>} - Response from the API.
 * @throws {Error} - Throws an error if the request fails.
 */
export const deleteChatMessage = async (messageId) => {
    try {
        const response = await fetch(`${CHAT_API_URL}/chats/${messageId}`, {
            method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to delete chat message.");
        }

        return result;
    } catch (error) {
        throw new Error(`Delete Chat Message Error: ${error.message}`);
    }
};

/**
 * Edit center name.
 * @param {Object} data - Data containing center details.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from the API.
 * @throws {Error} - Throws an error if the request fails.
 */
export const editCenterName = async (data, token) => {
    const response = await fetch(`${ASSIGN_API_URL}/manager/edit-center-name`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Failed to edit center name");
    }

    return response.json();
};

/**
 * Edit state name.
 * @param {Object} data - Data containing state details.
 * @param {string} token - Authentication token.
 * @returns {Promise<Object>} - Response from the API.
 * @throws {Error} - Throws an error if the request fails.
 */
export const editStateName = async (data, token) => {
    const response = await fetch(`${ASSIGN_API_URL}/manager/edit-state-name`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Failed to edit state name");
    }

    return response.json();
};


// =========================
// 📌 GIVEAWAY API
// =========================
// =========================
// 📌 GIVEAWAY / CARD UPLOAD API
// =========================

// ✅ Upload Giveaway CSV
export const uploadGiveawayCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file); // multer upload.single("file")

        const response = await fetch(`${LIST_API_URL}/cards/upload`, {
            method: "POST",
            body: formData, // ❌ Don’t set headers manually
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Upload Giveaway API error:", error);
        throw error;
    }
};

// ✅ Manual Single Insert Giveaway
export const addGiveawayManual = async (entry) => {
    try {
        const response = await fetch(`${LIST_API_URL}/cards/manual`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(entry),
        });

        const data = await response.json(); // 👈 parse pannunga

        if (!response.ok || data.error) {   // 👈 error / status check
            throw new Error(data.error || data.message || "Manual insert failed");
        }

        return data; // ✅ backend response pass pannudhu
    } catch (error) {
        console.error("Add Giveaway Manual API error:", error);
        throw error;
    }
};


// ✅ Get All Giveaways
export const getAllGiveaways = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/cards`);
        if (!response.ok) throw new Error("Failed to fetch giveaways");
        return await response.json();
    } catch (error) {
        console.error("Get Giveaways API error:", error);
        throw error;
    }
};


// =========================
// 📌 CARD API (elite_card_generate)
// =========================

// ✅ Get Card Stats (total, pending, active, expired/inactive)
export const getCardStats = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/cards/stats`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        return {
            total: result.total || 0,
            pending: result.pending || 0,
            active: result.active || 0,
            expired: result.expired || 0,
        };
    } catch (error) {
        console.error("Fetch Card Stats API error:", error);
        throw error;
    }
};

// ✅ Get Only Recent Pending Cards (latest 2)
export const getRecentPendingCards = async () => {
    try {
        const response = await fetch(`${LIST_API_URL}/cards/recent-pending`);
        if (!response.ok) throw new Error("Failed to fetch recent pending cards");

        const data = await response.json();

        // Already filtered by status = "card_generated" in backend
        return data.map(item => ({
            name: item.name_on_the_pass,
            email: item.email,
            card_number: item.card_number,
            card_name: item.card_name,
            status: item.status,
            created_at: item.created_at,
        }));
    } catch (error) {
        console.error("Fetch Recent Pending Cards API error:", error);
        throw error;
    }
};
const getAuthHeaders = (token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
});

// ✅ Get all leads (logged-in user's leads)
export const getAllLeads = async (token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/leads`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch leads");
        }

        // backend returns: { success: true, leads: [...] }
        return result.leads || [];
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching leads");
    }
};

// ✅ Get all leads for a specific center (for academic admin)
export const getLeadsByCenter = async (centerId, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/leads/center/${centerId}`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch leads by center");
        }

        // backend returns: { success: true, leads: [...] }
        return result.leads || [];
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching leads by center");
    }
};

// ✅ Create new lead
export const createLead = async (leadData, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/leads`, {
            method: "POST",
            headers: getAuthHeaders(token),
            body: JSON.stringify(leadData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to create lead");
        }

        return result.lead; // backend: { success, lead }
    } catch (error) {
        throw new Error(error.message || "Something went wrong while creating lead");
    }
};

// ✅ Update lead status
export const updateLeadStatus = async (id, status, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/leads/${id}/status`, {
            method: "PATCH", // 🔹 use PATCH instead of PUT
            headers: getAuthHeaders(token),
            body: JSON.stringify({ status }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update lead status");
        }

        return result.lead; // backend: { success, lead }
    } catch (error) {
        throw new Error(error.message || "Something went wrong while updating lead status");
    }
};

// ✅ Bulk upload leads from CSV
export const uploadLeadsCSV = async (file, skipDuplicates = false, validRows = null, token) => {
    try {
        let url = `${LIST_API_URL}/leads/upload-csv`;
        
        let body;
        let headers = {
            Authorization: `Bearer ${token}`,
        };

        if (skipDuplicates && validRows) {
            // Stage 2: Force insert with validRows (skip duplicates)
            url += "?forceInsert=true";
            headers["Content-Type"] = "application/json";
            body = JSON.stringify({ validRows });
        } else {
            // Stage 1: Initial CSV upload
            const formData = new FormData();
            formData.append("file", file);
            body = formData;
            // Don't set Content-Type for FormData, browser will set it with boundary
        }

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body,
        });

        const result = await response.json();

        if (!response.ok && response.status !== 200) {
            throw new Error(result.message || "Failed to upload CSV");
        }

        return result;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while uploading CSV");
    }
};

// ==================== DEMO MANAGEMENT ====================

// Get all demo requests
export const getDemoRequests = async (state, center_id, token) => {
    try {
        const params = new URLSearchParams();
        if (state) params.append('state', state);
        if (center_id) params.append('center_id', center_id);
        
        const response = await fetch(`${LIST_API_URL}/demo-requests?${params.toString()}`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch demo requests");
        }

        return result.demo_requests || [];
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching demo requests");
    }
};

// Get single demo request
export const getDemoRequestById = async (id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-requests/${id}`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch demo request");
        }

        return result.demo_request;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching demo request");
    }
};

// Get all demo batches
export const getDemoBatches = async (status, tutor_id, date_from, date_to, token) => {
    try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (tutor_id) params.append('tutor_id', tutor_id);
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);
        
        const response = await fetch(`${LIST_API_URL}/demo-batches?${params.toString()}`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch demo batches");
        }

        return result.demo_batches || [];
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching demo batches");
    }
};

// Get single demo batch
export const getDemoBatchById = async (id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-batches/${id}`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch demo batch");
        }

        return result.demo_batch;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching demo batch");
    }
};

// Create demo batch
export const createDemoBatch = async (demoBatchData, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-batches`, {
            method: "POST",
            headers: getAuthHeaders(token),
            body: JSON.stringify(demoBatchData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to create demo batch");
        }

        return result.demo_batch;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while creating demo batch");
    }
};

// Update demo batch
export const updateDemoBatch = async (id, demoBatchData, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-batches/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(token),
            body: JSON.stringify(demoBatchData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update demo batch");
        }

        return result.demo_batch;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while updating demo batch");
    }
};

// Update demo batch class link
export const updateDemoBatchClassLink = async (id, class_link, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-batches/${id}/class-link`, {
            method: "PATCH",
            headers: getAuthHeaders(token),
            body: JSON.stringify({ class_link }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update class link");
        }

        return result.demo_batch;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while updating class link");
    }
};

// Update demo attendance
export const updateDemoAttendance = async (attendanceData, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/demo-attendance`, {
            method: "PATCH",
            headers: getAuthHeaders(token),
            body: JSON.stringify(attendanceData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update attendance");
        }

        return result.attendance;
    } catch (error) {
        throw new Error(error.message || "Something went wrong while updating attendance");
    }
};

// Get demo details for a specific lead
export const getLeadDemoDetails = async (lead_id, token) => {
    try {
        const response = await fetch(`${LIST_API_URL}/leads/${lead_id}/demo`, {
            method: "GET",
            headers: getAuthHeaders(token),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to fetch lead demo details");
        }

        return result.demo_details || [];
    } catch (error) {
        throw new Error(error.message || "Something went wrong while fetching lead demo details");
    }
};

// ==================== BATCH CHANGE MANAGEMENT ====================

/**
 * Updates a student's batch assignment
 * @param {Object} updateData - The update data
 * @param {string} updateData.student_id - The ID of the student
 * @param {string} updateData.batch_id - The ID of the new batch
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Response containing the update status
 * @throws {Error} - Throws an error if the request fails
 */
export const updateStudentBatch = async (updateData, token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/update-student-batch`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to update student batch");
        }

        return result;
    } catch (error) {
        throw new Error(`Update Student Batch Error: ${error.message}`);
    }
};

// ----------------------
// Attendance Management Functions
// ----------------------

// Get batch details for attendance management
export const getBatchForAttendance = async (batchId, token) => {
    try {
        const response = await fetch(`${BATCHES_URL}/${batchId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });
        
        // Handle network errors or cases where response.json() fails
        if (!response.ok) {
            let errorMessage = 'Failed to fetch batch details';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (jsonError) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        // Handle network errors (fetch failed completely)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to the server. Please check your connection.');
        }
        // Re-throw with original message if it's already an Error we created
        if (error.message.includes('Failed to fetch batch details') || error.message.includes('Network error')) {
            throw error;
        }
        throw new Error(`Failed to fetch batch details: ${error.message}`);
    }
};

// Get attendance data for a batch
export const getBatchAttendanceData = async (batchId, token) => {
  try {
    const response = await fetch(
      `${ATTENDANCE_API_URL}/attendance/batch/${batchId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch attendance data");
    }

    return data;
  } catch (error) {
    throw new Error(`Get Batch Attendance Data Error: ${error.message}`);
  }
};

// Get session records for attendance marking
export const getSessionAttendanceRecords = async (
  batchId,
  sessionId,
  token
) => {
  try {
    const response = await fetch(
      `${ATTENDANCE_API_URL}/attendance/batch/${batchId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch session records");
    }

    const session = data?.data?.sessions?.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    return {
      success: true,
      session,
      records: session.records || [],
    };
  } catch (error) {
    throw new Error(`Get Session Records Error: ${error.message}`);
  }
};

// Create a new attendance session
export const createAttendanceSession = async (sessionData, token) => {
  try {
    const response = await fetch(`${ATTENDANCE_API_URL}/attendance/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sessionData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create session");
    }

    return data;
  } catch (error) {
    throw new Error(`Create Attendance Session Error: ${error.message}`);
  }
};


// Update attendance record status
export const updateAttendanceRecord = async (recordId, status, token) => {
  try {
    const response = await fetch(
      `${ATTENDANCE_API_URL}/attendance/records/${recordId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update attendance record");
    }

    return data;
  } catch (error) {
    throw new Error(`Update Attendance Record Error: ${error.message}`);
  }
};


// Bulk update attendance records
export const bulkUpdateAttendanceRecords = async (records, token) => {
  try {
    const response = await fetch(
      `${ATTENDANCE_API_URL}/attendance/records/bulk-update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ records }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save attendance");
    }

    return data;
  } catch (error) {
    throw new Error(`Bulk Update Attendance Records Error: ${error.message}`);
  }
};


// ----------------------
// Event Management Functions
// ----------------------

// Get all events with optional filters
export const getAllEvents = async (filters = {}) => {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters);
        const url = `${EVENTS_API_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Get Events Error: ${error.message}`);
    }
};

// Get events by date range
export const getEventsByDateRange = async (startDate, endDate) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${EVENTS_API_URL}/range?start_date=${startDate}&end_date=${endDate}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Get Events by Date Range Error: ${error.message}`);
    }
};

// Get upcoming events
export const getUpcomingEvents = async (limit = 10) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${EVENTS_API_URL}/upcoming?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch upcoming events');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Get Upcoming Events Error: ${error.message}`);
    }
};

// Get public upcoming events (no authentication required)
export const getPublicUpcomingEvents = async (limit = 10) => {
    try {
        const response = await fetch(`${EVENTS_API_URL}/public/upcoming?limit=${limit}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch public upcoming events');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Get Public Upcoming Events Error: ${error.message}`);
    }
};

// Create new event
export const createEvent = async (eventData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(EVENTS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create event');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Create Event Error: ${error.message}`);
    }
};

// Update event
export const updateEvent = async (eventId, eventData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${EVENTS_API_URL}/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update event');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Update Event Error: ${error.message}`);
    }
};

// Delete event
export const deleteEvent = async (eventId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${EVENTS_API_URL}/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete event');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Delete Event Error: ${error.message}`);
    }
};

// Get event statistics (Academic Admin only)
export const getEventStatistics = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${EVENTS_API_URL}/stats/statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch event statistics');
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Get Event Statistics Error: ${error.message}`);
    }
};





// ----------------------
// Sub-Teacher Request APIs
// ----------------------

export const createTeacherLeaveRequest = async (payload) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/teacher/leave-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to create request');
    return data;
};

export const getMyLeaveRequests = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/teacher/leave-requests`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch requests');
    return data;
};

export const listSubTutorRequests = async (status) => {
    const token = localStorage.getItem('token');
    const url = `${LIST_API_URL}/academic/sub-tutor-requests${status ? `?status=${status}` : ''}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch sub-tutor requests');
    return data;
};

export const approveSubTutorRequest = async (id, subTeacherId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/academic/sub-tutor-requests/${id}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sub_teacher_id: subTeacherId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to approve request');
    return data;
};

export const rejectSubTutorRequest = async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/academic/sub-tutor-requests/${id}/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to reject request');
    return data;
};

export const getEffectiveBatchesForDate = async (date) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${LIST_API_URL}/teacher/effective-batches?date=${date}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch effective batches');
    return data;
};

// ==============================================
// LSRW (Listening, Speaking, Reading, Writing) API Functions
// ==============================================

/**
 * Upload LSRW content (Academic)
 * @param {FormData} formData - FormData with course_id, title, instruction, max_marks, audio file, questionDoc file
 * @param {string} token - Authentication token
 */
export const uploadLSRWContent = async (formData, token) => {
    const response = await fetch(`${LSRW_API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || data.message || 'Failed to upload LSRW content');
        error.response = { data };
        error.details = data.details || data.hint || '';
        throw error;
    }
    return data;
};

/**
 * Get LSRW content by course (Academic)
 * @param {string} courseId - Course ID
 * @param {string} token - Authentication token
 * @param {string} moduleType - Module type (listening, speaking, reading, writing)
 */
export const getLSRWByCourse = async (courseId, token, moduleType = 'listening') => {
    const response = await fetch(`${LSRW_API_URL}/byCourse/${courseId}?module_type=${moduleType}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch LSRW content');
    return data;
};

/**
 * Update session numbers for listening materials (reorder sessions)
 * @param {string} courseId - Course ID
 * @param {Array} sessionOrders - Array of { lsrw_id, session_number }
 * @param {string} token - Authentication token
 */
export const updateSessionNumbers = async (courseId, moduleType, sessionOrders, token) => {
    const response = await fetch(`${LSRW_API_URL}/updateSessionNumbers`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            course_id: courseId,
            module_type: moduleType,
            sessionOrders: sessionOrders
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to update session numbers');
    return data;
};

/**
 * Delete a listening session (delete entire session with all files)
 * @param {string} sessionId - LSRW content ID (session ID)
 * @param {string} token - Authentication token
 */
export const deleteListeningSession = async (sessionId, token) => {
    const response = await fetch(`${LSRW_API_URL}/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to delete session');
    return data;
};

/**
 * Delete a speaking session (delete entire session with all files)
 * @param {string} sessionId - Speaking material ID (session ID)
 * @param {string} token - Authentication token
 */
export const deleteWritingSession = async (sessionId, token) => {
    const response = await fetch(`${WRITING_API_URL}/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete writing session: ${response.statusText}`);
    }

    return await response.json();
};

export const deleteSpeakingSession = async (sessionId, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to delete session');
    return data;
};

/**
 * Delete a reading session (Resource Manager)
 * @param {string} sessionId - Reading material ID
 * @param {string} token - Authentication token
 */
export const deleteReadingSession = async (sessionId, token) => {
    const response = await fetch(`${READING_API_URL}/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to delete reading session');
    return data;
};

/**
 * Get LSRW content for a batch (Tutor)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @param {string} moduleType - Module type (listening, speaking, reading, writing)
 */
export const getLSRWByBatch = async (batchId, token, moduleType = 'listening') => {
    const response = await fetch(`${LSRW_API_URL}/batch/${batchId}?module_type=${moduleType}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch batch LSRW content');
    return data;
};

/**
 * Mark LSRW lesson as completed (Tutor)
 * @param {string} mappingId - Mapping ID
 * @param {string} token - Authentication token
 */
export const getLSRWStudentSubmissions = async (batchId, token, lsrwContentId = null) => {
    try {
        let url = `${LSRW_API_URL}/batch/${batchId}/submissions`;
        if (lsrwContentId) {
            url += `?lsrw_content_id=${lsrwContentId}`;
        }
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch submissions");
        return data;
    } catch (error) {
        throw error;
    }
};

export const verifyLSRWSubmission = async (submissionId, token) => {
    try {
        const response = await fetch(`${LSRW_API_URL}/verify/${submissionId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to verify submission");
        return data;
    } catch (error) {
        throw error;
    }
};

export const markLSRWComplete = async (mappingId, token) => {
    const response = await fetch(`${LSRW_API_URL}/complete/${mappingId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to mark lesson as complete');
    return data;
};

/**
 * Get LSRW content for student (Student)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @param {string} moduleType - Module type (listening, speaking, reading, writing)
 */
export const getStudentLSRW = async (batchId, token, moduleType = 'listening') => {
    const response = await fetch(`${LSRW_API_URL}/student/${batchId}?module_type=${moduleType}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch student LSRW content');
    return data;
};

/**
 * Submit student answers (Student)
 * @param {Object} answerData - { student_id, lsrw_content_id, batch_id, answers }
 * @param {string} token - Authentication token
 */
export const submitLSRWAnswers = async (answerData, token) => {
    const response = await fetch(`${LSRW_API_URL}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(answerData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to submit answers');
    return data;
};

/**
 * Get student results (Student)
 * @param {string} studentId - Student ID
 * @param {string} lsrwId - LSRW content ID
 * @param {string} token - Authentication token
 */
export const getLSRWResults = async (studentId, lsrwId, token) => {
    const response = await fetch(`${LSRW_API_URL}/results/${studentId}/${lsrwId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch results');
    return data;
};

// ===========================================
// SPEAKING MODULE API FUNCTIONS
// ===========================================

/**
 * Upload speaking material (Academic Admin)
 * @param {FormData} formData - Form data with course_id, title, instruction, textFile (optional), content_text (optional)
 * @param {string} token - Authentication token
 */
export const uploadSpeakingMaterial = async (formData, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || data.message || 'Failed to upload speaking material');
        error.response = { data };
        error.details = data.details || data.hint || '';
        throw error;
    }
    return data;
};

/**
 * Get speaking materials by course (Academic Admin)
 * @param {string} courseId - Course ID
 * @param {string} token - Authentication token
 */
export const getSpeakingByCourse = async (courseId, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/byCourse/${courseId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch speaking materials');
    return data;
};

/**
 * Get speaking materials for a batch (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 */
export const getSpeakingByBatch = async (batchId, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/batch/${batchId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch batch speaking materials');
    return data;
};

/**
 * Mark speaking material as completed (Teacher)
 * @param {string} mappingId - Mapping ID
 * @param {string} token - Authentication token
 */
export const markSpeakingComplete = async (mappingId, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/complete/${mappingId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to mark speaking material as complete');
    return data;
};

/**
 * Get student speaking submissions (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @param {string} speakingMaterialId - Optional speaking material ID to filter
 */
export const getSpeakingSubmissions = async (batchId, token, speakingMaterialId = null) => {
    try {
        let url = `${SPEAKING_API_URL}/batch/${batchId}/submissions`;
        if (speakingMaterialId) {
            url += `?speaking_material_id=${speakingMaterialId}`;
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch speaking submissions');
        return data;
    } catch (error) {
        throw new Error(`Get Speaking Submissions Error: ${error.message}`);
    }
};

/**
 * Add/Update feedback for speaking attempt (Teacher)
 * @param {string} attemptId - Attempt ID
 * @param {string} remarks - Teacher feedback/remarks
 * @param {string} token - Authentication token
 */
/**
 * Add/Update speaking feedback (Teacher)
 * @param {string} attemptId - Speaking attempt ID
 * @param {string} remarks - Text feedback (optional if audioFeedback provided)
 * @param {File} audioFeedback - Audio feedback file (optional if remarks provided)
 * @param {string} token - Authentication token
 */
export const addSpeakingFeedback = async (attemptId, remarks, token, audioFeedback = null, marks = null) => {
    // If audio feedback is provided (and is a valid Blob/File), use FormData; otherwise use JSON
    if (audioFeedback && (audioFeedback instanceof Blob || audioFeedback instanceof File)) {
        const formData = new FormData();
        formData.append('attempt_id', attemptId);
        if (remarks) {
            formData.append('remarks', remarks);
        }
        if (marks !== null && marks !== undefined) {
            formData.append('marks', marks.toString());
        }
        formData.append('audioFeedback', audioFeedback, 'feedback.webm');

        const response = await fetch(`${SPEAKING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // Don't set Content-Type - browser will set it with boundary for multipart/form-data
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    } else {
        const response = await fetch(`${SPEAKING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                attempt_id: attemptId, 
                remarks: remarks || '',
                marks: marks !== null && marks !== undefined ? parseInt(marks) : null
            }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    }
};

/**
 * Get student speaking materials (Student)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 */
export const getStudentSpeaking = async (batchId, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/student/${batchId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch speaking materials');
    return data;
};

/**
 * Save speaking attempt (Student) - Draft or Submit
 * @param {string} speakingMaterialId - Speaking material ID
 * @param {string} batchId - Batch ID
 * @param {string} audioUrl - URL to recorded audio
 * @param {string} status - 'draft' or 'submitted'
 * @param {string} token - Authentication token
 */
export const saveSpeakingAttempt = async (speakingMaterialId, batchId, audioUrl, status, token) => {
    const response = await fetch(`${SPEAKING_API_URL}/attempt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            speaking_material_id: speakingMaterialId,
            batch_id: batchId,
            audio_url: audioUrl,
            status
        }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to save speaking attempt');
    return data;
};

// ===========================================
// READING MODULE API FUNCTIONS
// ===========================================

/**
 * Extract reading content from uploaded file (for preview/auto-fill)
 * @param {FormData} formData - FormData containing readingFile
 * @param {string} token - Authentication token
 */
export const extractReadingContent = async (formData, token) => {
    const response = await fetch(`${READING_API_URL}/extract`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        },
        body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to extract reading content');
    return data;
};

/**
 * Upload reading material (Academic Admin)
 * @param {FormData} formData - FormData containing course_id, title, instruction, readingFile (optional), content_text (optional), questions (array of 5 MCQs)
 * @param {string} token - Authentication token
 */
export const uploadReadingMaterial = async (formData, token) => {
    const response = await fetch(`${READING_API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        },
        body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to upload reading material');
    return data;
};

/**
 * Get reading materials by course (Academic Admin)
 * @param {string} courseId - Course ID
 * @param {string} token - Authentication token
 */
export const getReadingByCourse = async (courseId, token) => {
    const response = await fetch(`${READING_API_URL}/byCourse/${courseId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch reading materials');
    return data;
};

// ==================== WRITING MODULE FUNCTIONS ====================

/**
 * Upload writing task (Academic Admin)
 * @param {FormData} formData - Form data with course_id, title, instruction, writingImage OR writingDocument OR content_text
 * @param {string} token - Authentication token
 */
export const uploadWritingTask = async (formData, token) => {
    const response = await fetch(`${WRITING_API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        },
        body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to upload writing task');
    return data;
};

/**
 * Get writing tasks by course (Academic Admin)
 * @param {string} courseId - Course ID
 * @param {string} token - Authentication token
 */
export const getWritingByCourse = async (courseId, token) => {
    const response = await fetch(`${WRITING_API_URL}/byCourse/${courseId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch writing tasks');
    return data;
};

/**
 * Get writing tasks by batch (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 */
export const getWritingByBatch = async (batchId, token) => {
    const response = await fetch(`${WRITING_API_URL}/batch/${batchId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch writing tasks');
    return data;
};

/**
 * Mark writing task as read/completed (Teacher)
 * @param {string} mappingId - Mapping ID
 * @param {string} status - 'read' or 'completed'
 * @param {string} token - Authentication token
 */
export const markWritingComplete = async (mappingId, status, token) => {
    const response = await fetch(`${WRITING_API_URL}/complete/${mappingId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to mark writing task');
    return data;
};

/**
 * Get writing submissions for a batch (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @param {string} writingTaskId - Optional writing task ID to filter
 */
export const getWritingSubmissions = async (batchId, token, writingTaskId = null) => {
    let url = `${WRITING_API_URL}/batch/${batchId}/submissions`;
    if (writingTaskId) {
        url += `?writing_task_id=${writingTaskId}`;
    }
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch writing submissions');
    return data;
};

/**
 * Add/Update feedback for writing submission (Teacher)
 * @param {string} submissionId - Submission ID
 * @param {string} feedbackText - Feedback text
 * @param {string} status - 'reviewed', 'needs_improvement', or 'completed'
 * @param {string} token - Authentication token
 */
export const addWritingFeedback = async (submissionId, feedbackText, status, marks, audioFeedback, token) => {
    // If audio feedback is provided (and is a valid Blob/File), use FormData; otherwise use JSON
    if (audioFeedback && (audioFeedback instanceof Blob || audioFeedback instanceof File)) {
        const formData = new FormData();
        formData.append('submission_id', submissionId);
        if (feedbackText) {
            formData.append('feedback_text', feedbackText);
        }
        if (status) {
            formData.append('status', status);
        }
        if (marks !== null && marks !== undefined) {
            formData.append('marks', marks.toString());
        }
        formData.append('audioFeedback', audioFeedback, 'feedback.webm');

        const response = await fetch(`${WRITING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // Don't set Content-Type - browser will set it with boundary for multipart/form-data
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    } else {
        const response = await fetch(`${WRITING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                submission_id: submissionId, 
                feedback_text: feedbackText || '',
                status: status || 'reviewed',
                marks: marks !== null && marks !== undefined ? parseInt(marks) : null
            }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    }
};

/**
 * Get reading materials by batch (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 */
export const getReadingByBatch = async (batchId, token) => {
    const response = await fetch(`${READING_API_URL}/batch/${batchId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch reading materials');
    return data;
};

/**
 * Mark reading material as completed (Teacher)
 * @param {string} mappingId - Reading batch map ID
 * @param {string} token - Authentication token
 */
export const markReadingComplete = async (mappingId, token) => {
    const response = await fetch(`${READING_API_URL}/complete/${mappingId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to mark reading as completed');
    return data;
};

/**
 * Get student reading submissions (Teacher)
 * @param {string} batchId - Batch ID
 * @param {string} token - Authentication token
 * @param {string} readingMaterialId - Optional reading material ID to filter
 */
export const getReadingSubmissions = async (batchId, token, readingMaterialId = null) => {
    try {
        let url = `${READING_API_URL}/batch/${batchId}/submissions`;
        if (readingMaterialId) {
            url += `?reading_material_id=${readingMaterialId}`;
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch reading submissions');
        return data;
    } catch (error) {
        console.error('Error fetching reading submissions:', error);
        throw error;
    }
};

/**
 * Add/Update reading feedback (Teacher)
 * @param {string} attemptId - Reading attempt ID
 * @param {string} remarks - Text feedback
 * @param {string} token - Authentication token
 */
export const addReadingFeedback = async (attemptId, remarks, token, audioBlob = null, marks = null) => {
    // If audio blob is provided, use FormData; otherwise use JSON
    if (audioBlob) {
        const formData = new FormData();
        formData.append('attempt_id', attemptId);
        if (remarks) formData.append('remarks', remarks);
        if (marks !== null && marks !== undefined) formData.append('marks', marks.toString());
        formData.append('audioFeedback', audioBlob, 'feedback.webm');

        const response = await fetch(`${READING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // Don't set Content-Type - browser will set it with boundary for multipart/form-data
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    } else {
        const response = await fetch(`${READING_API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                attempt_id: attemptId, 
                remarks: remarks || null,
                marks: marks !== null && marks !== undefined ? marks : null
            }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to add feedback');
        return data;
    }
};

/**
 * Verify reading attempt and release marks (Teacher)
 * @param {string} attemptId - Reading attempt ID
 * @param {string} token - Authentication token
 */
export const verifyReadingAttempt = async (attemptId, token) => {
    const response = await fetch(`${READING_API_URL}/verify/${attemptId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to verify reading attempt');
    return data;
};

