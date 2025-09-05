import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { User, Tenant } from 'src/lib/models';
import { verifyToken } from 'src/lib/auth/jwt';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    // Connect to database
    await connectDB();

    // Get user and tenant data
    const user = await User.findOne({
      _id: payload.userId,
      tenantId: payload.tenantId,
      isActive: true,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const tenant = await Tenant.findById(payload.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 401 });
    }

    // Return user data in the format expected by Minimals UI
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions || [],
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
      avatar: user.avatar || '',
      displayName: `${user.firstName} ${user.lastName}`,
    };

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
      },
    });
  } catch (error) {
    console.error('Error in /api/v1/auth/me:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
