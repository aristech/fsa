import { Role, Personnel, User } from "../models";

export interface UserPermissions {
  userId: string;
  permissions: string[];
  role: string;
  tenantId: string;
  personnelId?: string;
}

export interface FilterOptions {
  includeCreated?: boolean; // Include items created by the user
  includeAssigned?: boolean; // Include items assigned to the user
  includeOwned?: boolean; // Include items owned by the user
}

export class PermissionService {
  /**
   * Get all available permissions in the system
   */
  static getAllPermissions(): string[] {
    return [
      // Admin permissions
      "admin.access",

      // Role permissions
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",
      "roles.manage",

      // User permissions
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "users.manage",

      // Task permissions
      "tasks.view",
      "tasks.viewOwn",
      "tasks.create",
      "tasks.edit",
      "tasks.editOwn",
      "tasks.delete",
      "tasks.assign",
      "tasks.manage",

      // Project permissions
      "projects.view",
      "projects.viewOwn",
      "projects.create",
      "projects.edit",
      "projects.editOwn",
      "projects.delete",
      "projects.manage",

      // Report permissions
      "reports.view",
      "reports.viewOwn",
      "reports.create",
      "reports.edit",
      "reports.editOwn",
      "reports.delete",
      "reports.manage",

      // Work order permissions
      "workOrders.view",
      "workOrders.viewOwn",
      "workOrders.create",
      "workOrders.edit",
      "workOrders.editOwn",
      "workOrders.delete",
      "workOrders.manage",

      // Personnel permissions
      "personnel.view",
      "personnel.create",
      "personnel.edit",
      "personnel.delete",
      "personnel.manage",

      // Client permissions
      "clients.view",
      "clients.create",
      "clients.edit",
      "clients.delete",
      "clients.manage",

      // Settings permissions
      "settings.view",
      "settings.edit",
      "settings.manage",
    ];
  }

  /**
   * Get permissions organized by category
   */
  static getPermissionsByCategory(): Record<string, string[]> {
    const permissions = this.getAllPermissions();
    const categories: Record<string, string[]> = {};

    permissions.forEach((permission) => {
      const [category] = permission.split(".");
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(permission);
    });

    return categories;
  }

  /**
   * Check if a permission string is valid
   */
  static isValidPermission(permission: string): boolean {
    const validPermissions = this.getAllPermissions();
    return validPermissions.includes(permission);
  }
  /**
   * Get user permissions by fetching their role
   */
  static async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<UserPermissions | null> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      // Get personnel record to find their personnel ID
      const personnel = await Personnel.findOne({ userId, tenantId });

      // For superusers, admins, and tenant owners, return all permissions
      if (
        user.role === "superuser" ||
        user.role === "admin" ||
        user.isTenantOwner
      ) {
        return {
          userId,
          permissions: ["*"], // All permissions
          role: user.role,
          tenantId,
          personnelId: personnel?._id?.toString(),
        };
      }

      // Get role permissions
      const role = await Role.findOne({
        tenantId,
        slug: user.role,
        isActive: true,
      });

      if (!role) return null;

      return {
        userId,
        permissions: role.permissions,
        role: user.role,
        tenantId,
        personnelId: personnel?._id?.toString(),
      };
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(
    userPermissions: UserPermissions,
    permission: string,
  ): boolean {
    // Superusers and those with '*' permission have all permissions
    if (userPermissions.permissions.includes("*")) {
      return true;
    }

    return userPermissions.permissions.includes(permission);
  }

  /**
   * Check if user should only see their own items for a given resource
   */
  static shouldFilterToOwn(
    userPermissions: UserPermissions,
    resource: string,
  ): boolean {
    // If user has full view permission, they can see all
    if (this.hasPermission(userPermissions, `${resource}.view`)) {
      return false;
    }

    // If user only has viewOwn permission, they should only see their own
    return this.hasPermission(userPermissions, `${resource}.viewOwn`);
  }

  /**
   * Get MongoDB filter for tasks based on user permissions
   */
  static getTaskFilter(
    userPermissions: UserPermissions,
    tenantId: string,
    baseFilter: any = {},
  ): any {
    const filter = { ...baseFilter, tenantId };

    // If user can view all tasks, return base filter
    if (this.hasPermission(userPermissions, "tasks.view")) {
      return filter;
    }

    // If user can only view own tasks, filter to assigned or created tasks
    if (this.hasPermission(userPermissions, "tasks.viewOwn")) {
      const ownFilter = {
        $or: [
          // Tasks created by the user
          { createdBy: userPermissions.userId },
          // Tasks assigned to the user (if they have personnel record)
          ...(userPermissions.personnelId
            ? [{ assignees: userPermissions.personnelId }]
            : []),
        ],
      };

      return { ...filter, ...ownFilter };
    }

    // If user has no task permissions, return filter that matches nothing
    return { ...filter, _id: { $in: [] } };
  }

