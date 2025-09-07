import { FastifyRequest, FastifyReply } from "fastify";
import { Role, User } from "../models";
import { PermissionService } from "../services/permission-service";

// ----------------------------------------------------------------------

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    permissions?: string[];
    isTenantOwner?: boolean;
  };
}

// ----------------------------------------------------------------------

/**
 * Middleware to check if user has required permissions
 * @deprecated Use createPermissionGuard from permission-guard.ts instead
 */
export function requirePermissions(requiredPermissions: string | string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      // Convert single permission to array
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Use the new PermissionService
      const result = await PermissionService.hasAllPermissions(
        user.id,
        permissions
      );

      if (!result.hasPermission) {
        return reply.status(403).send({
          success: false,
          message: "Insufficient permissions",
          reason: result.reason,
          required: permissions,
          userPermissions: result.userPermissions,
        });
      }

      // Add permission context to request
      request.user = {
        ...user,
        permissions: result.userPermissions || [],
        isTenantOwner:
          result.userPermissions?.length ===
          PermissionService.getAllPermissions().length,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Permission check failed",
      });
    }
  };
}

/**
 * Middleware to check if user can access own resources only
 */
export function requireOwnResource(
  resourceUserIdField: string = "assignedUserId"
) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      // Get the resource ID from params
      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({
          success: false,
          message: "Resource ID is required",
        });
      }

      // This would need to be implemented based on the specific resource
      // For now, we'll just check if the user has viewOwn permissions
      const role = await Role.findOne({
        tenantId: user.tenantId,
        name: user.role,
        isActive: true,
      });

      if (!role) {
        return reply.status(403).send({
          success: false,
          message: "Role not found or inactive",
        });
      }

      // Check if user has viewOwn permission for the resource type
      const resourceType = request.url.split("/")[3]; // Extract resource type from URL
      const ownPermission = `${resourceType}.viewOwn`;

      if (!role.permissions.includes(ownPermission)) {
        return reply.status(403).send({
          success: false,
          message: "Insufficient permissions to access own resources",
        });
      }

      // Add resource access info to request
      request.user = {
        ...user,
        permissions: role.permissions,
        canAccessOwnOnly: true,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: "Resource access check failed",
      });
    }
  };
}

/**
 * Helper function to check if user has specific permission
 */
export function hasPermission(
  userPermissions: string[],
  permission: string
): boolean {
  return userPermissions.includes(permission);
}

/**
 * Helper function to check if user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  permissions: string[]
): boolean {
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Helper function to check if user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  permissions: string[]
): boolean {
  return permissions.every((permission) =>
    userPermissions.includes(permission)
  );
}
