import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { Tenant, Role } from "../models";
import { User } from "../models/User";
import { TenantSetupService } from "../services/tenant-setup";
import { slugify } from "../utils/slugify";
import { MagicLinkService } from "../services/magic-link-service";
import { sendTenantActivationMagicLink } from "./email";
import {
  sendError,
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendUnauthorized,
  handleZodError
} from "../utils/error-handler";
import {
  AUTH_MESSAGES,
  BUSINESS_MESSAGES,
  SUCCESS_MESSAGES,
  SERVER_MESSAGES,
  PERMISSION_MESSAGES,
  NOT_FOUND_MESSAGES
} from "../constants/error-messages";

// ----------------------------------------------------------------------

// Tenant registration schema (for public registration with magic link)
const registerTenantSchema = z.object({
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminFirstName: z.string().min(1, "Admin first name is required"),
  adminLastName: z.string().min(1, "Admin last name is required"),
  adminPhone: z.string().optional(),
  slug: z
    .string()
    .min(1, "Company slug is required")
    .max(50, "Company slug must be less than 50 characters")
    .optional(), // Make slug optional - will be auto-generated from company name
});

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
  // Owner/Admin user details
  ownerFirstName: z.string().min(1, "Owner first name is required").optional(),
  ownerLastName: z.string().min(1, "Owner last name is required").optional(),
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
  slug: z.string().optional(),
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
  // Require authentication for all tenant routes
  fastify.addHook("preHandler", authenticate);
  // POST /api/v1/tenants/register - Public tenant registration with magic link
  fastify.post(
    "/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = registerTenantSchema.parse(request.body);

        // Generate slug from company name if not provided
        const slug =
          validatedData.slug ||
          slugify(validatedData.companyName, { strict: true });

        // Check if tenant with same slug or admin email already exists
        const existingTenant = await Tenant.findOne({
          $or: [{ slug: slug }, { email: validatedData.adminEmail }],
        });

        if (existingTenant) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.USER_ALREADY_EXISTS,
            "Company with this name or admin email already exists"
          );
        }

        // Create tenant record (inactive until magic link is used)
        const tenantData = {
          name: validatedData.companyName,
          slug: slug,
          email: validatedData.adminEmail,
          isActive: false, // Will be activated when magic link is used
        };

        const tenant = new Tenant(tenantData);
        await tenant.save();

        // Create magic link for tenant activation
        const magicLinkResult = await MagicLinkService.createMagicLink({
          email: validatedData.adminEmail,
          tenantId: tenant._id.toString(),
          type: "tenant_activation",
          metadata: {
            firstName: validatedData.adminFirstName,
            lastName: validatedData.adminLastName,
            phone: validatedData.adminPhone,
            companyName: validatedData.companyName,
            tenantSlug: slug,
          },
          expirationHours: 48, // 48 hours for tenant activation
        });

        if (!magicLinkResult.success || !magicLinkResult.magicLink) {
          // Clean up tenant if magic link creation fails
          await Tenant.findByIdAndDelete(tenant._id);

          return sendError(
            reply,
            500,
            SERVER_MESSAGES.SERVICE_UNAVAILABLE,
            "Failed to create activation link"
          );
        }

        // Send activation email
        const emailResult = await sendTenantActivationMagicLink({
          to: validatedData.adminEmail,
          tenantName: `${validatedData.adminFirstName} ${validatedData.adminLastName}`,
          companyName: validatedData.companyName,
          magicLink: magicLinkResult.magicLink,
          expirationHours: 48,
        });

        if (!emailResult.success) {
          fastify.log.error(
            `Failed to send activation email: ${emailResult.error}`,
          );
          // Don't fail the registration if email fails, but log it
        }

        return sendSuccess(
          reply,
          201,
          SUCCESS_MESSAGES.TENANT_REGISTRATION,
          "Tenant registration initiated. Please check your email to complete activation.",
          {
            tenantId: tenant._id,
            companyName: validatedData.companyName,
            adminEmail: validatedData.adminEmail,
            message: "Registration successful! Please check your email for the activation link.",
          }
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return handleZodError(error, reply);
        }

        fastify.log.error(error as Error, "Error registering tenant");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to register tenant"
        );
      }
    },
  );

  // GET /api/v1/tenants - Get all tenants
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenants = await Tenant.find({ isActive: true }).sort({
        createdAt: -1,
      });

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.FETCHED,
        "Tenants fetched successfully",
        tenants
      );
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching tenants");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to fetch tenants"
      );
    }
  });

  // GET /api/v1/tenants/:id - Get tenant by ID
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const tenant = await Tenant.findById(id);

      if (!tenant) {
        return sendNotFound(
          reply,
          NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
          "Tenant not found"
        );
      }

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.FETCHED,
        "Tenant fetched successfully",
        tenant
      );
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching tenant");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to fetch tenant"
      );
    }
  });

  // POST /api/v1/tenants - Create new tenant (superusers only)
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
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.USER_ALREADY_EXISTS,
          "Tenant with this slug or email already exists"
        );
      }

      // Get the current user ID from the request (assuming it's set by auth middleware)
      const userId = (request as any).user?.id;
      if (!userId) {
        return sendUnauthorized(
          reply,
          AUTH_MESSAGES.NO_TOKEN_PROVIDED,
          "User authentication required"
        );
      }

      // Ensure caller is superuser
      const caller = await User.findById(userId).select("role");
      if (!caller || caller.role !== "superuser") {
        return sendForbidden(
          reply,
          PERMISSION_MESSAGES.SUPERUSER_ONLY,
          "Only superusers can create tenants"
        );
      }

      // Add the generated slug to the data (no ownerId needed - will create new user)
      const tenantData = {
        ...validatedData,
        slug: slug,
        // Provide owner details - use defaults if not provided
        ownerFirstName: validatedData.ownerFirstName || validatedData.name.split(' ')[0] || validatedData.name,
        ownerLastName: validatedData.ownerLastName || validatedData.name.split(' ').slice(1).join(' ') || 'Admin',
      };

      // Setup new tenant with default roles and create tenant owner
      const { tenant, roles, owner } =
        await TenantSetupService.setupNewTenant(tenantData);

      // Send magic link invitation to tenant owner
      try {
        fastify.log.info(
          `📧 Sending tenant activation magic link to: ${validatedData.email}`,
        );

        // Create magic link for tenant activation
        const magicLinkResult = await MagicLinkService.createMagicLink({
          email: validatedData.email,
          tenantId: tenant._id.toString(),
          userId: owner._id.toString(),
          type: "tenant_activation",
          metadata: {
            tenantName: validatedData.name,
            companyName: validatedData.name,
            tenantSlug: tenant.slug,
          },
          expirationHours: 72, // 72 hours for tenant activation (more time than personnel)
        });

        if (magicLinkResult.success && magicLinkResult.magicLink) {
          // Send the magic link email
          const emailResult = await sendTenantActivationMagicLink({
            to: validatedData.email,
            tenantName: validatedData.name,
            companyName: validatedData.name,
            magicLink: magicLinkResult.magicLink,
            expirationHours: 72,
          });

          if (emailResult.success) {
            fastify.log.info(
              `✅ Tenant activation email sent successfully to: ${validatedData.email}`,
            );
          } else {
            fastify.log.error(
              `❌ Failed to send tenant activation email: ${emailResult.error}`,
            );
          }
        } else {
          fastify.log.error(
            `❌ Failed to create magic link for tenant activation: ${magicLinkResult.error}`,
          );
        }
      } catch (emailError) {
        fastify.log.error(
          `❌ Error sending tenant activation email: ${emailError}`,
        );
        // Don't fail the tenant creation if email fails
      }

      return sendSuccess(
        reply,
        201,
        SUCCESS_MESSAGES.TENANT_CREATED,
        "Tenant created successfully with default roles. Activation email sent to tenant owner.",
        {
          tenant,
          roles,
          owner: {
            id: owner._id,
            email: owner.email,
            firstName: owner.firstName,
            lastName: owner.lastName,
            role: owner.role,
            isTenantOwner: owner.isTenantOwner,
            isActive: owner.isActive,
          },
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleZodError(error, reply);
      }

      fastify.log.error(error as Error, "Error creating tenant");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to create tenant"
      );
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
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.TENANT_SLUG_EXISTS,
            "Tenant with this slug already exists"
          );
        }

        validatedData.slug = newSlug;
      }

      const tenant = await Tenant.findByIdAndUpdate(
        id,
        { ...validatedData, updatedAt: new Date() },
        { new: true, runValidators: true },
      );

      if (!tenant) {
        return sendNotFound(
          reply,
          NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
          "Tenant not found"
        );
      }

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.UPDATED,
        "Tenant updated successfully",
        tenant
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleZodError(error, reply);
      }

      fastify.log.error(error as Error, "Error updating tenant");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to update tenant"
      );
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
          { new: true },
        );

        if (!tenant) {
          return sendNotFound(
            reply,
            NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
            "Tenant not found"
          );
        }

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.DELETED,
          "Tenant deleted successfully"
        );
      } catch (error) {
        fastify.log.error(error as Error, "Error deleting tenant");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to delete tenant"
        );
      }
    },
  );

  // POST /api/v1/tenants/:id/setup - Setup default roles for existing tenant
  fastify.post(
    "/:id/setup",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const tenant = await Tenant.findById(id);
        if (!tenant) {
          return sendNotFound(
            reply,
            NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
            "Tenant not found"
          );
        }

        // Create default roles for this tenant
        await TenantSetupService.createDefaultRoles(id);

        // Fetch created roles
        const roles = await Role.find({
          tenantId: id,
          isDefault: true,
        });

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.SETUP_COMPLETED,
          "Default roles created successfully",
          { tenant, roles }
        );
      } catch (error) {
        fastify.log.error(error as Error, "Error setting up tenant");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to setup tenant"
        );
      }
    },
  );
}
