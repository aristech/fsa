import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { ApiKey } from "../models/ApiKey";
import { User } from "../models/User";
import { Personnel } from "../models/Personnel";
import { Role } from "../models/Role";
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
        .populate({
          path: 'personnelId',
          populate: [
            { path: 'userId', select: 'firstName lastName email' },
            { path: 'roleId', select: 'name permissions' }
          ]
        })
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
        .populate('userId', 'firstName lastName email')
        .populate({
          path: 'personnelId',
          populate: [
            { path: 'userId', select: 'firstName lastName email' },
            { path: 'roleId', select: 'name permissions' }
          ]
        });

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
        personnelId: string; // Required - personnel to create key for
        expiresAt?: string;
        rateLimitPerHour?: number;
      };

      // Validate and fetch personnel
      const personnel = await Personnel.findOne({
        _id: keyData.personnelId,
        tenantId: tenant._id
      }).populate('roleId', 'name permissions').populate('userId', 'firstName lastName email');

      if (!personnel) {
        reply.status(404).send({
          success: false,
          error: "Personnel not found",
        });
        return;
      }

      // Check if user has permission to create API keys for this personnel
      // Allow if it's for themselves or if they have admin permissions
      if (personnel.userId.toString() !== user.id) {
        if (!user.permissions.includes('*') && !user.permissions.includes('users.write')) {
          reply.status(403).send({
            success: false,
            error: "Insufficient permissions to create API keys for other personnel",
          });
          return;
        }
      }

      // Derive permissions from personnel's role
      let permissions: string[] = [];
      if (personnel.roleId && (personnel.roleId as any).permissions) {
        permissions = (personnel.roleId as any).permissions;
      } else {
        // Fallback to basic permissions if no role
        permissions = ['work_orders.read', 'tasks.read'];
      }

      // Validate that derived permissions are valid API permissions
      const validPermissions = permissions.filter(
        permission => API_PERMISSIONS.includes(permission as any)
      );

      if (validPermissions.length === 0) {
        reply.status(400).send({
          success: false,
          error: "Personnel role has no valid API permissions",
        });
        return;
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
        personnelId: keyData.personnelId,
        userId: personnel.userId._id, // Keep for backward compatibility
        name: keyData.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: validPermissions,
        expiresAt,
        rateLimitPerHour: keyData.rateLimitPerHour ?? 1000,
        usageCount: 0,
        isActive: true,
      });

      await apiKey.save();

      // Populate personnel and user info for response
      await apiKey.populate({
        path: 'personnelId',
        populate: [
          { path: 'userId', select: 'firstName lastName email' },
          { path: 'roleId', select: 'name permissions' }
        ]
      });

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
        expiresAt?: string;
        rateLimitPerHour?: number;
        isActive?: boolean;
      };

      // Permissions are derived from personnel role and cannot be updated directly

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
      // Check both userId (legacy) and personnelId (new)
      let isOwner = existingApiKey.userId === user.id;

      if (!isOwner && existingApiKey.personnelId) {
        // Check if current user is the personnel linked to this API key
        const linkedPersonnel = await Personnel.findOne({
          _id: existingApiKey.personnelId,
          userId: user.id,
          tenantId: tenant._id
        });
        isOwner = !!linkedPersonnel;
      }

      if (!isOwner) {
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
      ).select('-keyHash')
       .populate('userId', 'firstName lastName email')
       .populate({
         path: 'personnelId',
         populate: [
           { path: 'userId', select: 'firstName lastName email' },
           { path: 'roleId', select: 'name permissions' }
         ]
       });

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
      // Check both userId (legacy) and personnelId (new)
      let isOwner = existingApiKey.userId === user.id;

      if (!isOwner && existingApiKey.personnelId) {
        // Check if current user is the personnel linked to this API key
        const linkedPersonnel = await Personnel.findOne({
          _id: existingApiKey.personnelId,
          userId: user.id,
          tenantId: tenant._id
        });
        isOwner = !!linkedPersonnel;
      }

      if (!isOwner) {
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
      // Check both userId (legacy) and personnelId (new)
      let isOwner = apiKey.userId === user.id;

      if (!isOwner && apiKey.personnelId) {
        // Check if current user is the personnel linked to this API key
        const linkedPersonnel = await Personnel.findOne({
          _id: apiKey.personnelId,
          userId: user.id,
          tenantId: tenant._id
        });
        isOwner = !!linkedPersonnel;
      }

      if (!isOwner) {
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
        .populate('userId', 'firstName lastName email')
        .populate({
          path: 'personnelId',
          populate: [
            { path: 'userId', select: 'firstName lastName email' },
            { path: 'roleId', select: 'name permissions' }
          ]
        });

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