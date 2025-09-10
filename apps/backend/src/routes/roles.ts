import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Role, Tenant, Personnel } from "../models";
import { slugify } from "../utils/slugify";
import {
  requirePermission,
  requireAnyPermission,
} from "../middleware/permission-guard";
import { PermissionService } from "../services/permission-service";

// Role creation schema
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name must be less than 50 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

// Role update schema
const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name must be less than 50 characters")
    .optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Roles routes
export async function rolesRoutes(fastify: FastifyInstance) {
  // Normalize permission slugs (e.g., work_orders.view -> workOrders.view)
  const snakeToCamel = (input: string) => input.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const normalizePermission = (perm: string) => {
    const [resource, action] = perm.split(".");
    if (!action) return perm;
    return `${snakeToCamel(resource)}.${snakeToCamel(action)}`;
  };
  const normalizePermissions = (perms?: string[]) => {
    if (!Array.isArray(perms)) return [] as string[];
    const allowed = new Set(PermissionService.getAllPermissions());
    const normalized = perms.map((p) => normalizePermission(p));
    return Array.from(new Set(normalized.filter((p) => allowed.has(p))));
  };
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", async (request, reply) => {
    // Import authenticate function here to avoid circular dependency
    const { authenticate } = await import("../middleware/auth");
    return authenticate(request, reply);
  });

  // GET /api/v1/roles - Get all roles
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { includeInactive } = request.query as { includeInactive?: string };

      // Get tenant
      const tenant = await Tenant.findOne({ isActive: true });
      if (!tenant) {
        return reply.status(404).send({
          success: false,
          message: "No active tenant found",
        });
      }

      const query: any = { tenantId: tenant._id };
      if (includeInactive !== "true") {
        query.isActive = true;
      }

      const roles = await Role.find(query)
        .sort({ isDefault: -1, createdAt: -1, name: 1 })
        .lean();

      return reply.send({
        success: true,
        data: roles,
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching roles");
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch roles",
      });
    }
  });

  // POST /api/v1/roles - Create new role
  fastify.post(
    "/",
    {
      preHandler: requireAnyPermission(["roles.create", "roles.manage", "admin.access"]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = createRoleSchema.parse(request.body);

        // Get tenant
        const tenant = await Tenant.findOne({ isActive: true });
        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "No active tenant found",
          });
        }

        // Generate slug from name
        const slug = slugify(validatedData.name, { strict: true });

        // Check if role name or slug already exists for this tenant
        const existingRole = await Role.findOne({
          tenantId: tenant._id,
          $or: [{ name: validatedData.name }, { slug: slug }],
        });

        if (existingRole) {
          return reply.status(400).send({
            success: false,
            message: "Role with this name or slug already exists",
          });
        }

        const role = new Role({
          ...validatedData,
          slug: slug,
          tenantId: tenant._id,
          isDefault: false,
          isActive: true,
          permissions: normalizePermissions(validatedData.permissions),
        });

        try {
          await role.save();
        } catch (err: any) {
          fastify.log.error(`Mongoose save error: ${err?.message}`);
          return reply.status(400).send({
            success: false,
            message: 'Failed to create role. It may already exist.',
            error: err?.message,
          });
        }

        return reply.send({
          success: true,
          data: role,
          message: "Role created successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Validation error",
            errors: error.issues,
          });
        }

        fastify.log.error(error as Error, "Error creating role");
        return reply.status(500).send({
          success: false,
          message: "Failed to create role",
        });
      }
    }
  );

  // GET /api/v1/roles/:id - Get role by ID
  fastify.get(
    "/:id",
    {
      preHandler: requireAnyPermission(["roles.view", "roles.manage", "admin.access"]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        // Get tenant
        const tenant = await Tenant.findOne({ isActive: true });
        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "No active tenant found",
          });
        }

        const role = await Role.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!role) {
          return reply.status(404).send({
            success: false,
            message: "Role not found",
          });
        }

        return reply.send({
          success: true,
          data: role,
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error fetching role");
        return reply.status(500).send({
          success: false,
          message: "Failed to fetch role",
        });
      }
    }
  );

  // PUT /api/v1/roles/:id - Update role
  fastify.put(
    "/:id",
    {
      preHandler: requireAnyPermission(["roles.edit", "roles.manage", "admin.access"]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const validatedData = updateRoleSchema.parse(request.body);

        // Get tenant
        const tenant = await Tenant.findOne({ isActive: true });
        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "No active tenant found",
          });
        }

        const role = await Role.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!role) {
          return reply.status(404).send({
            success: false,
            message: "Role not found",
          });
        }

        // Check if role name already exists for this tenant (if name is being updated)
        if (validatedData.name && validatedData.name !== role.name) {
          // Generate new slug from updated name
          const newSlug = slugify(validatedData.name, { strict: true });

          const existingRole = await Role.findOne({
            tenantId: tenant._id,
            $or: [{ name: validatedData.name }, { slug: newSlug }],
            _id: { $ne: id },
          });

          if (existingRole) {
            return reply.status(400).send({
              success: false,
              message: "Role with this name or slug already exists",
            });
          }

          // Update slug when name changes
          (validatedData as any).slug = newSlug;
        }

        // Update role, normalizing permissions if provided
        const updatePayload: any = { ...validatedData };
        if (validatedData.permissions) {
          updatePayload.permissions = normalizePermissions(validatedData.permissions);
        }
        Object.assign(role, updatePayload);
        await role.save();

        return reply.send({
          success: true,
          data: role,
          message: "Role updated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Validation error",
            errors: error.issues,
          });
        }

        fastify.log.error(error as Error, "Error updating role");
        return reply.status(500).send({
          success: false,
          message: "Failed to update role",
        });
      }
    }
  );

  // DELETE /api/v1/roles/:id - Delete role
  fastify.delete(
    "/:id",
    {
      preHandler: requireAnyPermission(["roles.delete", "roles.manage", "admin.access"]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        // Get tenant
        const tenant = await Tenant.findOne({ isActive: true });
        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "No active tenant found",
          });
        }

        const role = await Role.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!role) {
          return reply.status(404).send({
            success: false,
            message: "Role not found",
          });
        }

        // Check if role is default
        if (role.isDefault) {
          return reply.status(400).send({
            success: false,
            message: "Cannot delete default role",
          });
        }

        // Check if role is being used by any personnel
        const personnelCount = await Personnel.countDocuments({ roleId: id });
        if (personnelCount > 0) {
          return reply.status(400).send({
            success: false,
            message: `Cannot delete role. It is being used by ${personnelCount} personnel.`,
          });
        }

        await Role.findByIdAndDelete(id);

        return reply.send({
          success: true,
          message: "Role deleted successfully",
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error deleting role");
        return reply.status(500).send({
          success: false,
          message: "Failed to delete role",
        });
      }
    }
  );
}
