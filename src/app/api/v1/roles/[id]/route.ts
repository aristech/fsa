import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { Role, Personnel } from 'src/lib/models';

// ----------------------------------------------------------------------

const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters')
    .optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code')
    .optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ----------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    const role = await Role.findOne({
      _id: params.id,
      tenantId,
    });

    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch role' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    // Check if role exists
    const existingRole = await Role.findOne({
      _id: params.id,
      tenantId,
    });

    if (!existingRole) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const duplicateRole = await Role.findOne({
        tenantId,
        name: validatedData.name,
        _id: { $ne: params.id },
      });

      if (duplicateRole) {
        return NextResponse.json(
          { success: false, message: 'Role with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updatedRole = await Role.findOneAndUpdate({ _id: params.id, tenantId }, validatedData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating role:', error);
    return NextResponse.json({ success: false, message: 'Failed to update role' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    const role = await Role.findOne({
      _id: params.id,
      tenantId,
    });

    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    // Prevent deletion of default roles
    if (role.isDefault) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete default role' },
        { status: 400 }
      );
    }

    // Check if role is being used by any personnel
    const personnelCount = await Personnel.countDocuments({ tenantId, roleId: params.id });

    if (personnelCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete role. It is being used by ${personnelCount} personnel. Please reassign them first.`,
        },
        { status: 400 }
      );
    }

    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete role' }, { status: 500 });
  }
}
