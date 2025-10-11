import fs from 'fs/promises';
import path from 'path';
import { Client, WorkOrder, Task, Comment, Subtask, Assignment } from '../models';
import { FileTrackingService } from './file-tracking-service';

export interface EntityCleanupOptions {
  deleteFiles?: boolean; // Default: true - remove associated files
  deleteComments?: boolean; // Default: true - remove associated comments
  deleteSubtasks?: boolean; // Default: true - remove subtasks (for tasks)
  deleteAssignments?: boolean; // Default: true - remove assignments
  cascadeDelete?: boolean; // Default: false - delete dependent entities
}

export interface EntityCleanupResult {
  success: boolean;
  message: string;
  details: {
    entityDeleted: boolean;
    filesDeleted: number;
    commentsDeleted: number;
    subtasksDeleted: number;
    assignmentsDeleted: number;
    dependentEntitiesDeleted: number;
    errors: string[];
  };
}

export class EntityCleanupService {
  /**
   * Cleanup client and all related data
   */
  static async cleanupClient(
    clientId: string,
    tenantId: string,
    options: EntityCleanupOptions = {}
  ): Promise<EntityCleanupResult> {
    const {
      deleteFiles = true,
      deleteComments = true,
      deleteAssignments = true,
      cascadeDelete = false, // Don't cascade delete work orders by default
    } = options;

    const result: EntityCleanupResult = {
      success: false,
      message: '',
      details: {
        entityDeleted: false,
        filesDeleted: 0,
        commentsDeleted: 0,
        subtasksDeleted: 0,
        assignmentsDeleted: 0,
        dependentEntitiesDeleted: 0,
        errors: [],
      },
    };

    try {

      // Check if client exists
      const client = await Client.findOne({ _id: clientId, tenantId });
      if (!client) {
        result.message = 'Client not found';
        return result;
      }

      // 1. Optionally cascade delete work orders for this client
      if (cascadeDelete) {
        const workOrders = await WorkOrder.find({ clientId, tenantId });
        for (const workOrder of workOrders) {
          const workOrderCleanup = await this.cleanupWorkOrder(
            workOrder._id.toString(),
            tenantId,
            { deleteFiles, deleteComments, deleteAssignments, cascadeDelete: true }
          );
          if (workOrderCleanup.success) {
            result.details.dependentEntitiesDeleted++;
          } else {
            result.details.errors.push(`Failed to cleanup work order ${workOrder._id}: ${workOrderCleanup.message}`);
          }
        }
      } else {
        // Just unlink work orders from client (set clientId to null)
        const workOrderUpdate = await WorkOrder.updateMany(
          { clientId, tenantId },
          { $unset: { clientId: 1, clientName: 1, clientCompany: 1 } }
        );
        result.details.dependentEntitiesDeleted = workOrderUpdate.modifiedCount;
      }

      // 2. Unlink tasks from client
      const taskUpdate = await Task.updateMany(
        { clientId, tenantId },
        { $unset: { clientId: 1, clientName: 1, clientCompany: 1 } }
      );

      // 3. Delete client-related files
      if (deleteFiles) {
        await this.deleteClientFiles(clientId, tenantId, result);
      }

      // 4. Delete client-related comments (if any commenting system supports clients)
      if (deleteComments) {
        await this.deleteEntityComments('client', clientId, tenantId, result);
      }

      // 5. Delete client-related assignments
      if (deleteAssignments) {
        await this.deleteEntityAssignments('client', clientId, tenantId, result);
      }

      // 6. Finally delete the client
      await Client.findOneAndDelete({ _id: clientId, tenantId });
      result.details.entityDeleted = true;

      result.success = true;
      result.message = `Client deleted successfully. Work orders updated: ${taskUpdate.modifiedCount + result.details.dependentEntitiesDeleted}, Tasks updated: ${taskUpdate.modifiedCount}`;

      return result;
    } catch (error) {
      console.error(`❌ Client cleanup failed:`, error);
      result.success = false;
      result.message = `Client cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Cleanup work order and all related data
   */
  static async cleanupWorkOrder(
    workOrderId: string,
    tenantId: string,
    options: EntityCleanupOptions = {}
  ): Promise<EntityCleanupResult> {
    const {
      deleteFiles = true,
      deleteComments = true,
      deleteAssignments = true,
      cascadeDelete = false, // Don't cascade delete tasks by default
    } = options;

    const result: EntityCleanupResult = {
      success: false,
      message: '',
      details: {
        entityDeleted: false,
        filesDeleted: 0,
        commentsDeleted: 0,
        subtasksDeleted: 0,
        assignmentsDeleted: 0,
        dependentEntitiesDeleted: 0,
        errors: [],
      },
    };

    try {

      // Check if work order exists
      const workOrder = await WorkOrder.findOne({ _id: workOrderId, tenantId });
      if (!workOrder) {
        result.message = 'Work order not found';
        return result;
      }

      // 1. Handle related tasks
      if (cascadeDelete) {
        // Delete all tasks for this work order
        const tasks = await Task.find({ workOrderId, tenantId });
        for (const task of tasks) {
          const taskCleanup = await this.cleanupTask(
            task._id.toString(),
            tenantId,
            { deleteFiles, deleteComments, deleteAssignments, deleteSubtasks: true }
          );
          if (taskCleanup.success) {
            result.details.dependentEntitiesDeleted++;
          } else {
            result.details.errors.push(`Failed to cleanup task ${task._id}: ${taskCleanup.message}`);
          }
        }
      } else {
        // Just unlink tasks from work order
        const taskUpdate = await Task.updateMany(
          { workOrderId, tenantId },
          { $unset: { workOrderId: 1 } }
        );
        result.details.dependentEntitiesDeleted = taskUpdate.modifiedCount;
      }

      // 2. Delete work order files
      if (deleteFiles) {
        await this.deleteWorkOrderFiles(workOrderId, tenantId, result);
      }

      // 3. Delete work order comments
      if (deleteComments) {
        await this.deleteEntityComments('workOrder', workOrderId, tenantId, result);
      }

      // 4. Delete work order assignments
      if (deleteAssignments) {
        await this.deleteEntityAssignments('workOrder', workOrderId, tenantId, result);
      }

      // 5. Finally delete the work order
      await WorkOrder.findOneAndDelete({ _id: workOrderId, tenantId });
      result.details.entityDeleted = true;

      result.success = true;
      result.message = cascadeDelete 
        ? `Work order and ${result.details.dependentEntitiesDeleted} related tasks deleted successfully`
        : `Work order deleted successfully. ${result.details.dependentEntitiesDeleted} tasks unlinked`;

      return result;
    } catch (error) {
      console.error(`❌ Work order cleanup failed:`, error);
      result.success = false;
      result.message = `Work order cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Cleanup task and all related data
   */
  static async cleanupTask(
    taskId: string,
    tenantId: string,
    options: EntityCleanupOptions = {}
  ): Promise<EntityCleanupResult> {
    const {
      deleteFiles = true,
      deleteComments = true,
      deleteSubtasks = true,
      deleteAssignments = true,
    } = options;

    const result: EntityCleanupResult = {
      success: false,
      message: '',
      details: {
        entityDeleted: false,
        filesDeleted: 0,
        commentsDeleted: 0,
        subtasksDeleted: 0,
        assignmentsDeleted: 0,
        dependentEntitiesDeleted: 0,
        errors: [],
      },
    };

    try {

      // Check if task exists
      const task = await Task.findOne({ _id: taskId, tenantId });
      if (!task) {
        result.message = 'Task not found';
        return result;
      }

      // 1. Delete subtasks with file cleanup
      if (deleteSubtasks) {
        const subtasks = await Subtask.find({ taskId, tenantId });
        console.log(`🔍 Found ${subtasks.length} subtasks to delete for task ${taskId}`);

        for (const subtask of subtasks) {
          // Clean up all attachments for this subtask
          if (subtask.attachments && subtask.attachments.length > 0) {
            console.log(`🗑️  Cleaning up ${subtask.attachments.length} attachment(s) for subtask ${subtask._id}`);

            for (const attachment of subtask.attachments) {
              let fileDeleted = false;
              try {
                // STEP 1: Delete file from disk FIRST (try new tenant-scoped path first)
                const newPath = path.join(process.cwd(), 'uploads', tenantId, 'subtasks', subtask._id.toString(), attachment.filename);
                try {
                  await fs.unlink(newPath);
                  console.log(`✅ Deleted file from disk: ${attachment.filename}`);
                  fileDeleted = true;
                } catch (newPathError) {
                  // Fallback to old path for backward compatibility
                  try {
                    const oldPath = path.join(process.cwd(), 'uploads', 'subtask-attachments', attachment.filename);
                    await fs.unlink(oldPath);
                    console.log(`✅ Deleted file from old path: ${attachment.filename}`);
                    fileDeleted = true;
                  } catch (oldPathError) {
                    console.error(`⚠️  File not found (already deleted?): ${attachment.filename}`);
                    result.details.errors.push(`File not found: ${attachment.filename}`);
                  }
                }

                // STEP 2: Track deletion AFTER file is deleted (update quota)
                if (fileDeleted) {
                  const trackResult = await FileTrackingService.trackFileDeletion(tenantId, attachment.filename);
                  if (!trackResult.tracked) {
                    // File was deleted but not in metadata - log warning
                    console.warn(`⚠️  File ${attachment.filename} deleted but not tracked: ${trackResult.reason}`);
                    result.details.errors.push(`Quota not updated for ${attachment.filename}: ${trackResult.reason}`);
                  } else {
                    console.log(`✅ Tracked deletion of subtask file: ${attachment.filename}`);
                  }
                  result.details.filesDeleted++;
                }
              } catch (error) {
                console.error(`❌ Error cleaning up attachment ${attachment.filename}:`, error);
                result.details.errors.push(`Failed to cleanup attachment: ${attachment.filename}`);
                // 🚨 CRITICAL: If file was deleted but tracking failed, log for manual review
                if (fileDeleted) {
                  console.error(`🚨 CRITICAL: File ${attachment.filename} deleted but quota tracking failed!`);
                }
                // Continue with other files even if one fails
              }
            }

            // Try to remove the entire subtask directory
            try {
              const subtaskDir = path.join(process.cwd(), 'uploads', tenantId, 'subtasks', subtask._id.toString());
              await fs.rm(subtaskDir, { recursive: true, force: true });
              console.log(`✅ Removed subtask directory: ${subtask._id}`);
            } catch (dirError) {
              console.log(`📁 Subtask directory not found or already removed: ${subtask._id}`);
            }
          }

          // Delete subtask from database
          await Subtask.findByIdAndDelete(subtask._id);
          result.details.subtasksDeleted++;
        }

        console.log(`✅ Deleted ${result.details.subtasksDeleted} subtasks with ${result.details.filesDeleted} files`);
      }

      // 2. Delete task files
      if (deleteFiles) {
        await this.deleteTaskFiles(taskId, tenantId, result);
      }

      // 3. Delete task comments
      if (deleteComments) {
        await this.deleteEntityComments('task', taskId, tenantId, result);
      }

      // 4. Delete task assignments
      if (deleteAssignments) {
        await this.deleteEntityAssignments('task', taskId, tenantId, result);
      }

      // 5. Finally delete the task
      await Task.findOneAndDelete({ _id: taskId, tenantId });
      result.details.entityDeleted = true;

      result.success = true;
      result.message = `Task deleted successfully with ${result.details.subtasksDeleted} subtasks, ${result.details.commentsDeleted} comments, and ${result.details.filesDeleted} files`;

      return result;
    } catch (error) {
      console.error(`❌ Task cleanup failed:`, error);
      result.success = false;
      result.message = `Task cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Delete files associated with a client
   */
  private static async deleteClientFiles(
    clientId: string,
    tenantId: string,
    result: EntityCleanupResult
  ): Promise<void> {
    try {
      // Client files would typically be in: uploads/{tenantId}/clients/{clientId}/
      const clientFilesPath = path.join(process.cwd(), 'uploads', tenantId, 'clients', clientId);

      try {
        const stats = await fs.stat(clientFilesPath);
        if (stats.isDirectory()) {
          const files = await fs.readdir(clientFilesPath);

          // STEP 1: Delete directory from disk FIRST
          await fs.rm(clientFilesPath, { recursive: true, force: true });
          console.log(`✅ Deleted ${files.length} client files from disk`);

          // STEP 2: Track each file deletion AFTER files are deleted (update quota)
          for (const filename of files) {
            try {
              const trackResult = await FileTrackingService.trackFileDeletion(tenantId, filename);
              if (!trackResult.tracked) {
                console.warn(`⚠️  File ${filename} deleted but not tracked: ${trackResult.reason}`);
                result.details.errors.push(`Quota not updated for ${filename}: ${trackResult.reason}`);
              } else {
                result.details.filesDeleted++;
              }
            } catch (error) {
              console.error(`❌ Failed to track deletion of ${filename}:`, error);
              result.details.errors.push(`Failed to track file deletion: ${filename}`);
              console.error(`🚨 CRITICAL: File ${filename} deleted but quota tracking failed!`);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, which is fine
        console.log(`📁 No client files directory found: ${clientFilesPath}`);
      }
    } catch (error) {
      console.error('Error deleting client files:', error);
      result.details.errors.push(`Failed to delete client files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete files associated with a work order
   */
  private static async deleteWorkOrderFiles(
    workOrderId: string,
    tenantId: string,
    result: EntityCleanupResult
  ): Promise<void> {
    try {
      // Work order files would typically be in: uploads/{tenantId}/work-orders/{workOrderId}/
      const workOrderFilesPath = path.join(process.cwd(), 'uploads', tenantId, 'work-orders', workOrderId);

      try {
        const stats = await fs.stat(workOrderFilesPath);
        if (stats.isDirectory()) {
          const files = await fs.readdir(workOrderFilesPath);

          // STEP 1: Delete directory from disk FIRST
          await fs.rm(workOrderFilesPath, { recursive: true, force: true });
          console.log(`✅ Deleted ${files.length} work order files from disk`);

          // STEP 2: Track each file deletion AFTER files are deleted (update quota)
          for (const filename of files) {
            try {
              const trackResult = await FileTrackingService.trackFileDeletion(tenantId, filename);
              if (!trackResult.tracked) {
                console.warn(`⚠️  File ${filename} deleted but not tracked: ${trackResult.reason}`);
                result.details.errors.push(`Quota not updated for ${filename}: ${trackResult.reason}`);
              } else {
                result.details.filesDeleted++;
              }
            } catch (error) {
              console.error(`❌ Failed to track deletion of ${filename}:`, error);
              result.details.errors.push(`Failed to track file deletion: ${filename}`);
              console.error(`🚨 CRITICAL: File ${filename} deleted but quota tracking failed!`);
            }
          }
        }
      } catch (error) {
        console.log(`📁 No work order files directory found: ${workOrderFilesPath}`);
      }
    } catch (error) {
      console.error('Error deleting work order files:', error);
      result.details.errors.push(`Failed to delete work order files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete files associated with a task
   */
  private static async deleteTaskFiles(
    taskId: string,
    tenantId: string,
    result: EntityCleanupResult
  ): Promise<void> {
    try {
      // Task files are in: uploads/{tenantId}/tasks/misc/ and uploads/{tenantId}/tasks/{taskId}/
      const taskFilesPath = path.join(process.cwd(), 'uploads', tenantId, 'tasks');
      
      // Check misc folder for files with taskId in filename
      try {
        const miscPath = path.join(taskFilesPath, 'misc');
        const files = await fs.readdir(miscPath);
        let filesDeleted = 0;

        // Before deleting any files, we need to be more careful
        // Only delete files that were specifically uploaded for this task
        // We should not delete files just because they contain the taskId substring
        console.log(`🔍 Task cleanup: Checking ${files.length} files in misc folder for task ${taskId}`);

        for (const file of files) {
          // Be more specific: only delete files that were uploaded with this exact taskId as the owner
          // The upload system creates URLs like: /api/v1/uploads/{tenantId}/tasks/{ownerId}/{filename}
          // where ownerId should be the taskId, NOT files that just happen to contain taskId in filename

          // Skip this aggressive deletion for now - it's too dangerous
          console.log(`⚠️  Skipping potentially dangerous file deletion: ${file} (contains ${taskId})`);
        }

        result.details.filesDeleted += filesDeleted;
      } catch (error) {
        console.log(`📁 No task misc files directory found`);
      }

      // Check dedicated task folder
      try {
        const dedicatedTaskPath = path.join(taskFilesPath, taskId);
        const stats = await fs.stat(dedicatedTaskPath);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dedicatedTaskPath);

          // STEP 1: Delete directory from disk FIRST
          await fs.rm(dedicatedTaskPath, { recursive: true, force: true });
          console.log(`✅ Deleted ${files.length} task files from disk`);

          // STEP 2: Track each file deletion AFTER files are deleted (update quota)
          for (const filename of files) {
            try {
              const trackResult = await FileTrackingService.trackFileDeletion(tenantId, filename);
              if (!trackResult.tracked) {
                console.warn(`⚠️  File ${filename} deleted but not tracked: ${trackResult.reason}`);
                result.details.errors.push(`Quota not updated for ${filename}: ${trackResult.reason}`);
              } else {
                result.details.filesDeleted++;
              }
            } catch (error) {
              console.error(`❌ Failed to track deletion of ${filename}:`, error);
              result.details.errors.push(`Failed to track file deletion: ${filename}`);
              console.error(`🚨 CRITICAL: File ${filename} deleted but quota tracking failed!`);
            }
          }
        }
      } catch (error) {
        console.log(`📁 No dedicated task files directory found: ${taskId}`);
      }
    } catch (error) {
      console.error('Error deleting task files:', error);
      result.details.errors.push(`Failed to delete task files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete comments associated with an entity
   */
  private static async deleteEntityComments(
    entityType: 'client' | 'workOrder' | 'task',
    entityId: string,
    tenantId: string,
    result: EntityCleanupResult
  ): Promise<void> {
    try {
      let commentDeleteResult;
      
      switch (entityType) {
        case 'task':
          commentDeleteResult = await Comment.deleteMany({ taskId: entityId, tenantId });
          break;
        case 'workOrder':
          commentDeleteResult = await Comment.deleteMany({ workOrderId: entityId, tenantId });
          break;
        case 'client':
          commentDeleteResult = await Comment.deleteMany({ clientId: entityId, tenantId });
          break;
      }

      result.details.commentsDeleted = commentDeleteResult.deletedCount;
    } catch (error) {
      console.error(`Error deleting ${entityType} comments:`, error);
      result.details.errors.push(`Failed to delete ${entityType} comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete assignments associated with an entity
   */
  private static async deleteEntityAssignments(
    entityType: 'client' | 'workOrder' | 'task',
    entityId: string,
    tenantId: string,
    result: EntityCleanupResult
  ): Promise<void> {
    try {
      let assignmentDeleteResult;

      switch (entityType) {
        case 'task':
          assignmentDeleteResult = await Assignment.deleteMany({ taskId: entityId, tenantId });
          break;
        case 'workOrder':
          assignmentDeleteResult = await Assignment.deleteMany({ workOrderId: entityId, tenantId });
          break;
        case 'client':
          assignmentDeleteResult = await Assignment.deleteMany({ clientId: entityId, tenantId });
          break;
      }

      result.details.assignmentsDeleted = assignmentDeleteResult.deletedCount;
    } catch (error) {
      console.error(`Error deleting ${entityType} assignments:`, error);
      result.details.errors.push(`Failed to delete ${entityType} assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
