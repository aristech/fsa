import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { Customer, WorkOrder, Technician } from 'src/lib/models';
import { withAuth, type AuthenticatedRequest } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const createWorkOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  technicianId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().min(1, 'Category is required'),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
  }),
  scheduledDate: z.string().datetime().optional(),
  estimatedDuration: z.number().min(0, 'Estimated duration must be positive'),
  notes: z.string().optional(),
});

// ----------------------------------------------------------------------

const getWorkOrders = async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const technicianId = searchParams.get('technicianId');
    const customerId = searchParams.get('customerId');

    await connectDB();

    // Build filter
    const filter: any = { tenantId: req.user.tenantId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (technicianId) filter.technicianId = technicianId;
    if (customerId) filter.customerId = customerId;

    // Get work orders with pagination
    const skip = (page - 1) * limit;
    const workOrders = await WorkOrder.find(filter)
      .populate('customerId', 'name email phone company')
      .populate('technicianId', 'employeeId userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WorkOrder.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: {
        workOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get work orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// ----------------------------------------------------------------------

const createWorkOrder = async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validatedData = createWorkOrderSchema.parse(body);

    await connectDB();

    // Verify customer exists
    const customer = await Customer.findOne({
      _id: validatedData.customerId,
      tenantId: req.user.tenantId,
      isActive: true,
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify technician exists (if provided)
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

    // Create work order
    const workOrder = new WorkOrder({
      ...validatedData,
      tenantId: req.user.tenantId,
      scheduledDate: validatedData.scheduledDate
        ? new Date(validatedData.scheduledDate)
        : undefined,
      history: [
        {
          status: 'created',
          timestamp: new Date(),
          userId: req.user.userId,
          notes: 'Work order created',
        },
      ],
    });

    await workOrder.save();

    // Populate the created work order
    await workOrder.populate([
      { path: 'customerId', select: 'name email phone company' },
      { path: 'technicianId', select: 'employeeId userId' },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: workOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create work order error:', error);

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

export const GET = withAuth(getWorkOrders);
export const POST = withAuth(createWorkOrder);
