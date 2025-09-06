import type { NextRequest } from 'next/server';
import type { IKanban, IKanbanTask, IKanbanColumn } from 'src/types/kanban';

import { NextResponse } from 'next/server';

import { Task, Status, Tenant, Project } from 'src/lib/models';

// ----------------------------------------------------------------------

// Helper function to convert status to Kanban column
function statusToKanbanColumn(status: any): IKanbanColumn {
  return {
    id: `column-${status._id}`,
    name: status.name,
  };
}

// ----------------------------------------------------------------------

function transformProjectToKanbanTask(project: any, statuses: any[]): IKanbanTask {
  // Map project status to kanban status name
  const statusMapping: Record<string, string> = {
    planning: 'Created',
    active: 'In Progress',
    'on-hold': 'Assigned',
    completed: 'Completed',
    cancelled: 'Completed',
  };

  const kanbanStatus = statusMapping[project.status] || 'Created';

  return {
    id: project._id,
    name: project.name,
    status: kanbanStatus, // Use mapped status name
    priority: project.priority,
    labels: project.tags || ['Technology'],
    description: project.description || 'No description available',
    attachments: [],
    comments: [],
    assignee: project.assignedTechnician
      ? [
          {
            id: project.assignedTechnician._id || 'unknown',
            name: project.assignedTechnician.name || 'Unknown Technician',
            role: 'Technician',
            email: project.assignedTechnician.email || '',
            status: project.assignedTechnician.availability || 'available',
            address: project.assignedTechnician.location?.address || '',
            avatarUrl: 'https://api-prod-minimal-v700.pages.dev/assets/images/avatar/avatar-1.webp',
            phoneNumber: project.assignedTechnician.phone || '',
            lastActivity: new Date().toISOString(),
          },
        ]
      : [],
    due: project.endDate
      ? [new Date().toISOString(), project.endDate.toISOString()]
      : [new Date().toISOString(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
    reporter: {
      id: project.managerId || 'admin-user-id',
      name: 'Project Manager',
      avatarUrl: 'https://api-prod-minimal-v700.pages.dev/assets/images/avatar/avatar-17.webp',
    },
  };
}

function transformTaskToKanbanTask(task: any, statuses: any[]): IKanbanTask {
  // Map task status to kanban status name
  const statusMapping: Record<string, string> = {
    todo: 'Created',
    'in-progress': 'In Progress',
    review: 'Assigned',
    done: 'Completed',
  };

  const kanbanStatus = statusMapping[task.status] || 'Created';

  return {
    id: task._id,
    name: task.title,
    status: kanbanStatus, // Use mapped status name
    priority: task.priority,
    labels: task.tags || ['Technology'],
    description: task.description || 'No description available',
    attachments: task.attachments || [],
    comments: [],
    assignee: task.assignedTo
      ? [
          {
            id: task.assignedTo._id || 'unknown',
            name: task.assignedTo.name || 'Unknown Technician',
            role: 'Technician',
            email: task.assignedTo.email || '',
            status: task.assignedTo.availability || 'available',
            address: task.assignedTo.location?.address || '',
            avatarUrl: 'https://api-prod-minimal-v700.pages.dev/assets/images/avatar/avatar-2.webp',
            phoneNumber: task.assignedTo.phone || '',
            lastActivity: new Date().toISOString(),
          },
        ]
      : [],
    due: task.dueDate
      ? [new Date().toISOString(), task.dueDate.toISOString()]
      : [new Date().toISOString(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
    reporter: {
      id: task.createdBy || 'admin-user-id',
      name: 'Task Creator',
      avatarUrl: 'https://api-prod-minimal-v700.pages.dev/assets/images/avatar/avatar-17.webp',
    },
  };
}

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from the first tenant (for demo purposes)
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();

    // Fetch statuses, projects and tasks
    const [statuses, projects, tasks] = await Promise.all([
      Status.find({ tenantId, isActive: true }).sort({ order: 1, createdAt: 1 }),
      Project.find({ tenantId }).sort({ createdAt: -1 }),
      Task.find({ tenantId }).sort({ createdAt: -1 }),
    ]);

    // Convert statuses to Kanban columns
    const columns = statuses.map(statusToKanbanColumn);

    // Transform projects to Kanban tasks
    const projectTasks = projects.map((project) => transformProjectToKanbanTask(project, statuses));

    // Transform tasks to Kanban tasks
    const taskItems = tasks.map((task) => transformTaskToKanbanTask(task, statuses));

    // Combine all tasks
    const allTasks = [...projectTasks, ...taskItems];

    // Group tasks by status/column
    const tasksByColumn: Record<string, IKanbanTask[]> = {};

    columns.forEach((column) => {
      const statusName = statuses.find((s) => `column-${s._id}` === column.id)?.name;
      tasksByColumn[column.id] = allTasks.filter((task) => task.status === statusName);
    });

    const kanbanData: IKanban = {
      columns,
      tasks: tasksByColumn,
    };

    return NextResponse.json({
      board: kanbanData,
    });
  } catch (error) {
    console.error('Error fetching Kanban data:', error);
    return NextResponse.json({ message: 'Failed to fetch Kanban data' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const body = await request.json();
    // Get tenant ID from the first tenant (for demo purposes)
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();
    const userId = 'admin-user-id'; // Hardcoded for testing

    switch (endpoint) {
      case 'create-column':
        // For now, we'll use predefined columns
        return NextResponse.json({ message: 'Columns are predefined for FSA' });

      case 'update-column':
        // For now, we'll use predefined columns
        return NextResponse.json({ message: 'Columns are predefined for FSA' });

      case 'move-column':
        // For now, we'll use predefined columns
        return NextResponse.json({ message: 'Columns are predefined for FSA' });

      case 'clear-column': {
        // Clear tasks in a specific column
        const { columnId } = body;
        await Promise.all([
          Project.updateMany({ tenantId, status: columnId }, { status: 'cancelled' }),
          Task.updateMany({ tenantId, status: columnId }, { status: 'cancelled' }),
        ]);
        return NextResponse.json({ message: 'Column cleared' });
      }

      case 'create-task': {
        // Create a new task
        const { name, description, priority, labels, assignee, due } = body;
        const newTask = new Task({
          tenantId,
          title: name,
          description,
          priority: priority || 'medium',
          status: 'todo',
          tags: labels || [],
          assignedTo: assignee?.[0]?.id,
          dueDate: due?.[1] ? new Date(due[1]) : undefined,
          createdBy: userId,
        });
        await newTask.save();
        return NextResponse.json({ message: 'Task created' });
      }

      case 'update-task': {
        // Update an existing task
        const { taskId, ...updateData } = body;
        await Task.findOneAndUpdate(
          { _id: taskId, tenantId },
          {
            title: updateData.name,
            description: updateData.description,
            priority: updateData.priority,
            tags: updateData.labels,
            assignedTo: updateData.assignee?.[0]?.id,
            dueDate: updateData.due?.[1] ? new Date(updateData.due[1]) : undefined,
          }
        );
        return NextResponse.json({ message: 'Task updated' });
      }

      case 'move-task': {
        // Move task between columns (update status)
        const { updateTasks } = body;
        for (const [taskColumnId, tasks] of Object.entries(updateTasks)) {
          const taskIds = (tasks as IKanbanTask[]).map((task) => task.id);

          // Map column IDs to statuses
          let newStatus = 'todo';
          let newProjectStatus = 'planning';

          switch (taskColumnId) {
            case '1-column-e99f09a7-dd88-49d5-b1c8-1daf80c2d7b2': // To do
              newStatus = 'todo';
              newProjectStatus = 'planning';
              break;
            case '2-column-e99f09a7-dd88-49d5-b1c8-1daf80c2d7b3': // In progress
              newStatus = 'in-progress';
              newProjectStatus = 'active';
              break;
            case '3-column-e99f09a7-dd88-49d5-b1c8-1daf80c2d7b4': // Ready to test
              newStatus = 'review';
              newProjectStatus = 'on-hold';
              break;
            case '4-column-e99f09a7-dd88-49d5-b1c8-1daf80c2d7b5': // Done
              newStatus = 'done';
              newProjectStatus = 'completed';
              break;
            default:
              // Keep default values
              break;
          }

          await Promise.all([
            Task.updateMany({ _id: { $in: taskIds }, tenantId }, { status: newStatus }),
            Project.updateMany({ _id: { $in: taskIds }, tenantId }, { status: newProjectStatus }),
          ]);
        }
        return NextResponse.json({ message: 'Tasks moved' });
      }

      case 'delete-task': {
        // Delete a task
        const { taskId: deleteTaskId } = body;
        await Task.findOneAndDelete({ _id: deleteTaskId, tenantId });
        return NextResponse.json({ message: 'Task deleted' });
      }

      default:
        return NextResponse.json({ message: 'Unknown endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in Kanban POST:', error);
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 });
  }
}
