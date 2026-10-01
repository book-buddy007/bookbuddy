export type Permission =
  | "ALL"
  | "USER_MANAGEMENT"
  | "CATALOG_MANAGEMENT"
  | "CIRCULATION"
  | "CATALOG_MAINTENANCE"

export type RoleId = "SUPER_ADMIN" | "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT"

// Available roles for super-admin to assign
export type AssignableRoleId = "ADMIN" | "LIBRARIAN"

export type Role = {
  permissions: Permission[]
  description: string
  assignable: boolean // Whether super-admin can assign this role
}

export type RoleTransition = Record<string, string[]>

export const roles: Record<RoleId, Role> = {
  "SUPER_ADMIN": {
    permissions: ["ALL"],
    description: "Full system control",
    assignable: false // Cannot be assigned by anyone
  },
  "ADMIN": {
    permissions: ["USER_MANAGEMENT", "CATALOG_MANAGEMENT"],
    description: "Network administration",
    assignable: true // Can be assigned by super-admin
  },
  "LIBRARIAN": {
    permissions: ["CIRCULATION", "CATALOG_MAINTENANCE"],
    description: "Library operational staff",
    assignable: true // Can be assigned by super-admin
  },
  "TEACHER": {
    permissions: ["USER_MANAGEMENT"],
    description: "Academic personnel",
    assignable: false // Cannot be assigned by super-admin (only by admin)
  },
  "STUDENT": {
    permissions: ["CATALOG_MANAGEMENT"],
    description: "Members/Readers",
    assignable: false // Cannot be assigned by super-admin (only by admin)
  }
}

// Get assignable roles for super-admin
export const getAssignableRoles = (): Record<AssignableRoleId, Role> => {
  return Object.entries(roles)
    .filter(([_, role]) => role.assignable)
    .reduce((acc, [roleId, role]) => ({
      ...acc,
      [roleId as AssignableRoleId]: role
    }), {} as Record<AssignableRoleId, Role>);
}

export const allowedTransitions: RoleTransition = {
  "LIBRARIAN": ["ADMIN"]
}

export const validateRoleChange = (currentRole: RoleId, newRole: RoleId, existingSuperAdmin?: boolean): { valid: boolean; message?: string } => {
  // Prevent creating multiple super-admins
  if (newRole === "SUPER_ADMIN") {
    return {
      valid: false,
      message: "Super Admin role cannot be assigned through this interface"
    }
  }

  // Prevent assigning teacher or student roles
  if (newRole === "TEACHER" || newRole === "STUDENT") {
    return {
      valid: false,
      message: "Academic and Member roles can only be assigned by a System Admin"
    }
  }

  // If current role is not super-admin, check transition rules
  if (currentRole !== "SUPER_ADMIN") {
    // If no transition rules for current role, or new role is not in allowed transitions
    if (!allowedTransitions[currentRole] || !allowedTransitions[currentRole].includes(newRole)) {
      return {
        valid: false,
        message: `Cannot change role from ${currentRole} to ${newRole}`
      }
    }
  }

  return { valid: true }
} 