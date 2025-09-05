import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { Status } from 'src/lib/models';
import { withAuth } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const updateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(50, 'Status name must be less than 50 characters')
    .optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code')
    .optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const status = await Status.findOne({
        _id: params.id,
        tenantId,
      });

      if (!status) {
        return NextResponse.json({ success: false, message: 'Status not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error fetching status:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch status' },
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
      const validatedData = updateStatusSchema.parse(body);

      // Check if status exists
      const existingStatus = await Status.findOne({
        _id: params.id,
        tenantId,
      });

      if (!existingStatus) {
        return NextResponse.json({ success: false, message: 'Status not found' }, { status: 404 });
      }

      // If updating name, check for duplicates
      if (validatedData.name && validatedData.name !== existingStatus.name) {
        const duplicateStatus = await Status.findOne({
          tenantId,
          name: validatedData.name,
          _id: { $ne: params.id },
        });

        if (duplicateStatus) {
          return NextResponse.json(
            { success: false, message: 'Status with this name already exists' },
            { status: 400 }
          );
        }
      }

      const updatedStatus = await Status.findOneAndUpdate(
        { _id: params.id, tenantId },
        validatedData,
        { new: true, runValidators: true }
      );

      return NextResponse.json({
        success: true,
        data: updatedStatus,
        message: 'Status updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }

      console.error('Error updating status:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update status' },
        { status: 500 }
      );
    }
  });
}

// ----------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req, { tenantId }) => {
    try {
      const status = await Status.findOne({
        _id: params.id,
        tenantId,
      });

      if (!status) {
        return NextResponse.json({ success: false, message: 'Status not found' }, { status: 404 });
      }

      // Prevent deletion of default statuses
      if (status.isDefault) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete default status' },
          { status: 400 }
        );
      }

      // Check if status is being used by any work orders or projects
      const { WorkOrder, Project } = await import('src/lib/models');

      const [workOrderCount, projectCount] = await Promise.all([
        WorkOrder.countDocuments({ tenantId, status: status.name }),
        Project.countDocuments({ tenantId, status: status.name }),
      ]);

      if (workOrderCount > 0 || projectCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot delete status. It is being used by ${workOrderCount + projectCount} items. Please reassign them first.`,
          },
          { status: 400 }
        );
      }

      await Status.findByIdAndDelete(params.id);

      return NextResponse.json({
        success: true,
        message: 'Status deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting status:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete status' },
        { status: 500 }
      );
    }
  });
}
