import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { User, Tenant } from 'src/lib/models';
import { hashPassword, generateToken } from 'src/lib/auth/jwt';

// ----------------------------------------------------------------------

const setupTenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  tenantSlug: z
    .string()
    .min(1, 'Tenant slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  adminFirstName: z.string().min(1, 'Admin first name is required'),
  adminLastName: z.string().min(1, 'Admin last name is required'),
  adminPhone: z.string().optional(),
});

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantName,
      tenantSlug,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      adminPhone,
    } = setupTenantSchema.parse(body);

    await connectDB();

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ slug: tenantSlug }, { email: adminEmail.toLowerCase() }],
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Tenant with this slug or email already exists' },
        { status: 400 }
      );
    }

    // Create tenant
    const tenant = new Tenant({
      name: tenantName,
      slug: tenantSlug,
      email: adminEmail.toLowerCase(),
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        workingHours: {
          start: '09:00',
          end: '17:00',
          days: [1, 2, 3, 4, 5], // Monday to Friday
        },
      },
      subscription: {
        plan: 'free',
        status: 'active',
        startDate: new Date(),
      },
    });

    await tenant.save();

    // Hash admin password
    const hashedPassword = await hashPassword(adminPassword);

    // Create admin user
    const adminUser = new User({
      tenantId: tenant._id.toString(),
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: adminPhone,
      role: 'admin',
      permissions: ['*'], // Admin has all permissions
    });

    await adminUser.save();

    // Generate token for admin
    const token = generateToken({
      userId: adminUser._id.toString(),
      tenantId: tenant._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
    });

    // Return tenant and admin data
    const tenantData = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      settings: tenant.settings,
      subscription: tenant.subscription,
    };

    const adminData = {
      id: adminUser._id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      phone: adminUser.phone,
      role: adminUser.role,
      permissions: adminUser.permissions,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          tenant: tenantData,
          admin: adminData,
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tenant setup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
