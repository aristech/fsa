import type { NextRequest} from 'next/server';

import { z as zod } from 'zod';
import { NextResponse } from 'next/server';

import { Project } from 'src/lib/models';
import { withAuth } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const updateProjectSchema = zod.object({
  name: zod.string().min(1).optional(),
  description: zod.string().optional(),
  status: zod.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).optional(),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate: zod.string().optional(),
  endDate: zod.string().optional(),
  customerId: zod.string().min(1).optional(),
  managerId: zod.string().min(1).optional(),
  budget: zod.number().min(0).optional(),
  actualCost: zod.number().min(0).optional(),
  progress: zod.number().min(0).max(100).optional(),
  tags: zod.array(zod.string()).optional(),
  notes: zod.string().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const project = await Project.findOne({
        _id: params.id,
        tenantId,
      })
        .populate('customerId', 'name email company phone address')
        .populate('managerId', 'name email');

      if (!project) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch project' },
        { status: 500 }
      );
    }
  });
}

// ----------------------------------------------------------------------

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const body = await req.json();
      const validatedData = updateProjectSchema.parse(body);

      const updateData: any = { ...validatedData };
      if (validatedData.startDate) {
        updateData.startDate = new Date(validatedData.startDate);
      }
      if (validatedData.endDate) {
        updateData.endDate = new Date(validatedData.endDate);
      }

      const project = await Project.findOneAndUpdate({ _id: params.id, tenantId }, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('customerId', 'name email company')
        .populate('managerId', 'name email');

      if (!project) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: project,
        message: 'Project updated successfully',
      });
    } catch (error) {
      console.error('Error updating project:', error);
      if (error instanceof zod.ZodError) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Failed to update project' },
        { status: 500 }
      );
    }
  });
}

// ----------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const project = await Project.findOneAndDelete({
        _id: params.id,
        tenantId,
      });

      if (!project) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete project' },
        { status: 500 }
      );
    }
  });
}
