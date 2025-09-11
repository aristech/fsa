import { Task, WorkOrder, Personnel } from '../models';
import { NotificationService } from './notification-service';
import { realtimeService } from './realtime-service';

export interface WorkOrderAssignmentOptions {
  notifyPersonnel?: boolean;
  skipNotifications?: boolean;
}

export class WorkOrderAssignmentService {
  /**
   * When personnel are assigned to a work order, automatically assign them to:
   * 1. All existing tasks linked to that work order
   * 2. Tasks will be assigned as they're created (handled in task creation logic)
   */
  static async propagateWorkOrderAssignments(
    workOrderId: string,
    newPersonnelIds: string[],
    previousPersonnelIds: string[] = [],
    tenantId: string,
    assignedBy: string,
    options: WorkOrderAssignmentOptions = {}
  ): Promise<void> {
    try {
      console.log('🔄 Starting work order assignment propagation:', {
        workOrderId,
        newPersonnelIds,
        previousPersonnelIds,
        tenantId,
        assignedBy
      });

      // Get work order details for notifications
      const workOrder = await WorkOrder.findOne({ 
        _id: workOrderId, 
        tenantId 
      }).select('title workOrderNumber').lean();

      if (!workOrder) {
        console.error('Work order not found for assignment propagation');
        return;
      }

      // Find all tasks linked to this work order
      const tasks = await Task.find({
        workOrderId: workOrderId,
        tenantId: tenantId
      });

      console.log(`📋 Found ${tasks.length} tasks linked to work order ${workOrderId}`);

      if (tasks.length === 0) {
        console.log('No tasks found, skipping assignment propagation');
        return;
      }

      // Validate new personnel exist and are active
      const validPersonnel = await Personnel.find({
        _id: { $in: newPersonnelIds },
        tenantId: tenantId,
        isActive: true,
        status: 'active'
      }).select('_id').lean();

      const validPersonnelIds = validPersonnel.map((p: any) => p._id.toString());
      
      console.log('✅ Valid personnel for assignment:', validPersonnelIds);

      // Process each task
      for (const task of tasks) {
        const currentAssignees = task.assignees || [];
        
        // Merge work order personnel with existing task assignees (avoiding duplicates)
        const mergedAssignees = Array.from(new Set([
          ...currentAssignees.map((id: any) => id.toString()),
          ...validPersonnelIds
        ]));

        // Only update if there are changes
        if (JSON.stringify(mergedAssignees.sort()) !== JSON.stringify(currentAssignees.map((id: any) => id.toString()).sort())) {
          console.log(`📝 Updating task ${task._id} assignees from [${currentAssignees}] to [${mergedAssignees}]`);

          // Update task with new assignees
          await Task.findByIdAndUpdate(
            task._id,
            {
              assignees: mergedAssignees,
              updatedAt: new Date()
            },
            { new: true }
          );

          // Send notifications for newly assigned personnel only
          const newlyAssignedPersonnel = validPersonnelIds.filter(
            (id: string) => !currentAssignees.map((a: any) => a.toString()).includes(id)
          );

          if (newlyAssignedPersonnel.length > 0 && !options.skipNotifications) {
            try {
              await NotificationService.notifyTaskAssigned(
                task as any,
                mergedAssignees,
                currentAssignees.map((id: any) => id.toString()),
                assignedBy
              );
            } catch (error) {
              console.error('Error sending task assignment notifications:', error);
            }
          }

          // Send realtime update
          try {
            realtimeService.emitToTask(
              task._id.toString(),
              'task:updated',
              {
                taskId: task._id.toString(),
                updates: {
                  assignees: mergedAssignees,
                  updatedAt: new Date()
                }
              }
            );
          } catch (error) {
            console.error('Error sending realtime update:', error);
          }
        }
      }

      console.log('✅ Work order assignment propagation completed');

    } catch (error) {
      console.error('Error in work order assignment propagation:', error);
      throw error;
    }
  }

