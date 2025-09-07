import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Role, Tenant, Personnel } from "../models";

// Role creation schema
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name must be less than 50 characters"),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color code"),
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
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color code")
    .optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Roles routes
export async function rolesRoutes(fastify: FastifyInstance) {
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
      fastify.log.error("Error fetching roles:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch roles",
      });
    }
  });

  // POST /api/v1/roles - Create new role
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Check if role name already exists for this tenant
      const existingRole = await Role.findOne({
        tenantId: tenant._id,
        name: validatedData.name,
      });

      if (existingRole) {
        return reply.status(400).send({
          success: false,
          message: "Role with this name already exists",
        });
      }

      const role = new Role({
        ...validatedData,
        tenantId: tenant._id,
        isDefault: false,
        isActive: true,
      });

      await role.save();

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
          errors: error.errors,
        });
      }

      fastify.log.error("Error creating role:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to create role",
      });
    }
  });

  // GET /api/v1/roles/:id - Get role by ID
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
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
      fastify.log.error("Error fetching role:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch role",
      });
    }
  });

  // PUT /api/v1/roles/:id - Update role
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
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
        const existingRole = await Role.findOne({
          tenantId: tenant._id,
          name: validatedData.name,
          _id: { $ne: id },
        });

        if (existingRole) {
          return reply.status(400).send({
            success: false,
            message: "Role with this name already exists",
          });
        }
      }

      // Update role
      Object.assign(role, validatedData);
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
          errors: error.errors,
        });
      }

      fastify.log.error("Error updating role:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to update role",
      });
    }
  });

  // DELETE /api/v1/roles/:id - Delete role
  fastify.delete(
    "/:id",
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
        fastify.log.error("Error deleting role:", error);
        return reply.status(500).send({
          success: false,
          message: "Failed to delete role",
        });
      }
    }
  );
}
