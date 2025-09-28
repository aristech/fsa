import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Role, Tenant } from "../models";
import { Personnel } from "../models/Personnel";
import { CheckInSession } from "../models/CheckInSession";
import { authenticate } from "../middleware/auth";
import { MagicLinkService } from "../services/magic-link-service";
import { TenantSetupService } from "../services/tenant-setup";
import { GoogleOAuthService } from "../services/google-oauth-service";
import { sendPersonnelMagicLink, sendPasswordResetEmail } from "./email";

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

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const createPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
});

const setupAccountSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .refine(
        (password) => {
          // Password validation: min 8 chars, mixed case, symbols, numbers
          const hasLowerCase = /[a-z]/.test(password);
          const hasUpperCase = /[A-Z]/.test(password);
          const hasNumbers = /\d/.test(password);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
          return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar;
        },
        {
          message:
            "Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters",
        },
      ),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Google OAuth schemas
const googleAuthStartSchema = z.object({
  planId: z.string().optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  companyName: z.string().optional(),
  redirectPath: z.string().optional(),
});

const googleAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  error: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Sign out
  fastify.post("/sign-out", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const userId = user?.userId as string;

      if (userId) {
        // Mark user as offline and update lastSeenAt
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              isOnline: false,
              lastSeenAt: new Date()
            }
          },
          { new: true }
        );

        // Also close any active time tracking sessions for this user
        await CheckInSession.updateMany(
          { userId, isActive: true },
          { $set: { isActive: false, notes: 'Auto-closed on logout' } }
        );
      }

      return reply.send({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      fastify.log.error({ error }, "Error during logout");
      return reply.status(500).send({
        success: false,
        message: "Internal server error during logout",
      });
    }
  });

  // Sign in
  fastify.post("/sign-in", async (request, reply) => {
    try {
      const { email, password } = signInSchema.parse(request.body);

      // Find user by email first
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Superuser bootstrap: allow login without tenant
      const isSuperuser = user.role === "superuser";

      // Get the user's tenant (non-superuser only)
      let tenant: any = null;
      if (!isSuperuser) {
        if (!user.tenantId) {
          return reply.status(401).send({
            success: false,
            message: "Your account is not associated with a tenant.",
          });
        }
        tenant = await Tenant.findOne({
          _id: user.tenantId,
          isActive: true,
        });
        if (!tenant) {
          return reply.status(401).send({
            success: false,
            message: "Your tenant is not active. Please contact support.",
          });
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active (for technician/supervisor roles)
      if (!isSuperuser && user.role && ["technician", "supervisor"].includes(user.role)) {
        const personnel = await Personnel.findOne({ userId: user._id });
        if (!personnel || !personnel.isActive) {
          return reply.status(403).send({
            success: false,
            message:
              "Your account is inactive. Please contact your administrator.",
          });
        }
      }

      // Update user's login status and timestamps
      try {
        await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              lastLoginAt: new Date(),
              isOnline: true,
              lastSeenAt: new Date()
            }
          },
          { new: true }
        );
      } catch (e) {
        fastify.log.warn(
          `Could not update login status on sign-in: ${String(e)}`,
        );
      }

      // Ensure personnel status is active after successful first sign-in
      try {
        await Personnel.findOneAndUpdate(
          { userId: user._id },
          { $set: { status: "active", isActive: true } },
          { new: true },
        );
      } catch (e) {
        fastify.log.warn(
          `Could not update personnel status on sign-in: ${String(e)}`,
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role || "admin",
          tenantId: user.tenantId || null,
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "7d" },
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
          // Include tenant info when available for convenience
          tenant: tenant || null,
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
        message:
          "Direct sign-up is not supported. Please use the invitation link provided by your organization.",
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
        process.env.JWT_SECRET || "fallback-secret",
      ) as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Invalid token",
        });
      }

      // Get personnel data for environment access
      const personnel = await Personnel.findOne({
        userId: user._id,
        tenantId: user.tenantId,
      });

      // Get tenant information
      const isSuperuser = user.role === "superuser";
      const tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;

      // Get user's role and permissions
      let permissions: string[] = [];
      if (isSuperuser) {
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
          tenant: tenant || null,
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
      const { token, password, confirmPassword } = setupAccountSchema.parse(
        request.body,
      );

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
          { new: true },
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
            { $set: { isActive: true, status: "active" } },
          );
        } catch (e) {
          fastify.log.warn(
            `Could not set personnel active during setup-account: ${String(e)}`,
          );
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
        if (type === "personnel_invitation" && metadata?.roleId) {
          const personnel = new Personnel({
            userId: user._id,
            tenantId,
            roleId: metadata.roleId,
            isActive: true,
            status: "active",
          });
          await personnel.save();
        }

        // If this is a tenant activation, complete tenant setup
        if (type === "tenant_activation") {
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
          const adminRole = roles.find((role) => role.name === "Supervisor");
          if (adminRole) {
            const personnel = new Personnel({
              userId: user._id,
              tenantId,
              roleId: adminRole._id,
              isActive: true,
              status: "active",
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
        { expiresIn: "24h" },
      );

      // Get role information if available
      let roleInfo = null;
      if (type === "personnel_invitation" || type === "tenant_activation") {
        const personnel = await Personnel.findOne({
          userId: user._id,
          tenantId,
        }).populate("roleId", "name color permissions");

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

  // Request password reset endpoint
  fastify.post("/request-password-reset", async (request, reply) => {
    try {
      const { email } = requestPasswordResetSchema.parse(request.body);

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Return success even if user not found for security reasons
        return reply.send({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      // Create magic link for password reset
      const result = await MagicLinkService.createMagicLink({
        email: user.email,
        tenantId: user.tenantId?.toString() || '',
        userId: user._id.toString(),
        type: 'password_reset',
        metadata: {
          firstName: user.name?.split(' ')[0] || user.name,
        },
        expirationHours: 1, // Password reset links expire in 1 hour
      });

      if (!result.success || !result.magicLink) {
        return reply.status(500).send({
          success: false,
          message: "Failed to create password reset link",
        });
      }

      // Send password reset email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name || 'User',
          companyName: 'Field Service Automation',
          magicLink: result.magicLink.replace('/verify-account', '/verify-account'),
          expirationHours: 1,
        });
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        return reply.status(500).send({
          success: false,
          message: "Failed to send password reset email",
        });
      }

      return reply.send({
        success: true,
        message: "Password reset link sent successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error requesting password reset");
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Verify magic link endpoint (without consuming)
  fastify.post("/verify-magic-link", async (request, reply) => {
    try {
      const { token } = verifyMagicLinkSchema.parse(request.body);

      const result = await MagicLinkService.getMagicLinkInfo(token);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          message: result.error || "Invalid or expired token",
        });
      }

      return reply.send({
        success: true,
        message: "Token is valid",
        data: result.data,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error verifying magic link");
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Create password endpoint (using magic link)
  fastify.post("/create-password", async (request, reply) => {
    try {
      const { token, password } = createPasswordSchema.parse(request.body);

      // Validate and consume magic link
      const result = await MagicLinkService.validateAndConsumeMagicLink(token);

      if (!result.success || !result.data) {
        return reply.status(400).send({
          success: false,
          message: result.error || "Invalid or expired token",
        });
      }

      // Find user
      const user = await User.findById(result.data.userId);
      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        isActive: true, // Activate account if it wasn't already
      });

      // If this is personnel, activate their account too
      await Personnel.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            status: "active",
            isActive: true
          }
        }
      );

      return reply.send({
        success: true,
        message: "Password created successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(error as Error, "Error creating password");
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Heartbeat endpoint to update user activity
  fastify.post("/heartbeat", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const userId = user?.userId as string;

      if (userId) {
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              isOnline: true,
              lastSeenAt: new Date()
            }
          },
          { new: true }
        );
      }

      return reply.send({
        success: true,
        message: "Heartbeat updated",
      });
    } catch (error) {
      fastify.log.error({ error }, "Error updating heartbeat");
      return reply.status(500).send({
        success: false,
        message: "Failed to update heartbeat",
      });
    }
  });

  // Google OAuth start - Generate authorization URL
  fastify.post("/google", async (request, reply) => {
    try {
      const validatedData = googleAuthStartSchema.parse(request.body);

      // Create state parameter with tenant context
      const state = GoogleOAuthService.createStateParameter({
        planId: validatedData.planId,
        billingCycle: validatedData.billingCycle,
        companyName: validatedData.companyName,
        redirectPath: validatedData.redirectPath,
      });

      // Generate Google OAuth URL
      const authUrl = GoogleOAuthService.generateAuthUrl(state);

      return reply.send({
        success: true,
        message: "Google OAuth URL generated",
        data: {
          authUrl,
          state,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Invalid request data",
          errors: error.issues,
        });
      }

      fastify.log.error({ error }, "Error generating Google OAuth URL");
      return reply.status(500).send({
        success: false,
        message: "Failed to generate OAuth URL",
      });
    }
  });

  // Google OAuth callback - Handle OAuth response and create tenant
  fastify.get("/google/callback", async (request, reply) => {
    try {
      const validatedData = googleAuthCallbackSchema.parse(request.query);

      // Handle OAuth errors
      if (validatedData.error) {
        fastify.log.warn(`Google OAuth error: ${validatedData.error}`);
        return reply.status(400).send({
          success: false,
          message: `OAuth error: ${validatedData.error}`,
        });
      }

      // Exchange code for tokens
      const tokens = await GoogleOAuthService.exchangeCodeForTokens(validatedData.code);

      // Get user profile
      let userProfile;
      if (tokens.idToken) {
        userProfile = await GoogleOAuthService.verifyIdToken(tokens.idToken);
      } else {
        userProfile = await GoogleOAuthService.getUserProfile(tokens.accessToken);
      }

      // Parse state parameter
      let stateData: any = {};
      if (validatedData.state) {
        try {
          stateData = GoogleOAuthService.parseStateParameter(validatedData.state);
        } catch (error) {
          fastify.log.warn(`Invalid OAuth state: ${error}`);
          // Continue without state data
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: userProfile.email });
      if (existingUser) {
        // User exists - sign them in
        const tenant = await Tenant.findById(existingUser.tenantId);

        const token = jwt.sign(
          {
            userId: existingUser._id,
            email: existingUser.email,
            role: existingUser.role,
            tenantId: existingUser.tenantId,
            isTenantOwner: existingUser.isTenantOwner,
          },
          process.env.JWT_SECRET!,
          { expiresIn: "7d" }
        );

        // Redirect to frontend with token as URL parameter (temporary, frontend should store it properly)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectPath = stateData.redirectPath || '/dashboard';

        // Redirect to frontend callback page that will handle the token
        const redirectUrl = `${frontendUrl}/auth/oauth-callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}&provider=google&type=existing`;
        return reply.redirect(redirectUrl);
      }

      // New user - create tenant and admin user
      const companyName = stateData.companyName ||
                         `${userProfile.givenName} ${userProfile.familyName}'s Company`;
      const planId = stateData.planId || 'free';

      // Create tenant using TenantSetupService
      const setupResult = await TenantSetupService.createTenant({
        companyName,
        adminEmail: userProfile.email,
        adminFirstName: userProfile.givenName,
        adminLastName: userProfile.familyName,
        subscriptionPlan: planId,
        skipMagicLink: true, // Skip magic link since we're using OAuth
        googleProfile: {
          id: userProfile.id,
          picture: userProfile.picture,
        },
      });

      if (!setupResult.success) {
        return reply.status(500).send({
          success: false,
          message: setupResult.message || "Failed to create tenant",
        });
      }

      const { tenant, adminUser } = setupResult;

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: adminUser._id,
          email: adminUser.email,
          role: adminUser.role,
          tenantId: tenant._id,
          isTenantOwner: true,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      fastify.log.info(`New tenant created via Google OAuth: ${tenant.name} (${userProfile.email})`);

      // Redirect to frontend with token as URL parameter (temporary, frontend should store it properly)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectPath = stateData.redirectPath || '/dashboard';

      // Redirect to frontend callback page that will handle the token
      const redirectUrl = `${frontendUrl}/auth/oauth-callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}&provider=google&type=new`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Invalid callback parameters",
          errors: error.issues,
        });
      }

      fastify.log.error({ error }, "Error processing Google OAuth callback");
      return reply.status(500).send({
        success: false,
        message: "Failed to process OAuth callback",
      });
    }
  });

  // Google OAuth callback - Frontend-first flow (POST endpoint)
  fastify.post("/google/callback", async (request, reply) => {
    try {
      const validatedData = googleAuthCallbackSchema.parse(request.body);

      // Handle OAuth errors
      if (validatedData.error) {
        fastify.log.warn(`Google OAuth error: ${validatedData.error}`);
        return reply.status(400).send({
          success: false,
          message: `OAuth error: ${validatedData.error}`,
        });
      }

      // Exchange code for tokens
      const tokens = await GoogleOAuthService.exchangeCodeForTokens(validatedData.code);

      // Get user profile
      let userProfile;
      if (tokens.idToken) {
        userProfile = await GoogleOAuthService.verifyIdToken(tokens.idToken);
      } else {
        userProfile = await GoogleOAuthService.getUserProfile(tokens.accessToken);
      }

      // Parse state parameter
      let stateData: any = {};
      if (validatedData.state) {
        try {
          stateData = GoogleOAuthService.parseStateParameter(validatedData.state);
        } catch (error) {
          fastify.log.warn(`Invalid OAuth state: ${error}`);
          // Continue without state data
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: userProfile.email });
      if (existingUser) {
        // User exists - sign them in
        const tenant = await Tenant.findById(existingUser.tenantId);

        const token = jwt.sign(
          {
            userId: existingUser._id,
            email: existingUser.email,
            role: existingUser.role,
            tenantId: existingUser.tenantId,
            isTenantOwner: existingUser.isTenantOwner,
          },
          process.env.JWT_SECRET!,
          { expiresIn: "7d" }
        );

        // Return JSON response with token and user info
        return reply.send({
          success: true,
          data: {
            token,
            user: {
              id: existingUser._id,
              email: existingUser.email,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              role: existingUser.role,
              tenantId: existingUser.tenantId,
              isTenantOwner: existingUser.isTenantOwner,
            },
            tenant: tenant ? {
              id: tenant._id,
              name: tenant.name,
              slug: tenant.slug,
            } : null,
            type: 'existing'
          }
        });
      }

      // New user - create tenant and admin user
      const companyName = stateData.companyName ||
                         `${userProfile.givenName} ${userProfile.familyName}'s Company`;
      const planId = stateData.planId || 'free';

      // Create tenant using TenantSetupService
      const setupResult = await TenantSetupService.createTenant({
        companyName,
        adminEmail: userProfile.email,
        adminFirstName: userProfile.givenName,
        adminLastName: userProfile.familyName,
        subscriptionPlan: planId,
        skipMagicLink: true, // Skip magic link since we're using OAuth
        googleProfile: {
          id: userProfile.id,
          picture: userProfile.picture,
        },
      });

      if (!setupResult.success) {
        return reply.status(500).send({
          success: false,
          message: setupResult.message || "Failed to create tenant",
        });
      }

      const { tenant, adminUser } = setupResult;

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: adminUser._id,
          email: adminUser.email,
          role: adminUser.role,
          tenantId: tenant._id,
          isTenantOwner: true,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      fastify.log.info(`New tenant created via Google OAuth: ${tenant.name} (${userProfile.email})`);

      // Return JSON response with token and user info
      return reply.send({
        success: true,
        data: {
          token,
          user: {
            id: adminUser._id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            role: adminUser.role,
            tenantId: tenant._id,
            isTenantOwner: true,
          },
          tenant: {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          },
          type: 'new'
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Invalid callback parameters",
          errors: error.issues,
        });
      }

      fastify.log.error({ error }, "Error processing Google OAuth callback");
      return reply.status(500).send({
        success: false,
        message: "Failed to process OAuth callback",
      });
    }
  });
}
