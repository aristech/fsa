import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Tenant } from "../models";
import { TenantSetupService } from "../services/tenant-setup";
import { slugify } from "../utils/slugify";

// ----------------------------------------------------------------------

// Tenant creation schema
const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, "Tenant name is required")
    .max(100, "Tenant name must be less than 100 characters"),
  slug: z
    .string()
    .min(1, "Tenant slug is required")
    .max(50, "Tenant slug must be less than 50 characters")
    .optional(), // Make slug optional - will be auto-generated from name
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().default("US"),
    })
    .optional(),
  settings: z
    .object({
      timezone: z.string().default("America/New_York"),
      currency: z.string().default("USD"),
      dateFormat: z.string().default("MM/DD/YYYY"),
      workingHours: z
        .object({
          start: z.string().default("09:00"),
          end: z.string().default("17:00"),
          days: z.array(z.number()).default([1, 2, 3, 4, 5]), // Monday to Friday
        })
        .optional(),
    })
    .optional(),
});

// Tenant update schema
const updateTenantSchema = z.object({
  name: z
    .string()
    .min(1, "Tenant name is required")
    .max(100, "Tenant name must be less than 100 characters")
    .optional(),
  email: z.string().email("Valid email is required").optional(),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().default("US"),
    })
    .optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      currency: z.string().optional(),
      dateFormat: z.string().optional(),
      workingHours: z
        .object({
          start: z.string().optional(),
          end: z.string().optional(),
          days: z.array(z.number()).optional(),
        })
        .optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

// ----------------------------------------------------------------------

export async function tenantRoutes(fastify: FastifyInstance) {
  // GET /api/v1/tenants - Get all tenants
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenants = await Tenant.find({ isActive: true }).sort({
        createdAt: -1,
      });

      return reply.send({
        success: true,
        data: tenants,
        message: "Tenants fetched successfully",
      });
    } catch (error) {
      fastify.log.error("Error fetching tenants:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch tenants",
      });
    }
  });

  // GET /api/v1/tenants/:id - Get tenant by ID
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const tenant = await Tenant.findById(id);

      if (!tenant) {
        return reply.status(404).send({
          success: false,
          message: "Tenant not found",
        });
      }

      return reply.send({
        success: true,
        data: tenant,
        message: "Tenant fetched successfully",
      });
    } catch (error) {
      fastify.log.error("Error fetching tenant:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch tenant",
      });
    }
  });

  // POST /api/v1/tenants - Create new tenant
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = createTenantSchema.parse(request.body);

      // Generate slug from name if not provided
      const slug =
        validatedData.slug || slugify(validatedData.name, { strict: true });

      // Check if tenant with same slug or email already exists
      const existingTenant = await Tenant.findOne({
        $or: [{ slug: slug }, { email: validatedData.email }],
      });

      if (existingTenant) {
        return reply.status(400).send({
          success: false,
          message: "Tenant with this slug or email already exists",
        });
      }

      // Get the current user ID from the request (assuming it's set by auth middleware)
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User authentication required",
        });
      }

      // Add the generated slug and owner ID to the data
      const tenantData = {
        ...validatedData,
        slug: slug,
        ownerId: userId,
      };

      // Setup new tenant with default roles
      const { tenant, roles } = await TenantSetupService.setupNewTenant(
        tenantData
      );

      return reply.status(201).send({
        success: true,
        data: {
          tenant,
          roles,
        },
        message: "Tenant created successfully with default roles",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      fastify.log.error("Error creating tenant:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to create tenant",
      });
    }
  });

  // PUT /api/v1/tenants/:id - Update tenant
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = updateTenantSchema.parse(request.body);

      // If name is being updated, generate new slug
      if (validatedData.name) {
        const newSlug = slugify(validatedData.name, { strict: true });

        // Check if new slug already exists
        const existingTenant = await Tenant.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });

        if (existingTenant) {
          return reply.status(400).send({
            success: false,
            message: "Tenant with this slug already exists",
          });
        }

        validatedData.slug = newSlug;
      }

      const tenant = await Tenant.findByIdAndUpdate(
        id,
        { ...validatedData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        return reply.status(404).send({
          success: false,
          message: "Tenant not found",
        });
      }

      return reply.send({
        success: true,
        data: tenant,
        message: "Tenant updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      fastify.log.error("Error updating tenant:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to update tenant",
      });
    }
  });

  // DELETE /api/v1/tenants/:id - Delete tenant (soft delete)
  fastify.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const tenant = await Tenant.findByIdAndUpdate(
          id,
          { isActive: false, updatedAt: new Date() },
          { new: true }
        );

        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "Tenant not found",
          });
        }

        return reply.send({
          success: true,
          message: "Tenant deleted successfully",
        });
      } catch (error) {
        fastify.log.error("Error deleting tenant:", error);
        return reply.status(500).send({
          success: false,
          message: "Failed to delete tenant",
        });
      }
    }
  );

  // POST /api/v1/tenants/:id/setup - Setup default roles for existing tenant
  fastify.post(
    "/:id/setup",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const tenant = await Tenant.findById(id);
        if (!tenant) {
          return reply.status(404).send({
            success: false,
            message: "Tenant not found",
          });
        }

        // Create default roles for this tenant
        await TenantSetupService.createDefaultRoles(id);

        // Fetch created roles
        const roles = await Role.find({
          tenantId: id,
          isDefault: true,
        });

        return reply.send({
          success: true,
          data: { tenant, roles },
          message: "Default roles created successfully",
        });
      } catch (error) {
        fastify.log.error("Error setting up tenant:", error);
        return reply.status(500).send({
          success: false,
          message: "Failed to setup tenant",
        });
      }
    }
  );
}
