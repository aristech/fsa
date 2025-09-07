import { User, Role } from "../models";

// ----------------------------------------------------------------------

export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
  userRole?: string;
  userPermissions?: string[];
}

export interface UserPermissionContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isTenantOwner: boolean;
}

// ----------------------------------------------------------------------

export class PermissionService {
  /**
   * Get user's permission context from database
   */
  static async getUserPermissionContext(
    userId: string
  ): Promise<UserPermissionContext | null> {
    try {
      const user = await User.findById(userId).lean();
      if (!user) {
        return null;
      }

      // If user is tenant owner, they have all permissions
      if (user.isTenantOwner) {
        return {
          userId: user._id.toString(),
          tenantId: user.tenantId.toString(),
          role: user.role,
          permissions: this.getAllPermissions(),
          isTenantOwner: true,
        };
      }

      // Handle special case for "admin" role (legacy support)
      if (user.role === "admin") {
        return {
          userId: user._id.toString(),
          tenantId: user.tenantId.toString(),
          role: user.role,
          permissions: this.getAllPermissions(),
          isTenantOwner: false,
        };
      }

      // Get permissions from role
      const role = await Role.findOne({
        tenantId: user.tenantId,
        slug: user.role,
        isActive: true,
      }).lean();

      return {
        userId: user._id.toString(),
        tenantId: user.tenantId.toString(),
        role: user.role,
        permissions: role?.permissions || [],
        isTenantOwner: false,
      };
    } catch (error) {
      console.error("Error getting user permission context:", error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(
    userId: string,
    permission: string
  ): Promise<PermissionCheckResult> {
    const context = await this.getUserPermissionContext(userId);

    if (!context) {
      return {
        hasPermission: false,
        reason: "User not found or invalid",
      };
    }

    if (context.isTenantOwner) {
      return {
        hasPermission: true,
        userRole: context.role,
        userPermissions: context.permissions,
      };
    }

    const hasPermission = context.permissions.includes(permission);

    return {
      hasPermission,
      reason: hasPermission ? undefined : `Missing permission: ${permission}`,
      userRole: context.role,
      userPermissions: context.permissions,
    };
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(
    userId: string,
    permissions: string[]
  ): Promise<PermissionCheckResult> {
    const context = await this.getUserPermissionContext(userId);

    if (!context) {
      return {
        hasPermission: false,
        reason: "User not found or invalid",
      };
    }

    if (context.isTenantOwner) {
      return {
        hasPermission: true,
        userRole: context.role,
        userPermissions: context.permissions,
      };
    }

    const hasAnyPermission = permissions.some((permission) =>
      context.permissions.includes(permission)
    );

    return {
      hasPermission: hasAnyPermission,
      reason: hasAnyPermission
        ? undefined
        : `Missing any of: ${permissions.join(", ")}`,
      userRole: context.role,
      userPermissions: context.permissions,
    };
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(
    userId: string,
    permissions: string[]
  ): Promise<PermissionCheckResult> {
    const context = await this.getUserPermissionContext(userId);

    if (!context) {
      return {
        hasPermission: false,
        reason: "User not found or invalid",
      };
    }

    if (context.isTenantOwner) {
      return {
        hasPermission: true,
        userRole: context.role,
        userPermissions: context.permissions,
      };
    }

    const hasAllPermissions = permissions.every((permission) =>
      context.permissions.includes(permission)
    );

    return {
      hasPermission: hasAllPermissions,
      reason: hasAllPermissions
        ? undefined
        : `Missing all of: ${permissions.join(", ")}`,
      userRole: context.role,
      userPermissions: context.permissions,
    };
  }

  /**
   * Check if user can access a specific resource
   */
  static async canAccessResource(
    userId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    const permission = `${resource}.${action}`;
    return this.hasPermission(userId, permission);
  }

  /**
   * Check if user can manage a specific resource
   */
  static async canManageResource(
    userId: string,
    resource: string
  ): Promise<PermissionCheckResult> {
    const permissions = [
      `${resource}.create`,
      `${resource}.edit`,
      `${resource}.delete`,
    ];
    return this.hasAnyPermission(userId, permissions);
  }

  /**
   * Get all available permissions in the system
   */
  static getAllPermissions(): string[] {
    return [
      // Work Orders
      "workOrders.view",
      "workOrders.create",
      "workOrders.edit",
      "workOrders.delete",
      "workOrders.assign",
      "workOrders.viewOwn",
      "workOrders.editOwn",

      // Projects
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.delete",

      // Tasks
      "tasks.view",
      "tasks.create",
      "tasks.edit",
      "tasks.delete",
      "tasks.viewOwn",
      "tasks.editOwn",

      // Clients
      "clients.view",
      "clients.create",
      "clients.edit",
      "clients.delete",

      // Personnel
      "personnel.view",
      "personnel.create",
      "personnel.edit",
      "personnel.delete",
      "personnel.viewOwn",
      "personnel.editOwn",

      // Roles
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",

      // Scheduling
      "scheduling.view",
      "scheduling.create",
      "scheduling.edit",
      "scheduling.delete",

      // Reports
      "reports.view",
      "reports.create",
      "reports.edit",
      "reports.delete",

      // Settings
      "settings.view",
      "settings.edit",

      // Admin
      "admin.access",
      "admin.manageUsers",
      "admin.manageTenants",
    ];
  }

  /**
   * Get permissions by category
   */
  static getPermissionsByCategory(): Record<string, string[]> {
    return {
      "Work Orders": [
        "workOrders.view",
        "workOrders.create",
        "workOrders.edit",
        "workOrders.delete",
        "workOrders.assign",
        "workOrders.viewOwn",
        "workOrders.editOwn",
      ],
      Projects: [
        "projects.view",
        "projects.create",
        "projects.edit",
        "projects.delete",
      ],
      Tasks: [
        "tasks.view",
        "tasks.create",
        "tasks.edit",
        "tasks.delete",
        "tasks.viewOwn",
        "tasks.editOwn",
      ],
      Clients: [
        "clients.view",
        "clients.create",
        "clients.edit",
        "clients.delete",
      ],
      Personnel: [
        "personnel.view",
        "personnel.create",
        "personnel.edit",
        "personnel.delete",
        "personnel.viewOwn",
        "personnel.editOwn",
      ],
      Roles: ["roles.view", "roles.create", "roles.edit", "roles.delete"],
      Scheduling: [
        "scheduling.view",
        "scheduling.create",
        "scheduling.edit",
        "scheduling.delete",
      ],
      Reports: [
        "reports.view",
        "reports.create",
        "reports.edit",
        "reports.delete",
      ],
      Settings: ["settings.view", "settings.edit"],
      Admin: ["admin.access", "admin.manageUsers", "admin.manageTenants"],
    };
  }

  /**
   * Validate permission format
   */
  static isValidPermission(permission: string): boolean {
    const validFormat = /^[a-z]+\.[a-z]+$/;
    return validFormat.test(permission);
  }

  /**
   * Get user's effective permissions (including inherited from role)
   */
  static async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const context = await this.getUserPermissionContext(userId);
    return context?.permissions || [];
  }

  /**
   * Check if user can perform action on resource
   */
  static async canPerformAction(
    userId: string,
    resource: string,
    action: string,
    resourceOwnerId?: string
  ): Promise<PermissionCheckResult> {
    // Check general permission first
    const generalCheck = await this.canAccessResource(userId, resource, action);

    if (!generalCheck.hasPermission) {
      return generalCheck;
    }

    // If it's an "own" action, check if user owns the resource
    if (action.includes("_own") && resourceOwnerId) {
      const context = await this.getUserPermissionContext(userId);
      if (context?.userId !== resourceOwnerId) {
        return {
          hasPermission: false,
          reason: "User can only access their own resources",
          userRole: context?.role,
          userPermissions: context?.permissions,
        };
      }
    }

    return generalCheck;
  }
}

// ----------------------------------------------------------------------

export default PermissionService;
