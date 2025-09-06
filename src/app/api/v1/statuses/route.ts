import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { Status } from 'src/lib/models';

// ----------------------------------------------------------------------

const createStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(50, 'Status name must be less than 50 characters'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'),
  order: z.number().int().min(0).optional(),
});

// const updateStatusSchema = z.object({
//   name: z
//     .string()
//     .min(1, 'Status name is required')
//     .max(50, 'Status name must be less than 50 characters')
//     .optional(),
//   description: z.string().optional(),
//   color: z
//     .string()
//     .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code')
//     .optional(),
//   order: z.number().int().min(0).optional(),
//   isActive: z.boolean().optional(),
// });

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

    const statuses = await Status.find(query).sort({ order: 1, createdAt: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createStatusSchema.parse(body);
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    // Check if status name already exists for this tenant
    const existingStatus = await Status.findOne({
      tenantId,
      name: validatedData.name,
    });

    if (existingStatus) {
      return NextResponse.json(
        { success: false, message: 'Status with this name already exists' },
        { status: 400 }
      );
    }

    // If no order is provided, set it to the next available order
    let order = validatedData.order;
    if (order === undefined) {
      const lastStatus = await Status.findOne({ tenantId }).sort({ order: -1 }).select('order');
      order = lastStatus ? lastStatus.order + 1 : 0;
    }

    const status = new Status({
      ...validatedData,
      tenantId,
      order,
      isDefault: false,
      isActive: true,
    });

    await status.save();

    return NextResponse.json({
      success: true,
      data: status,
      message: 'Status created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create status' },
      { status: 500 }
    );
  }
}
