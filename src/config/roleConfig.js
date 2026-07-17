export const ROLE_CONFIG = {
  admin: {
    allowedRoles: ["manager", "financial", "academic", "state", "center", "teacher", "cardadmin", "resource_manager", "franchise_master"]
  },
  manager: {
    allowedRoles: ["state", "center"]
  },
  academic: {
    allowedRoles: ["teacher"]
  }
  // Add other roles as needed
};