  /**
   * Get MongoDB filter for projects based on user permissions
   */
  static getProjectFilter(
    userPermissions: UserPermissions,
    tenantId: string,
    baseFilter: any = {},
  ): any {
    const filter = { ...baseFilter, tenantId };

    // If user can view all projects, return base filter
    if (this.hasPermission(userPermissions, "projects.view")) {
      return filter;
    }

    // If user can only view own projects, filter to created or assigned projects
    if (this.hasPermission(userPermissions, "projects.viewOwn")) {
      const ownFilter = {
        $or: [
          // Projects created by the user
          { createdBy: userPermissions.userId },
          // Projects where user is assigned (if they have personnel record)
          ...(userPermissions.personnelId
            ? [
                { assignees: userPermissions.personnelId },
                { managerId: userPermissions.personnelId },
              ]
            : []),
        ],
      };

      return { ...filter, ...ownFilter };
    }

    // If user has no project permissions, return filter that matches nothing
    return { ...filter, _id: { $in: [] } };
  }

  /**
   * Get MongoDB filter for reports based on user permissions
   */
  static getReportFilter(
    userPermissions: UserPermissions,
    tenantId: string,
    baseFilter: any = {},
  ): any {
    const filter = { ...baseFilter, tenantId };

    // If user can view all reports, return base filter
    if (this.hasPermission(userPermissions, "reports.view")) {
      return filter;
    }

    // If user can only view own reports, filter to created reports
    if (this.hasPermission(userPermissions, "reports.viewOwn")) {
      return {
        ...filter,
        createdBy: userPermissions.userId,
      };
    }

    // If user has no report permissions, return filter that matches nothing
    return { ...filter, _id: { $in: [] } };
  }

