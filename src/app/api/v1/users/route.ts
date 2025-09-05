import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { User } from 'src/lib/models';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const tenantId = '68bacc230e20f67f2394e52f'; // Hardcoded for testing

    const users = await User.find({ tenantId })
      .select('_id firstName lastName email phone isActive role')
      .sort({ firstName: 1, lastName: 1 });

    const data = users.map((u) => ({
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      role: u.role,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}
