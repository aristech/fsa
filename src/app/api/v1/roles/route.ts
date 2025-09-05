import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { Role } from 'src/lib/models';

// ----------------------------------------------------------------------

const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50, 'Role name must be less than 50 characters'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'),
  permissions: z.array(z.string()).optional(),
});

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    const query: any = { tenantId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const roles = await Role.find(query).sort({ isDefault: -1, name: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch roles' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    // Check if role name already exists for this tenant
    const existingRole = await Role.findOne({
      tenantId,
      name: validatedData.name,
    });

    if (existingRole) {
      return NextResponse.json(
        { success: false, message: 'Role with this name already exists' },
        { status: 400 }
      );
    }

    const role = new Role({
      ...validatedData,
      tenantId,
      isDefault: false,
      isActive: true,
    });

    await role.save();

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating role:', error);
    return NextResponse.json({ success: false, message: 'Failed to create role' }, { status: 500 });
  }
}
