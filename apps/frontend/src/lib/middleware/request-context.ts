import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import connectDB from 'src/lib/db';
import { verifyToken } from 'src/lib/auth/jwt';
import { User, Tenant, Client } from 'src/lib/models';

// ----------------------------------------------------------------------

export interface RequestContext {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    isActive: boolean;
  };
  tenant: {
    _id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
  client?: {
    _id: string;
    name: string;
    email: string;
    company?: string;
  };
  filters: {
    clientId?: string;
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
}

// ----------------------------------------------------------------------

export interface RequestContextMiddlewareOptions {
  requireAuth?: boolean;
  requireClient?: boolean;
  allowedRoles?: string[];
}

// ----------------------------------------------------------------------

export function withRequestContext(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>,
  options: RequestContextMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      console.log('Middleware: Starting request processing');
      const { requireAuth = true, requireClient = false, allowedRoles } = options;

      // Connect to database
      console.log('Middleware: Connecting to database');
      await connectDB();
      console.log('Middleware: Database connected');

      // 1. Extract and verify authentication
      let user = null;
      if (requireAuth) {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        try {
          const payload = verifyToken(token);
          user = await User.findById(payload.userId).select(
            '_id email firstName lastName role tenantId isActive'
          );

          if (!user || !user.isActive) {
            return NextResponse.json({ error: 'Invalid or inactive user' }, { status: 401 });
          }
        } catch (error) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
      }

      // 2. Resolve tenant from user
      let tenant = null;
      if (user) {
        tenant = await Tenant.findById(user.tenantId).select('_id name slug isActive');
        if (!tenant || !tenant.isActive) {
          return NextResponse.json({ error: 'Invalid or inactive tenant' }, { status: 403 });
        }
      }

      // 3. Check role permissions
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // 4. Extract client filter from query parameters
      const { searchParams } = new URL(request.url);
      const clientId = searchParams.get('clientId');

      let client = null;
      if (clientId) {
        if (requireClient) {
          client = await Client.findOne({
            _id: clientId,
            tenantId: tenant._id,
            isActive: true,
          }).select('_id name email company');

          if (!client) {
            return NextResponse.json({ error: 'Client not found or inactive' }, { status: 404 });
          }
        } else {
          // Optional client - just validate it exists and belongs to tenant
          const clientExists = await Client.findOne({
            _id: clientId,
            tenantId: tenant._id,
            isActive: true,
          }).select('_id name email company');

          if (clientExists) {
            client = clientExists;
          }
        }
      }

      // 5. Extract other filters
      const start = searchParams.get('start');
      const end = searchParams.get('end');

      const filters = {
        clientId: clientId || undefined,
        dateRange: {
          start: start || undefined,
          end: end || undefined,
        },
      };

      // 6. Build request context
      const context: RequestContext = {
        user: user
          ? {
              _id: user._id.toString(),
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              tenantId: user.tenantId.toString(),
              isActive: user.isActive,
            }
          : null,
        tenant: tenant
          ? {
              _id: tenant._id.toString(),
              name: tenant.name,
              slug: tenant.slug,
              isActive: tenant.isActive,
            }
          : null,
        client: client
          ? {
              _id: client._id.toString(),
              name: client.name,
              email: client.email,
              company: client.company,
            }
          : undefined,
        filters,
      };

      // 7. Call the actual handler with context
      return await handler(request, context);
    } catch (error) {
      console.error('Request context middleware error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

// ----------------------------------------------------------------------

// Helper function to build MongoDB filters based on context
export function buildFilters(context: RequestContext) {
  const { tenant, client, filters } = context;

  const baseFilter: any = {
    tenantId: tenant._id,
  };

  // Add client filter if specified
  if (client) {
    baseFilter.clientId = client._id;
  }

  // Add date range filters if specified
  const dateFilters: any = {};
  if (filters.dateRange.start) {
    dateFilters.$gte = new Date(filters.dateRange.start);
  }
  if (filters.dateRange.end) {
    dateFilters.$lte = new Date(filters.dateRange.end);
  }

  return {
    baseFilter,
    dateFilters: Object.keys(dateFilters).length > 0 ? dateFilters : null,
  };
}

// ----------------------------------------------------------------------

// Helper function to get related entity IDs for filtering
export async function getRelatedEntityIds(
  context: RequestContext,
  entityType: 'projects' | 'workOrders'
): Promise<string[]> {
  const { tenant, client } = context;

  if (!client) {
    return [];
  }

  let entityIds: string[] = [];

  if (entityType === 'projects') {
    const { Project } = await import('src/lib/models');
    const projects = await Project.find({
      tenantId: tenant._id,
      clientId: client._id,
    }).select('_id');
    entityIds = projects.map((p) => p._id.toString());
  } else if (entityType === 'workOrders') {
    const { WorkOrder } = await import('src/lib/models');
    const workOrders = await WorkOrder.find({
      tenantId: tenant._id,
      clientId: client._id,
    }).select('_id');
    entityIds = workOrders.map((wo) => wo._id.toString());
  }

  return entityIds;
}