  /**
   * Check if user can edit a specific task
   */
  static async canEditTask(
    userPermissions: UserPermissions,
    taskId: string,
    tenantId: string,
  ): Promise<boolean> {
    // Full edit permission
    if (this.hasPermission(userPermissions, "tasks.edit")) {
      return true;
    }

    // Edit own permission - check if user created or is assigned to the task
    if (this.hasPermission(userPermissions, "tasks.editOwn")) {
      const { Task } = await import("../models");
      const task = await Task.findOne({ _id: taskId, tenantId });

      if (!task) return false;

      // Can edit if user created the task
      if (task.createdBy === userPermissions.userId) {
        return true;
      }

      // Can edit if user is assigned to the task
      if (
        userPermissions.personnelId &&
        task.assignees?.includes(userPermissions.personnelId)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user can assign tasks to others
   */
  static canAssignTasks(userPermissions: UserPermissions): boolean {
    return (
      this.hasPermission(userPermissions, "tasks.edit") ||
      this.hasPermission(userPermissions, "tasks.assign")
    );
  }

  /**
   * Get user permission context for middleware
   */
  static async getUserPermissionContext(
    userId: string,
  ): Promise<(UserPermissions & { isTenantOwner: boolean }) | null> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      // For superusers and tenant owners, we need to determine the tenantId
      // This is a simplified approach - in production you might want to pass tenantId explicitly
      let tenantId = user.tenantId;

      // If no tenantId in user record, try to find it from Personnel
      if (!tenantId) {
        const personnel = await Personnel.findOne({ userId });
        tenantId = personnel?.tenantId;
      }

      if (!tenantId) return null;

      const permissions = await this.getUserPermissions(userId, tenantId);
      if (!permissions) return null;

      return {
        ...permissions,
        isTenantOwner: user.isTenantOwner || false,
      };
    } catch (error) {
      console.error("Error getting user permission context:", error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission (accepts userId)
   */
  static async hasPermissionAsync(
    userId: string,
    permission: string,
    tenantId?: string,
  ): Promise<{ hasPermission: boolean; reason: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { hasPermission: false, reason: "User not found" };
      }

      // Superusers, admins, and tenant owners have all permissions
      if (
        user.role === "superuser" ||
        user.role === "admin" ||
        user.isTenantOwner
      ) {
        return { hasPermission: true, reason: "" };
      }

      // If tenantId not provided, try to find it
      if (!tenantId) {
        tenantId = user.tenantId;
        if (!tenantId) {
          const personnel = await Personnel.findOne({ userId });
          tenantId = personnel?.tenantId;
        }

        if (!tenantId) {
          return { hasPermission: false, reason: "Tenant not found" };
        }
      }

      const userPermissions = await this.getUserPermissions(userId, tenantId);
      if (!userPermissions) {
        return { hasPermission: false, reason: "User permissions not found" };
      }

      const hasAccess = this.hasPermission(userPermissions, permission);
      return {
        hasPermission: hasAccess,
        reason: hasAccess ? "" : `Missing permission: ${permission}`,
      };
    } catch (error) {
      console.error("Error checking permission:", error);
      return { hasPermission: false, reason: "Permission check failed" };
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(
    userId: string,
    permissions: string[],
    tenantId?: string,
  ): Promise<{ hasPermission: boolean; reason: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { hasPermission: false, reason: "User not found" };
      }

      // Superusers, admins, and tenant owners have all permissions
      if (
        user.role === "superuser" ||
        user.role === "admin" ||
        user.isTenantOwner
      ) {
        return { hasPermission: true, reason: "" };
      }

      // If tenantId not provided, try to find it
      if (!tenantId) {
        tenantId = user.tenantId;
        if (!tenantId) {
          const personnel = await Personnel.findOne({ userId });
          tenantId = personnel?.tenantId;
        }

        if (!tenantId) {
          return { hasPermission: false, reason: "Tenant not found" };
        }
      }

      const userPermissions = await this.getUserPermissions(userId, tenantId);
      if (!userPermissions) {
        return { hasPermission: false, reason: "User permissions not found" };
      }

      for (const permission of permissions) {
        if (this.hasPermission(userPermissions, permission)) {
          return { hasPermission: true, reason: "" };
        }
      }

      return {
        hasPermission: false,
        reason: `Missing any of permissions: ${permissions.join(", ")}`,
      };
    } catch (error) {
      console.error("Error checking any permission:", error);
      return { hasPermission: false, reason: "Permission check failed" };
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(
    userId: string,
    permissions: string[],
    tenantId?: string,
  ): Promise<{ hasPermission: boolean; reason: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { hasPermission: false, reason: "User not found" };
      }

      // Superusers, admins, and tenant owners have all permissions
      if (
        user.role === "superuser" ||
        user.role === "admin" ||
        user.isTenantOwner
      ) {
        return { hasPermission: true, reason: "" };
      }

      // If tenantId not provided, try to find it
      if (!tenantId) {
        tenantId = user.tenantId;
        if (!tenantId) {
          const personnel = await Personnel.findOne({ userId });
          tenantId = personnel?.tenantId;
        }

        if (!tenantId) {
          return { hasPermission: false, reason: "Tenant not found" };
        }
      }

      const userPermissions = await this.getUserPermissions(userId, tenantId);
      if (!userPermissions) {
        return { hasPermission: false, reason: "User permissions not found" };
      }

      const missingPermissions = permissions.filter(
        (permission) => !this.hasPermission(userPermissions, permission),
      );

      if (missingPermissions.length > 0) {
        return {
          hasPermission: false,
          reason: `Missing permissions: ${missingPermissions.join(", ")}`,
        };
      }

      return { hasPermission: true, reason: "" };
    } catch (error) {
      console.error("Error checking all permissions:", error);
      return { hasPermission: false, reason: "Permission check failed" };
    }
  }

  /**
   * Check if user can access a specific resource with given action
   */
  static async canAccessResource(
    userId: string,
    resource: string,
    action: string,
    tenantId?: string,
  ): Promise<{ hasPermission: boolean; reason: string }> {
    const permission = `${resource}.${action}`;
    return this.hasPermissionAsync(userId, permission, tenantId);
  }

  /**
   * Get dynamic permissions based on user assignments to tasks/work orders
   */
  static async getUserAssignmentPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    try {
      const { Personnel, Task, WorkOrder } = await import("../models");

      // Get user's personnel record
      const personnel = await Personnel.findOne({ userId, tenantId });
      if (!personnel) return [];

      const personnelId = personnel._id.toString();
      const assignmentPermissions: string[] = [];

      // Check if user is assigned to any tasks
      const assignedTasks = await Task.countDocuments({
        tenantId,
        assignees: personnelId,
      });

      if (assignedTasks > 0) {
        assignmentPermissions.push("tasks.viewOwn", "tasks.editOwn");
      }

      // Check if user is assigned to any work orders
      const assignedWorkOrders = await WorkOrder.countDocuments({
        tenantId,
        personnelIds: personnelId,
      });

      if (assignedWorkOrders > 0) {
        assignmentPermissions.push("workOrders.viewOwn", "workOrders.editOwn");
      }

      // Remove duplicates
      return [...new Set(assignmentPermissions)];
    } catch (error) {
      console.error("Error getting user assignment permissions:", error);
      return [];
    }
  }
}
