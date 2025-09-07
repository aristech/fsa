import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../types";
import { Tenant } from "../models";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // For now, we'll skip authentication and use mock data
    // Later this will be replaced with proper JWT verification

    // Mock user data
    const mockUser = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      name: "Test User",
      role: "admin",
    };

    // Get actual tenant from database
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      throw new Error("No active tenant found");
    }

    // Attach to request
    (request as AuthenticatedRequest).user = mockUser;
    (request as AuthenticatedRequest).tenant = tenant;
    (request as AuthenticatedRequest).context = {
      user: mockUser,
      tenant: tenant,
    };
  } catch (error) {
    reply.code(401).send({
      success: false,
      error: "Authentication failed",
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Optional authentication - doesn't fail if no token
    // This can be used for endpoints that work with or without auth

    // For now, we'll use mock data
    const mockUser = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      name: "Test User",
      role: "admin",
    };

    // Get actual tenant from database
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      throw new Error("No active tenant found");
    }

    (request as AuthenticatedRequest).user = mockUser;
    (request as AuthenticatedRequest).tenant = tenant;
    (request as AuthenticatedRequest).context = {
      user: mockUser,
      tenant: tenant,
    };
  } catch (error) {
    // Optional auth - don't fail, just continue without user context
    console.log("Optional auth failed:", error);
  }
}
