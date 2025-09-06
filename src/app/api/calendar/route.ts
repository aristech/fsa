import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { Task, Project, WorkOrder, Assignment } from 'src/lib/models';
import {
  withRequestContext,
  buildFilters,
  getRelatedEntityIds,
  type RequestContext,
} from 'src/lib/middleware/request-context';

// ----------------------------------------------------------------------

async function getCalendarData(request: NextRequest, context: RequestContext) {
  try {
    const { tenant, client, filters } = context;

    // Build filters using the middleware helper
    const { baseFilter, dateFilters } = buildFilters(context);

    // Build work order filter
    const workOrderFilter: any = {
      ...baseFilter,
      scheduledDate: dateFilters || {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    };

    // Fetch work orders with scheduled dates
    const workOrders = await WorkOrder.find(workOrderFilter)
      .populate('customerId', 'name email company')
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: 1 });

    // Build assignment filter
    const assignmentFilter: any = {
      ...baseFilter,
      scheduledStartDate: dateFilters || {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    };

    if (client) {
      // For assignments, filter by work orders that belong to this client
      const clientWorkOrderIds = await getRelatedEntityIds(context, 'workOrders');
      if (clientWorkOrderIds.length > 0) {
        assignmentFilter.workOrderId = { $in: clientWorkOrderIds };
      } else {
        // No work orders for this client, return empty assignment list
        assignmentFilter._id = { $in: [] };
      }
    }

    // Fetch assignments with scheduled dates
    const assignments = await Assignment.find(assignmentFilter)
      .populate('workOrderId', 'title description status priority')
      .populate('technicianId', 'name email skills')
      .populate('assignedBy', 'name email')
      .sort({ scheduledStartDate: 1 });

    // Build project filter
    const projectFilter: any = {
      ...baseFilter,
      $or: [
        { startDate: dateFilters || { $gte: new Date() } },
        {
          endDate: dateFilters || {
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    };

    // Fetch projects with start/end dates
    const projects = await Project.find(projectFilter)
      .populate('customerId', 'name email company')
      .populate('managerId', 'name email')
      .sort({ startDate: 1 });

    // Build task filter
    const taskFilter: any = {
      ...baseFilter,
      dueDate: dateFilters || {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    };

    if (client) {
      // For tasks, filter by projects that belong to this client
      const clientProjectIds = await getRelatedEntityIds(context, 'projects');
      if (clientProjectIds.length > 0) {
        taskFilter.projectId = { $in: clientProjectIds };
      } else {
        // No projects for this client, return empty task list
        taskFilter._id = { $in: [] };
      }
    }

    // Fetch tasks with due dates
    const tasks = await Task.find(taskFilter).sort({ dueDate: 1 });

    // Transform work orders to calendar events
    const workOrderEvents = workOrders.map((wo) => {
      const backgroundColor =
        wo.priority === 'urgent'
          ? '#f44336'
          : wo.priority === 'high'
            ? '#ff9800'
            : wo.priority === 'medium'
              ? '#2196f3'
              : '#4caf50';

      return {
        id: `wo-${wo._id}`,
        title: wo.title,
        start: wo.scheduledDate,
        end: wo.scheduledDate
          ? new Date(new Date(wo.scheduledDate).getTime() + (wo.estimatedDuration || 60) * 60000)
          : undefined,
        allDay: false,
        color: backgroundColor,
        backgroundColor,
        borderColor:
          wo.priority === 'urgent'
            ? '#d32f2f'
            : wo.priority === 'high'
              ? '#f57c00'
              : wo.priority === 'medium'
                ? '#1976d2'
                : '#388e3c',
        extendedProps: {
          type: 'work-order',
          status: wo.status,
          priority: wo.priority,
          category: wo.category,
          customer: wo.customerId?.name || 'Unknown Customer',
          description: wo.description,
          location: wo.location,
          estimatedDuration: wo.estimatedDuration,
        },
      };
    });

    // Transform assignments to calendar events
    const assignmentEvents = assignments.map((assignment) => {
      const backgroundColor =
        assignment.status === 'completed'
          ? '#4caf50'
          : assignment.status === 'in-progress'
            ? '#2196f3'
            : '#ff9800';

      return {
        id: `assignment-${assignment._id}`,
        title: `${assignment.technicianId?.name || 'Technician'} - ${assignment.workOrderId?.title || 'Work Order'}`,
        start: assignment.scheduledStartDate,
        end: assignment.scheduledEndDate,
        allDay: false,
        color: backgroundColor,
        backgroundColor,
        borderColor:
          assignment.status === 'completed'
            ? '#388e3c'
            : assignment.status === 'in-progress'
              ? '#1976d2'
              : '#f57c00',
        extendedProps: {
          type: 'assignment',
          status: assignment.status,
          technician: assignment.technicianId?.name || 'Unknown Technician',
          workOrder: assignment.workOrderId?.title || 'Unknown Work Order',
          workOrderId: assignment.workOrderId?._id,
          estimatedHours: assignment.estimatedHours,
          actualHours: assignment.actualHours,
        },
      };
    });

    // Transform projects to calendar events
    const projectEvents = projects.map((project) => {
      const backgroundColor =
        project.priority === 'urgent'
          ? '#f44336'
          : project.priority === 'high'
            ? '#ff9800'
            : project.priority === 'medium'
              ? '#2196f3'
              : '#4caf50';

      return {
        id: `project-${project._id}`,
        title: project.name,
        start: project.startDate,
        end: project.endDate,
        allDay: true,
        color: backgroundColor,
        backgroundColor,
        borderColor:
          project.priority === 'urgent'
            ? '#d32f2f'
            : project.priority === 'high'
              ? '#f57c00'
              : project.priority === 'medium'
                ? '#1976d2'
                : '#388e3c',
        extendedProps: {
          type: 'project',
          status: project.status,
          priority: project.priority,
          customer: project.customerId?.name || 'Unknown Customer',
          manager: project.managerId?.name || 'Unknown Manager',
          budget: project.budget,
          progress: project.progress,
        },
      };
    });

    // Transform tasks to calendar events
    const taskEvents = tasks.map((task) => {
      const backgroundColor =
        task.status === 'done'
          ? '#4caf50'
          : task.status === 'in-progress'
            ? '#2196f3'
            : task.status === 'review'
              ? '#ff9800'
              : task.priority === 'urgent'
                ? '#f44336'
                : task.priority === 'high'
                  ? '#ff5722'
                  : task.priority === 'medium'
                    ? '#9c27b0'
                    : '#607d8b';

      return {
        id: `task-${task._id}`,
        title: task.title,
        start: task.dueDate,
        end: task.dueDate
          ? new Date(new Date(task.dueDate).getTime() + (task.estimatedHours || 1) * 60 * 60 * 1000)
          : undefined,
        allDay: false,
        color: backgroundColor,
        backgroundColor,
        borderColor:
          task.status === 'done'
            ? '#388e3c'
            : task.status === 'in-progress'
              ? '#1976d2'
              : task.status === 'review'
                ? '#f57c00'
                : task.priority === 'urgent'
                  ? '#d32f2f'
                  : task.priority === 'high'
                    ? '#e64a19'
                    : task.priority === 'medium'
                      ? '#7b1fa2'
                      : '#455a64',
        extendedProps: {
          type: 'task',
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo?.name || 'Unassigned',
          createdBy: task.createdBy?.name || 'Unknown',
          project: task.projectId?.name || null,
          workOrder: task.workOrderId?.title || null,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          description: task.description,
          tags: task.tags,
          notes: task.notes,
        },
      };
    });

    // Combine all events
    const events = [...workOrderEvents, ...assignmentEvents, ...projectEvents, ...taskEvents];

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ message: 'Failed to fetch calendar data' }, { status: 500 });
  }
}

// Export the middleware-wrapped function
export const GET = withRequestContext(getCalendarData, {
  requireAuth: true,
  requireClient: false,
});

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Get the active tenant dynamically
    const { Tenant } = await import('src/lib/models');
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();
    const userId = 'admin-user-id'; // Hardcoded for testing
    const { type, title, start, end, extendedProps } = body;

    switch (type) {
      case 'work-order': {
        // Create a new work order
        const workOrder = new WorkOrder({
          tenantId,
          title,
          description: extendedProps?.description || '',
          status: 'scheduled',
          priority: extendedProps?.priority || 'medium',
          category: extendedProps?.category || 'General Maintenance',
          scheduledDate: new Date(start),
          estimatedDuration: extendedProps?.estimatedDuration || 60,
          customerId: extendedProps?.customerId,
          createdBy: userId,
          location: extendedProps?.location || {
            address: '',
            city: '',
            state: '',
            zipCode: '',
          },
        });
        await workOrder.save();
        return NextResponse.json({ message: 'Work order created', id: workOrder._id });
      }

      case 'assignment': {
        // Create a new assignment
        const assignment = new Assignment({
          tenantId,
          workOrderId: extendedProps?.workOrderId,
          technicianId: extendedProps?.technicianId,
          assignedBy: userId,
          scheduledStartDate: new Date(start),
          scheduledEndDate: new Date(end),
          estimatedHours: extendedProps?.estimatedHours || 1,
          status: 'assigned',
        });
        await assignment.save();
        return NextResponse.json({ message: 'Assignment created', id: assignment._id });
      }

      case 'project': {
        // Create a new project
        const project = new Project({
          tenantId,
          name: title,
          description: extendedProps?.description || '',
          status: 'planning',
          priority: extendedProps?.priority || 'medium',
          startDate: new Date(start),
          endDate: new Date(end),
          customerId: extendedProps?.customerId,
          managerId: userId,
          budget: extendedProps?.budget,
          progress: 0,
          tags: extendedProps?.tags || [],
        });
        await project.save();
        return NextResponse.json({ message: 'Project created', id: project._id });
      }

      case 'task': {
        // Create a new task
        const task = new Task({
          tenantId,
          title,
          description: extendedProps?.description || '',
          status: 'todo',
          priority: extendedProps?.priority || 'medium',
          dueDate: new Date(start),
          estimatedHours: extendedProps?.estimatedHours || 1,
          assignedTo: extendedProps?.assignedTo,
          createdBy: userId,
          projectId: extendedProps?.projectId,
          workOrderId: extendedProps?.workOrderId,
          tags: extendedProps?.tags || [],
          notes: extendedProps?.notes || '',
        });
        await task.save();
        return NextResponse.json({ message: 'Task created', id: task._id });
      }

      default:
        return NextResponse.json({ message: 'Unknown event type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ message: 'Failed to create event' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // Get the active tenant dynamically
    const { Tenant } = await import('src/lib/models');
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();
    const { id, start, end, extendedProps } = body;

    // Determine the type from the ID prefix
    if (id.startsWith('wo-')) {
      const workOrderId = id.replace('wo-', '');
      await WorkOrder.findOneAndUpdate(
        { _id: workOrderId, tenantId },
        {
          scheduledDate: new Date(start),
          ...(extendedProps && { ...extendedProps }),
        }
      );
    } else if (id.startsWith('assignment-')) {
      const assignmentId = id.replace('assignment-', '');
      await Assignment.findOneAndUpdate(
        { _id: assignmentId, tenantId },
        {
          scheduledStartDate: new Date(start),
          scheduledEndDate: new Date(end),
          ...(extendedProps && { ...extendedProps }),
        }
      );
    } else if (id.startsWith('project-')) {
      const projectId = id.replace('project-', '');
      await Project.findOneAndUpdate(
        { _id: projectId, tenantId },
        {
          startDate: new Date(start),
          endDate: new Date(end),
          ...(extendedProps && { ...extendedProps }),
        }
      );
    } else if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      await Task.findOneAndUpdate(
        { _id: taskId, tenantId },
        {
          dueDate: new Date(start),
          ...(extendedProps && { ...extendedProps }),
        }
      );
    }

    return NextResponse.json({ message: 'Event updated' });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ message: 'Failed to update event' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    // Get the active tenant dynamically
    const { Tenant } = await import('src/lib/models');
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();

    if (!id) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    // Determine the type from the ID prefix
    if (id.startsWith('wo-')) {
      const workOrderId = id.replace('wo-', '');
      await WorkOrder.findOneAndDelete({ _id: workOrderId, tenantId });
    } else if (id.startsWith('assignment-')) {
      const assignmentId = id.replace('assignment-', '');
      await Assignment.findOneAndDelete({ _id: assignmentId, tenantId });
    } else if (id.startsWith('project-')) {
      const projectId = id.replace('project-', '');
      await Project.findOneAndDelete({ _id: projectId, tenantId });
    } else if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      await Task.findOneAndDelete({ _id: taskId, tenantId });
    }

    return NextResponse.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
  }
}