  /**
   * When a task is created and linked to a work order, automatically assign
   * all personnel from the work order to the task
   */
  static async inheritWorkOrderAssignments(
    taskId: string,
    workOrderId: string,
    tenantId: string,
    createdBy: string,
    options: WorkOrderAssignmentOptions = {}
  ): Promise<string[]> {
    try {
      console.log('🔄 Inheriting work order assignments for new task:', {
        taskId,
        workOrderId,
        tenantId
      });

      // Get work order personnel
      const workOrder = await WorkOrder.findOne({
        _id: workOrderId,
        tenantId: tenantId
      }).select('personnelIds title workOrderNumber').lean() as any;

      if (!workOrder || !workOrder.personnelIds || workOrder.personnelIds.length === 0) {
        console.log('No personnel found on work order, returning empty array');
        return [];
      }

      // Validate personnel are active
      const validPersonnel = await Personnel.find({
        _id: { $in: workOrder.personnelIds },
        tenantId: tenantId,
        isActive: true,
        status: 'active'
      }).select('_id').lean();

      const validPersonnelIds = validPersonnel.map((p: any) => p._id.toString());

      if (validPersonnelIds.length === 0) {
        console.log('No valid personnel found on work order');
        return [];
      }

      console.log(`👥 Inheriting ${validPersonnelIds.length} personnel from work order`);

      // Update task with inherited assignees
      const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        {
          assignees: validPersonnelIds,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTask) {
        console.error('Task not found for assignment inheritance');
        return [];
      }

      // Send notifications to newly assigned personnel
      if (!options.skipNotifications && validPersonnelIds.length > 0) {
        try {
          await NotificationService.notifyTaskAssigned(
            updatedTask as any,
            validPersonnelIds,
            [], // no previous assignees for new task
            createdBy
          );
        } catch (error) {
          console.error('Error sending task assignment notifications:', error);
        }
      }

      // Send realtime update
      try {
        realtimeService.emitToTask(
          taskId,
          'task:updated',
          {
            taskId: taskId,
            updates: {
              assignees: validPersonnelIds,
              updatedAt: new Date()
            }
          }
        );
      } catch (error) {
        console.error('Error sending realtime update:', error);
      }

      return validPersonnelIds;

    } catch (error) {
      console.error('Error inheriting work order assignments:', error);
      return [];
    }
  }

  /**
   * Handle removal of personnel from work order
   * Note: Personnel remain on tasks even when removed from work order
   * This method is for future extensibility and logging
   */
  static async handleWorkOrderPersonnelRemoval(
    workOrderId: string,
    removedPersonnelIds: string[],
    tenantId: string,
    removedBy: string
  ): Promise<void> {
    try {
      console.log('ℹ️  Personnel removed from work order (tasks remain unchanged):', {
        workOrderId,
        removedPersonnelIds,
        tenantId,
        removedBy
      });

      // Get work order details
      const workOrder = await WorkOrder.findOne({
        _id: workOrderId,
        tenantId
      }).select('title workOrderNumber').lean();

      // Count how many tasks these personnel are still assigned to
      const taskCount = await Task.countDocuments({
        workOrderId: workOrderId,
        tenantId: tenantId,
        assignees: { $in: removedPersonnelIds }
      });

      console.log(`📊 ${removedPersonnelIds.length} personnel removed from work order, but still assigned to ${taskCount} related tasks`);

      // Future: Could add notification to personnel about work order removal
      // but they remain on individual tasks

    } catch (error) {
      console.error('Error handling work order personnel removal:', error);
    }
  }

  /**
   * Remove personnel from a specific task (manual removal)
   */
  static async removePersonnelFromTask(
    taskId: string,
    personnelIds: string[],
    tenantId: string,
    removedBy: string
  ): Promise<void> {
    try {
      console.log('🗑️ Removing personnel from specific task:', {
        taskId,
        personnelIds,
        tenantId,
        removedBy
      });

      const task = await Task.findOne({
        _id: taskId,
        tenantId: tenantId
      });

      if (!task) {
        throw new Error('Task not found');
      }

      const currentAssignees = task.assignees || [];
      const updatedAssignees = currentAssignees
        .map((id: any) => id.toString())
        .filter((id: string) => !personnelIds.includes(id));

      // Only update if there are changes
      if (updatedAssignees.length !== currentAssignees.length) {
        await Task.findByIdAndUpdate(
          taskId,
          {
            assignees: updatedAssignees,
            updatedAt: new Date()
          }
        );

        console.log(`✅ Removed ${personnelIds.length} personnel from task ${taskId}`);

        // Send realtime update
        try {
          realtimeService.emitToTask(
            taskId,
            'task:updated',
            {
              taskId: taskId,
              updates: {
                assignees: updatedAssignees,
                updatedAt: new Date()
              }
            }
          );
        } catch (error) {
          console.error('Error sending realtime update:', error);
        }
      }

    } catch (error) {
      console.error('Error removing personnel from task:', error);
      throw error;
    }
  }
}