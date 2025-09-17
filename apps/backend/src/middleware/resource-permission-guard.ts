import { FastifyRequest, FastifyReply } from "fastify";
import { PermissionService } from "../services/permission-service";
import { WorkOrder, Task, Personnel } from "../models";

/**
 * Smart permission guard that handles both full permissions and "own" permissions
 * by checking resource ownership/assignment
 */

export interface ResourcePermissionOptions {
  resource: 'workOrders' | 'tasks' | 'projects';
  action: 'view' | 'edit' | 'delete' | 'create';
  resourceIdParam?: string; // Parameter name to extract resource ID from (default: 'id')
}

/**
 * Create a permission guard that handles both full and "own" permissions
 */
export function createResourcePermissionGuard(options: ResourcePermissionOptions) {
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
      const tenantId = user.tenantId;

      // Allow superusers and tenant owners to bypass all checks
      if (user.role === 'superuser' || user.isTenantOwner) {
        return; // Continue to next middleware
      }

      const fullPermission = `${options.resource}.${options.action}`;
      const ownPermission = `${options.resource}.${options.action}Own`;

      // Get tenant ID from context
      const req = request as any;
      const tenant = req.context?.tenant;
      const tenantIdFromContext = tenant?._id?.toString();

      // First check if user has full permission
      const fullPermissionResult = await PermissionService.hasPermissionAsync(userId, fullPermission, tenantIdFromContext);
      if (fullPermissionResult.hasPermission) {
        return; // User has full permission, allow access
      }

      // Check if user has "own" permission
      const ownPermissionResult = await PermissionService.hasPermissionAsync(userId, ownPermission, tenantIdFromContext);
      if (!ownPermissionResult.hasPermission) {
        return reply.status(403).send({
          success: false,
          message: "Insufficient permissions",
          reason: `Missing permission: ${fullPermission}`,
        });
      }

      // User has "own" permission, now check if they have access to this specific resource
      const resourceId = (request.params as any)[options.resourceIdParam || 'id'];
      if (!resourceId) {
        // For list endpoints without specific ID, we'll handle filtering in the route
        return;
      }

      const hasResourceAccess = await checkResourceAccess(
        userId,
        tenantId,
        options.resource,
        resourceId
      );

      if (!hasResourceAccess) {
        return reply.status(403).send({
          success: false,
          message: "Access denied",
          reason: `You can only ${options.action} your own ${options.resource}`,
        });
      }

      // User has access to this specific resource
      return;

    } catch (error) {
      console.error("Resource permission guard error:", error);
      return reply.status(500).send({
        success: false,
        message: "Permission check failed",
      });
    }
  };
}

/**
 * Check if user has access to a specific resource
 */
async function checkResourceAccess(
  userId: string,
  tenantId: string,
  resource: string,
  resourceId: string
): Promise<boolean> {
  try {
    switch (resource) {
      case 'workOrders':
        return await checkWorkOrderAccess(userId, tenantId, resourceId);
      case 'tasks':
        return await checkTaskAccess(userId, tenantId, resourceId);
      default:
        console.warn(`Unknown resource type: ${resource}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking ${resource} access:`, error);
    return false;
  }
}

/**
 * Check if user has access to a specific work order
 */
async function checkWorkOrderAccess(
  userId: string,
  tenantId: string,
  workOrderId: string
): Promise<boolean> {
  try {
    // Get user's personnel record
    const personnel = await Personnel.findOne({ userId, tenantId });
    if (!personnel) {
      return false;
    }

    const personnelId = personnel._id.toString();

    // Check if user is directly assigned to the work order
    const workOrder = await WorkOrder.findOne({
      _id: workOrderId,
      tenantId,
      personnelIds: personnelId,
    });

    if (workOrder) {
      return true;
    }

    // Check if user is assigned to any tasks in this work order
    const taskInWorkOrder = await Task.findOne({
      workOrderId,
      tenantId,
      assignees: personnelId,
    });

    return !!taskInWorkOrder;
  } catch (error) {
    console.error('Error checking work order access:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific task
 */
async function checkTaskAccess(
  userId: string,
  tenantId: string,
  taskId: string
): Promise<boolean> {
  try {
    // Get user's personnel record
    const personnel = await Personnel.findOne({ userId, tenantId });
    if (!personnel) {
      return false;
    }

    const personnelId = personnel._id.toString();

    // Check if user is assigned to the task
    const task = await Task.findOne({
      _id: taskId,
      tenantId,
      assignees: personnelId,
    });

    return !!task;
  } catch (error) {
    console.error('Error checking task access:', error);
    return false;
  }
}

// Convenience functions for common resource permission checks
export const requireWorkOrderView = () =>
  createResourcePermissionGuard({ resource: 'workOrders', action: 'view' });

export const requireWorkOrderEdit = () =>
  createResourcePermissionGuard({ resource: 'workOrders', action: 'edit' });

export const requireTaskView = () =>
  createResourcePermissionGuard({ resource: 'tasks', action: 'view' });

export const requireTaskEdit = () =>
  createResourcePermissionGuard({ resource: 'tasks', action: 'edit' });
