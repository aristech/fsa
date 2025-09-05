import type { NextRequest} from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { User, Tenant } from 'src/lib/models';
import { generateToken, comparePassword } from 'src/lib/auth/jwt';

// ----------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, tenantSlug } = signInSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find tenant
    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant or tenant is inactive' }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      tenantId: tenant._id.toString(),
      isActive: true,
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    user.lastLoginAt = new Date();
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

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token,
      },
      accessToken: token, // For Minimals UI compatibility
    });
  } catch (error) {
    console.error('Sign-in error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
