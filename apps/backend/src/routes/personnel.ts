import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { User, Role, Tenant, Personnel } from "../models";
import { sendPersonnelInvitation, sendPersonnelMagicLink } from "./email";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { MagicLinkService } from "../services/magic-link-service";
import { UserCleanupService } from "../services/user-cleanup-service";

// Personnel creation schema
const createPersonnelSchema = z.object({
  // Either supply userId or (name + email) to create a user
  userId: z.string().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0, "Hourly rate must be positive"),
  notes: z.string().optional(),
  availability: z
    .object({
      monday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      tuesday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      wednesday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      thursday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      friday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      saturday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
      sunday: z.object({
        start: z.string(),
        end: z.string(),
        available: z.boolean(),
      }),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional(),
    })
    .optional(),
  sendInvitation: z.boolean().optional(),
});

// Allow partial updates on PUT
const updatePersonnelSchema = createPersonnelSchema.partial();

// Personnel routes
export async function personnelRoutes(fastify: FastifyInstance) {
  // Add authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/personnel - Get all personnel
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      
      const { id, tenantId } = request.query as {
        id?: string;
        tenantId?: string;
      };

      // If specific personnel ID is requested
      if (id) {
        const personnel = await Personnel.findOne({ _id: id, tenantId: tenant._id })
          .populate("userId", "firstName lastName email phone")
          .populate("roleId", "name color");

        if (!personnel) {
          return reply.status(404).send({
            success: false,
            message: "Personnel not found or access denied",
          });
        }

        // Transform the response
        const obj: any = personnel.toObject();
        if (obj.userId && typeof obj.userId === "object") {
          const first = obj.userId.firstName || "";
          const last = obj.userId.lastName || "";
          const full = `${first} ${last}`.trim();
          obj.user = {
            _id: obj.userId._id,
            name: full,
            email: obj.userId.email,
            phone: obj.userId.phone,
          };
          // Add name directly on personnel object for easier frontend access
          obj.name = full || obj.userId.email || 'Unknown Personnel';
          delete obj.userId;
        } else {
          obj.name = 'Unknown Personnel';
        }
        if (obj.roleId && typeof obj.roleId === "object") {
          obj.role = {
            _id: obj.roleId._id,
            name: obj.roleId.name,
            color: obj.roleId.color,
          };
          delete obj.roleId;
        }

        return reply.send({
          success: true,
          data: obj,
          message: "Personnel fetched successfully",
        });
      }

      const personnel = await Personnel.find({ tenantId: tenant._id })
        .populate("userId", "firstName lastName email phone")
        .populate("roleId", "name color")
        .sort({ createdAt: -1 });

      // Transform the response
      const transformedPersonnel = personnel.map((p) => {
        const obj: any = p.toObject();

        // Transform userId to user and add name field for easier access
        if (obj.userId && typeof obj.userId === "object") {
          const first = obj.userId.firstName || "";
          const last = obj.userId.lastName || "";
          const full = `${first} ${last}`.trim();
          
          obj.user = {
            _id: obj.userId._id,
            name: full,
            email: obj.userId.email,
            phone: obj.userId.phone,
          };
          // Add name directly on personnel object for easier frontend access
          obj.name = full || obj.userId.email || 'Unknown Personnel';
          delete obj.userId;
        } else {
          // If userId is not populated or missing
          obj.name = 'Unknown Personnel';
        }

        // Transform roleId to role
        if (obj.roleId && typeof obj.roleId === "object") {
          obj.role = {
            _id: obj.roleId._id,
            name: obj.roleId.name,
            color: obj.roleId.color,
          };
          delete obj.roleId;
        }

        return obj;
      });

      return reply.send({
        success: true,
        data: transformedPersonnel,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Failed to fetch personnel",
      });
    }
  });

  // POST /api/v1/personnel - Create new personnel
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const validatedData = createPersonnelSchema.parse(request.body);

      // Resolve or create user
      let userId = validatedData.userId;
      if (!userId) {
        if (!validatedData.name || !validatedData.email) {
          return reply.status(400).send({
            success: false,
            message: "Name and email are required when userId is not provided",
          });
        }

        const [firstName, ...rest] = validatedData.name.split(" ");
        const lastName = rest.join(" ") || "User";

        // Try find existing user by email within tenant
        let user = await User.findOne({
          tenantId: tenant._id,
          email: validatedData.email,
        });
        if (!user) {
          // Get the role for this personnel (either provided or default)
          let role = null;
          if (validatedData.roleId) {
            role = await Role.findById(validatedData.roleId);
          } else {
            // Get default technician role for permissions
            role = await Role.findOne({
              tenantId: tenant._id,
              name: "Technician",
              isDefault: true,
              isActive: true,
            });
          }

          user = await User.create({
            tenantId: tenant._id,
            email: validatedData.email,
            password: await bcrypt.hash("password123", 12),
            firstName,
            lastName,
            phone: validatedData.phone,
            role: role?.slug || "technician",
            permissions: role?.permissions || [],
            isActive: true,
          });
        }
        userId = user._id;
        } else {
          const user = await User.findOne({ _id: userId, tenantId: tenant._id });
          if (!user) {
            return reply.status(400).send({
              success: false,
              message: "User not found or access denied",
            });
          }
        }

      // Generate employeeId if missing
      let employeeId = validatedData.employeeId;
      if (!employeeId) {
        let unique = false;
        while (!unique) {
          const idCandidate = `EMP-${Math.floor(
            Math.random() * 900000 + 100000
          )}`;

          const exists = await Personnel.findOne({
            tenantId: tenant._id,
            employeeId: idCandidate,
          });
          if (!exists) {
            employeeId = idCandidate;
            unique = true;
          }
        }
      } else {
        const existingPersonnel = await Personnel.findOne({
          tenantId: tenant._id,
          employeeId,
        });
        if (existingPersonnel) {
          return reply.status(400).send({
            success: false,
            message: "Employee ID already exists",
          });
        }
      }

      // Check if role exists (if provided) and belongs to tenant
      if (validatedData.roleId) {
        const role = await Role.findById(validatedData.roleId);
        if (!role) {
          return reply.status(400).send({
            success: false,
            message: "Role not found",
          });
        }
        if (String(role.tenantId) !== String(tenant._id)) {
          return reply.status(400).send({
            success: false,
            message: "Role belongs to a different tenant",
          });
        }
        if (!role.isActive) {
          return reply.status(400).send({
            success: false,
            message: "Role is not active",
          });
        }
      } else {
        // If no role provided, assign a default role
        const defaultRole = await Role.findOne({
          tenantId: tenant._id,
          isDefault: true,
          isActive: true,
        });
        if (defaultRole) {
          validatedData.roleId = defaultRole._id.toString();
          fastify.log.info(
            `Assigned default role "${defaultRole.name}" to new personnel`
          );
        }
      }

      const personnel = new Personnel({
        ...validatedData,
        employeeId,
        userId,
        tenantId: tenant._id,
        isActive: true,
      });

      await personnel.save();

      // Send magic link invitation email if requested
      if (validatedData.sendInvitation && validatedData.email) {
        fastify.log.info(
          `📧 Sending magic link invitation to: ${validatedData.email}`
        );
        try {
          const user = await User.findOne({ _id: userId, tenantId: tenant._id });

          if (user) {
            // Create magic link for personnel invitation
            const magicLinkResult = await MagicLinkService.createMagicLink({
              email: validatedData.email,
              tenantId: tenant._id.toString(),
              userId: userId,
              type: 'personnel_invitation',
              metadata: {
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                roleId: validatedData.roleId,
              },
              expirationHours: 24, // 24 hours to complete setup
            });

            if (magicLinkResult.success && magicLinkResult.magicLink) {
              fastify.log.info(`📧 Magic link generated: ${magicLinkResult.token}`);

              // Send magic link email
              const emailResult = await sendPersonnelMagicLink({
                to: validatedData.email,
                name: `${user.firstName} ${user.lastName}`.trim() || validatedData.email,
                companyName: tenant.name,
                magicLink: magicLinkResult.magicLink,
                expirationHours: 24,
              });

              fastify.log.info(`📧 Magic link email result: ${JSON.stringify(emailResult)}`);

              if (emailResult.success) {
                fastify.log.info(
                  `✅ Magic link invitation sent to ${validatedData.email}`
                );
              } else {
                fastify.log.error(`❌ Failed to send magic link email: ${emailResult.error}`);
              }
            } else {
              fastify.log.error(`❌ Failed to create magic link: ${magicLinkResult.error}`);
            }
          }
        } catch (emailError) {
          fastify.log.error(`❌ Failed to send magic link invitation: ${String(emailError)}`);
          // Don't fail the entire request if email fails
        }
      }

      // Populate and normalize the response
      const populatedPersonnel = await Personnel.findOne({ _id: personnel._id, tenantId: tenant._id })
        .populate("userId", "firstName lastName email phone")
        .populate("roleId", "name color");

      let responseData: any = populatedPersonnel;
      if (populatedPersonnel) {
        const obj: any = populatedPersonnel.toObject();
        if (obj.userId && typeof obj.userId === "object") {
          const first = obj.userId.firstName || "";
          const last = obj.userId.lastName || "";
          const full = `${first} ${last}`.trim();
          obj.userId = {
            _id: obj.userId._id,
            email: obj.userId.email,
            phone: obj.userId.phone,
            name: obj.userId.name || full,
          };
        }
        responseData = obj;
      }

      return reply.send({
        success: true,
        data: responseData,
        message: "Personnel created successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(`Error creating personnel: ${String(error)}`);
      console.error("Detailed error:", error);
      return reply.status(500).send({
        success: false,
        message: "Failed to create personnel",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  // PUT /api/v1/personnel/:id - Update personnel
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };
      const validatedData = updatePersonnelSchema.parse(request.body);

      const personnel = await Personnel.findOne({
        _id: id,
        tenantId: tenant._id,
      });
      if (!personnel) {
        return reply.status(404).send({
          success: false,
          message: "Personnel not found",
        });
      }

      // Update personnel
      Object.assign(personnel, validatedData);
      await personnel.save();

      // If roleId was updated, also update the User's role and permissions
      if (validatedData.roleId) {
        const role = await Role.findOne({ _id: validatedData.roleId, tenantId: tenant._id });
        if (role) {
          await User.findOneAndUpdate(
            { _id: personnel.userId, tenantId: tenant._id },
            {
              role: role.slug,
              permissions: role.permissions,
            }
          );
        }
      }

      // Populate and normalize the response
      const populatedPersonnel = await Personnel.findOne({ _id: personnel._id, tenantId: tenant._id })
        .populate("userId", "firstName lastName email phone")
        .populate("roleId", "name color");

      let responseData: any = populatedPersonnel;
      if (populatedPersonnel) {
        const obj: any = populatedPersonnel.toObject();
        if (obj.userId && typeof obj.userId === "object") {
          const first = obj.userId.firstName || "";
          const last = obj.userId.lastName || "";
          const full = `${first} ${last}`.trim();
          obj.userId = {
            _id: obj.userId._id,
            email: obj.userId.email,
            phone: obj.userId.phone,
            name: obj.userId.name || full,
          };
        }
        responseData = obj;
      }

      return reply.send({
        success: true,
        data: responseData,
        message: "Personnel updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      fastify.log.error(`Error updating personnel: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        message: "Failed to update personnel",
      });
    }
  });

  // DELETE /api/v1/personnel/:id - Delete personnel
  fastify.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const personnel = await Personnel.findOne({
          _id: id,
          tenantId: tenant._id,
        });
        if (!personnel) {
          return reply.status(404).send({
            success: false,
            message: "Personnel not found",
          });
        }

        // Get the associated user ID
        const userId = personnel.userId;

        if (!userId) {
          // If no user associated, just delete personnel record
          await Personnel.findOneAndDelete({ _id: id, tenantId: tenant._id });
          return reply.send({
            success: true,
            message: "Personnel deleted successfully",
          });
        }

        // Perform comprehensive cleanup using the UserCleanupService
        const cleanupResult = await UserCleanupService.cleanupUserData(
          userId.toString(),
          tenant._id.toString(),
          {
            preserveHistory: true, // Keep comments, files, reports for audit
            removeFromActiveAssignments: true, // Remove from tasks, work orders, projects
            revokePermissions: true, // Clean up dynamic permissions
            revokeMagicLinks: true, // Cancel unused magic links
          }
        );

        if (!cleanupResult.success) {
          fastify.log.error(`Cleanup failed: ${cleanupResult.message}`);
          return reply.status(500).send({
            success: false,
            message: `Failed to cleanup user data: ${cleanupResult.message}`,
          });
        }

        // Log cleanup details
        fastify.log.info(`🧹 User cleanup completed:`, {
          tasksUpdated: cleanupResult.details.tasksUpdated,
          workOrdersUpdated: cleanupResult.details.workOrdersUpdated,
          projectsUpdated: cleanupResult.details.projectsUpdated,
          assignmentsRemoved: cleanupResult.details.assignmentsRemoved,
          userDeleted: cleanupResult.details.userDeleted,
          preservedComments: cleanupResult.preservedItems.comments,
        });

        return reply.send({
          success: true,
          message: "Personnel deleted and assignments cleaned up successfully",
          data: {
            cleanupDetails: cleanupResult.details,
            preservedItems: cleanupResult.preservedItems,
          },
        });
      } catch (error) {
        fastify.log.error(`Error deleting personnel: ${String(error)}`);
        return reply.status(500).send({
          success: false,
          message: "Failed to delete personnel",
        });
      }
    }
  );

  // POST /api/v1/personnel/:id/cleanup-assignments - Clean up user assignments (admin utility)
  fastify.post(
    "/:id/cleanup-assignments",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const personnel = await Personnel.findOne({
          _id: id,
          tenantId: tenant._id,
        });
        if (!personnel) {
          return reply.status(404).send({
            success: false,
            message: "Personnel not found",
          });
        }

        if (!personnel.userId) {
          return reply.status(400).send({
            success: false,
            message: "No user associated with this personnel",
          });
        }

        // Remove from active work without deleting the user/personnel
        const cleanupResult = await UserCleanupService.removeFromActiveWork(
          personnel.userId.toString(),
          tenant._id.toString()
        );

        return reply.send({
          success: true,
          message: "User removed from all active assignments",
          data: cleanupResult,
        });
      } catch (error) {
        fastify.log.error(`Error cleaning up assignments: ${String(error)}`);
        return reply.status(500).send({
          success: false,
          message: "Failed to cleanup assignments",
        });
      }
    }
  );

  // PUT /api/v1/personnel/:id/toggle-active - Toggle personnel active status
  fastify.put(
    "/:id/toggle-active",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const personnel = await Personnel.findOne({
          _id: id,
          tenantId: tenant._id,
        });
        if (!personnel) {
          return reply.status(404).send({
            success: false,
            message: "Personnel not found",
          });
        }

        personnel.isActive = !personnel.isActive;
        await personnel.save();

        return reply.send({
          success: true,
          data: { isActive: personnel.isActive },
          message: `Personnel ${
            personnel.isActive ? "activated" : "deactivated"
          } successfully`,
        });
      } catch (error) {
        fastify.log.error(`Error toggling personnel status: ${String(error)}`);
        return reply.status(500).send({
          success: false,
          message: "Failed to toggle personnel status",
        });
      }
    }
  );
}
