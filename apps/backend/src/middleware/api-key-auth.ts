import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKey } from "../models/ApiKey";

// ----------------------------------------------------------------------

export interface ApiKeyRequest extends FastifyRequest {
  apiKey?: {
    _id: string;
    tenantId: string;
    userId: string;
    name: string;
    permissions: string[];
    rateLimitPerHour: number;
  };
}

// ----------------------------------------------------------------------

/**
 * Middleware to authenticate API key requests
 */
export async function authenticateApiKey(
  request: ApiKeyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Missing authorization header",
      });
      return;
    }

    // Extract API key from Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/);
    if (!match) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid authorization header format. Use 'Bearer <api_key>'",
      });
      return;
    }

    const apiKeyValue = match[1];

    // Validate API key format
    if (!apiKeyValue.startsWith('fsa_')) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid API key format",
      });
      return;
    }

    // Hash the API key for database lookup
    const keyHash = ApiKey.hashKey(apiKeyValue);
    const keyPrefix = apiKeyValue.substring(0, 7);

    // Find API key in database
    const apiKey = await ApiKey.findOne({
      keyHash,
      keyPrefix,
      isActive: true,
    }).select('-keyHash');

    if (!apiKey) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or inactive API key",
      });
      return;
    }

    // Check if API key is expired
    if (apiKey.isExpired()) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "API key has expired",
      });
      return;
    }

    // Check rate limit (simple hourly check)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (apiKey.lastUsedAt && apiKey.lastUsedAt > oneHourAgo) {
      // In a production environment, you'd want to implement proper rate limiting
      // using Redis or similar for distributed systems
      const hourlyUsage = await getHourlyUsage(apiKey._id);
      if (hourlyUsage >= apiKey.rateLimitPerHour) {
        reply.status(429).send({
          error: "Rate Limit Exceeded",
          message: `API key has exceeded the rate limit of ${apiKey.rateLimitPerHour} requests per hour`,
        });
        return;
      }
    }

    // Update usage statistics
    await ApiKey.findByIdAndUpdate(apiKey._id, {
      lastUsedAt: new Date(),
      $inc: { usageCount: 1 },
    });

    // Attach API key info to request
    request.apiKey = {
      _id: apiKey._id,
      tenantId: apiKey.tenantId,
      userId: apiKey.userId,
      name: apiKey.name,
      permissions: apiKey.permissions,
      rateLimitPerHour: apiKey.rateLimitPerHour,
    };

  } catch (error) {
    console.error("API key authentication error:", error);
    reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to authenticate API key",
    });
  }
}

// ----------------------------------------------------------------------

/**
 * Middleware to check API key permissions
 */
export function requireApiKeyPermission(permission: string) {
  return async function(request: ApiKeyRequest, reply: FastifyReply): Promise<void> {
    if (!request.apiKey) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "API key authentication required",
      });
      return;
    }

    const hasPermission = request.apiKey.permissions.includes('*') ||
                         request.apiKey.permissions.includes(permission);

    if (!hasPermission) {
      reply.status(403).send({
        error: "Forbidden",
        message: `API key lacks required permission: ${permission}`,
      });
      return;
    }
  };
}

// ----------------------------------------------------------------------

/**
 * Get hourly usage count for an API key
 * In production, this should use Redis or similar for performance
 */
async function getHourlyUsage(apiKeyId: string): Promise<number> {
  // This is a simplified implementation
  // In production, you'd want to use Redis with a sliding window
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const apiKey = await ApiKey.findById(apiKeyId);
  if (!apiKey || !apiKey.lastUsedAt || apiKey.lastUsedAt < oneHourAgo) {
    return 0;
  }

  // For simplicity, we'll assume each usage increments by 1
  // In production, you'd track actual request counts per hour
  return 1;
}

// ----------------------------------------------------------------------

// Available API permissions
export const API_PERMISSIONS = [
  // Work Orders
  'work_orders.read',
  'work_orders.write',
  'work_orders.delete',

  // Tasks
  'tasks.read',
  'tasks.write',
  'tasks.delete',

  // Clients
  'clients.read',
  'clients.write',
  'clients.delete',

  // Users
  'users.read',
  'users.write',
  'users.delete',

  // Calendar
  'calendar.read',
  'calendar.write',
  'calendar.delete',

  // Reports
  'reports.read',

  // Webhooks
  'webhooks.read',
  'webhooks.write',
  'webhooks.delete',

  // All permissions
  '*',
] as const;

export type ApiPermission = typeof API_PERMISSIONS[number];