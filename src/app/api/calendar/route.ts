import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

import { Project, WorkOrder, Assignment } from 'src/lib/models';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const tenantId = '68bacc230e20f67f2394e52f'; // Actual tenant ID from database

    // Fetch work orders with scheduled dates
    const workOrders = await WorkOrder.find({
      tenantId,
      scheduledDate: {
        $gte: start ? new Date(start) : new Date(),
        $lte: end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    })
      .populate('customerId', 'name email company')
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: 1 });

    // Fetch assignments with scheduled dates
    const assignments = await Assignment.find({
      tenantId,
      scheduledStartDate: {
        $gte: start ? new Date(start) : new Date(),
        $lte: end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .populate('workOrderId', 'title description status priority')
      .populate('technicianId', 'name email skills')
      .populate('assignedBy', 'name email')
      .sort({ scheduledStartDate: 1 });

    // Fetch projects with start/end dates
    const projects = await Project.find({
      tenantId,
      $or: [
        { startDate: { $gte: start ? new Date(start) : new Date() } },
        {
          endDate: {
            $lte: end ? new Date(end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    })
      .populate('customerId', 'name email company')
      .populate('managerId', 'name email')
      .sort({ startDate: 1 });

    // Transform work orders to calendar events
    const workOrderEvents = workOrders.map((wo) => ({
      id: `wo-${wo._id}`,
      title: wo.title,
      start: wo.scheduledDate,
      end: wo.scheduledDate
        ? new Date(new Date(wo.scheduledDate).getTime() + (wo.estimatedDuration || 60) * 60000)
        : undefined,
      allDay: false,
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
      backgroundColor:
        wo.priority === 'urgent'
          ? '#f44336'
          : wo.priority === 'high'
            ? '#ff9800'
            : wo.priority === 'medium'
              ? '#2196f3'
              : '#4caf50',
      borderColor:
        wo.priority === 'urgent'
          ? '#d32f2f'
          : wo.priority === 'high'
            ? '#f57c00'
            : wo.priority === 'medium'
              ? '#1976d2'
              : '#388e3c',
    }));

    // Transform assignments to calendar events
    const assignmentEvents = assignments.map((assignment) => ({
      id: `assignment-${assignment._id}`,
      title: `${assignment.technicianId?.name || 'Technician'} - ${assignment.workOrderId?.title || 'Work Order'}`,
      start: assignment.scheduledStartDate,
      end: assignment.scheduledEndDate,
      allDay: false,
      extendedProps: {
        type: 'assignment',
        status: assignment.status,
        technician: assignment.technicianId?.name || 'Unknown Technician',
        workOrder: assignment.workOrderId?.title || 'Unknown Work Order',
        workOrderId: assignment.workOrderId?._id,
        estimatedHours: assignment.estimatedHours,
        actualHours: assignment.actualHours,
      },
      backgroundColor:
        assignment.status === 'completed'
          ? '#4caf50'
          : assignment.status === 'in-progress'
            ? '#2196f3'
            : '#ff9800',
      borderColor:
        assignment.status === 'completed'
          ? '#388e3c'
          : assignment.status === 'in-progress'
            ? '#1976d2'
            : '#f57c00',
    }));

    // Transform projects to calendar events
    const projectEvents = projects.map((project) => ({
      id: `project-${project._id}`,
      title: project.name,
      start: project.startDate,
      end: project.endDate,
      allDay: true,
      extendedProps: {
        type: 'project',
        status: project.status,
        priority: project.priority,
        customer: project.customerId?.name || 'Unknown Customer',
        manager: project.managerId?.name || 'Unknown Manager',
        budget: project.budget,
        progress: project.progress,
      },
      backgroundColor:
        project.priority === 'urgent'
          ? '#f44336'
          : project.priority === 'high'
            ? '#ff9800'
            : project.priority === 'medium'
              ? '#2196f3'
              : '#4caf50',
      borderColor:
        project.priority === 'urgent'
          ? '#d32f2f'
          : project.priority === 'high'
            ? '#f57c00'
            : project.priority === 'medium'
              ? '#1976d2'
              : '#388e3c',
    }));

    // Combine all events
    const events = [...workOrderEvents, ...assignmentEvents, ...projectEvents];

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ message: 'Failed to fetch calendar data' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = '68bacc230e20f67f2394e52f'; // Actual tenant ID from database
    const userId = 'admin-user-id'; // Hardcoded for testing
    const { type, title, start, end, extendedProps } = body;

    switch (type) {
      case 'work-order':
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

      case 'assignment':
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

      case 'project':
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
    const tenantId = '68bacc230e20f67f2394e52f'; // Actual tenant ID from database
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
    const tenantId = '68bacc230e20f67f2394e52f'; // Actual tenant ID from database

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
    }

    return NextResponse.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
  }
}
