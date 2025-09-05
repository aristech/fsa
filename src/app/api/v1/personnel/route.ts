import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { User, Role, Personnel } from 'src/lib/models';

// ----------------------------------------------------------------------

const createPersonnelSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  roleId: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  availability: z
    .object({
      monday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      tuesday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      wednesday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      thursday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      friday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      saturday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      sunday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string(),
    })
    .optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const roleId = searchParams.get('roleId');
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    const query: any = { tenantId };
    if (!includeInactive) {
      query.isActive = true;
    }
    if (roleId) {
      query.roleId = roleId;
    }

    const personnel = await Personnel.find(query)
      .populate('userId', 'name email phone')
      .populate('roleId', 'name color')
      .sort({ employeeId: 1 });

    // Get task/project counts for each personnel
    const { Task, Project } = await import('src/lib/models');

    const personnelWithCounts = await Promise.all(
      personnel.map(async (person) => {
        const [taskCount, projectCount] = await Promise.all([
          Task.countDocuments({
            tenantId,
            $or: [
              { assignedTo: person.userId._id || person.userId },
              { createdBy: person.userId._id || person.userId },
            ],
          }),
          Project.countDocuments({
            tenantId,
            $or: [
              { managerId: person.userId._id || person.userId },
              { assignedTechnician: person.userId._id || person.userId },
            ],
          }),
        ]);

        return {
          ...person.toObject(),
          taskCount,
          projectCount,
          totalAssignments: taskCount + projectCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: personnelWithCounts,
    });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch personnel' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPersonnelSchema.parse(body);
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    // Check if employee ID already exists
    const existingPersonnel = await Personnel.findOne({
      tenantId,
      employeeId: validatedData.employeeId,
    });

    if (existingPersonnel) {
      return NextResponse.json(
        { success: false, message: 'Employee ID already exists' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(validatedData.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 400 });
    }

    // Check if role exists (if provided)
    if (validatedData.roleId) {
      const role = await Role.findOne({ _id: validatedData.roleId, tenantId });
      if (!role) {
        return NextResponse.json({ success: false, message: 'Role not found' }, { status: 400 });
      }
    }

    const personnel = new Personnel({
      ...validatedData,
      tenantId,
      isActive: true,
    });

    await personnel.save();

    // Populate the response
    const populatedPersonnel = await Personnel.findById(personnel._id)
      .populate('userId', 'name email phone')
      .populate('roleId', 'name color');

    return NextResponse.json({
      success: true,
      data: populatedPersonnel,
      message: 'Personnel created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create personnel' },
      { status: 500 }
    );
  }
}
