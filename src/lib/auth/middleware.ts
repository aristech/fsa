import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';

import connectDB from '../db';
import { User } from '../models';
import { verifyToken, type JWTPayload } from './jwt';

// ----------------------------------------------------------------------

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

// ----------------------------------------------------------------------

export const withAuth = (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const payload = verifyToken(token);

      // Connect to database
      await connectDB();

      // Verify user exists and is active
      const user = await User.findOne({
        _id: payload.userId,
        tenantId: payload.tenantId,
        isActive: true,
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
      }

      // Add user info to request
      (req as AuthenticatedRequest).user = payload;

      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };

// ----------------------------------------------------------------------

export const withRole = (allowedRoles: string[]) => (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => withAuth(async (req: AuthenticatedRequest) => {
      if (!allowedRoles.includes(req.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      return handler(req);
    });

// ----------------------------------------------------------------------

export const withTenant = (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => withAuth(async (req: AuthenticatedRequest) => 
    // Tenant ID is already verified in withAuth
    // Additional tenant-specific logic can be added here
     handler(req)
  );
