import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { Customer, WorkOrder, Technician } from 'src/lib/models';
import { withAuth, type AuthenticatedRequest } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const updateWorkOrderSchema = z
  .object({
    customerId: z.string().optional(),
    technicianId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z
      .enum(['created', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'])
      .optional(),
    category: z.string().optional(),
    location: z
      .object({
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        coordinates: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
      })
      .optional(),
    scheduledDate: z.string().datetime().optional(),
    estimatedDuration: z.number().min(0).optional(),
    actualDuration: z.number().min(0).optional(),
    cost: z
      .object({
        labor: z.number().min(0),
        materials: z.number().min(0),
        total: z.number().min(0),
      })
      .optional(),
    materials: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number().min(0),
          unitPrice: z.number().min(0),
          total: z.number().min(0),
        })
      )
      .optional(),
    notes: z.string().optional(),
  })
  .partial();

// ----------------------------------------------------------------------

const getWorkOrder = async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    await connectDB();

    const workOrder = await WorkOrder.findOne({
      _id: params.id,
      tenantId: req.user.tenantId,
    })
      .populate('customerId', 'name email phone company address')
      .populate('technicianId', 'employeeId userId')
      .populate('history.userId', 'firstName lastName email');

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error('Get work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// ----------------------------------------------------------------------

const updateWorkOrder = async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await req.json();
    const validatedData = updateWorkOrderSchema.parse(body);

    await connectDB();

    // Find work order
    const workOrder = await WorkOrder.findOne({
      _id: params.id,
      tenantId: req.user.tenantId,
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Verify customer exists (if updating)
    if (validatedData.customerId) {
      const customer = await Customer.findOne({
        _id: validatedData.customerId,
        tenantId: req.user.tenantId,
        isActive: true,
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    // Verify technician exists (if updating)
    if (validatedData.technicianId) {
      const technician = await Technician.findOne({
        _id: validatedData.technicianId,
        tenantId: req.user.tenantId,
        isActive: true,
      });

      if (!technician) {
        return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
      }
    }

    // Track status changes
    const statusChanged = validatedData.status && validatedData.status !== workOrder.status;
    const oldStatus = workOrder.status;

    // Update work order
    Object.assign(workOrder, {
      ...validatedData,
      scheduledDate: validatedData.scheduledDate
        ? new Date(validatedData.scheduledDate)
        : workOrder.scheduledDate,
    });

    // Add to history if status changed
    if (statusChanged) {
      workOrder.history.push({
        status: validatedData.status!,
        timestamp: new Date(),
        userId: req.user.userId,
        notes: `Status changed from ${oldStatus} to ${validatedData.status}`,
      });
    }

    await workOrder.save();

    // Populate the updated work order
    await workOrder.populate([
      { path: 'customerId', select: 'name email phone company address' },
      { path: 'technicianId', select: 'employeeId userId' },
      { path: 'history.userId', select: 'firstName lastName email' },
    ]);

    return NextResponse.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error('Update work order error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// ----------------------------------------------------------------------

const deleteWorkOrder = async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();

    const workOrder = await WorkOrder.findOneAndDelete({
      _id: params.id,
      tenantId: req.user.tenantId,
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Work order deleted successfully',
    });
  } catch (error) {
    console.error('Delete work order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// ----------------------------------------------------------------------

export const GET = withAuth(getWorkOrder);
export const PUT = withAuth(updateWorkOrder);
export const DELETE = withAuth(deleteWorkOrder);
