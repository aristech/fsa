import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { User, Tenant } from 'src/lib/models';
import { hashPassword, generateToken } from 'src/lib/auth/jwt';

// ----------------------------------------------------------------------

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, phone, tenantSlug } = signUpSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find tenant
    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant or tenant is inactive' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      tenantId: tenant._id.toString(),
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      tenantId: tenant._id.toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'customer', // Default role for new signups
      permissions: [],
    });

    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Return user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      permissions: user.permissions,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userData,
          token,
        },
        accessToken: token, // For Minimals UI compatibility
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Sign-up error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
