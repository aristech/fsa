import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';

import { User, Role, Personnel, Tenant } from 'src/lib/models';

// ----------------------------------------------------------------------

const createPersonnelSchema = z.object({
  // Either supply userId or (name + email) to create a user
  userId: z.string().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  notes: z.string().optional(),
  availability: z
    .object({
      monday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      tuesday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      wednesday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      thursday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      friday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      saturday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
      sunday: z.object({ start: z.string(), end: z.string(), available: z.boolean() }),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

// Allow partial updates on PUT
const updatePersonnelSchema = createPersonnelSchema.partial();

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const roleId = searchParams.get('roleId');
    const q = (searchParams.get('q') || '').trim();
    const statusParam = searchParams.get('status'); // active|pending|inactive|banned|all
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    // Resolve tenant from params: tenantId or tenantSlug, else first tenant
    const tenantIdParam = searchParams.get('tenantId');
    const tenantSlug = searchParams.get('tenantSlug');
    let tenantId: string | undefined = tenantIdParam || undefined;
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

    if (id) {
      const one = await Personnel.findById(id)
        .populate('userId', 'firstName lastName email phone')
        .populate('roleId', 'name color');
      if (!one) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

      const obj: any = one.toObject();
      if (obj.userId && typeof obj.userId === 'object') {
        const first = obj.userId.firstName || '';
        const last = obj.userId.lastName || '';
        const full = `${first} ${last}`.trim();
        obj.userId = {
          _id: obj.userId._id,
          email: obj.userId.email,
          phone: obj.userId.phone,
          name: obj.userId.name || full,
        };
      }

      return NextResponse.json({ success: true, data: obj });
    }

    const query: any = { tenantId };
    if (!includeInactive) {
      query.isActive = true;
    }
    if (roleId) {
      query.roleId = roleId;
    }
    if (statusParam && statusParam !== 'all') {
      if (statusParam === 'active') {
        query.$or = [
          { status: 'active' },
          { $and: [{ status: { $exists: false } }, { isActive: true }] },
        ];
      } else if (statusParam === 'inactive') {
        query.$or = [
          { status: 'inactive' },
          { $and: [{ status: { $exists: false } }, { isActive: false }] },
        ];
      } else {
        query.status = statusParam;
      }
    }

    let regex: RegExp | undefined;
    let userIds: any[] = [];
    if (q) {
      regex = new RegExp(q, 'i');
      const matchUsers = await User.find({
        tenantId,
        $or: [{ email: regex }, { firstName: regex }, { lastName: regex }],
      }).select('_id');
      userIds = matchUsers.map((u) => u._id);
      query.$or = [{ employeeId: regex }, { userId: { $in: userIds } }];
    }

    // Total across ALL personnel for this tenant (ignores active/role filters)
    const total = await Personnel.countDocuments({ tenantId });
    // Total matching current filters (if needed by client)
    const totalFiltered = await Personnel.countDocuments(query);

    const personnel = await Personnel.find(query)
      .populate('userId', 'firstName lastName email phone')
      .populate({ path: 'roleId', select: 'name color' })
      .sort({ employeeId: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get task/project counts for each personnel
    const { Task, Project } = await import('src/lib/models');

    const personnelWithCounts = await Promise.all(
      personnel.map(async (person) => {
        const uid = (person as any).userId?._id || (person as any).userId;
        const [taskCount, projectCount] = await Promise.all([
          Task.countDocuments({
            tenantId,
            $or: [{ assignedTo: uid }, { createdBy: uid }],
          }),
          Project.countDocuments({
            tenantId,
            $or: [{ managerId: uid }, { assignedTechnician: uid }],
          }),
        ]);

        const obj: any = person.toObject();
        if (obj.userId && typeof obj.userId === 'object') {
          const first = obj.userId.firstName || '';
          const last = obj.userId.lastName || '';
          const full = `${first} ${last}`.trim();
          obj.userId = {
            _id: obj.userId._id,
            email: obj.userId.email,
            phone: obj.userId.phone,
            name: obj.userId.name || full,
          };
        }

        return {
          ...obj,
          taskCount,
          projectCount,
          totalAssignments: taskCount + projectCount,
        };
      })
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasPrev = page > 1 && totalPages > 0;
    const hasNext = totalPages > 0 && page < totalPages;
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = total === 0 ? 0 : Math.min(page * limit, total);
    const url = new URL(request.url);
    const base = `${url.origin}/api/v1/personnel/`;
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));
    if (includeInactive) queryParams.set('includeInactive', 'true');
    if (roleId) queryParams.set('roleId', roleId);
    const prevParams = new URLSearchParams(queryParams.toString());
    prevParams.set('page', String(page - 1));
    const nextParams = new URLSearchParams(queryParams.toString());
    nextParams.set('page', String(page + 1));
    // Adjust next page based on actual current-page count
    const count = personnelWithCounts.length;
    let adjustedHasNext = hasNext;
    let adjustedNextPage = hasNext ? `${base}?${nextParams.toString()}` : null;
    if (count < limit || from === to) {
      adjustedHasNext = false;
      adjustedNextPage = null;
    }

    const baseCountsMatch: any = { tenantId };
    if (roleId) baseCountsMatch.roleId = roleId as any;
    if (q && regex) baseCountsMatch.$or = [{ employeeId: regex }, { userId: { $in: userIds } }];

    const statusCountsAgg = await Personnel.aggregate([
      { $match: baseCountsMatch },
      {
        $addFields: {
          computedStatus: {
            $ifNull: ['$status', { $cond: [{ $eq: ['$isActive', true] }, 'active', 'inactive'] }],
          },
        },
      },
      { $group: { _id: '$computedStatus', count: { $sum: 1 } } },
    ]);
    const statusCounts = statusCountsAgg.reduce((acc: any, cur: any) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    const meta = {
      page,
      limit,
      total,
      totalFiltered,
      totalPages,
      count,
      from,
      to,
      hasPrev,
      hasNext: adjustedHasNext,
      prevPage: hasPrev ? `${base}?${prevParams.toString()}` : null,
      nextPage: adjustedNextPage,
      statusCounts: {
        active: statusCounts.active || 0,
        pending: statusCounts.pending || 0,
        inactive: statusCounts.inactive || 0,
        banned: statusCounts.banned || 0,
        all: total,
      },
    };

    return NextResponse.json({ success: true, data: personnelWithCounts, meta });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch personnel' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPersonnelSchema.parse(body);
    // Resolve tenant from params: tenantId or tenantSlug, else first tenant
    const { searchParams } = new URL(request.url);
    let tenantId: string | undefined = searchParams.get('tenantId') || undefined;
    const tenantSlug = searchParams.get('tenantSlug');
    if (!tenantId && tenantSlug) {
      const t = await Tenant.findOne({ slug: tenantSlug });
      if (t) tenantId = String(t._id);
    }
    if (!tenantId) {
      const t = await Tenant.findOne();
      if (t) tenantId = String(t._id);
    }
    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'Tenant not found' }, { status: 400 });
    }

    // Resolve or create user
    let userId = validatedData.userId as any;
    if (!userId) {
      if (!validatedData.name || !validatedData.email) {
        return NextResponse.json(
          { success: false, message: 'Name and email are required when userId is not provided' },
          { status: 400 }
        );
      }

      const [firstName, ...rest] = validatedData.name.split(' ');
      const lastName = rest.join(' ') || 'User';

      // Try find existing user by email within tenant
      let user = await User.findOne({ tenantId, email: validatedData.email });
      if (!user) {
        user = await User.create({
          tenantId,
          email: validatedData.email,
          password: 'password123',
          firstName,
          lastName,
          phone: validatedData.phone,
          role: 'technician',
          permissions: [],
          isActive: true,
        });
      }
      userId = user._id;
    } else {
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 400 });
      }
    }

    // Generate employeeId if missing
    let employeeId = validatedData.employeeId;
    if (!employeeId) {
      let unique = false;
      while (!unique) {
        const idCandidate = `EMP-${Math.floor(Math.random() * 900000 + 100000)}`;
        // eslint-disable-next-line no-await-in-loop
        const exists = await Personnel.findOne({ tenantId, employeeId: idCandidate });
        if (!exists) {
          employeeId = idCandidate;
          unique = true;
        }
      }
    } else {
      const existingPersonnel = await Personnel.findOne({ tenantId, employeeId });
      if (existingPersonnel) {
        return NextResponse.json(
          { success: false, message: 'Employee ID already exists' },
          { status: 400 }
        );
      }
    }

    // Check if role exists (if provided) and belongs to tenant
    if (validatedData.roleId) {
      const role = await Role.findById(validatedData.roleId);
      if (!role) {
        return NextResponse.json({ success: false, message: 'Role not found' }, { status: 400 });
      }
      if (String(role.tenantId) !== String(tenantId)) {
        return NextResponse.json(
          { success: false, message: 'Role belongs to a different tenant' },
          { status: 400 }
        );
      }
    }

    const personnel = new Personnel({
      ...validatedData,
      employeeId,
      userId,
      tenantId,
      isActive: true,
    });

    await personnel.save();

    // Populate and normalize the response
    const populatedPersonnel = await Personnel.findById(personnel._id)
      .populate('userId', 'firstName lastName email phone')
      .populate('roleId', 'name color');

    let responseData: any = populatedPersonnel;
    if (populatedPersonnel) {
      const obj: any = populatedPersonnel.toObject();
      if (obj.userId && typeof obj.userId === 'object') {
        const first = obj.userId.firstName || '';
        const last = obj.userId.lastName || '';
        const full = `${first} ${last}`.trim();
        obj.userId = {
          _id: obj.userId._id,
          email: obj.userId.email,
          phone: obj.userId.phone,
          name: obj.userId.name || full,
        };
      }
      responseData = obj;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Personnel created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create personnel' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });

    const rawBody = await request.json();
    const payload = updatePersonnelSchema.parse(rawBody);

    // Load current personnel to resolve tenant/user linkage
    const current = await Personnel.findById(id);
    if (!current)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    const tenantId = String(current.tenantId);

    // If role change requested, validate role exists and belongs to same tenant
    if (payload.roleId) {
      const role = await Role.findById(payload.roleId as string);
      if (!role) {
        return NextResponse.json({ success: false, message: 'Role not found' }, { status: 400 });
      }
      if (String(role.tenantId) !== String(tenantId)) {
        return NextResponse.json(
          { success: false, message: 'Role belongs to a different tenant' },
          { status: 400 }
        );
      }
    }

    // Determine linked user to update (allow switching userId)
    let linkedUserId: string = payload.userId || String(current.userId);
    if (payload.userId) {
      const u = await User.findById(payload.userId);
      if (!u)
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 400 });
    }

    // Update linked user fields if provided
    if (payload.name || payload.email || payload.phone) {
      const updateUser: any = {};
      if (payload.name) {
        const [firstName, ...rest] = payload.name.split(' ');
        const lastName = rest.join(' ') || '';
        updateUser.firstName = firstName;
        updateUser.lastName = lastName;
      }
      if (payload.email) updateUser.email = payload.email;
      if (payload.phone) updateUser.phone = payload.phone;
      if (Object.keys(updateUser).length > 0) {
        await User.findByIdAndUpdate(linkedUserId, { $set: updateUser });
      }
    }

    // Build personnel update payload with only allowed fields
    const personnelUpdate: Record<string, unknown> = {};
    const assignIfPresent = (key: keyof typeof payload) => {
      const value = payload[key];
      if (value !== undefined) {
        personnelUpdate[String(key)] = value as unknown;
      }
    };
    assignIfPresent('userId');
    assignIfPresent('roleId');
    assignIfPresent('skills');
    assignIfPresent('certifications');
    assignIfPresent('hourlyRate');
    assignIfPresent('notes');
    assignIfPresent('availability');
    assignIfPresent('location');

    const updated = await Personnel.findByIdAndUpdate(id, { $set: personnelUpdate }, { new: true })
      .populate('userId', 'firstName lastName email phone')
      .populate('roleId', 'name color');

    if (!updated)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    const obj: any = updated.toObject();
    if (obj.userId && typeof obj.userId === 'object') {
      const first = obj.userId.firstName || '';
      const last = obj.userId.lastName || '';
      const full = `${first} ${last}`.trim();
      obj.userId = {
        _id: obj.userId._id,
        email: obj.userId.email,
        phone: obj.userId.phone,
        name: obj.userId.name || full,
      };
    }

    return NextResponse.json({ success: true, data: obj });
  } catch (error) {
    console.error('Error updating personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update personnel' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Missing id' }, { status: 400 });

    const deleted = await Personnel.findByIdAndDelete(id);

    if (!deleted)
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting personnel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete personnel' },
      { status: 500 }
    );
  }
}
