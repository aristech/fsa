import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { Customer } from 'src/lib/models';
import { withAuth, type AuthenticatedRequest } from 'src/lib/auth/middleware';

// ----------------------------------------------------------------------

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().default('US'),
  }),
  billingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string(),
    })
    .optional(),
  contactPerson: z
    .object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
});

// ----------------------------------------------------------------------

const getCustomers = async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    await connectDB();

    // Build filter
    const filter: any = { tenantId: req.user.tenantId, isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    // Get customers with pagination
    const skip = (page - 1) * limit;
    const customers = await Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit);

    const total = await Customer.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

// ----------------------------------------------------------------------

const createCustomer = async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validatedData = createCustomerSchema.parse(body);

    await connectDB();

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      email: validatedData.email.toLowerCase(),
      tenantId: req.user.tenantId,
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer already exists with this email' },
        { status: 400 }
      );
    }

    // Create customer
    const customer = new Customer({
      ...validatedData,
      tenantId: req.user.tenantId,
      email: validatedData.email.toLowerCase(),
    });

    await customer.save();

    return NextResponse.json(
      {
        success: true,
        data: customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer error:', error);

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

export const GET = withAuth(getCustomers);
export const POST = withAuth(createCustomer);
