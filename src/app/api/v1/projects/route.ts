import type { NextRequest} from 'next/server';

import { z as zod } from 'zod';
import { NextResponse } from 'next/server';

import { Project } from 'src/lib/models';
import { withAuth } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const createProjectSchema = zod.object({
  name: zod.string().min(1, 'Project name is required'),
  description: zod.string().optional(),
  status: zod.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).default('planning'),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: zod.string().optional(),
  endDate: zod.string().optional(),
  customerId: zod.string().min(1, 'Customer is required'),
  managerId: zod.string().min(1, 'Manager is required'),
  budget: zod.number().min(0).optional(),
  tags: zod.array(zod.string()).default([]),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const customerId = searchParams.get('customerId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (customerId) filter.customerId = customerId;

      const skip = (page - 1) * limit;

      const [projects, total] = await Promise.all([
        Project.find(filter)
          .populate('customerId', 'name email company')
          .populate('managerId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Project.countDocuments(filter),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          projects,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch projects' },
        { status: 500 }
      );
    }
  });
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const body = await req.json();
      const validatedData = createProjectSchema.parse(body);

      const projectData = {
        ...validatedData,
        tenantId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      };

      const project = new Project(projectData);
      await project.save();

      await project.populate([
        { path: 'customerId', select: 'name email company' },
        { path: 'managerId', select: 'name email' },
      ]);

      return NextResponse.json({
        success: true,
        data: project,
        message: 'Project created successfully',
      });
    } catch (error) {
      console.error('Error creating project:', error);
      if (error instanceof zod.ZodError) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Failed to create project' },
        { status: 500 }
      );
    }
  });
}
