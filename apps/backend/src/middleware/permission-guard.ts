import { FastifyRequest, FastifyReply } from "fastify";
import { PermissionService } from "../services/permission-service";

// ----------------------------------------------------------------------

export interface PermissionGuardOptions {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
  allowTenantOwner?: boolean;
  customCheck?: (userId: string, request: FastifyRequest) => Promise<boolean>;
}

// ----------------------------------------------------------------------

/**
 * Permission guard middleware factory
 */
export function createPermissionGuard(options: PermissionGuardOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get user from request (set by auth middleware)
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply.status(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      const userId = user.id;

      // Allow tenant owners to bypass all checks if specified
      if (options.allowTenantOwner !== false && user.isTenantOwner) {
        return; // Continue to next middleware
      }

      let hasPermission = false;
      let reason = "";

      // Custom permission check
      if (options.customCheck) {
        hasPermission = await options.customCheck(userId, request);
        reason = hasPermission ? "" : "Custom permission check failed";
      }
      // Single permission check
      else if (options.permission) {
        const result = await PermissionService.hasPermission(
          userId,
          options.permission
        );
        hasPermission = result.hasPermission;
        reason = result.reason || "";
      }
      // Multiple permissions check
      else if (options.permissions && options.permissions.length > 0) {
        const result = options.requireAll
          ? await PermissionService.hasAllPermissions(
              userId,
              options.permissions
            )
          : await PermissionService.hasAnyPermission(
              userId,
              options.permissions
            );
        hasPermission = result.hasPermission;
        reason = result.reason || "";
      }
      // Resource-action check
      else if (options.resource && options.action) {
        const result = await PermissionService.canAccessResource(
          userId,
          options.resource,
          options.action
        );
        hasPermission = result.hasPermission;
        reason = result.reason || "";
      }
      // Default: require authentication only
      else {
        hasPermission = true;
      }

      if (!hasPermission) {
        return reply.status(403).send({
          success: false,
          message: "Insufficient permissions",
          reason: reason,
        });
      }

      // Add permission context to request for use in route handlers
      (request as any).permissionContext = {
        userId,
        hasPermission,
        reason,
      };
    } catch (error) {
      console.error("Permission guard error:", error);
      return reply.status(500).send({
        success: false,
        message: "Permission check failed",
      });
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Convenience functions for common permission checks
 */

export const requirePermission = (permission: string) =>
  createPermissionGuard({ permission });

export const requireAnyPermission = (permissions: string[]) =>
  createPermissionGuard({ permissions, requireAll: false });

export const requireAllPermissions = (permissions: string[]) =>
  createPermissionGuard({ permissions, requireAll: true });

export const requireResourceAccess = (resource: string, action: string) =>
  createPermissionGuard({ resource, action });

export const requireResourceManagement = (resource: string) =>
  createPermissionGuard({
    permissions: [
      `${resource}.create`,
      `${resource}.edit`,
      `${resource}.delete`,
    ],
    requireAll: false,
  });

export const requireAdminAccess = () =>
  createPermissionGuard({ permission: "admin.access" });

export const requireTenantOwner = () =>
  createPermissionGuard({
    customCheck: async (userId) => {
      const context = await PermissionService.getUserPermissionContext(userId);
      return context?.isTenantOwner || false;
    },
  });

// ----------------------------------------------------------------------

/**
 * Resource ownership check middleware
 */
export function createOwnershipGuard(resourceIdParam: string = "id") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      // Tenant owners can access everything
      if (user.isTenantOwner) {
        return;
      }

      const resourceId = (request.params as any)[resourceIdParam];
      if (!resourceId) {
        return reply.status(400).send({
          success: false,
          message: "Resource ID required",
        });
      }

      // Check if user owns the resource
      // This is a simplified check - in real implementation, you'd query the database
      // to check if the resource belongs to the user
      const ownsResource = await checkResourceOwnership(
        user.userId,
        resourceId,
        request
      );

      if (!ownsResource) {
        return reply.status(403).send({
          success: false,
          message: "Access denied: You can only access your own resources",
        });
      }
    } catch (error) {
      console.error("Ownership guard error:", error);
      return reply.status(500).send({
        success: false,
        message: "Ownership check failed",
      });
    }
  };
}

/**
 * Check if user owns a specific resource
 * This is a placeholder - implement based on your resource types
 */
async function checkResourceOwnership(
  userId: string,
  resourceId: string,
  request: FastifyRequest
): Promise<boolean> {
  // This is a simplified implementation
  // In a real application, you would:
  // 1. Determine the resource type from the route
  // 2. Query the appropriate model to check ownership
  // 3. Return true if user owns the resource

  // For now, we'll allow access (implement proper ownership checks as needed)
  return true;
}

// ----------------------------------------------------------------------

export default {
  createPermissionGuard,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireResourceAccess,
  requireResourceManagement,
  requireAdminAccess,
  requireTenantOwner,
  createOwnershipGuard,
};
