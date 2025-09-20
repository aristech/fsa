import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { ApiKey } from "../models/ApiKey";
import { User } from "../models/User";
import { API_PERMISSIONS } from "../middleware/api-key-auth";
import { AuthenticatedRequest } from "../types";

// ----------------------------------------------------------------------

export async function apiKeyRoutes(fastify: FastifyInstance) {

  // Get all API keys for the current tenant
  fastify.get("/", {
    preHandler: [authenticate, requirePermission("webhooks.read")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;

      const apiKeys = await ApiKey.find({ tenantId: tenant._id })
        .select('-keyHash') // Don't expose key hashes
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 });

      reply.send({
        success: true,
        data: apiKeys,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get a specific API key
  fastify.get("/:id", {
    preHandler: [authenticate, requirePermission("webhooks.read")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };

      const apiKey = await ApiKey.findOne({ _id: id, tenantId: tenant._id })
        .select('-keyHash')
        .populate('userId', 'firstName lastName email');

      if (!apiKey) {
        reply.status(404).send({
          success: false,
          error: "API key not found",
        });
        return;
      }

      reply.send({
        success: true,
        data: apiKey,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Create a new API key
  fastify.post("/", {
    preHandler: [authenticate, requirePermission("webhooks.write")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const keyData = request.body as {
        name: string;
        permissions: string[];
        expiresAt?: string;
        rateLimitPerHour?: number;
        userId?: string; // Allow creating keys for other users (admin only)
      };

      // Validate permissions
      const invalidPermissions = keyData.permissions.filter(
        permission => !API_PERMISSIONS.includes(permission as any)
      );

      if (invalidPermissions.length > 0) {
        reply.status(400).send({
          success: false,
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          validPermissions: API_PERMISSIONS,
        });
        return;
      }

      // Check if user is trying to create key for another user
      let targetUserId = user.id;
      if (keyData.userId && keyData.userId !== user.id) {
        // Only allow if user has admin permissions
        if (!user.permissions.includes('*') && !user.permissions.includes('users.write')) {
          reply.status(403).send({
            success: false,
            error: "Insufficient permissions to create API keys for other users",
          });
          return;
        }

        // Verify target user exists and belongs to same tenant
        const targetUser = await User.findOne({ _id: keyData.userId, tenantId: tenant._id });
        if (!targetUser) {
          reply.status(404).send({
            success: false,
            error: "Target user not found",
          });
          return;
        }

        targetUserId = keyData.userId;
      }

      // Generate API key
      const { key, hash, prefix } = ApiKey.generateApiKey();

      // Parse expiration date if provided
      let expiresAt: Date | undefined;
      if (keyData.expiresAt) {
        expiresAt = new Date(keyData.expiresAt);
        if (isNaN(expiresAt.getTime())) {
          reply.status(400).send({
            success: false,
            error: "Invalid expiration date format",
          });
          return;
        }

        // Don't allow expiration in the past
        if (expiresAt <= new Date()) {
          reply.status(400).send({
            success: false,
            error: "Expiration date must be in the future",
          });
          return;
        }
      }

      const apiKey = new ApiKey({
        tenantId: tenant._id,
        userId: targetUserId,
        name: keyData.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: keyData.permissions,
        expiresAt,
        rateLimitPerHour: keyData.rateLimitPerHour ?? 1000,
        usageCount: 0,
        isActive: true,
      });

      await apiKey.save();

      // Populate user info for response
      await apiKey.populate('userId', 'firstName lastName email');

      // Return API key without hash, but include the plaintext key once
      const responseData = apiKey.toObject();
      delete (responseData as any).keyHash;

      reply.status(201).send({
        success: true,
        data: responseData,
        apiKey: key, // Only returned once during creation
        message: "API key created successfully. Store it securely - it won't be shown again.",
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Update an API key
  fastify.put("/:id", {
    preHandler: [authenticate, requirePermission("webhooks.write")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const { id } = request.params as { id: string };
      const updateData = request.body as {
        name?: string;
        permissions?: string[];
        expiresAt?: string;
        rateLimitPerHour?: number;
        isActive?: boolean;
      };

      // Validate permissions if provided
      if (updateData.permissions) {
        const invalidPermissions = updateData.permissions.filter(
          permission => !API_PERMISSIONS.includes(permission as any)
        );

        if (invalidPermissions.length > 0) {
          reply.status(400).send({
            success: false,
            error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
            validPermissions: API_PERMISSIONS,
          });
          return;
        }
      }

      // Parse expiration date if provided
      let updateFields: any = { ...updateData };
      if (updateData.expiresAt) {
        const expiresAt = new Date(updateData.expiresAt);
        if (isNaN(expiresAt.getTime())) {
          reply.status(400).send({
            success: false,
            error: "Invalid expiration date format",
          });
          return;
        }

        if (expiresAt <= new Date()) {
          reply.status(400).send({
            success: false,
            error: "Expiration date must be in the future",
          });
          return;
        }

        updateFields.expiresAt = expiresAt;
      }

      // Find the API key first to check ownership
      const existingApiKey = await ApiKey.findOne({ _id: id, tenantId: tenant._id });
      if (!existingApiKey) {
        reply.status(404).send({
          success: false,
          error: "API key not found",
        });
        return;
      }

      // Only allow updating own keys unless user has admin permissions
      if (existingApiKey.userId !== user.id) {
        if (!user.permissions.includes('*') && !user.permissions.includes('users.write')) {
          reply.status(403).send({
            success: false,
            error: "Insufficient permissions to update this API key",
          });
          return;
        }
      }

      const apiKey = await ApiKey.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true }
      ).select('-keyHash').populate('userId', 'firstName lastName email');

      reply.send({
        success: true,
        data: apiKey,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Delete an API key
  fastify.delete("/:id", {
    preHandler: [authenticate, requirePermission("webhooks.delete")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const { id } = request.params as { id: string };

      // Find the API key first to check ownership
      const existingApiKey = await ApiKey.findOne({ _id: id, tenantId: tenant._id });
      if (!existingApiKey) {
        reply.status(404).send({
          success: false,
          error: "API key not found",
        });
        return;
      }

      // Only allow deleting own keys unless user has admin permissions
      if (existingApiKey.userId !== user.id) {
        if (!user.permissions.includes('*') && !user.permissions.includes('users.write')) {
          reply.status(403).send({
            success: false,
            error: "Insufficient permissions to delete this API key",
          });
          return;
        }
      }

      await ApiKey.findByIdAndDelete(id);

      reply.send({
        success: true,
        message: "API key deleted successfully",
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get available permissions
  fastify.get("/permissions", {
    preHandler: [authenticate, requirePermission("webhooks.read")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      success: true,
      data: API_PERMISSIONS,
    });
  });

  // Get API key usage statistics
  fastify.get("/:id/usage", {
    preHandler: [authenticate, requirePermission("webhooks.read")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const { id } = request.params as { id: string };

      const apiKey = await ApiKey.findOne({ _id: id, tenantId: tenant._id })
        .select('name usageCount lastUsedAt rateLimitPerHour createdAt userId');

      if (!apiKey) {
        reply.status(404).send({
          success: false,
          error: "API key not found",
        });
        return;
      }

      // Only allow viewing own key stats unless user has admin permissions
      if (apiKey.userId !== user.id) {
        if (!user.permissions.includes('*') && !user.permissions.includes('users.read')) {
          reply.status(403).send({
            success: false,
            error: "Insufficient permissions to view this API key usage",
          });
          return;
        }
      }

      const stats = {
        totalUsage: apiKey.usageCount,
        lastUsedAt: apiKey.lastUsedAt,
        rateLimitPerHour: apiKey.rateLimitPerHour,
        createdAt: apiKey.createdAt,
        daysSinceCreation: Math.floor((Date.now() - apiKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        avgUsagePerDay: apiKey.usageCount > 0 && apiKey.createdAt ?
          Math.round(apiKey.usageCount / Math.max(1, Math.floor((Date.now() - apiKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)))) : 0,
      };

      reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Test API key (validate without incrementing usage)
  fastify.post("/:id/test", {
    preHandler: [authenticate, requirePermission("webhooks.read")]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };

      const apiKey = await ApiKey.findOne({ _id: id, tenantId: tenant._id })
        .select('-keyHash')
        .populate('userId', 'firstName lastName email');

      if (!apiKey) {
        reply.status(404).send({
          success: false,
          error: "API key not found",
        });
        return;
      }

      const status = {
        valid: true,
        active: apiKey.isActive,
        expired: apiKey.isExpired(),
        permissions: apiKey.permissions,
        rateLimitPerHour: apiKey.rateLimitPerHour,
        expiresAt: apiKey.expiresAt,
      };

      reply.send({
        success: true,
        data: status,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}