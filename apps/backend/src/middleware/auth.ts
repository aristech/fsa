import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { Tenant, User } from "../models";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from Authorization header
    const token = request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.code(401).send({
        success: false,
        message: "No token provided",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as any;

    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return reply.code(401).send({
        success: false,
        message: "User not found",
      });
    }

    // Get tenant from database
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      return reply.code(500).send({
        success: false,
        message: "No active tenant found",
      });
    }

    // Attach to request
    (request as AuthenticatedRequest).user = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    (request as AuthenticatedRequest).tenant = tenant;
    (request as AuthenticatedRequest).context = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: tenant,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return reply.code(401).send({
      success: false,
      message: "Authentication failed",
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

    // Get token from Authorization header
    const token = request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      // No token provided - continue without user context
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    ) as any;

    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      // User not found - continue without user context
      return;
    }

    // Get tenant from database
    const tenant = await Tenant.findOne({ isActive: true });
    if (!tenant) {
      // No tenant found - continue without user context
      return;
    }

    // Attach to request
    (request as AuthenticatedRequest).user = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    (request as AuthenticatedRequest).tenant = tenant;
    (request as AuthenticatedRequest).context = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: tenant,
    };
  } catch (error) {
    // Optional auth - don't fail, just continue without user context
    console.log("Optional auth failed:", error);
  }
}
