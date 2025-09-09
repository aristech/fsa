import { User, Task, WorkOrder, Personnel } from '../models';
import { PermissionService } from './permission-service';

/**
 * Service to manage dynamic permissions based on assignments
 * Grants necessary permissions when users are assigned to tasks/work orders
 */
export class AssignmentPermissionService {
  
  /**
   * Get dynamic permissions for a user based on their assignments
   */
  static async getUserAssignmentPermissions(userId: string, tenantId: string): Promise<string[]> {
    return PermissionService.getUserAssignmentPermissions(userId, tenantId);
  }

  /**
   * Grant permissions when a user is assigned to a task
   */
  static async handleTaskAssignment(taskId: string, assigneeIds: string[], tenantId: string): Promise<void> {
    try {
      const task = await Task.findOne({ _id: taskId, tenantId }).select('workOrderId projectId');
      if (!task) return;

      // Get personnel records for assignees
      const personnel = await Personnel.find({
        _id: { $in: assigneeIds },
        tenantId,
      }).select('userId');

      const userIds = personnel.map(p => p.userId);

      // If task has a work order, ensure users can view it
      if (task.workOrderId) {
        await this.ensureWorkOrderViewPermissions(userIds, tenantId);
      }

      // Ensure users can view and edit their own tasks
      await this.ensureTaskOwnPermissions(userIds, tenantId);

    } catch (error) {
      console.error('Error handling task assignment:', error);
    }
  }

  /**
   * Grant permissions when a user is assigned to a work order
   */
  static async handleWorkOrderAssignment(workOrderId: string, personnelIds: string[], tenantId: string): Promise<void> {
    try {
      // Get personnel records for assignees
      const personnel = await Personnel.find({
        _id: { $in: personnelIds },
        tenantId,
      }).select('userId');

      const userIds = personnel.map(p => p.userId);

      // Ensure users can view and edit their assigned work orders
      await this.ensureWorkOrderOwnPermissions(userIds, tenantId);

      // Check if work order has related tasks and grant task permissions
      const relatedTasks = await Task.find({
        workOrderId,
        tenantId,
      }).select('_id');

      if (relatedTasks.length > 0) {
        await this.ensureTaskOwnPermissions(userIds, tenantId);
      }

    } catch (error) {
      console.error('Error handling work order assignment:', error);
    }
  }

  /**
   * Remove permissions when a user is unassigned from a task
   */
  static async handleTaskUnassignment(taskId: string, unassignedUserIds: string[], tenantId: string): Promise<void> {
    try {
      for (const userId of unassignedUserIds) {
        // Check if user still has other assignments that require these permissions
        const remainingPermissions = await this.getUserAssignmentPermissions(userId, tenantId);
        
        // Only remove permissions that are no longer needed
        await this.cleanupUnneededPermissions(userId, tenantId, remainingPermissions);
      }
    } catch (error) {
      console.error('Error handling task unassignment:', error);
    }
  }

  /**
   * Remove permissions when a user is unassigned from a work order
   */
  static async handleWorkOrderUnassignment(workOrderId: string, unassignedUserIds: string[], tenantId: string): Promise<void> {
    try {
      for (const userId of unassignedUserIds) {
        // Check if user still has other assignments that require these permissions
        const remainingPermissions = await this.getUserAssignmentPermissions(userId, tenantId);
        
        // Only remove permissions that are no longer needed
        await this.cleanupUnneededPermissions(userId, tenantId, remainingPermissions);
      }
    } catch (error) {
      console.error('Error handling work order unassignment:', error);
    }
  }

  /**
   * Ensure users have work order view permissions
   */
  private static async ensureWorkOrderViewPermissions(userIds: string[], tenantId: string): Promise<void> {
    const requiredPermissions = ['workOrders.viewOwn'];
    
    for (const userId of userIds) {
      await this.addUserPermissions(userId, tenantId, requiredPermissions);
    }
  }

  /**
   * Ensure users have work order own permissions  
   */
  private static async ensureWorkOrderOwnPermissions(userIds: string[], tenantId: string): Promise<void> {
    const requiredPermissions = ['workOrders.viewOwn', 'workOrders.editOwn'];
    
    for (const userId of userIds) {
      await this.addUserPermissions(userId, tenantId, requiredPermissions);
    }
  }

  /**
   * Ensure users have task own permissions
   */
  private static async ensureTaskOwnPermissions(userIds: string[], tenantId: string): Promise<void> {
    const requiredPermissions = ['tasks.viewOwn', 'tasks.editOwn'];
    
    for (const userId of userIds) {
      await this.addUserPermissions(userId, tenantId, requiredPermissions);
    }
  }

  /**
   * Add permissions to a user if they don't already have them
   */
  private static async addUserPermissions(userId: string, tenantId: string, permissions: string[]): Promise<void> {
    try {
      const user = await User.findOne({ _id: userId, tenantId });
      if (!user) return;

      // Get current permissions
      const currentPermissions = user.permissions || [];
      const newPermissions = [...new Set([...currentPermissions, ...permissions])];

      // Only update if permissions changed
      if (newPermissions.length !== currentPermissions.length) {
        await User.findOneAndUpdate(
          { _id: userId, tenantId },
          { permissions: newPermissions }
        );

        console.log(`Added permissions [${permissions.join(', ')}] to user ${user.email}`);
      }
    } catch (error) {
      console.error(`Error adding permissions to user ${userId}:`, error);
    }
  }

  /**
   * Remove permissions that are no longer needed based on current assignments
   */
  private static async cleanupUnneededPermissions(
    userId: string, 
    tenantId: string, 
    stillNeededPermissions: string[]
  ): Promise<void> {
    try {
      const user = await User.findOne({ _id: userId, tenantId });
      if (!user) return;

      const currentPermissions = user.permissions || [];
      const assignmentRelatedPermissions = [
        'workOrders.viewOwn',
        'workOrders.editOwn', 
        'tasks.viewOwn',
        'tasks.editOwn'
      ];

      // Only remove assignment-related permissions that are no longer needed
      const updatedPermissions = currentPermissions.filter(permission => {
        if (!assignmentRelatedPermissions.includes(permission)) {
          return true; // Keep non-assignment permissions
        }
        return stillNeededPermissions.includes(permission); // Keep if still needed
      });

      // Only update if permissions changed
      if (updatedPermissions.length !== currentPermissions.length) {
        await User.findOneAndUpdate(
          { _id: userId, tenantId },
          { permissions: updatedPermissions }
        );

        const removedPermissions = currentPermissions.filter(p => !updatedPermissions.includes(p));
        console.log(`Removed permissions [${removedPermissions.join(', ')}] from user ${user.email}`);
      }
    } catch (error) {
      console.error(`Error cleaning up permissions for user ${userId}:`, error);
    }
  }

  /**
   * Sync all assignment-based permissions for a tenant
   * Useful for one-time migrations or data fixes
   */
  static async syncAllAssignmentPermissions(tenantId: string): Promise<void> {
    console.log(`Starting permission sync for tenant ${tenantId}`);
    
    try {
      // Get all personnel in the tenant
      const allPersonnel = await Personnel.find({ tenantId }).select('userId _id');
      
      for (const personnel of allPersonnel) {
        const dynamicPermissions = await this.getUserAssignmentPermissions(personnel.userId, tenantId);
        
        if (dynamicPermissions.length > 0) {
          await this.addUserPermissions(personnel.userId, tenantId, dynamicPermissions);
        }
      }

      console.log(`Completed permission sync for tenant ${tenantId}`);
    } catch (error) {
      console.error(`Error syncing permissions for tenant ${tenantId}:`, error);
    }
  }
}
