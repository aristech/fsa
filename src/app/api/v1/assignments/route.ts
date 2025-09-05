import type { NextRequest} from 'next/server';

import { z as zod } from 'zod';
import { NextResponse } from 'next/server';

import { Assignment } from 'src/lib/models';
import { withAuth } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const createAssignmentSchema = zod.object({
  workOrderId: zod.string().min(1, 'Work order is required'),
  technicianId: zod.string().min(1, 'Technician is required'),
  scheduledStartDate: zod.string().optional(),
  scheduledEndDate: zod.string().optional(),
  estimatedHours: zod.number().min(0).optional(),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const workOrderId = searchParams.get('workOrderId');
      const technicianId = searchParams.get('technicianId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (workOrderId) filter.workOrderId = workOrderId;
      if (technicianId) filter.technicianId = technicianId;

      const skip = (page - 1) * limit;

      const [assignments, total] = await Promise.all([
        Assignment.find(filter)
          .populate('workOrderId', 'title description status priority customerId')
          .populate('technicianId', 'name email skills certifications')
          .populate('assignedBy', 'name email')
          .sort({ assignedAt: -1 })
          .skip(skip)
          .limit(limit),
        Assignment.countDocuments(filter),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          assignments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch assignments' },
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
      const validatedData = createAssignmentSchema.parse(body);

      const assignmentData = {
        ...validatedData,
        tenantId,
        assignedBy: userId,
        scheduledStartDate: validatedData.scheduledStartDate
          ? new Date(validatedData.scheduledStartDate)
          : undefined,
        scheduledEndDate: validatedData.scheduledEndDate
          ? new Date(validatedData.scheduledEndDate)
          : undefined,
      };

      const assignment = new Assignment(assignmentData);
      await assignment.save();

      await assignment.populate([
        { path: 'workOrderId', select: 'title description status priority customerId' },
        { path: 'technicianId', select: 'name email skills certifications' },
        { path: 'assignedBy', select: 'name email' },
      ]);

      return NextResponse.json({
        success: true,
        data: assignment,
        message: 'Assignment created successfully',
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      if (error instanceof zod.ZodError) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      if (error.code === 11000) {
        return NextResponse.json(
          { success: false, message: 'Technician is already assigned to this work order' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Failed to create assignment' },
        { status: 500 }
      );
    }
  });
}
