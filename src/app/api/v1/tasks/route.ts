import type { NextRequest} from 'next/server';

import { z as zod } from 'zod';
import { NextResponse } from 'next/server';

import { Task } from 'src/lib/models';
import { withAuth } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const createTaskSchema = zod.object({
  title: zod.string().min(1, 'Task title is required'),
  description: zod.string().optional(),
  status: zod.enum(['todo', 'in-progress', 'review', 'done']).default('todo'),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  projectId: zod.string().optional(),
  workOrderId: zod.string().optional(),
  assignedTo: zod.string().optional(),
  dueDate: zod.string().optional(),
  estimatedHours: zod.number().min(0).optional(),
  tags: zod.array(zod.string()).default([]),
  attachments: zod.array(zod.string()).default([]),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { tenantId, userId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const projectId = searchParams.get('projectId');
      const workOrderId = searchParams.get('workOrderId');
      const assignedTo = searchParams.get('assignedTo');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (projectId) filter.projectId = projectId;
      if (workOrderId) filter.workOrderId = workOrderId;
      if (assignedTo) filter.assignedTo = assignedTo;

      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .populate('projectId', 'name status')
          .populate('workOrderId', 'title status priority')
          .populate('assignedTo', 'name email skills')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Task.countDocuments(filter),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }
  });
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, { tenantId, userId }) => {
    try {
      const body = await req.json();
      const validatedData = createTaskSchema.parse(body);

      const taskData = {
        ...validatedData,
        tenantId,
        createdBy: userId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      };

      const task = new Task(taskData);
      await task.save();

      await task.populate([
        { path: 'projectId', select: 'name status' },
        { path: 'workOrderId', select: 'title status priority' },
        { path: 'assignedTo', select: 'name email skills' },
        { path: 'createdBy', select: 'name email' },
      ]);

      return NextResponse.json({
        success: true,
        data: task,
        message: 'Task created successfully',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      if (error instanceof zod.ZodError) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Failed to create task' },
        { status: 500 }
      );
    }
  });
}
