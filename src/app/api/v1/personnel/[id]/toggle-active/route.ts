import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { Tenant, Personnel } from 'src/lib/models';

// ----------------------------------------------------------------------

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Personnel ID is required' },
        { status: 400 }
      );
    }

    // Get tenant ID from the first tenant (for demo purposes)
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return NextResponse.json({ message: 'No active tenant found' }, { status: 404 });
    }
    const tenantId = tenant._id.toString();

    // Find the personnel record
    const personnel = await Personnel.findOne({
      _id: id,
      tenantId,
    });

    if (!personnel) {
      return NextResponse.json({ success: false, message: 'Personnel not found' }, { status: 404 });
    }

    // Toggle the active status
    const newActiveStatus = !personnel.isActive;
    await Personnel.findByIdAndUpdate(id, { isActive: newActiveStatus });

    // Return the updated status
    return NextResponse.json({
      success: true,
      data: {
        id: personnel._id,
        isActive: newActiveStatus,
      },
      message: `Personnel ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling personnel active status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to toggle personnel status' },
      { status: 500 }
    );
  }
}
