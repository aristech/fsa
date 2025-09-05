import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { Tenant, Skill } from 'src/lib/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenantId');
    const tenantSlug = searchParams.get('tenantSlug');

    let tenantId = tenantIdParam || '';
    if (!tenantId) {
      if (tenantSlug) {
        const t = await Tenant.findOne({ slug: tenantSlug });
        if (t) tenantId = String(t._id);
      }
    }
    if (!tenantId) {
      const t = await Tenant.findOne();
      if (t) tenantId = String(t._id);
    }
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 400 });
    }

    const skills = await Skill.find({ tenantId }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: skills });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}
