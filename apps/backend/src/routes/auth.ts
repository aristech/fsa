import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Role, Tenant } from "../models";
import { Personnel } from "../models/Personnel";
import { authenticate } from "../middleware/auth";
import { MagicLinkService } from "../services/magic-link-service";
import { TenantSetupService } from "../services/tenant-setup";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["admin", "manager", "technician", "dispatcher", "customer"])
    .optional(),
});

const magicLinkValidationSchema = z.object({
  token: z.string().min(1),
});

const setupAccountSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).refine(
    (password) => {
      // Password validation: min 8 chars, mixed case, symbols, numbers
      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar;
    },
    {
      message: "Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters",
    }
  ),
  confirmPassword: z.string().min(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function authRoutes(fastify: FastifyInstance) {
  // Sign in
  fastify.post("/sign-in", async (request, reply) => {
    try {
      const { email, password } = signInSchema.parse(request.body);

      // Find user by email first
      console.log(`🔍 Looking for user with email: "${email}"`);
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        console.log(`❌ User not found with email: "${email}"`);
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }
      console.log(`✅ Found user: ${user.email} (${user._id}) in tenant: ${user.tenantId}`);

      // Get the user's tenant
      const tenant = await Tenant.findOne({ _id: user.tenantId, isActive: true });
      if (!tenant) {
        console.log(`❌ Tenant not found or not active for user's tenant: ${user.tenantId}`);
        return reply.status(401).send({
          success: false,
          message: "Your tenant is not active. Please contact support.",
        });
      }
      console.log(`✅ Found tenant: ${tenant.name} (${tenant._id})`);

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active (for technician/supervisor roles)
      if (user.role && ["technician", "supervisor"].includes(user.role)) {
        const personnel = await Personnel.findOne({ userId: user._id });
        if (!personnel || !personnel.isActive) {
          return reply.status(403).send({
            success: false,
            message:
              "Your account is inactive. Please contact your administrator.",
          });
        }
      }

      // Ensure personnel status is active after successful first sign-in
      try {
        await Personnel.findOneAndUpdate(
          { userId: user._id },
          { $set: { status: 'active', isActive: true } },
          { new: true }
        );
      } catch (e) {
        fastify.log.warn(`Could not update personnel status on sign-in: ${String(e)}`);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role || "admin",
          tenantId: user.tenantId,
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "7d" }
      );

      return reply.send({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role || "admin",
            avatarUrl: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Sign up
  fastify.post("/sign-up", async (request, reply) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        role = "admin",
      } = signUpSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          message: "User already exists",
        });
      }

      // For sign-up without tenant slug, we disable direct sign-up
      // Users should be invited through the invitation flow instead
      return reply.status(400).send({
        success: false,
        message: "Direct sign-up is not supported. Please use the invitation link provided by your organization.",
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Verify token and get user info with permissions
  fastify.get("/verify", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({
          success: false,
          message: "No token provided",
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Invalid token",
        });
      }

      // Get personnel data for environment access
      const personnel = await Personnel.findOne({ userId: user._id, tenantId: user.tenantId });

      // Get user's role and permissions
      let permissions: string[] = [];
      if (user.role === 'superuser') {
        permissions = [];
      } else if (user.isTenantOwner) {
        // Tenant owner has all permissions
        permissions = [
          "workOrders.view",
          "workOrders.create",
          "workOrders.edit",
          "workOrders.delete",
          "workOrders.assign",
          "projects.view",
          "projects.create",
          "projects.edit",
          "projects.delete",
          "tasks.view",
          "tasks.create",
          "tasks.edit",
          "tasks.delete",
          "clients.view",
          "clients.create",
          "clients.edit",
          "clients.delete",
          "personnel.view",
          "personnel.create",
          "personnel.edit",
          "personnel.delete",
          "calendar.view",
          "calendar.edit",
          "reports.view",
          "reports.export",
          "roles.manage",
          "statuses.manage",
          "settings.manage",
          "tenant.manage",
        ];
      } else {
        // Get permissions from role using slug
        const role = await Role.findOne({
          tenantId: user.tenantId,
          slug: user.role,
          isActive: true,
        });

        permissions = role?.permissions || [];
      }

      return reply.send({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            permissions,
            isTenantOwner: user.isTenantOwner,
            isActive: user.isActive,
            phone: user.phone,
            avatar: user.avatar,
            lastLoginAt: user.lastLoginAt,
            environmentAccess: personnel?.environmentAccess || null,
          },
        },
        message: "User verified successfully",
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(401).send({
        success: false,
        message: "Invalid token",
      });
    }
  });

  // Validate magic link token (GET - for initial page load)
  fastify.get("/validate-magic-link", async (request, reply) => {
    try {
      const { token } = magicLinkValidationSchema.parse(request.query);

      const result = await MagicLinkService.getMagicLinkInfo(token);

      if (!result.success || !result.data) {
        return reply.status(400).send({
          success: false,
          message: result.error || "Invalid or expired magic link",
        });
      }

      // Get tenant information
      const tenant = await Tenant.findById(result.data.tenantId);
      if (!tenant) {
        return reply.status(400).send({
          success: false,
          message: "Tenant not found",
        });
      }

      return reply.send({
        success: true,
        data: {
          email: result.data.email,
          type: result.data.type,
          tenantName: tenant.name,
          companyName: tenant.name,
          metadata: result.data.metadata,
        },
        message: "Magic link is valid",
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error validating magic link");
      return reply.status(400).send({
        success: false,
        message: "Invalid magic link format",
      });
    }
  });

  // Setup account with magic link (POST - complete account setup)
  fastify.post("/setup-account", async (request, reply) => {
    try {
      const { token, password, confirmPassword } = setupAccountSchema.parse(request.body);

      // Validate and consume the magic link
      const result = await MagicLinkService.validateAndConsumeMagicLink(token);

      if (!result.success || !result.data) {
        return reply.status(400).send({
          success: false,
          message: result.error || "Invalid or expired magic link",
        });
      }

      const { email, tenantId, userId, type, metadata } = result.data;

      // Get tenant information
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return reply.status(400).send({
          success: false,
          message: "Tenant not found",
        });
      }

      let user: any;

      if (userId) {
        // User already exists, just update password
        user = await User.findOneAndUpdate(
          { _id: userId, tenantId },
          { 
            password: await bcrypt.hash(password, 12),
            isActive: true,
          },
          { new: true }
        );

        if (!user) {
          return reply.status(400).send({
            success: false,
            message: "User not found",
          });
        }
        // Also ensure linked personnel is marked active
        try {
          await Personnel.findOneAndUpdate(
            { userId: user._id, tenantId },
            { $set: { isActive: true, status: 'active' } }
          );
        } catch (e) {
          fastify.log.warn(`Could not set personnel active during setup-account: ${String(e)}`);
        }
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 12);
        
        user = new User({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: metadata?.firstName || "",
          lastName: metadata?.lastName || "",
          phone: metadata?.phone || "",
          role: "user", // Default role
          tenantId,
          isActive: true,
        });

        await user.save();

        // If this is a personnel invitation, create personnel record
        if (type === 'personnel_invitation' && metadata?.roleId) {
          const personnel = new Personnel({
            userId: user._id,
            tenantId,
            roleId: metadata.roleId,
            isActive: true,
            status: 'active',
          });
          await personnel.save();
        }

        // If this is a tenant activation, complete tenant setup
        if (type === 'tenant_activation') {
          // Activate the tenant
          await Tenant.findByIdAndUpdate(tenantId, { 
            isActive: true,
            ownerId: user._id,
          });

          // Create default roles for the tenant
          await TenantSetupService.createDefaultRoles(tenantId);
          
          // Get the created roles
          const roles = await Role.find({ tenantId });
          
          // Find supervisor role (admin equivalent) and create personnel record
          const adminRole = roles.find(role => role.name === 'Supervisor');
          if (adminRole) {
            const personnel = new Personnel({
              userId: user._id,
              tenantId,
              roleId: adminRole._id,
              isActive: true,
              status: 'active',
            });
            await personnel.save();
          }
        }
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || "fallback-secret";
      const jwtToken = jwt.sign(
        { 
          userId: user._id,
          tenantId: user.tenantId,
          email: user.email,
        },
        jwtSecret,
        { expiresIn: "24h" }
      );

      // Get role information if available
      let roleInfo = null;
      if (type === 'personnel_invitation' || type === 'tenant_activation') {
        const personnel = await Personnel.findOne({ 
          userId: user._id, 
          tenantId 
        }).populate('roleId', 'name color permissions');
        
        if (personnel && personnel.roleId) {
          roleInfo = personnel.roleId;
        }
      }

      return reply.send({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            tenantId: user.tenantId,
            isActive: user.isActive,
          },
          tenant: {
            _id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          },
          role: roleInfo,
          token: jwtToken,
        },
        message: "Account setup completed successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error setting up account");
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });
}
