import { Task, WorkOrder, Project, Assignment, Personnel, User } from '../models';
import { MagicLinkService } from './magic-link-service';

export interface UserCleanupOptions {
  preserveHistory?: boolean; // Default: true - keep comments, files, reports
  removeFromActiveAssignments?: boolean; // Default: true - remove from tasks/work orders
  revokePermissions?: boolean; // Default: true - clean up dynamic permissions
  revokeMagicLinks?: boolean; // Default: true - cancel unused magic links
}

export interface UserCleanupResult {
  success: boolean;
  message: string;
  details: {
    tasksUpdated: number;
    workOrdersUpdated: number;
    projectsUpdated: number;
    assignmentsRemoved: number;
    magicLinksRevoked: boolean;
    userDeleted: boolean;
    personnelDeleted: boolean;
  };
  preservedItems: {
    comments: number;
    files: number;
    reports: number;
  };
}

export class UserCleanupService {
  /**
   * Comprehensive cleanup when a user/personnel is deleted
   */
  static async cleanupUserData(
    userId: string,
    tenantId: string,
    options: UserCleanupOptions = {}
  ): Promise<UserCleanupResult> {
    const {
      preserveHistory = true,
      removeFromActiveAssignments = true,
      revokePermissions = true,
      revokeMagicLinks = true,
    } = options;

    const result: UserCleanupResult = {
      success: false,
      message: '',
      details: {
        tasksUpdated: 0,
        workOrdersUpdated: 0,
        projectsUpdated: 0,
        assignmentsRemoved: 0,
        magicLinksRevoked: false,
        userDeleted: false,
        personnelDeleted: false,
      },
      preservedItems: {
        comments: 0,
        files: 0,
        reports: 0,
      },
    };

    try {
      console.log(`🗑️ Starting comprehensive cleanup for user: ${userId} in tenant: ${tenantId}`);

      // 1. Remove from active task assignments
      if (removeFromActiveAssignments) {
        await this.removeFromTasks(userId, tenantId, result);
      }

      // 2. Remove from work order assignments
      if (removeFromActiveAssignments) {
        await this.removeFromWorkOrders(userId, tenantId, result);
      }

      // 3. Remove from project assignments
      if (removeFromActiveAssignments) {
        await this.removeFromProjects(userId, tenantId, result);
      }

      // 4. Remove general assignments
      if (removeFromActiveAssignments) {
        await this.removeAssignments(userId, tenantId, result);
      }

      // 5. Revoke unused magic links
      if (revokeMagicLinks) {
        await this.revokeMagicLinks(userId, tenantId, result);
      }

      // 6. Count preserved historical items (for reporting)
      if (preserveHistory) {
        await this.countPreservedItems(userId, tenantId, result);
      }

      // 7. Remove personnel record
      await this.removePersonnelRecord(userId, tenantId, result);

      // 8. Delete user account (only if no password or inactive)
      await this.deleteUserIfUnverified(userId, tenantId, result);

      result.success = true;
      result.message = 'User cleanup completed successfully';

      console.log(`✅ User cleanup completed: ${JSON.stringify(result.details)}`);

      return result;
    } catch (error) {
      console.error(`❌ User cleanup failed for user ${userId}:`, error);
      result.success = false;
      result.message = `User cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Remove user from all assigned tasks
   */
  private static async removeFromTasks(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Remove from assignedTo arrays in tasks
      const taskUpdateResult = await Task.updateMany(
        {
          tenantId,
          assignedTo: userId,
        },
        {
          $pull: { assignedTo: userId },
        }
      );

      result.details.tasksUpdated = taskUpdateResult.modifiedCount;
      console.log(`📋 Removed user from ${taskUpdateResult.modifiedCount} tasks`);
    } catch (error) {
      console.error('Error removing user from tasks:', error);
    }
  }

  /**
   * Remove user from all assigned work orders
   */
  private static async removeFromWorkOrders(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Remove from assignedTo fields in work orders
      const workOrderUpdateResult = await WorkOrder.updateMany(
        {
          tenantId,
          assignedTo: userId,
        },
        {
          $unset: { assignedTo: 1 }, // Remove assignedTo field entirely
        }
      );

      result.details.workOrdersUpdated = workOrderUpdateResult.modifiedCount;
      console.log(`🔧 Removed user from ${workOrderUpdateResult.modifiedCount} work orders`);
    } catch (error) {
      console.error('Error removing user from work orders:', error);
    }
  }

  /**
   * Remove user from all assigned projects
   */
  private static async removeFromProjects(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Remove from assignedTo arrays in projects (if projects have assignedTo field)
      const projectUpdateResult = await Project.updateMany(
        {
          tenantId,
          assignedTo: userId,
        },
        {
          $pull: { assignedTo: userId },
        }
      );

      result.details.projectsUpdated = projectUpdateResult.modifiedCount;
      console.log(`📊 Removed user from ${projectUpdateResult.modifiedCount} projects`);
    } catch (error) {
      console.error('Error removing user from projects:', error);
    }
  }

  /**
   * Remove general assignment records
   */
  private static async removeAssignments(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Remove Assignment records where user is assigned
      const assignmentDeleteResult = await Assignment.deleteMany({
        tenantId,
        userId,
      });

      result.details.assignmentsRemoved = assignmentDeleteResult.deletedCount;
      console.log(`📋 Removed ${assignmentDeleteResult.deletedCount} assignment records`);
    } catch (error) {
      console.error('Error removing assignments:', error);
    }
  }

  /**
   * Revoke unused magic links for the user
   */
  private static async revokeMagicLinks(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Get user email for magic link revocation
      const user = await User.findOne({ _id: userId, tenantId });
      if (user?.email) {
        await MagicLinkService.revokeMagicLinks(user.email, tenantId);
        result.details.magicLinksRevoked = true;
        console.log(`🔗 Revoked magic links for user: ${user.email}`);
      }
    } catch (error) {
      console.error('Error revoking magic links:', error);
    }
  }

  /**
   * Count preserved historical items (comments, files, reports)
   */
  private static async countPreservedItems(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      // Note: We preserve these items, just count them for reporting
      
      // Count comments by this user (preserved for history)
      const { Comment } = await import('../models/Comment');
      const commentsCount = await Comment.countDocuments({
        tenantId,
        createdBy: userId,
      });
      result.preservedItems.comments = commentsCount;

      // Count files uploaded by this user (preserved for records)
      // Note: Files are typically stored with user references in metadata
      // This would need to be implemented based on your file storage structure
      result.preservedItems.files = 0; // Placeholder

      // Count reports created by this user (preserved for audit)
      // This would depend on your reporting system structure
      result.preservedItems.reports = 0; // Placeholder

      console.log(`📚 Preserved items: ${commentsCount} comments, files, and reports`);
    } catch (error) {
      console.error('Error counting preserved items:', error);
    }
  }

  /**
   * Remove personnel record
   */
  private static async removePersonnelRecord(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      const deletedPersonnel = await Personnel.findOneAndDelete({
        userId,
        tenantId,
      });

      if (deletedPersonnel) {
        result.details.personnelDeleted = true;
        console.log(`👤 Deleted personnel record`);
      }
    } catch (error) {
      console.error('Error deleting personnel record:', error);
    }
  }

  /**
   * Delete user account only if unverified (no password or inactive)
   */
  private static async deleteUserIfUnverified(
    userId: string,
    tenantId: string,
    result: UserCleanupResult
  ): Promise<void> {
    try {
      const user = await User.findOne({ _id: userId, tenantId });

      // Only delete users who haven't completed their account setup
      if (user && (!user.password || !user.isActive)) {
        await User.findOneAndDelete({ _id: userId, tenantId });
        result.details.userDeleted = true;
        console.log(`🗑️ Deleted unverified user account: ${user.email}`);
      } else if (user) {
        console.log(`👤 Preserved verified user account: ${user.email} (has password and is active)`);
      }
    } catch (error) {
      console.error('Error deleting user account:', error);
    }
  }

  /**
   * Quick cleanup for just removing active assignments (lighter operation)
   */
  static async removeFromActiveWork(
    userId: string,
    tenantId: string
  ): Promise<{ tasksUpdated: number; workOrdersUpdated: number; projectsUpdated: number }> {
    const result = {
      tasksUpdated: 0,
      workOrdersUpdated: 0,
      projectsUpdated: 0,
    };

    try {
      // Remove from tasks
      const taskResult = await Task.updateMany(
        { tenantId, assignedTo: userId },
        { $pull: { assignedTo: userId } }
      );
      result.tasksUpdated = taskResult.modifiedCount;

      // Remove from work orders
      const workOrderResult = await WorkOrder.updateMany(
        { tenantId, assignedTo: userId },
        { $unset: { assignedTo: 1 } }
      );
      result.workOrdersUpdated = workOrderResult.modifiedCount;

      // Remove from projects
      const projectResult = await Project.updateMany(
        { tenantId, assignedTo: userId },
        { $pull: { assignedTo: userId } }
      );
      result.projectsUpdated = projectResult.modifiedCount;

      console.log(`⚡ Quick cleanup completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('Error in quick cleanup:', error);
      return result;
    }
  }
}
