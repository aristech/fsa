import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { Tenant } from 'src/lib/models';

// ----------------------------------------------------------------------

export interface TenantContext {
  tenantId: string;
  tenant: any;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: any;
  tenant?: any;
  tenantId?: string;
}

// ----------------------------------------------------------------------

/**
 * Middleware to resolve tenant from request parameters
 * Can be used with or without authentication
 */
export function withTenantResolution() {
  return async (
    request: AuthenticatedRequest,
    handler: (req: AuthenticatedRequest, context: TenantContext) => Promise<NextResponse>
  ) => {
    try {
      const { searchParams } = new URL(request.url);

      // Try to get tenant from various sources in order of preference:
      // 1. Authenticated user's tenant
      // 2. tenantId query param
      // 3. tenantSlug query param
      // 4. First tenant in database (fallback)

      let tenantId: string | null = null;
      let tenant: any = null;

      // 1. From authenticated user
      if (request.user?.tenantId) {
        tenantId = request.user.tenantId;
        tenant = await Tenant.findById(tenantId);
      }

      // 2. From tenantId param
      if (!tenant) {
        const paramTenantId = searchParams.get('tenantId');
        if (paramTenantId) {
          tenant = await Tenant.findById(paramTenantId);
          if (tenant) tenantId = String(tenant._id);
        }
      }

      // 3. From tenantSlug param
      if (!tenant) {
        const tenantSlug = searchParams.get('tenantSlug');
        if (tenantSlug) {
          tenant = await Tenant.findOne({ slug: tenantSlug });
          if (tenant) tenantId = String(tenant._id);
        }
      }

      // 4. Fallback to first tenant
      if (!tenant) {
        tenant = await Tenant.findOne({ isActive: true });
        if (tenant) tenantId = String(tenant._id);
      }

      if (!tenant || !tenantId) {
        return NextResponse.json(
          { success: false, message: 'Tenant not found or not accessible' },
          { status: 400 }
        );
      }

      // Validate user has access to this tenant (if authenticated)
      if (request.user && request.user.tenantId !== tenantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied: User does not belong to this tenant' },
          { status: 403 }
        );
      }

      // Add tenant info to request
      request.tenant = tenant;
      request.tenantId = tenantId;

      return handler(request, { tenantId, tenant });
    } catch (error) {
      console.error('Tenant resolution error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to resolve tenant' },
        { status: 500 }
      );
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Middleware that requires tenant to be specified and validates access
 */
export function withRequiredTenant() {
  return async (
    request: AuthenticatedRequest,
    handler: (req: AuthenticatedRequest, context: TenantContext) => Promise<NextResponse>
  ) => {
    const { searchParams } = new URL(request.url);

    // Require explicit tenant specification
    const tenantIdParam = searchParams.get('tenantId');
    const tenantSlugParam = searchParams.get('tenantSlug');

    if (!tenantIdParam && !tenantSlugParam && !request.user?.tenantId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tenant must be specified (tenantId or tenantSlug parameter required)',
        },
        { status: 400 }
      );
    }

    return withTenantResolution()(request, handler);
  };
}

// ----------------------------------------------------------------------

/**
 * Utility to validate tenant scope for data operations
 */
export function validateTenantScope(dataItem: any, tenantId: string): boolean {
  if (!dataItem || !tenantId) return false;

  const itemTenantId = String(dataItem.tenantId || dataItem.tenant);
  return itemTenantId === tenantId;
}

// ----------------------------------------------------------------------

/**
 * Utility to add tenant scope to query filters
 */
export function addTenantScope(query: any, tenantId: string): any {
  return {
    ...query,
    tenantId,
  };
}
