import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PermissionService } from "../services/permission-service";
import { createPermissionGuard } from "../middleware/permission-guard";
import { authenticate } from "../middleware/auth";

// ----------------------------------------------------------------------

// Permission check schema
const permissionCheckSchema = z.object({
  permission: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  requireAll: z.boolean().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
});

// ----------------------------------------------------------------------

export async function permissionRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/permissions - Get all available permissions
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const permissions = PermissionService.getAllPermissions();
      const permissionsByCategory =
        PermissionService.getPermissionsByCategory();

      return reply.send({
        success: true,
        data: {
          permissions,
          permissionsByCategory,
        },
        message: "Permissions retrieved successfully",
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching permissions");
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch permissions",
      });
    }
  });

  // GET /api/v1/permissions/user/:userId - Get user's permissions
  fastify.get(
    "/user/:userId",
    {
      preHandler: createPermissionGuard({
        permission: "admin.access",
        allowTenantOwner: true,
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const currentUser = (request as any).user;

        // Users can only check their own permissions unless they're admin
        if (currentUser.userId !== userId && !currentUser.isTenantOwner) {
          const hasAdminAccess = await PermissionService.hasPermissionAsync(
            currentUser.userId,
            "admin.access"
          );
          if (!hasAdminAccess.hasPermission) {
            return reply.status(403).send({
              success: false,
              message: "You can only view your own permissions",
            });
          }
        }

        const context = await PermissionService.getUserPermissionContext(
          userId
        );
        if (!context) {
          return reply.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        return reply.send({
          success: true,
          data: {
            userId: context.userId,
            tenantId: context.tenantId,
            role: context.role,
            permissions: context.permissions,
            isTenantOwner: context.isTenantOwner,
          },
          message: "User permissions retrieved successfully",
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error fetching user permissions");
        return reply.status(500).send({
          success: false,
          message: "Failed to fetch user permissions",
        });
      }
    }
  );

  // POST /api/v1/permissions/check - Check if user has specific permissions
  fastify.post(
    "/check",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = permissionCheckSchema.parse(request.body);
        const user = (request as any).user;

        if (!user || !user.id) {
          return reply.status(401).send({
            success: false,
            message: "Authentication required",
          });
        }

        let result;

        if (validatedData.permission) {
          result = await PermissionService.hasPermissionAsync(
            user.id,
            validatedData.permission
          );
        } else if (
          validatedData.permissions &&
          validatedData.permissions.length > 0
        ) {
          result = validatedData.requireAll
            ? await PermissionService.hasAllPermissions(
                user.id,
                validatedData.permissions
              )
            : await PermissionService.hasAnyPermission(
                user.id,
                validatedData.permissions
              );
        } else if (validatedData.resource && validatedData.action) {
          result = await PermissionService.canAccessResource(
            user.id,
            validatedData.resource,
            validatedData.action
          );
        } else {
          return reply.status(400).send({
            success: false,
            message: "Invalid permission check request",
          });
        }

        return reply.send({
          success: true,
          data: result,
          message: "Permission check completed",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Validation error",
            errors: error.issues,
          });
        }

        fastify.log.error(error as Error, "Error checking permissions");
        return reply.status(500).send({
          success: false,
          message: "Failed to check permissions",
        });
      }
    }
  );

  // GET /api/v1/permissions/me - Get current user's permissions
  fastify.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.id) {
        return reply.status(401).send({
          success: false,
          message: "Authentication required",
        });
      }

      const context = await PermissionService.getUserPermissionContext(user.id);
      if (!context) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      return reply.send({
        success: true,
        data: {
          userId: context.userId,
          tenantId: context.tenantId,
          role: context.role,
          permissions: context.permissions,
          isTenantOwner: context.isTenantOwner,
        },
        message: "User permissions retrieved successfully",
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching current user permissions");
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch user permissions",
      });
    }
  });

  // POST /api/v1/permissions/validate - Validate permission format
  fastify.post(
    "/validate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { permission } = request.body as { permission: string };

        if (!permission) {
          return reply.status(400).send({
            success: false,
            message: "Permission is required",
          });
        }

        const isValid = PermissionService.isValidPermission(permission);

        return reply.send({
          success: true,
          data: {
            permission,
            isValid,
          },
          message: isValid
            ? "Permission format is valid"
            : "Permission format is invalid",
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error validating permission");
        return reply.status(500).send({
          success: false,
          message: "Failed to validate permission",
        });
      }
    }
  );
}
